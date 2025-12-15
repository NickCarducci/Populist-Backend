/**
 * IDWise Webhook Handler for Populist App
 *
 * Receives webhook events from IDWise and updates user verification status in Firestore.
 * Supports multiple event types with idempotent processing to prevent duplicate updates.
 *
 * Environment Variables Required:
 * - IDWISE_CLIENT_KEY: Your IDWise client key (for verification)
 * - FIREBASE_PROJECT_ID: Your Firebase project ID (optional if using service account)
 * - APPLE_CLIENT_ID: Your Apple Service ID (e.g. com.sayists.Populist.signin)
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to Firebase service account JSON (for local dev)
 * - CONGRESS_API_KEY: Your Congress.gov API key
 * - MASTER_CRYPT_KEY: 32-byte hex key for encrypting API keys
 * - APPLE_TEAM_ID: Your Apple Team ID (for App Attest validation)
 * - APPLE_BUNDLE_ID: Your app's bundle ID (for App Attest validation)
 *
 */

const express = require("express");
const admin = require("firebase-admin");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const appleSignin = require("apple-signin-auth");
const crypto = require("crypto");
const cbor = require("cbor");
const path = require("path");
require("dotenv").config();

// Initialize Express app
const app = express();

// Trust the proxy (DigitalOcean Load Balancer) to get correct IP and protocol
// This is required for rate limiting to work correctly and to detect HTTPS
app.set("trust proxy", 1);

// Force HTTPS in production
app.use((req, res, next) => {
  if (
    process.env.NODE_ENV === "production" &&
    req.get("X-Forwarded-Proto") !== "https"
  ) {
    return res.redirect(`https://${req.get("Host")}${req.url}`);
  }
  next();
});

// Check critical environment variables on startup
if (!process.env.APPLE_CLIENT_ID) {
  console.warn(
    "⚠️  WARNING: APPLE_CLIENT_ID is missing or empty. 'Sign in with Apple' will fail."
  );
}

// Security middleware
// Allow inline styles for the splash page
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "style-src": ["'self'", "'unsafe-inline'"],
        "script-src": ["'self'", "'unsafe-inline'"],
        "connect-src": [
          "'self'",
          "https://identitytoolkit.googleapis.com",
          "https://securetoken.googleapis.com",
          "https://firestore.googleapis.com"
        ]
      }
    }
  })
);
app.use(cors({ origin: true })); // In production, restrict to IDWise IPs
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Required for Apple Sign In form-post

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many webhook requests from this IP, please try again later."
});
app.use("/webhook", limiter);

// Serve static files (CSS, Images, HTML) from React app build directory
app.use(express.static(path.join(__dirname, "dist")));

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Option 1: Load from JSON string in environment variable (Best for DigitalOcean/Production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    let serviceAccount;
    try {
      // Try parsing as direct JSON
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (error) {
      // Fallback: Try decoding from Base64 (Fixes copy-paste formatting issues)
      console.log("JSON parse failed, attempting Base64 decode...");
      const decoded = Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT,
        "base64"
      ).toString("utf-8");
      serviceAccount = JSON.parse(decoded);
    }

    // Fix private_key formatting if needed (handles common copy-paste issues)
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(
        /\\n/g,
        "\n"
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  // Option 2: Load from file path (Best for Local Dev)
  else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Auto-configure in Cloud Functions environment
    admin.initializeApp();
  }
}

const db = admin.firestore();

// Store processed event IDs to prevent duplicate processing (using Firestore)
// In production, consider using Redis for better performance
const processedEvents = new Set();

