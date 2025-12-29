# Didit Integration Setup Guide

This guide covers how to set up the Didit identity verification integration for the Populist backend.

## ✅ What's Been Added

### Backend Changes (`backend/index.js`)

1. **New Webhook Handler**: `POST /webhook/didit`
   - Receives verification status updates from Didit
   - Implements HMAC-SHA256 signature verification
   - Updates user verification status in Firestore
   - Idempotent processing to prevent duplicates

2. **Session Creation Endpoint**: `POST /api/didit/create-session`
   - Creates new verification sessions via Didit API
   - Requires Firebase authentication
   - Stores session metadata in Firestore

3. **Status Check Endpoint**: `GET /api/didit/status/:sessionId`
   - Returns current verification status
   - Requires Firebase authentication
   - Verifies user ownership of session

4. **Helper Function**: `updateUserVerificationStatusFromDidit()`
   - Processes webhook payloads
   - Updates user documents with verification results
   - Supports proof of address, ID verification, and face match data

---

## 🔧 Environment Variables Required

Add these to your DigitalOcean environment variables or `.env` file:

```bash
# Didit Configuration (NEW - Required)
DIDIT_API_KEY=your_didit_api_key_here
DIDIT_WEBHOOK_SECRET=your_didit_webhook_secret_here
DIDIT_WORKFLOW_ID=your_didit_workflow_id_here

# IDWise Configuration (LEGACY - Keep for backward compatibility)
IDWISE_CLIENT_KEY=your_idwise_client_key

# Firebase (Existing - No changes)
FIREBASE_SERVICE_ACCOUNT=your_firebase_service_account_json
APPLE_CLIENT_ID=com.sayists.Populist.signin
CONGRESS_API_KEY=your_congress_api_key
MASTER_CRYPT_KEY=your_32_byte_hex_key
APPLE_TEAM_ID=your_apple_team_id
APPLE_BUNDLE_ID=com.sayists.Populist
```

---

## 📝 How to Get Didit Credentials

### 1. Get Your API Key

