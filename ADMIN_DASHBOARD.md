# Admin Dashboard - App Attest Device Management

## Overview

The admin dashboard at **youinpolitics.com** provides a web interface to manage App Attest devices for the Populist app.

---

## 🔐 Authentication

### Email-Based Admin Access

The dashboard uses **Firebase Authentication** with email-based authorization.

**Authorized Admin:** `nmcarducci@gmail.com`

Only users signed in with this email address can access device management features.

### No ADMIN_SECRET Required

Unlike typical admin panels, this dashboard leverages your existing Firebase authentication:
- ✅ No separate admin password to remember
- ✅ No ADMIN_SECRET environment variable needed
- ✅ Firebase ID tokens provide cryptographic authentication
- ✅ Backend verifies both token validity AND email address

---

## 🚀 Accessing the Dashboard

### Step 1: Sign In with Apple

1. Visit **https://youinpolitics.com**
2. Click **"Sign in with Apple"**
3. Authenticate with your Apple ID associated with `nmcarducci@gmail.com`

### Step 2: Automatic Authorization

- If you're signed in as `nmcarducci@gmail.com`, you'll see the dashboard immediately
- If you're signed in as a different email, you'll see an "Unauthorized Access" message

---

## 📊 Dashboard Features

### View All Devices

The dashboard shows:
- **Device ID** (truncated for readability)
- **Platform** (iOS/Android)
- **Status** (Active/Revoked)
- **Issued Date** - When the device first requested a key
- **Last Seen** - When the device last requested a key
- **Request Count** - How many times this device requested a key
- **IP Address** - Last known IP (if available)
- **Revocation Reason** - Why the device was revoked (if applicable)

### Filter Devices

Three filter options:
- **All** - Show all devices (active + revoked)
- **Active** - Show only active devices
- **Revoked** - Show only revoked devices

### Revoke a Device

1. Find the device in the list
2. Click the **"Revoke"** button
3. Optionally enter a reason (e.g., "Suspected compromise", "User requested")
4. Click **"Confirm Revocation"**

**Effect**: The device will be immediately blocked from receiving API keys. On next app launch, the device will receive a `deviceRevoked` error.

### Refresh Data

Click the **🔄 Refresh** button to reload the device list from Firestore.

### Statistics

At the bottom, you'll see:
- **Total Devices** - All registered devices
- **Active** - Devices not revoked
- **Revoked** - Devices that have been banned

---

## 🔧 Technical Details

### API Endpoints Used

The dashboard calls these backend endpoints with Firebase ID tokens:

#### GET /admin/devices
```bash
# First, get your Firebase ID token (from browser console after signing in):
# const token = await firebase.auth().currentUser.getIdToken();

curl "https://youinpolitics.com/admin/devices?idToken=YOUR_FIREBASE_ID_TOKEN&revoked=false"
```

**Query Parameters:**
- `idToken` (required) - Firebase ID token from authenticated user
- `limit` (optional) - Max devices to return (default: 100)
- `revoked` (optional) - Filter by revoked status ("true" or "false")

**Backend Validation:**
1. Verifies Firebase ID token is valid
2. Checks that token email is `nmcarducci@gmail.com`
3. Returns devices only if both checks pass

**Response:**
```json
{
  "success": true,
  "count": 42,
  "devices": [
    {
      "deviceId": "abc123...",
      "platform": "ios",
      "issuedAt": "2025-12-14T10:30:00Z",
      "lastSeen": "2025-12-14T14:22:15Z",
      "requestCount": 3,
      "revoked": false,
      "ipAddress": "1.2.3.4"
    }
  ]
}
```

#### POST /admin/revoke-device
```bash
curl -X POST https://youinpolitics.com/admin/revoke-device \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "suspicious-device-id",
    "idToken": "YOUR_FIREBASE_ID_TOKEN",
    "reason": "Suspected compromise"
  }'
```

**Backend Validation:**
1. Verifies Firebase ID token is valid
2. Checks that token email is `nmcarducci@gmail.com`
3. Revokes device only if both checks pass
4. Logs revoking admin's email

**Response:**
```json
{
  "success": true,
  "message": "Device suspicious-device-id has been revoked",
  "deviceId": "suspicious-device-id",
  "reason": "Suspected compromise"
}
```

---

## 🛡️ Security Best Practices

### Firebase Authentication Security