// Helper to sanitize Base64 IDs for Firestore paths (replace / with _)
function getSafeFirestoreId(id) {
  if (!id) return id;
  return id.replace(/\//g, "_").replace(/\+/g, "-");
}

/**
 * Verifies that the App ID (RPID Hash) in the authenticator data matches our TeamID.BundleID
 * This ensures the request is coming from OUR app signed by OUR team.
 */
function verifyAppIdHash(authData) {
  const teamId = process.env.APPLE_TEAM_ID;
  const bundleId = process.env.APPLE_BUNDLE_ID || "com.sayists.Populist";

  if (!teamId || !bundleId) {
    console.warn(
      "⚠️ APPLE_TEAM_ID or APPLE_BUNDLE_ID missing. Skipping strict App ID check."
    );
    return true;
  }

  const appId = `${teamId}.${bundleId}`;
  const expectedHash = crypto.createHash("sha256").update(appId).digest();
  const actualHash = authData.subarray(0, 32); // First 32 bytes is the RPID Hash

  return actualHash.equals(expectedHash);
}

// ============================================================================
// APP ATTEST & SAFETYNET VALIDATION
// ============================================================================

/**
 * Validates iOS App Attest assertion
 * @param {string} assertionBase64 - Base64 encoded assertion from iOS
 * @param {string} keyId - App Attest key ID stored for this device
 * @param {string} challenge - Challenge data hash
 * @returns {Promise<boolean>} - True if valid
 */
async function validateAppAttest(assertionBase64, keyId, challenge) {
  try {
    const safeKeyId = getSafeFirestoreId(keyId);
    // Get stored public key for this device
    const keyDoc = await db.collection("devices").doc(safeKeyId).get();
    if (!keyDoc.exists) {
      console.error("❌ App Attest key not found:", keyId);
      return false;
    }

    const { publicKey: storedAuthDataBase64, counter: storedCounter } =
      keyDoc.data();
    const assertion = Buffer.from(assertionBase64, "base64");

    // Decode CBOR assertion
    const decodedAssertion = cbor.decodeFirstSync(assertion);

    // Handle both Map (if configured) and Object returns from cbor
    let authenticatorData, signature;
    if (decodedAssertion instanceof Map) {
      authenticatorData = decodedAssertion.get("authenticatorData");
      signature = decodedAssertion.get("signature");
    } else {
      authenticatorData = decodedAssertion.authenticatorData;
      signature = decodedAssertion.signature;
    }

    // Ensure we have Buffers (cbor might return Uint8Array)
    if (!Buffer.isBuffer(authenticatorData))
      authenticatorData = Buffer.from(authenticatorData);
    if (!Buffer.isBuffer(signature)) signature = Buffer.from(signature);

    // Hash the challenge to match client-side SHA256(challenge)
    const challengeBuffer = Buffer.from(challenge, "base64");
    const clientDataHash = crypto
      .createHash("sha256")
      .update(challengeBuffer)
      .digest();

    // 0. Verify App ID (RPID Hash)
    if (!verifyAppIdHash(authenticatorData)) {
      console.error("❌ App Attest App ID mismatch (RPID Hash)");
      return false;
    }

    // 1. Verify Signature
    // We need to extract the public key from the stored authData (registered previously)
    // Structure: RPIDHash(32) + Flags(1) + Counter(4) + AAGUID(16) + CredIDLen(2) + CredID(L) + COSEKey(Variable)
    // Reference: https://developer.apple.com/documentation/devicecheck/validating_apps_that_connect_to_your_server
    const storedAuthData = Buffer.from(storedAuthDataBase64, "base64");
    const credIdLen = storedAuthData.readUInt16BE(53); // Offset 53 is where CredID Len starts
    const coseKeyBuffer = storedAuthData.subarray(55 + credIdLen); // 55 = 53 + 2 bytes for len

    // Decode COSE Key to get coordinates
    const coseKey = cbor.decodeFirstSync(coseKeyBuffer);

    let xBuffer, yBuffer;
    if (coseKey instanceof Map) {
      xBuffer = Buffer.from(coseKey.get(-2));
      yBuffer = Buffer.from(coseKey.get(-3));
    } else {
      // Fallback if cbor returns Object (keys converted to strings)
      // COSE keys: -2 is x, -3 is y
      xBuffer = Buffer.from(coseKey["-2"]);
      yBuffer = Buffer.from(coseKey["-3"]);
    }

    // Convert COSE Key to JWK for Node crypto
    // COSE Keys: 1=kty, 3=alg, -1=crv, -2=x, -3=y
    // Ensure x and y are Buffers before converting to base64url
    const jwk = {
      kty: "EC",
      crv: "P-256",
      alg: "ES256",
      x: xBuffer.toString("base64url"),
      y: yBuffer.toString("base64url")
    };

    // Construct the data that was signed: authenticatorData + clientDataHash
    const signedData = Buffer.concat([authenticatorData, clientDataHash]);

    // Verify using the public key
    let isSignatureValid = false;
    try {
      const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
      // Use standard verification which handles hashing internally
      isSignatureValid = crypto.verify(
        "sha256",
        signedData,
        publicKey,
        signature
      );
    } catch (e) {
      console.error("❌ Crypto verification error:", e.message);
      return false;
    }

    if (!isSignatureValid) {
      console.error("❌ App Attest signature verification failed");
      return false;
    }

    // Extract counter from authenticator data
    const counter = authenticatorData.readUInt32BE(33);

    // 2. Verify counter is incremented (prevents replay attacks)
    if (counter <= storedCounter) {
      console.error("❌ App Attest replay attack detected");
      return false;
    }

    // Update counter in database
    await db.collection("devices").doc(safeKeyId).update({
      counter,
      lastUsed: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("✅ App Attest validation successful");
    return true;
  } catch (error) {
    console.error("❌ App Attest validation error:", error);
    return false;
  }
}

/**
 * Validates Android SafetyNet/Play Integrity attestation
 * @param {string} attestationToken - JWT token from Android
 * @returns {Promise<boolean>} - True if valid
 */
async function validateAndroidAttestation(attestationToken) {
  try {
    // For Play Integrity API (recommended for Android 13+)
    // You would verify the JWT token with Google's public keys
    // This is a simplified version - production should use Google's library

    const decoded = JSON.parse(
      Buffer.from(attestationToken.split(".")[1], "base64").toString()
    );

    // Verify package name matches your app
    if (decoded.appPackageName !== process.env.ANDROID_PACKAGE_NAME) {
      return false;
    }

    // Verify integrity verdict
    if (
      !decoded.appIntegrity ||
      decoded.appIntegrity.verdict !== "PLAY_RECOGNIZED"
    ) {
      return false;
    }

    console.log("✅ Android attestation validation successful");
    return true;
  } catch (error) {
    console.error("❌ Android attestation validation error:", error);
    return false;
  }
}

/**
 * Encrypts API key with device-specific encryption using HKDF
 * Each device gets a uniquely encrypted key that only they can decrypt
 * @param {string} apiKey - Congress.gov API key
 * @param {string} deviceId - Unique device identifier (App Attest keyId)
 * @param {string} service - Service identifier (e.g. "congress") for HKDF context
 * @returns {Object} - Encrypted key and metadata
 */
function encryptAPIKeyPerDevice(apiKey, deviceId, service) {
  const masterKey = Buffer.from(
    process.env.MASTER_CRYPT_KEY || crypto.randomBytes(32).toString("hex"),
    "hex"
  );

  // Derive device-specific encryption key using HKDF
  // This ensures each device's key is unique and can't be used on other devices
  // We include the service name in the info string to prevent cross-service key usage
  const deviceKey = crypto.hkdfSync(
    "sha256",
    masterKey,
    Buffer.from(deviceId, "utf8"),
    Buffer.from(`${service}-api-key-encryption`, "utf8"),
    32 // 256-bit key
  );

  // Create perpetual payload (no expiration)
  const payload = JSON.stringify({
    key: apiKey,
    deviceId,
    issuedAt: Date.now(),
    version: 1 // For future key rotation
  });

  // Encrypt with AES-256-GCM using device-specific key
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", deviceKey, iv);

  let encrypted = cipher.update(payload, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return {
    encryptedKey: encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    perpetual: true // Flag indicating no expiration
  };
}

// Rate limiting for API key requests (more lenient for perpetual keys)
const apiKeyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // 5 requests per device per day (should only need 1)
  message: "Too many API key requests, please try again later.",
  keyGenerator: (req) => req.body.deviceId || req.ip
});

// Rate limiting for Congress.gov API usage
const congressAPILimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 Congress API requests per device per hour
  message: "Rate limit exceeded for Congress.gov API",
  keyGenerator: (req) => req.body.deviceId || req.ip
});