1. Log in to [Didit Business Console](https://business.didit.me)
2. Select your Application from the dropdown menu
3. Navigate to the **Verifications** section
4. Click the **Settings** icon (⚙️) in the top right
5. Copy your **API Key**

### 2. Get Your Webhook Secret

1. In the Didit Business Console, go to **Settings**
2. Under **Webhooks**, you'll see your **Webhook Secret Key**
3. Copy this value
4. **Important**: Configure your webhook URL to:
   ```
   https://youinpolitics.com/webhook/didit
   ```

### 3. Get Your Workflow ID

1. In the Didit Business Console, go to **Workflows**
2. Create a new workflow or select an existing one
3. Configure which verification steps you want (e.g., Proof of Address only)
4. Copy the **Workflow ID** (usually starts with `wf_...`)

---

## 🚀 Deployment Steps

### Step 1: Update Environment Variables

**On DigitalOcean:**

```bash
# SSH into your server
ssh root@youinpolitics.com

# Edit environment variables (or use DigitalOcean control panel)
nano /etc/environment

# Add the three Didit variables above
```

**Or via DigitalOcean Control Panel:**

1. Go to your App Platform dashboard
2. Select your app
3. Go to **Settings** → **Environment Variables**
4. Add the three Didit variables

### Step 2: Deploy Updated Backend

```bash
# From your local machine
cd /Users/nicholascarducci/Desktop/Populist/backend

# Commit changes
git add index.js
git commit -m "Add Didit webhook integration"

# Push to production
git push origin main
```

### Step 3: Configure Didit Webhook

1. Go to [Didit Business Console](https://business.didit.me)
2. Navigate to **Settings** → **Webhooks**
3. Set webhook URL to: `https://youinpolitics.com/webhook/didit`
4. Save settings

### Step 4: Test the Integration

**Test webhook endpoint:**

```bash
curl -X POST https://youinpolitics.com/webhook/didit \
  -H "Content-Type: application/json" \
  -H "X-Signature: test" \
  -H "X-Timestamp: $(date +%s)" \
  -d '{
    "webhook_type": "status.updated",
    "session_id": "test_session",
    "status": "Approved"
  }'
```

Expected response: `401 Invalid signature` (this is correct - signature verification is working)

---

## 🔒 Security Features

### HMAC-SHA256 Signature Verification

Every webhook request is verified using HMAC-SHA256:

```javascript
const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(rawBody)
  .digest('hex');

// Constant-time comparison to prevent timing attacks
crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(expectedSignature)
);
```

### Timestamp Validation

Requests older than 5 minutes are rejected to prevent replay attacks:

```javascript
const now = Math.floor(Date.now() / 1000);
const timestampInt = parseInt(timestamp);
if (Math.abs(now - timestampInt) > 300) {
  return res.status(401).json({ error: "Request too old" });
}
```

### Idempotent Processing

Each webhook event is processed only once using Firestore:

```javascript
const eventId = `didit_${session_id}_${webhook_type}_${timestamp}`;
const alreadyProcessed = await isEventProcessed(eventId);

if (alreadyProcessed) {
  return res.status(200).json({ message: "Event already processed" });
}
```

---

## 📊 Firestore Data Structure

### Users Collection

```javascript
/users/{userId}
  - email: "user@example.com"
  - createdAt: Timestamp

  // IDWise fields (LEGACY - kept for backward compatibility)
  - journeyId: "idwise_journey_123"
  - journeyStatus: "verified"

  // Didit fields (NEW)
  - digitSessionId: "session_xyz"
  - digitVerificationStatus: "verified" | "rejected" | "under_review" | "abandoned"
  - verifiedAt: Timestamp
  - proofOfAddress: {
      address: "123 Main St, City, State, ZIP",
      documentType: "utility_bill",
      issueDate: "2025-11-15",
      valid: true
    }
  - idVerification: {
      documentType: "driver_license",
      fullName: "John Doe",
      dateOfBirth: "1990-01-01"
    }
  - faceMatch: {
      score: 0.98,
      isMatch: true
    }
```

### Verification Sessions Collection (NEW)

```javascript
/verification_sessions/{sessionId}
  - userId: "firebase_auth_uid"
  - sessionUrl: "https://verification.didit.me/session/xyz"
  - provider: "didit"
  - status: "pending" | "verified" | "rejected" | "under_review"
  - verificationType: "poa" | "id" | "full"
  - metadata: { parentUserId: "optional_for_minors" }
  - createdAt: Timestamp
  - updatedAt: Timestamp
  - decision: { ... } // Full Didit decision object
```

### Verification Logs Collection (NEW)

```javascript
/verification_logs/{logId}
  - userId: "firebase_auth_uid"
  - sessionId: "session_xyz"
  - provider: "didit"
  - event: "status.updated"
  - status: "verified"
  - decision: { ... }
  - timestamp: Timestamp
```

---

## 🔄 Migration Strategy

### Backward Compatibility

The backend supports **both** IDWise and Didit simultaneously:

- **IDWise webhook**: `POST /webhook` (unchanged)
- **Didit webhook**: `POST /webhook/didit` (new)

### User Migration Options

**Option A: Gradual Migration (Recommended)**
- Keep both systems running
- New users use Didit
- Existing verified users stay on IDWise
- No user data migration needed

**Option B: Active Migration**
- Disable IDWise for new verifications
- Keep webhook active for pending IDWise verifications
- Prompt existing users to re-verify with Didit (optional)

---

## 🧪 Testing Checklist

- [ ] Environment variables configured in production
- [ ] Backend deployed successfully
- [ ] Webhook URL configured in Didit dashboard
- [ ] Test session creation from iOS app
- [ ] Verify webhook signature validation works
- [ ] Check Firestore collections are created correctly
- [ ] Verify user documents update on webhook
- [ ] Test status check endpoint
- [ ] Confirm idempotent processing (duplicate webhooks ignored)

---

## 📱 Next Steps: iOS Integration

See the iOS integration guide for:
1. Creating `DiditVerificationService.swift`
2. Building `DiditVerificationView` UI
3. Updating `AppUser` model
4. Replacing IDWise flows with Didit

---

## 🐛 Troubleshooting

### Webhook Not Receiving Events

**Check:**
1. Webhook URL is correct: `https://youinpolitics.com/webhook/didit`
2. Server is running and accessible
3. Firewall allows incoming requests
4. Check server logs: `pm2 logs` or DigitalOcean logs

### Signature Verification Failing

**Check:**
1. `DIDIT_WEBHOOK_SECRET` matches Didit dashboard
2. No extra spaces or newlines in environment variable
3. Server is using raw JSON body (not re-stringified)

### Session Creation Failing

**Check:**
1. `DIDIT_API_KEY` is correct
2. `DIDIT_WORKFLOW_ID` exists and is active
3. Network can reach `https://verification.didit.me`
4. Check response error messages in logs

### User Document Not Updating

**Check:**
1. `vendor_data` contains valid `userId`
2. User document exists in Firestore
3. Firestore permissions allow updates
4. Check `verification_logs` collection for errors

---

## 📚 Resources

- [Didit Documentation](https://docs.didit.me)
- [Didit Webhook Guide](https://docs.didit.me/reference/webhooks)
- [Didit API Reference](https://docs.didit.me/reference/api-authentication)
- [Backend Source Code](./index.js)

---

## ✅ Summary

**What's Working:**
- ✅ Didit webhook handler with HMAC verification
- ✅ Session creation endpoint
- ✅ Status check endpoint
- ✅ Firestore integration
- ✅ Backward compatibility with IDWise
- ✅ Idempotent processing
- ✅ Security hardening

**What's Next:**
- 📱 iOS DiditVerificationService
- 📱 iOS DiditVerificationView UI
- 🔄 Update AppUser model
- 🧪 End-to-end testing
