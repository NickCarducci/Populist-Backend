# React Frontend Integration - Summary

## Overview
Successfully integrated Didit identity verification and updated Firestore service layer to match iOS frontend patterns.

## Files Created

### 1. `/backend/src/services/diditService.js`
**Purpose**: Didit API client for React frontend

**Key Functions**:
- `createVerificationSession(verificationType, metadata)` - Creates new verification session
- `getVerificationStatus(sessionId)` - Fetches current status
- `pollVerificationStatus(sessionId, onUpdate, intervalMs, maxAttempts)` - Polls until completion

**Features**:
- Automatic Firebase Auth token inclusion
- 3-second polling interval
- Error handling and retry logic
- Configurable timeout (default: 3 minutes)

### 2. `/backend/src/services/firestoreService.js`
**Purpose**: Centralized Firestore operations matching iOS service layer

**Key Functions**:

#### User Operations
- `getCurrentUser()` - Get current user data
- `updateCurrentUser(data)` - Update user fields
- `observeCurrentUser(callback)` - Real-time user updates

#### Organization Operations
- `getOrganizations(limit)` - Fetch all organizations
- `getOrganization(orgId)` - Get specific org
- `joinOrganization(orgId)` - Join with membership tracking
- `leaveOrganization(orgId)` - Leave with cleanup

#### Chat Operations
- `getMessages(orgId, limit)` - Fetch chat messages
- `sendMessage(orgId, content, type)` - Send message
- `observeMessages(orgId, callback)` - Real-time chat updates

#### Forum Operations
- `getForumPosts(limit)` - Fetch posts
- `createForumPost(content, billId, orgId)` - Create post
- `likeForumPost(postId)` - Like post
- `unlikeForumPost(postId)` - Unlike post

#### Event Operations
- `getUpcomingEvents(limit)` - Fetch upcoming events
- `attendEvent(eventId)` - Mark attendance
- `unattendEvent(eventId)` - Remove attendance

#### Vote Operations
- `getVoteStats(billId)` - Get vote statistics with percentages
- `getUserVote(billId)` - Get user's vote ('support' or 'oppose')
- `voteBill(billId, vote)` - Submit vote with automatic previous vote handling

**Pattern Consistency**:
- Matches iOS VoteService.swift structure
- Uses `/user_votes/{userId}/votes/` subcollection (private)
- Uses `/bill_votes/{billId}` collection (public stats)
- Automatic support/oppose count management

### 3. `/backend/src/components/DiditVerificationView.jsx`
**Purpose**: Full-screen verification modal component

**Features**:
- Loading state with spinner animation
- Error state with retry button
- Success state with completion message
- Full-screen iframe for Didit web SDK
- Automatic status polling (3-second interval)
- Real-time webhook updates via Firestore listener
- Cancel button with cleanup

**States**:
1. `initializing` - Creating session
2. `ready` - Showing Didit iframe
3. `verified` - Success (auto-closes after 2s)
4. `failed` - Error with retry option

**Props**:
- `verificationType` - 'proof_of_address', 'id_verification', or 'face_match'
- `onComplete(success)` - Callback when verification completes
- `onCancel()` - Callback when user cancels

## Files Updated

### 1. `/backend/BillFeed.jsx`
**Changes**:
- Replaced direct Firestore imports with `firestoreService` functions
- Updated to use `bill_votes` collection (matches iOS)
- Updated to use private `/user_votes/{userId}/votes/` subcollection
- Improved vote handling with optimistic updates
- Added error handling with rollback
- Uses `totalVotes` field from VoteStats
- Real-time listeners for vote statistics

**Before**:
```javascript
// Used bill_stats collection
const statsQuery = query(
  collection(db, "bill_stats"),
  where(documentId(), "in", billIds)
);

// Used votes collection with compound key
const voteRef = doc(db, "votes", `${user.uid}_${billId}`);
```

**After**:
```javascript
// Uses bill_votes collection (matches iOS)
const statsQuery = query(
  collection(db, "bill_votes"),
  where("__name__", "in", billIds)
);

// Uses firestoreService with private subcollection
await voteBill(billId, voteType);
const vote = await getUserVote(billId);
```