/**
 * Maps IDWise decision values to Firestore journeyStatus values
 *
 * @param {string} finalDecision - The final decision from IDWise webhook
 * @returns {string} - Firestore-compatible status
 */
function mapDecisionToStatus(finalDecision) {
  const decisionMap = {
    Complete: "verified", // System approved
    Approved: "verified", // Manually approved
    Rejected: "rejected", // Manually rejected
    Refer: "under_review", // Needs manual review
    Incomplete: "in_progress" // User hasn't finished
  };

  return decisionMap[finalDecision] || "unknown";
}

/**
 * Check if event has already been processed (idempotency)
 *
 * @param {string} eventId - Unique event identifier from IDWise
 * @returns {Promise<boolean>} - True if already processed
 */
async function isEventProcessed(eventId) {
  try {
    const eventRef = db.collection("processed_webhook_events").doc(eventId);
    const doc = await eventRef.get();
    return doc.exists;
  } catch (error) {
    console.error("Error checking event processing status:", error);
    return false;
  }
}

/**
 * Mark event as processed
 *
 * @param {string} eventId - Unique event identifier
 * @param {Object} eventData - Event metadata for logging
 */
async function markEventProcessed(eventId, eventData) {
  try {
    await db.collection("processed_webhook_events").doc(eventId).set({
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      eventType: eventData.event,
      journeyId: eventData.body?.journeyId,
      referenceNo: eventData.body?.referenceNo
    });
  } catch (error) {
    console.error("Error marking event as processed:", error);
  }
}

