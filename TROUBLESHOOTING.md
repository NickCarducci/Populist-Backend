# Troubleshooting Guide

## Common Issues and Solutions

### 1. "Cannot access '$i' before initialization" Error

**Cause**: This is a Vite HMR (Hot Module Replacement) issue that occurs when:
- New files are added to the project
- Module dependencies change
- Circular dependencies exist

**Solution**:
1. Stop the Vite dev server (Ctrl+C)
2. Clear the Vite cache:
   ```bash
   cd backend
   rm -rf node_modules/.vite
   ```
3. Restart the dev server:
   ```bash
   npm run dev
   ```

### 2. Firebase Import Errors

**Issue**: `Cannot find module './src/firebase'`

**Solution**: Ensure all Firebase imports use the centralized config:
```javascript
// ✅ Correct
import { auth, db } from "./src/firebase";

// ❌ Incorrect (old pattern)
import { getAuth } from "firebase/auth";
const auth = getAuth();
```

**Files using centralized Firebase**:
- `/backend/src/firebase.js` - Main config
- `/backend/App.jsx` - Uses auth, db
- `/backend/BillFeed.jsx` - Uses auth, db
- `/backend/UserAccount.jsx` - Uses observeCurrentUser (which uses auth internally)
- `/backend/AdminDashboard.jsx` - Uses auth
- `/backend/src/services/firestoreService.js` - Uses auth, db
- `/backend/src/services/diditService.js` - Uses auth

### 3. Verification Modal Not Showing

**Issue**: Clicking "Start Verification" doesn't show the modal

**Checklist**:
1. Check browser console for errors
2. Verify DiditVerificationView component is imported:
   ```javascript
   import DiditVerificationView from "./src/components/DiditVerificationView";
   ```
3. Check that backend API endpoints are running (port 3000)
4. Verify DIDIT_API_KEY is set in backend `.env`

**Test API endpoints**:
```bash
# Should return session data (requires auth token)
curl http://localhost:3000/api/didit/create-session \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"verificationType":"proof_of_address"}'
```

### 4. Vote Not Saving

**Issue**: Votes don't persist or update

**Checklist**:
1. User must be signed in (check `user` prop)
2. Firestore security rules must allow writes
3. Check browser console for errors
4. Verify `bill_votes` collection exists in Firestore

**Test vote manually in Firestore console**:
```
Collection: user_votes/{userId}/votes/{billId}
Document data:
{
  "vote": "support",
  "timestamp": [Firestore serverTimestamp]
}
```

### 5. Real-time Updates Not Working

**Issue**: Changes in one tab don't appear in another

**Checklist**:
1. Verify Firestore listeners are attached (check useEffect)
2. Check browser console for listener errors
3. Ensure cleanup function is called on unmount
4. Test with Firestore console (manual doc changes should appear)

**Debug real-time listeners**:
```javascript
// Add to BillFeed.jsx useEffect
console.log('Attached listener for bill_votes');

// Add to UserAccount.jsx useEffect
console.log('Attached listener for user data');
```

### 6. CORS Errors

**Issue**: API calls fail with CORS policy errors

**Solution**: Ensure backend CORS is configured:
```javascript
// backend/index.js should have:
app.use(cors({
  origin: 'http://localhost:5173', // Vite dev server
  credentials: true
}));
```

For production, update to your domain:
```javascript
origin: 'https://yourdomain.com'
```

### 7. Environment Variables Not Loading

**Issue**: `import.meta.env.VITE_API_URL` is undefined

**Checklist**:
1. Create `.env` file in `/backend` directory:
   ```
   VITE_API_URL=http://localhost:3000
   ```
2. Restart Vite dev server after creating .env
3. Environment variables must start with `VITE_` prefix
4. Never commit `.env` to git (add to `.gitignore`)

### 8. Build Errors

**Issue**: `npm run build` fails

**Common causes**:
1. **Unused imports**: Remove unused imports like the one we fixed in DiditVerificationView
2. **Missing dependencies**: Run `npm install`
3. **Type errors**: Check console for specific error messages

**Fix**:
```bash
cd backend
npm install
npm run build
```

## Development Workflow

### Starting Development
```bash
# Terminal 1: Start backend
cd backend
node index.js

# Terminal 2: Start Vite dev server
cd backend
npm run dev
```

### After Making Changes
1. **New file added**: Restart Vite dev server
2. **Import changed**: Save file, check for errors
3. **Firebase config changed**: Clear cache and restart
4. **Environment variable added**: Restart Vite dev server

### Testing Checklist
- [ ] Sign in with Apple works
- [ ] Bills load and display
- [ ] Voting works (support/oppose)
- [ ] Real-time updates work (open 2 tabs)
- [ ] User account page shows correct data
- [ ] Verification modal opens
- [ ] Admin dashboard accessible (for admin user)

## Performance Tips

### 1. Reduce Bundle Size
```bash
# Analyze bundle
npm run build
npx vite-bundle-visualizer
```

### 2. Optimize Firebase Queries
- Use `limit()` on all queries
- Add indexes for complex queries
- Use `onSnapshot` only when needed (prefer one-time reads)

### 3. Code Splitting
```javascript
// Lazy load heavy components
const DiditVerificationView = lazy(() =>
  import('./src/components/DiditVerificationView')
);

// Wrap in Suspense
<Suspense fallback={<div>Loading...</div>}>
  <DiditVerificationView />
</Suspense>
```

## Getting Help

1. **Check browser console** - Most errors show here
2. **Check backend logs** - Run backend with `DEBUG=* node index.js`
3. **Firebase console** - View data and security rule evaluations
4. **Network tab** - Check API request/response data

## Useful Commands

```bash
# Clear all caches
rm -rf node_modules/.vite .parcel-cache dist

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for outdated packages
npm outdated

# Update Firebase packages
npm update firebase @firebase/app-check

# View Firestore security rules evaluation
# Go to: Firebase Console > Firestore > Rules > Playground
```
