# ⚡ Backend Quick Start - 5 Minutes to Deploy

## 🎯 What You're Deploying

An automatic webhook handler that:
1. Receives verification results from IDWise
2. Updates your Firestore user status to "verified"
3. Your iOS app automatically gives users full access

---

## 🚀 Fastest Deploy: Google Cloud Run (Recommended)

### Step 1: Install Google Cloud CLI
```bash
brew install google-cloud-sdk
gcloud auth login
```

### Step 2: Run Deploy Script
```bash
cd backend
./deploy-cloud-run.sh
```

**That's it!** The script will output your webhook URL.

---

## 📋 Copy Webhook URL to IDWise

After deployment, you'll see:
```
✅ Deployment complete!

📍 Your webhook URL:
   https://idwise-webhook-abc123.run.app/webhook
```

### Configure in IDWise Dashboard:

1. Go to: https://dashboard.idwise.com
2. **Settings** → **Webhooks** → **Create a Webhook**
3. Paste URL: `https://your-url.run.app/webhook`
4. Select events:
   - ✅ Finished Journey
   - ✅ Updated Journey
   - ✅ Manually Reviewed
5. Click **Save**

Done! IDWise will now automatically update your users' verification status.

---

## 🧪 Test It Works

### 1. Check Health
```bash
curl https://your-url.run.app/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-12T...",
  "service": "idwise-webhook-handler"
}
```

### 2. Send Test Webhook
```bash
curl -X POST https://your-url.run.app/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "Finished Journey",
    "body": {
      "journeyId": "test-123",
      "referenceNo": "YOUR_FIREBASE_USER_UID",
      "systemDecision": "Complete",
      "manualDecision": null,
      "finalDecision": "Complete"
    }
  }'
```

### 3. Check Firestore

Go to Firebase Console → Firestore → `users/{YOUR_USER_UID}`

Should now have:
```javascript
{
  journeyStatus: "verified",
  verifiedAt: <timestamp>,
  idwiseSystemDecision: "Complete"
}
```

---

## 💰 Cost

**Cloud Run Free Tier:**
- 2 million requests/month
- 360,000 GB-seconds

**Your usage:** ~100-1000 webhooks/month

**Actual cost: $0/month** 🎉

---

## 📊 Monitor Logs

```bash
# View real-time logs
gcloud run logs tail idwise-webhook --region us-central1

# View recent logs
gcloud run logs read idwise-webhook --region us-central1 --limit 50
```

---

## 🔧 Update After Code Changes

Just run the deploy script again:
```bash
./deploy-cloud-run.sh
```

Cloud Run automatically:
- Builds new container
- Zero-downtime deployment
- Keeps same webhook URL

---

## 🆘 Troubleshooting

### "gcloud: command not found"
```bash
brew install google-cloud-sdk
```

### "Permission denied"
```bash
gcloud auth login
```

### Webhook returns 500 error
Check logs:
```bash
gcloud run logs tail idwise-webhook --region us-central1
```

Common issues:
- Missing Firebase service account (auto-configured in Cloud Run)
- User document doesn't exist in Firestore
- Firestore security rules blocking write

### User status not updating
1. Check webhook URL is correct in IDWise dashboard
2. Verify events are selected (Finished Journey, etc.)
3. Check Firestore logs collection for webhook events
4. Ensure user document exists before starting verification

---

## 🎯 Alternative: Firebase Functions (Also Great!)

If you prefer Firebase Functions:

```bash
# Install Firebase CLI
npm install -g firebase-tools
firebase login

# Initialize
firebase init functions

# Copy files
cp index.js ../functions/
cp package.json ../functions/

# Deploy
cd ../functions
npm install
firebase deploy --only functions
```

Your URL: `https://us-central1-pop-u-list.cloudfunctions.net/idwiseWebhook`

---

## ✨ That's It!

You now have:
- ✅ Automatic verification status updates
- ✅ Scalable serverless backend
- ✅ $0/month hosting cost
- ✅ Real-time logs and monitoring

**Next:** Configure the webhook URL in IDWise dashboard and you're done!