/**
 * Update user verification status in Firestore
 *
 * @param {string} referenceNo - User's Firebase UID (used as reference number)
 * @param {Object} webhookData - Webhook payload from IDWise
 * @returns {Promise<Object>} - Update result
 */
async function updateUserVerificationStatus(referenceNo, webhookData) {
  const { journeyId, systemDecision, manualDecision, finalDecision, action } =
    webhookData.body;

  // Map final decision to our status enum
  const journeyStatus = mapDecisionToStatus(finalDecision);

  // Prepare update data
  const updateData = {
    journeyStatus,
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    idwiseSystemDecision: systemDecision,
    idwiseManualDecision: manualDecision || null,
    idwiseFinalDecision: finalDecision
  };

  // Add verification timestamp if approved
  if (journeyStatus === "verified") {
    updateData.verifiedAt = admin.firestore.FieldValue.serverTimestamp();
  }

  // Add action if present (e.g., "Manual Review")
  if (action) {
    updateData.idwiseAction = action;
  }

  // Add manual review details if present
  if (webhookData.body.manualReviewDetails) {
    updateData.manualReviewDetails = {
      decision: webhookData.body.manualReviewDetails.journeyReviewDecision,
      reasonCode: webhookData.body.manualReviewDetails.reasonCode,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp()
    };
  }

  try {
    // Update user document
    const userRef = db.collection("users").doc(referenceNo);
    await userRef.update(updateData);

    console.log(`✅ Updated user ${referenceNo}: ${journeyStatus}`);

    // Log the verification event
    await db.collection("verification_logs").add({
      userId: referenceNo,
      journeyId,
      event: webhookData.event,
      status: journeyStatus,
      systemDecision,
      manualDecision: manualDecision || null,
      finalDecision,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      userId: referenceNo,
      status: journeyStatus
    };
  } catch (error) {
    console.error(`❌ Error updating user ${referenceNo}:`, error);
    throw error;
  }
}

/**
 * Main webhook handler endpoint
 *
 * POST /webhook
 *
 * Handles all IDWise webhook events:
 * - Finished Journey
 * - Updated Journey
 * - Manually Reviewed
 * - Finished User Steps
 * - AML Monitor Update
 */
app.post("/webhook", async (req, res) => {
  try {
    const webhookPayload = req.body;
    const { event, body } = webhookPayload;

    console.log(`📥 Received webhook event: ${event}`);
    console.log(`   Journey ID: ${body?.journeyId}`);
    console.log(`   Reference: ${body?.referenceNo}`);

    // Validate payload structure
    if (!event || !body || !body.journeyId || !body.referenceNo) {
      console.error("❌ Invalid webhook payload:", webhookPayload);
      return res.status(400).json({
        error: "Invalid webhook payload",
        message:
          "Missing required fields: event, body.journeyId, or body.referenceNo"
      });
    }

    // Check for idempotency using eventId (if present)
    if (body.eventId) {
      const alreadyProcessed = await isEventProcessed(body.eventId);
      if (alreadyProcessed) {
        console.log(`⚠️  Event ${body.eventId} already processed, skipping...`);
        return res.status(200).json({
          message: "Event already processed",
          eventId: body.eventId
        });
      }
    }

    // Process different event types
    const eventsToProcess = [
      "Finished Journey",
      "Updated Journey",
      "Manually Reviewed",
      "Finished User Steps",
      "AML Monitor Update"
    ];

    if (!eventsToProcess.includes(event)) {
      console.log(`ℹ️  Event type '${event}' not configured for processing`);
      return res.status(200).json({
        message: `Event type '${event}' acknowledged but not processed`
      });
    }

    // Update user verification status in Firestore
    const result = await updateUserVerificationStatus(
      body.referenceNo,
      webhookPayload
    );

    // Mark event as processed (if eventId present)
    if (body.eventId) {
      await markEventProcessed(body.eventId, webhookPayload);
    }

    // Return success response
    console.log(
      `✅ Webhook processed successfully for user ${body.referenceNo}`
    );
    res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
      result
    });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);

    // Return 500 so IDWise retries
    res.status(500).json({
      error: "Internal server error",
      message: error.message
    });
  }
});

