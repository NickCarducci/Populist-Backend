/**
 * IDWise Webhook Handler for Populist App
 *
 * Receives webhook events from IDWise and updates user verification status in Firestore.
 * Supports multiple event types with idempotent processing to prevent duplicate updates.
 *
 * Environment Variables Required:
 * - IDWISE_CLIENT_KEY: Your IDWise client key (for verification)
 * - FIREBASE_PROJECT_ID: Your Firebase project ID (optional if using service account)
 * - APPLE_CLIENT_ID: Your Apple Service ID (e.g. com.sayists.service)
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to Firebase service account JSON (for local dev)
 *
 */

const express = require("express");
const admin = require("firebase-admin");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const appleSignin = require("apple-signin-auth");
const path = require("path");
require("dotenv").config();

// Initialize Express app
const app = express();

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
        "style-src": ["'self'", "'unsafe-inline'"]
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

// Serve static files (CSS, Images, HTML) from 'public' folder
app.use(express.static(path.join(__dirname, "public")));

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
 * Apple Sign In Callback Handler
 *
 * POST /apple
 * Return URL configured in Apple Developer Console: https://sayists.com/apple
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
    const { sub: appleUserId, email } = await appleSignin.verifyIdToken(
      id_token,
      {
        audience: process.env.APPLE_CLIENT_ID, // Your Apple Service ID
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
    const uid = `apple:${appleUserId}`;

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
    res.status(500).send("Authentication failed");
  }
});

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "idwise-webhook-handler"
  });
});

/**
 * Root endpoint - Serve Splash Page
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
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