1. **Email verification** - Backend checks exact email match (`nmcarducci@gmail.com`)
2. **Token validation** - Firebase ID tokens are cryptographically verified
3. **Time-limited tokens** - ID tokens expire after 1 hour (auto-refreshed by Firebase SDK)
4. **No shared secrets** - Each session gets unique token, no static ADMIN_SECRET to leak

### Monitoring

Check for suspicious activity:
- Devices with unusually high request counts
- Multiple devices from same IP
- Devices requesting keys too frequently (should be ~1 per device lifetime)

### Firestore Access

The dashboard queries the `device_api_keys` collection directly. Ensure:
- Firebase Security Rules protect this collection
- Only admin users can read/write
- Rate limiting is enabled on Firestore queries

---

## 🧪 Testing

### Test Revocation Flow

1. Register a test device (run iOS app on simulator/device)
2. Note the device ID in Firestore
3. Revoke the device in admin dashboard
4. Kill and relaunch the iOS app
5. Verify the app receives `deviceRevoked` error

### Verify Un-revocation

If you accidentally revoke a device:
1. Go to Firestore Console
2. Find `device_api_keys/{deviceId}`
3. Set `revoked: false`
4. Clear `revokedAt` and `revokedReason` fields
5. Device will work on next app launch

---

## 📱 Browser Compatibility

The dashboard works in all modern browsers:
- ✅ Safari (macOS/iOS)
- ✅ Chrome
- ✅ Firefox
- ✅ Edge

**Note**: The admin secret is stored in localStorage, which is browser-specific. You'll need to re-enter it on different browsers/devices.

---

## 🚨 Troubleshooting

### "Unauthorized Access" Screen
- You're signed in with an email other than `nmcarducci@gmail.com`
- Sign out and sign in with the authorized admin account

### "Unauthorized - admin access required" Error
- Your Firebase ID token is valid but email doesn't match
- Backend logs show which email attempted access
- Ensure you're using `nmcarducci@gmail.com`

### "Failed to fetch devices"
- Backend might be down - check Digital Ocean app status
- Firebase authentication not working - check Firebase console
- CORS issue - ensure backend allows requests from youinpolitics.com
- ID token expired - refresh the page to get new token

### Devices Not Showing Up
- Click "🔄 Refresh" to reload
- Check that devices have actually requested keys
- Verify Firestore `device_api_keys` collection exists

### Can't Sign In
- Ensure Apple Sign In is configured correctly
- Check that your Apple ID is authorized
- Verify Firebase authentication is working

---

## 🔄 Deployment Checklist

- [ ] Deploy updated backend with Firebase auth-based admin endpoints
- [ ] Ensure Firebase Admin SDK is initialized in backend
- [ ] Test signing in as `nmcarducci@gmail.com`
- [ ] Test unauthorized access (sign in with different email)
- [ ] Test device listing
- [ ] Test device revocation
- [ ] Verify revoked device is blocked from API access
- [ ] Check backend logs for admin activity tracking

---

## 💡 Tips

1. **Bookmark the dashboard** - Add youinpolitics.com to bookmarks for quick access
2. **Monitor daily** - Check for suspicious devices regularly
3. **Set up alerts** - Create Firestore triggers for unusual activity
4. **Document revocations** - Always enter a reason when revoking
5. **Keep logs** - Backend logs all revocation events to Firestore

---

## 📚 Related Documentation

- [PERPETUAL_KEYS_DEPLOYMENT.md](../PERPETUAL_KEYS_DEPLOYMENT.md) - Full deployment guide
- [PERPETUAL_KEY_ARCHITECTURE.md](../PERPETUAL_KEY_ARCHITECTURE.md) - Technical architecture
- [backend/index.js](index.js) - Admin endpoint implementation

---

## 🎯 Why Firebase Auth Instead of ADMIN_SECRET?

**You were absolutely right!** Using Firebase authentication is superior because:

1. **No redundancy** - Leverages existing App Attest and Firebase infrastructure
2. **Better security** - No shared static secret to leak or rotate
3. **Audit trail** - Backend logs which email performed each action (`revokedBy` field)
4. **Simpler setup** - No ADMIN_SECRET environment variable needed
5. **Time-limited tokens** - Firebase ID tokens expire automatically
6. **Email-based ACL** - Easy to add more admins by checking additional emails

**The only requirement:** Sign in with `nmcarducci@gmail.com` 🎉