/**
 * Generic Secure API Key Request Endpoint (Perpetual Per-Device Keys)
 *
 * POST /api/secure-key
 *
 * Returns a perpetual, device-specific encrypted API key for the requested service.
 * Each device gets a uniquely encrypted key using HKDF derivation.
 * Extracted keys are useless on other devices.
 *
 * Request body:
 * - service: "congress" | "openai" | etc.
 * - platform: "ios" | "android"
 * - deviceId: Unique device identifier (App Attest keyId for iOS)
 * - assertion: Base64 App Attest assertion (iOS) or Play Integrity token (Android)
 * - challenge: Base64 challenge hash (iOS only)
 */
app.post("/api/secure-key", apiKeyLimiter, async (req, res) => {
  try {
    const {
      platform,
      deviceId,
      assertion,
      challenge,
      service = "congress"
    } = req.body;

    // Map service IDs to Environment Variables
    const SERVICE_REGISTRY = {
      congress: "CONGRESS_API_KEY"
      // Add other read-only services here easily:
      // "weather": "WEATHER_API_KEY",
      // "maps": "GOOGLE_MAPS_KEY"
    };

    // Validate required fields
    if (!platform || !deviceId || !assertion) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["platform", "deviceId", "assertion"]
      });
    }

    console.log(`📱 API key request from ${platform} device: ${deviceId}`);

    const safeDeviceId = getSafeFirestoreId(deviceId);

    // Check if device is revoked BEFORE validation
    const deviceDoc = await db.collection("devices").doc(safeDeviceId).get();
    if (deviceDoc.exists && deviceDoc.data().revoked) {
      console.log(`🚫 Revoked device attempted access: ${deviceId}`);
      return res.status(403).json({
        error: "Device revoked",
        message: "This device has been revoked. Contact support."
      });
    }

    // Validate based on platform
    let isValid = false;

    if (platform === "ios") {
      if (!challenge) {
        return res.status(400).json({
          error: "Missing challenge for iOS attestation"
        });
      }
      isValid = await validateAppAttest(assertion, deviceId, challenge);
    } else if (platform === "android") {
      isValid = await validateAndroidAttestation(assertion);
    } else {
      return res.status(400).json({
        error: "Invalid platform",
        message: "Platform must be 'ios' or 'android'"
      });
    }

    if (!isValid) {
      console.error(`❌ Attestation validation failed for ${platform} device`);
      return res.status(403).json({
        error: "Attestation validation failed",
        message: "Device authenticity could not be verified"
      });
    }

    // Check if requested service is configured
    const envVarName = SERVICE_REGISTRY[service];
    const targetApiKey = envVarName ? process.env[envVarName] : null;

    if (!targetApiKey) {
      console.error(`❌ API key for service '${service}' not configured`);
      return res.status(500).json({
        error: "Service API key not configured"
      });
    }

    // Check if device already has a perpetual key
    // We check if the device has a key specifically for this service
    // Note: In a multi-key system, you might want to store keys in a sub-collection or map
    // For now, we assume one key per device or check if the existing key matches the service
    if (
      deviceDoc.exists &&
      !deviceDoc.data().revoked &&
      deviceDoc.data().service === service
    ) {
      const data = deviceDoc.data();

      // Update last seen timestamp
      await db
        .collection("devices")
        .doc(safeDeviceId)
        .update({
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
          requestCount: admin.firestore.FieldValue.increment(1)
        });

      console.log(`✅ Returning cached perpetual key for ${deviceId}`);

      return res.status(200).json({
        success: true,
        encryptedKey: data.encryptedKey,
        iv: data.iv,
        authTag: data.authTag,
        perpetual: true,
        cached: true,
        message: "Perpetual API key retrieved from cache."
      });
    }

    // First time - encrypt new perpetual key for this device
    const encrypted = encryptAPIKeyPerDevice(targetApiKey, deviceId, service);

    // Store encrypted key in Firestore (perpetual, but revocable)
    await db.collection("devices").doc(safeDeviceId).set(
      {
        deviceId,
        service,
        platform,
        encryptedKey: encrypted.encryptedKey,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        issuedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        revoked: false,
        requestCount: 1,
        ipAddress: req.ip,
        version: 1
      },
      { merge: true }
    );

    console.log(`✅ Issued perpetual key to ${platform} device: ${deviceId}`);

    res.status(200).json({
      success: true,
      encryptedKey: encrypted.encryptedKey,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      perpetual: true,
      cached: false,
      message: "Perpetual API key issued. Store securely in memory."
    });
  } catch (error) {
    console.error("❌ API key request error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message
    });
  }
});

