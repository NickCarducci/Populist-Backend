# IDWise Webhook Handler - Backend

This Node.js/Express server receives webhook events from IDWise and automatically updates user verification status in your Firebase Firestore database.

## 🎯 What This Does

When a user completes identity verification with IDWise:
1. IDWise processes the verification (5-30 minutes)
2. IDWise sends a webhook to this server
3. Server updates Firestore: `users/{userId}/journeyStatus = "verified"`
4. Your iOS app automatically reflects the new status
5. User gets full app access!

---

## 📋 Prerequisites

- Node.js 18+ installed
- Firebase project (already set up: `pop-u-list`)
- Firebase Admin SDK service account key
- IDWise account with webhook configuration

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **pop-u-list**
3. Click ⚙️ **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the downloaded JSON file as `serviceAccountKey.json` in this directory

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```bash
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
FIREBASE_PROJECT_ID=pop-u-list
PORT=3000
```

### 4. Run Locally

```bash
npm start
```

Your webhook server is now running at: `http://localhost:3000/webhook`

---

## 🧪 Testing Locally

### Test Health Check
```bash
curl http://localhost:3000/health
```

### Test Webhook with Sample Payload
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "Finished Journey",
    "body": {
      "journeyId": "test-journey-123",
      "referenceNo": "test-user-uid",
      "systemDecision": "Complete",
      "manualDecision": null,
      "finalDecision": "Complete"
    }
  }'
```

### Use Ngrok for Testing with IDWise

1. Install ngrok: `brew install ngrok` (macOS)
2. Start your server: `npm start`
3. In another terminal: `ngrok http 3000`
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Configure in IDWise Dashboard: `https://abc123.ngrok.io/webhook`

---

## ☁️ Deployment Options

### Option 1: DigitalOcean App Platform (Recommended) - $5/month

**Best for production - fixed cost, no surprises!**

#### Why DigitalOcean?
- ✅ **$5/month flat fee** - no usage charges
- ✅ **Unlimited requests** - no per-webhook fees
- ✅ **Auto-deploy from GitHub** - push to deploy
- ✅ **Predictable billing** - never worry about spike costs
- ✅ **Perfect for webhooks** - low traffic, high value

#### Quick Deploy
See **[DEPLOY_DIGITALOCEAN.md](DEPLOY_DIGITALOCEAN.md)** for complete guide.

```bash
# 1. Push to GitHub
git push origin main

# 2. Create app on DigitalOcean
# 3. Connect GitHub repo
# 4. Add environment variables
# 5. Deploy!

# Webhook URL:
https://your-app.ondigitalocean.app/webhook
```

**Total time: 5 minutes | Cost: $5/month (fixed)**

---

### Option 2: Firebase Cloud Functions

#### Setup
```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

Select:
- Use existing project: **pop-u-list**
- Language: **JavaScript**
- ESLint: **No** (or Yes, your choice)
- Install dependencies: **Yes**

#### Deploy
```bash
# Copy index.js to functions directory
cp index.js ../functions/
cp package.json ../functions/

# Deploy
cd ../functions
npm install
firebase deploy --only functions
```

Your webhook URL will be:
```
https://us-central1-pop-u-list.cloudfunctions.net/idwiseWebhook
```

#### Cost
- **Free Tier:** 2 million invocations/month
- **Typical Usage:** ~100-1000 webhooks/month = **$0/month**

---

### Option 2: Google Cloud Run (Serverless)

#### Build & Deploy
```bash
# Make sure you're in the backend directory
cd backend

# Deploy to Cloud Run
gcloud run deploy idwise-webhook \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars FIREBASE_PROJECT_ID=pop-u-list
```

Your webhook URL will be:
```
https://idwise-webhook-<hash>.run.app/webhook
```

#### Cost
- **Free Tier:** 2 million requests/month, 360,000 GB-seconds
- **Typical Usage:** ~$0-1/month

---

### Option 3: Heroku

#### Setup
```bash
# Install Heroku CLI
brew tap heroku/brew && brew install heroku

# Login
heroku login

# Create app
heroku create populist-idwise-webhook

# Add Firebase credentials as environment variable
heroku config:set FIREBASE_CONFIG="$(cat serviceAccountKey.json)"
heroku config:set FIREBASE_PROJECT_ID=pop-u-list

# Deploy
git init
git add .
git commit -m "Initial commit"
heroku git:remote -a populist-idwise-webhook
git push heroku main
```

Your webhook URL will be:
```
https://populist-idwise-webhook.herokuapp.com/webhook
```

#### Cost
- **Free Tier:** 550-1000 dyno hours/month
- **Eco Dyno:** $5/month for always-on

---

### Option 4: Railway.app (Easiest!)

1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Connect this backend folder
4. Railway auto-detects Node.js and deploys
5. Add environment variables in Railway dashboard:
   - `FIREBASE_PROJECT_ID` = `pop-u-list`
   - `FIREBASE_CONFIG` = (paste serviceAccountKey.json contents)

Your webhook URL will be:
```
https://populist-webhook.up.railway.app/webhook
```

#### Cost
- **Free Tier:** $5 credit/month
- **Typical Usage:** ~$0-2/month

---

## 🔧 Configure IDWise Webhook

After deployment, configure your webhook URL in IDWise:

### Steps:
1. Go to [IDWise Dashboard](https://dashboard.idwise.com)
2. Navigate to **Settings** → **Webhooks**
3. Click **Create a Webhook**
4. Fill in:
   - **Event:** Select **"Finished Journey"** (and optionally "Updated Journey", "Manually Reviewed")
   - **Webhook URL:** Your deployed URL + `/webhook`
     - Example: `https://your-app.cloudfunctions.net/idwiseWebhook`
   - **Authentication:** (Optional) Add bearer token if you want extra security
