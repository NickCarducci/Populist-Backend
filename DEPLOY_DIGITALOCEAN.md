# 🚀 Deploy to DigitalOcean App Platform - $5/Month

## Why DigitalOcean App Platform?

### **Best Value for Production:**

- **Fixed $5/month** (Basic plan)
- **No usage fees** - unlimited requests
- **No surprise bills** unlike Google Cloud/AWS
- **Simple pricing** - what you see is what you pay
- **Perfect for webhooks** - predictable low traffic

### **Cost Comparison:**

| Platform           | Base Cost | Usage Fees     | Typical Monthly Cost  |
| ------------------ | --------- | -------------- | --------------------- |
| **DigitalOcean**   | **$5/mo** | **None**       | **$5** ✅             |
| Cloud Run          | $0        | Per request    | $0-10 (unpredictable) |
| Firebase Functions | $0        | Per invocation | $0-5 (unpredictable)  |
| Railway            | $0-5      | Per hour       | $0-10 (variable)      |
| Heroku             | $5-7      | None           | $7                    |

**Winner: DigitalOcean** - Fixed $5, no surprises! 🎯

---

## 🚀 Deploy in 5 Minutes

### **Prerequisites:**

1. DigitalOcean account (free to create)
2. GitHub account
3. Your code pushed to GitHub

---

### **Step 1: Push Code to GitHub**

```bash
cd /Users/nicholascarducci/Desktop/Populist/backend

# Initialize git if not already
git init
git add .
git commit -m "Add IDWise webhook handler"

# Create new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/populist-backend.git
git branch -M main
git push -u origin main
```

---

### **Step 2: Create DigitalOcean App**

1. Go to: https://cloud.digitalocean.com/apps
2. Click **Create App**
3. Choose **GitHub** as source
4. Authorize DigitalOcean to access your repos
5. Select your repository: `populist-backend`
6. Select branch: `main`
7. DigitalOcean auto-detects Node.js!

---

### **Step 3: Configure Build Settings**

DigitalOcean will auto-detect from your `package.json`:

```json
{
  "scripts": {
    "start": "node index.js"
  }
}
```

**Build Command:** (auto-detected) `npm install`
**Run Command:** (auto-detected) `npm start`

---

### **Step 4: Set Environment Variables**

In the DigitalOcean dashboard:

1. Click **Environment Variables**
2. Add these:

```
FIREBASE_PROJECT_ID = pop-u-list
PORT = 8080
NODE_ENV = production
APPLE_CLIENT_ID = com.sayists.service
```

3. For **Firebase credentials**, you have 2 options:

**Option A: Service Account Key (Easier)**

```
FIREBASE_CONFIG = {paste entire serviceAccountKey.json content}
```

**Option B: Individual Fields** (More secure)

```
FIREBASE_PROJECT_ID = pop-u-list
FIREBASE_CLIENT_EMAIL = firebase-adminsdk-...@pop-u-list.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

---

### **Step 5: Choose Plan**

**Recommended: Basic Plan - $5/month**

- 512 MB RAM
- 1 vCPU
- Perfect for webhooks!

**Why not free tier?**

- DigitalOcean doesn't have a free tier
- But $5 is the cheapest predictable cost
- No usage fees = no surprises

---

### **Step 6: Deploy!**

1. Click **Create Resources**
2. Wait ~3 minutes
3. Get your URL: `https://your-app.ondigitalocean.app`
4. Done! 🎉

---

## 🔧 Your Webhook URL

After deployment:

```
https://your-app-abc123.ondigitalocean.app/webhook
```

Add this to IDWise Dashboard:

1. Go to IDWise Dashboard → Settings → Webhooks
2. Create new webhook
3. URL: `https://your-app-abc123.ondigitalocean.app/webhook`
4. Select events: Finished Journey, Updated Journey, Manually Reviewed

---

## 📊 Monitoring & Logs

### **View Logs:**

1. Go to your app in DigitalOcean
2. Click **Runtime Logs**
3. See real-time output!

### **Console Output:**

```
🚀 IDWise Webhook Handler running on port 8080
📥 Received webhook event: Finished Journey
   Journey ID: abc123
   Reference: user-uid
✅ Updated user user-uid: verified
```

---

## 🔄 Updates & Deployments

### **Automatic Deployments:**

Every push to `main` branch triggers automatic deployment!

```bash
# Make changes to code
git add .
git commit -m "Update webhook handler"
git push origin main

# DigitalOcean automatically:
# 1. Pulls new code
# 2. Runs npm install
# 3. Restarts app
# 4. Zero downtime!
```

### **Manual Deployment:**

In DigitalOcean dashboard:

1. Click your app
2. Click **Deploy**
3. Select commit
4. Click **Deploy**

---

## 💰 Billing & Costs