/**
 * App Attest Key Registration Endpoint
 *
 * POST /api/attest/register
 *
 * Stores the public key from iOS App Attest attestation object.
 * This must be called once per device before requesting API keys.
 */
app.post("/api/attest/register", async (req, res) => {
  try {
    const { keyId, attestation, challenge } = req.body;

    if (!keyId || !attestation || !challenge) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["keyId", "attestation", "challenge"]
      });
    }

    const safeKeyId = getSafeFirestoreId(keyId);

    // Decode attestation object (CBOR encoded)
    const attestationBuffer = Buffer.from(attestation, "base64");
    const decodedAttestation = cbor.decodeFirstSync(attestationBuffer);

    // Extract public key from attestation
    // In production, you should fully validate the attestation with Apple's servers
    let authData;
    if (decodedAttestation instanceof Map) {
      authData = decodedAttestation.get("authData");
    } else {
      authData = decodedAttestation.authData;
    }

    if (!authData) {
      throw new Error("Invalid attestation object: missing authData");
    }

    // Ensure authData is a Buffer before converting to base64
    if (!Buffer.isBuffer(authData)) {
      authData = Buffer.from(authData);
    }

    // Verify App ID (RPID Hash) matches our TeamID.BundleID
    if (!verifyAppIdHash(authData)) {
      console.error("❌ App Attest Registration App ID mismatch");
      return res.status(403).json({ error: "Invalid App ID or Team ID" });
    }

    // Store the public key and initial counter
    await db
      .collection("devices")
      .doc(safeKeyId)
      .set(
        {
          keyId,
          publicKey: authData.toString("base64"),
          counter: 0,
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          bundleId: process.env.APPLE_BUNDLE_ID || "com.sayists.Populist"
        },
        { merge: true }
      );

    console.log(`✅ App Attest key registered: ${keyId}`);

    res.status(200).json({
      success: true,
      message: "App Attest key registered successfully",
      keyId
    });
  } catch (error) {
    console.error("❌ App Attest registration error:", error);
    res.status(500).json({
      error: "Registration failed",
      message: error.message
    });
  }
});