### 2. `/backend/UserAccount.jsx`
**Changes**:
- Added Didit verification status display
- Real-time status updates via `observeCurrentUser`
- "Start Verification" button for unverified users
- Status badges: ✅ Verified, ⏳ Pending, ⚠️ Failed
- Retry button for failed verifications
- Shows verification date when verified
- Full-screen verification modal integration

**Verification States**:
1. **Not Verified** - Blue "Start Verification" button
2. **Verifying** - Yellow badge "⏳ Verification in progress..."
3. **Verified** - Green badge "✅ Verified" with date
4. **Failed** - Red badge "⚠️ Verification failed" with retry button

**Status Detection**:
- Checks both `digitVerificationStatus` (Didit) and `journeyStatus` (IDWise legacy)
- Real-time updates from Firestore webhook

## Integration Flow

### Verification Flow:
1. User clicks "Start Verification" in UserAccount
2. `DiditVerificationView` component renders (full-screen)
3. Component calls `createVerificationSession()` API
4. Backend creates Didit session and returns URL
5. User completes verification in iframe
6. Component polls `getVerificationStatus()` every 3 seconds
7. Didit sends webhook to backend when complete
8. Backend updates user record in Firestore
9. `observeCurrentUser` listener fires in React
10. UI updates to show verified status
11. Modal auto-closes after 2 seconds

### Vote Flow:
1. User clicks vote button (support/oppose)
2. Optimistic UI update (instant feedback)
3. `voteBill()` checks for existing vote
4. If exists, removes old vote counts
5. Saves new vote to private subcollection
6. Updates public vote statistics
7. Real-time listener updates UI
8. On error, reverts optimistic update

## Architecture Patterns

### Service Layer Pattern
- All Firestore operations centralized in `firestoreService.js`
- Matches iOS service architecture (UserService, VoteService, etc.)
- Consistent error handling across all operations
- Firebase Auth integration built-in

### Real-time Updates
- Uses Firestore `onSnapshot` listeners
- Automatic UI updates when data changes
- Cleanup functions in useEffect returns
- Optimistic updates with rollback on error

### Authentication
- All API calls include Firebase ID token
- Automatic token refresh handled by Firebase SDK
- User checks before sensitive operations
- Backend verifies token on all endpoints

## Testing Checklist

### Didit Verification
- [ ] Click "Start Verification" button
- [ ] Verify session creation succeeds
- [ ] Complete verification in iframe
- [ ] Check webhook updates user record
- [ ] Verify status polling detects completion
- [ ] Check real-time UI update to verified state
- [ ] Test cancel button cleanup
- [ ] Test retry after failure

### Voting
- [ ] Vote on bill (support)
- [ ] Verify optimistic update
- [ ] Check Firestore update succeeded
- [ ] Switch vote to oppose
- [ ] Verify counts update correctly
- [ ] Click same vote to toggle off
- [ ] Test error handling with network disconnect

### Real-time Features
- [ ] Open app in two browser tabs
- [ ] Vote in one tab
- [ ] Verify other tab updates instantly
- [ ] Send chat message in org
- [ ] Verify message appears in real-time
- [ ] Complete verification
- [ ] Check status updates across tabs

## Environment Variables

Required in `.env`:
```
VITE_API_URL=http://localhost:3000
```

Backend requires:
```
DIDIT_API_KEY=your_api_key_here
DIDIT_WEBHOOK_SECRET=your_webhook_secret_here
```

## Future Enhancements

### PermissionKit Integration
- Add age range detection in React
- Implement batch permission requests
- Show pending approval UI for minors
- Integrate with Messages app for parent approval

### Enhanced Features
- Offline support with local caching
- Push notifications for verification status
- Multi-language support
- Accessibility improvements (ARIA labels)
- Loading skeleton screens
- Error boundary components

## Notes

- BillFeed now uses `bill_votes` collection (not `bill_stats`)
- Vote subcollections are private per-user (security rules enforce)
- All timestamps use Firestore `serverTimestamp()`
- Mock data retained with `isSample` flag for empty feeds
- Real-time listeners properly cleaned up on unmount
- Optimistic updates improve perceived performance