### **What You Pay:**

**Basic Plan: $5/month** includes:

- 512 MB RAM
- 1 vCPU
- Unlimited bandwidth
- Unlimited requests
- Free SSL certificate
- Automatic deployments
- Zero egress fees

**Total: $5/month**

No matter how many webhooks you receive!

### **When to Upgrade:**

You won't need to. Even with 10,000 users:

- ~10,000 webhooks/month
- Each webhook takes <100ms
- Plenty of capacity on $5 plan

---

## 🔒 Security Setup

### **1. Custom Domain (Optional)**

```bash
# Add your domain in DigitalOcean
# Point DNS: CNAME → your-app.ondigitalocean.app
# Free SSL auto-configured
```

### **2. Environment Variables**

✅ Already secured (added in Step 4)

- Never commit secrets to git
- Use DigitalOcean's encrypted env vars

### **3. IP Whitelisting (Optional)**

If IDWise provides IP addresses:

```javascript
// Add to index.js
const ALLOWED_IPS = process.env.IDWISE_IPS?.split(",") || [];

app.use("/webhook", (req, res, next) => {
  const clientIP = req.ip;
  if (ALLOWED_IPS.length && !ALLOWED_IPS.includes(clientIP)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
});
```

---

## 🧪 Testing

### **Test Webhook:**

```bash
curl -X POST https://your-app.ondigitalocean.app/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "Finished Journey",
    "body": {
      "journeyId": "idwise-abc123",
      "referenceNo": "firebase-user-uid",
      "systemDecision": "Complete",
      "manualDecision": null,
      "finalDecision": "Complete"
    }
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "result": {
    "userId": "firebase-user-uid",
    "status": "verified"
  }
}
```

---

## 🆚 DigitalOcean vs Others

| Feature                | DigitalOcean | Cloud Run      | Firebase Functions |
| ---------------------- | ------------ | -------------- | ------------------ |
| **Monthly Cost**       | $5 fixed     | $0-10 variable | $0-5 variable      |
| **Usage Fees**         | None ✅      | Per request    | Per invocation     |
| **Billing Surprise**   | Never        | Possible       | Possible           |
| **Setup Difficulty**   | Easy         | Medium         | Easy               |
| **GitHub Integration** | Yes ✅       | Manual         | Manual             |
| **Auto Deploy**        | Yes ✅       | No             | No                 |
| **Logs**               | Built-in ✅  | GCloud CLI     | Firebase CLI       |
| **Custom Domain**      | Free ✅      | Extra setup    | Extra setup        |

**Winner: DigitalOcean** for predictable billing! 🏆

---

## 🔧 Troubleshooting

### **App won't start:**

- Check logs for errors
- Verify `package.json` has `"start": "node index.js"`
- Ensure PORT is set to 8080

### **Webhook returns 500:**

- Check Firebase credentials are correct
- Verify user exists in Firestore
- Check runtime logs for error details

### **Environment variables not working:**

- Redeploy after adding env vars
- Check spelling matches code exactly
- Use `process.env.VARIABLE_NAME` in code

---

## 📈 Scaling (Future)

### **When to Scale:**

Current $5 plan handles:

- Up to **50,000 webhooks/month**
- Up to **100,000 users**

If you exceed this (unlikely):

**Pro Plan: $12/month**

- 1 GB RAM
- 2 vCPUs
- Still no usage fees!

---

## 🎯 Quick Reference

### **URLs:**

- **App Dashboard:** https://cloud.digitalocean.com/apps
- **Webhook Endpoint:** `https://your-app.ondigitalocean.app/webhook`
- **Health Check:** `https://your-app.ondigitalocean.app/health`

### **Commands:**

```bash
# View logs
# (Use DigitalOcean dashboard - easier than CLI)

# Redeploy
git push origin main  # Auto-deploys

# Manual deploy
# (Use DigitalOcean dashboard)
```

---

## 🎉 Summary

### **Why DigitalOcean Wins:**

✅ **$5/month** - Fixed, predictable
✅ **No usage fees** - Unlimited webhooks
✅ **Auto-deploy** - Push to deploy
✅ **Simple setup** - 5 minutes
✅ **Great logs** - Built-in dashboard
✅ **Free SSL** - Automatic HTTPS
✅ **Zero surprise bills** - Sleep well!

**Perfect for webhook handlers.** 🎯

---

## 📚 Next Steps

1. [ ] Create DigitalOcean account
2. [ ] Push code to GitHub
3. [ ] Deploy app (5 minutes)
4. [ ] Copy webhook URL
5. [ ] Add to IDWise dashboard
6. [ ] Test with real verification
7. [ ] Done! 🎉

**Total time: ~15 minutes**
**Total cost: $5/month** (forever, no surprises!)