/**
 * Apple Sign In Callback Handler
 *
 * POST /apple
 * Return URL configured in Apple Developer Console: https://youinpolitics.com/apple
 *
 * Receives the form POST from Apple, verifies identity, creates Firebase user,
 * and redirects with a custom token.
 */
app.post("/apple", async (req, res) => {
  try {
    // Apple sends 'id_token' and 'user' (JSON string, first login only) in body
    const { id_token, user } = req.body;

    if (!id_token) {
      return res.status(400).send("Authentication failed: Missing id_token");
    }

    // Verify the identity token
    // We must accept both the Service ID (Web) and Bundle ID (iOS App)
    const validAudiences = [
      process.env.APPLE_CLIENT_ID,
      "com.sayists.Populist"
    ];

    const { sub: appleUserId, email } = await appleSignin.verifyIdToken(
      id_token,
      {
        audience: validAudiences,
        ignoreExpiration: true
      }
    );

    console.log(` Apple Sign In verified for user: ${appleUserId}`);

    // Parse user name (only sent on first login)
    let displayName = "";
    if (user) {
      try {
        // Handle both JSON string (Apple Web Form) and Object (Native App JSON)
        const userData = typeof user === "string" ? JSON.parse(user) : user;
        const { firstName, lastName } = userData.name || {};
        if (firstName || lastName) {
          displayName = [firstName, lastName].filter(Boolean).join(" ");
        }
      } catch (e) {
        console.error("Error parsing Apple user data:", e);
      }
    }

    // Create or update user in Firebase
    // We use a prefixed UID to avoid collisions with other auth providers
    // We sanitize the ID to ensure it's a valid Firestore document path (no slashes)
    const uid = `apple:${getSafeFirestoreId(appleUserId)}`;

    try {
      // Check if user exists in Firebase Auth
      await admin.auth().getUser(uid);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        // Create new user in Firebase Auth
        const userPayload = {
          uid,
          emailVerified: true
        };
        if (email) userPayload.email = email;
        if (displayName) userPayload.displayName = displayName;

        await admin.auth().createUser(userPayload);

        // Create user document in Firestore (matching IDWise structure)
        await db
          .collection("users")
          .doc(uid)
          .set({
            authProvider: "apple",
            appleUserId,
            email: email || null,
            displayName: displayName || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            journeyStatus: "unknown" // Default status
          });
      } else {
        throw error;
      }
    }

    // Generate a custom token for the client to sign in
    const customToken = await admin.auth().createCustomToken(uid);

    // If request is JSON (Native App), return JSON response
    if (req.is("json")) {
      return res.status(200).json({
        token: customToken,
        uid
      });
    }

    // Redirect to app root with token (Frontend should parse this query param)
    res.redirect(`/?token=${customToken}&uid=${uid}`);
  } catch (error) {
    console.error("❌ Apple Sign In processing error:", error);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
});

/**
 * Admin Endpoint - Revoke Device
 *
 * POST /admin/revoke-device
 *
 * Revokes a specific device's API key access.
 * Requires Firebase ID token from authorized admin (nmcarducci@gmail.com).
 */