5. Click **Save**

IDWise will send a test request. Your server should return HTTP 200.

---

## 📊 How It Works

### Webhook Event Flow

```
[IDWise Backend]
      ↓ (Verification Complete)
      ↓ Sends webhook event
      ↓
[Your Webhook Server]
      ↓ Receives event
      ↓ Validates payload
      ↓ Maps decision to status
      ↓
[Firestore: users/{userId}]
      ↓ Updates: journeyStatus = "verified"
      ↓ Adds: verifiedAt = timestamp
      ↓
[iOS App]
      ↓ Firestore listener detects change
      ↓ Updates UI
      ↓ User gets full access!
```

### Supported Webhook Events

| Event | When Triggered | Action |
|-------|---------------|--------|
| **Finished Journey** | Verification processing complete | Update journeyStatus |
| **Updated Journey** | Manual review decision made | Update with manual decision |
| **Manually Reviewed** | Admin manually approves/rejects | Update journeyStatus |
| **Finished User Steps** | User completes all steps | Update to "submitted" |
| **AML Monitor Update** | AML status changes | Update with new AML data |

### Status Mapping

| IDWise Decision | Firestore Status | App Behavior |
|----------------|------------------|--------------|
| `Complete` | `verified` | ✅ Full access |
| `Approved` | `verified` | ✅ Full access |
| `Rejected` | `rejected` | ❌ Show rejection message |
| `Refer` | `under_review` | ⏳ Show pending status |
| `Incomplete` | `in_progress` | 📝 Prompt to resume |

---

## 🔒 Security Features

### Built-in Security

1. **Helmet.js** - Sets secure HTTP headers
2. **Rate Limiting** - Prevents abuse (100 requests per 15 minutes)
3. **CORS** - Restricts cross-origin requests
4. **Idempotency** - Prevents duplicate processing using eventId
5. **Input Validation** - Validates webhook payload structure

### Production Security Enhancements

#### 1. IP Whitelisting (Recommended)

Get IDWise IP addresses from support, then add to your server:

```javascript
const allowedIPs = process.env.ALLOWED_IPS?.split(',') || [];

app.use('/webhook', (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  if (!allowedIPs.includes(clientIP)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});
```

#### 2. Webhook Signature Verification (If IDWise Provides)

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return hash === signature;
}

app.post('/webhook', (req, res, next) => {
  const signature = req.headers['x-idwise-signature'];
  if (!verifyWebhookSignature(req.body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  next();
});
```

---

## 📈 Monitoring & Logging

### View Logs

**Firebase Functions:**
```bash
firebase functions:log
```

**Google Cloud Run:**
```bash
gcloud run logs tail idwise-webhook
```

**Heroku:**
```bash
heroku logs --tail -a populist-idwise-webhook
```

### Firestore Collections Created

#### `verification_logs`
Tracks all verification events:
```javascript
{
  userId: "firebase-uid",
  journeyId: "idwise-journey-id",
  event: "Finished Journey",
  status: "verified",
  systemDecision: "Complete",
  manualDecision: null,
  finalDecision: "Complete",
  timestamp: Firestore.Timestamp
}
```

#### `processed_webhook_events`
Prevents duplicate processing:
```javascript
{
  eventId: "unique-event-id",
  processedAt: Firestore.Timestamp,
  eventType: "Finished Journey",
  journeyId: "journey-id",
  referenceNo: "user-id"
}
```

---

## 🧪 Testing in Production

### 1. Simulate Verification

Manually trigger webhook from IDWise dashboard or use their test mode.

### 2. Check Firestore

After webhook fires:
```
Firebase Console → Firestore → users/{userId}

Should see:
- journeyStatus: "verified"
- verifiedAt: <timestamp>
- idwiseSystemDecision: "Complete"
- idwiseFinalDecision: "Complete"
```

### 3. Check iOS App

User should see:
- No more verification prompts
- Full app access
- Any "verified" badges or features enabled

---

## 🐛 Troubleshooting

### Webhook Returns 400 "Invalid payload"
**Cause:** Missing required fields
**Fix:** Check IDWise webhook configuration sends all required fields

### Webhook Returns 500 "Internal error"
**Cause:** Firestore update failed
**Fix:** Check:
- Firebase service account has Firestore write permissions
- User document exists in `users` collection
- Field names match your Firestore schema

### User Status Not Updating in App
**Cause:** Firestore listener not configured or user document doesn't exist
**Fix:**
- Ensure user document exists before verification starts
- Check ContentView.swift has Firestore listener

### "Event already processed" Warning
**Cause:** IDWise sent duplicate webhook (normal retry behavior)
**Fix:** This is expected and handled automatically by idempotency logic

---

## 📚 Additional Resources

- [IDWise Webhook Documentation](https://docs.idwise.com/docs/webhooks-overview)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Express.js Documentation](https://expressjs.com/)

---

## 🆘 Support

If you encounter issues:

1. **Check Logs:** See monitoring section above
2. **Verify Firestore Rules:** Ensure backend can write to `users` collection
3. **Test Locally:** Use ngrok to debug with real IDWise webhooks
4. **Contact IDWise:** support@idwise.com for webhook-specific issues

---

## 📝 License

MIT - Part of the Populist App ecosystem