app.post("/admin/revoke-device", async (req, res) => {
  try {
    const { deviceId, reason, idToken } = req.body;

    // Verify Firebase ID token
    if (!idToken) {
      return res.status(401).json({ error: "Missing authentication token" });
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      console.log(`🚫 Invalid Firebase token:`, error.message);
      return res.status(403).json({ error: "Invalid authentication token" });
    }

    // Verify admin email
    const userEmail = decodedToken.email;
    if (userEmail !== "nmcarducci@gmail.com") {
      console.log(`🚫 Unauthorized revocation attempt by ${userEmail}`);
      return res
        .status(403)
        .json({ error: "Unauthorized - admin access required" });
    }

    if (!deviceId) {
      return res.status(400).json({
        error: "Missing deviceId"
      });
    }

    const safeDeviceId = getSafeFirestoreId(deviceId);

    // Check if device exists
    const deviceDoc = await db.collection("devices").doc(safeDeviceId).get();

    if (!deviceDoc.exists) {
      return res.status(404).json({
        error: "Device not found",
        deviceId
      });
    }

    // Mark device as revoked
    await db
      .collection("devices")
      .doc(safeDeviceId)
      .update({
        revoked: true,
        revokedAt: admin.firestore.FieldValue.serverTimestamp(),
        revokedReason: reason || "Admin revocation",
        revokedBy: userEmail
      });

    console.log(
      `🚫 Device ${deviceId} revoked by ${userEmail}: ${
        reason || "No reason provided"
      }`
    );

    res.json({
      success: true,
      message: `Device ${deviceId} has been revoked`,
      deviceId,
      reason: reason || "Admin revocation"
    });
  } catch (error) {
    console.error("❌ Revocation error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message
    });
  }
});

/**
 * Admin Endpoint - List Devices
 *
 * GET /admin/devices
 *
 * Lists all registered devices with optional filtering.
 * Requires Firebase ID token from authorized admin (nmcarducci@gmail.com).
 */
app.get("/admin/devices", async (req, res) => {
  try {
    const { idToken, limit = 100, revoked } = req.query;

    // Verify Firebase ID token
    if (!idToken) {
      return res.status(401).json({ error: "Missing authentication token" });
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      console.log(`🚫 Invalid Firebase token:`, error.message);
      return res.status(403).json({ error: "Invalid authentication token" });
    }

    // Verify admin email
    const userEmail = decodedToken.email;
    if (userEmail !== "nmcarducci@gmail.com") {
      console.log(`🚫 Unauthorized device list attempt by ${userEmail}`);
      return res
        .status(403)
        .json({ error: "Unauthorized - admin access required" });
    }

    let query = db.collection("devices").limit(parseInt(limit));

    // Filter by revoked status if specified
    if (revoked !== undefined) {
      query = query.where("revoked", "==", revoked === "true");
    }

    const snapshot = await query.orderBy("issuedAt", "desc").get();

    const devices = snapshot.docs.map((doc) => ({
      deviceId: doc.id,
      ...doc.data(),
      issuedAt: doc.data().issuedAt?.toDate?.()?.toISOString(),
      lastSeen: doc.data().lastSeen?.toDate?.()?.toISOString(),
      revokedAt: doc.data().revokedAt?.toDate?.()?.toISOString()
    }));

    console.log(`📋 Admin ${userEmail} listed ${devices.length} devices`);

    res.json({
      success: true,
      count: devices.length,
      devices
    });
  } catch (error) {
    console.error("❌ List devices error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message
    });
  }
});

/**
 * Public Bills Proxy Endpoint
 *
 * GET /api/bills
 *
 * Proxies requests to Congress.gov to protect the API key.
 * Used by the web frontend to avoid exposing secrets in the browser.
 */
app.get("/api/bills", congressAPILimiter, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const apiKey = process.env.CONGRESS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Congress API key not configured" });
    }

    const url = `https://api.congress.gov/v3/bill?api_key=${apiKey}&format=json&limit=${limit}&offset=${offset}&sort=updateDate+desc`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Congress API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("❌ Bills proxy error:", error);
    res.status(500).json({ error: "Failed to fetch bills" });
  }
});

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "populist-api-gateway"
  });
});

/**
 * Root endpoint - Serve React App (SPA)
 * Handles all non-API routes
 */
app.get("*", (req, res) => {
  // Don't intercept API routes if they fell through
  if (
    req.path.startsWith("/webhook") ||
    req.path.startsWith("/apple") ||
    req.path.startsWith("/health")
  ) {
    return res.status(404).json({ error: "Not Found" });
  }
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// For Cloud Functions deployment
exports.idwiseWebhook = app;

// For local development server
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 IDWise Webhook Handler running on port ${PORT}`);
    console.log(`📍 Webhook endpoint: http://localhost:${PORT}/webhook`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
  });
}
