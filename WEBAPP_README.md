# Populist Web App - youinpolitics.com

## Overview

The web app at **youinpolitics.com** provides three main features:

1. **📜 Bills** - Read-only legislative feed (public, no auth required)
2. **👤 Account** - User profile and settings (requires sign-in)
3. **🔐 Admin** - Device management dashboard (only for nmcarducci@gmail.com)

---

## 🌐 Public Bill Feed

### Features

- **Read-only preview** of current legislation
- Beautiful, responsive card layout
- Bill metadata display:
  - Bill number (HR/S)
  - Chamber (House/Senate)
  - Status (In Committee, Floor Vote, Passed, Enacted)
  - Sponsor information
  - Introduction date
  - Summary
  - Engagement stats (votes, comments)

### Current Implementation

Uses **mock data** for now. In the future, this will connect to:
- Your backend `/api/bills` endpoint
- Same Congress.gov data as mobile app
- Real-time legislative updates

### Design

- Dark theme matching youinpolitics.com aesthetic
- Hover effects on bill cards
- Color-coded chambers (blue for House, red for Senate)
- Status badges with dynamic colors
- Mobile-responsive layout

---

## 👤 User Account

### Features

- **Cross-platform sync** - Works on iOS, Android, and web
- **Vote history** - Your votes and comments sync across devices
- **Personalized feed** - Track bills and representatives (coming soon)
- **Privacy first** - Your votes are private, we never share your data

### Account Info Display

- Email address
- User ID (Firebase UID)
- Admin badge (if you're nmcarducci@gmail.com)

### Coming Soon

- Download voting history
- Export comments and engagement data
- Privacy settings and data controls
- Custom bill notifications

---

## 🔐 Admin Dashboard

### Features

- **Firebase auth-based** access control
- Only `nmcarducci@gmail.com` can access
- View all registered App Attest devices
- Filter devices (All/Active/Revoked)
- Revoke compromised devices
- Real-time statistics

See [ADMIN_DASHBOARD.md](ADMIN_DASHBOARD.md) for full documentation.

---

## 🎨 Navigation

The app features **dynamic tab-based navigation**:

### When Not Signed In
```
┌──────────────────────────────┐
│     You In Politics          │
│  Populist Legislative Feed   │
├──────────────────────────────┤
│  📜 Bills  │  Sign In        │
├──────────────────────────────┤
│                              │
│   [Bills Feed - Public]      │
│                              │
└──────────────────────────────┘
```

### When Signed In (Regular User)
```
┌──────────────────────────────┐
│     You In Politics          │
│         Your Account         │
├──────────────────────────────┤
│  📜 Bills  │  👤 Account     │
├──────────────────────────────┤
│                              │
│   [Account Dashboard]        │
│                              │
└──────────────────────────────┘
```

### When Signed In (Admin - nmcarducci@gmail.com)
```
┌──────────────────────────────────────┐
│        You In Politics               │
│       Admin Dashboard                │
├──────────────────────────────────────┤
│  📜 Bills  │  👤 Account │  🔐 Admin │
├──────────────────────────────────────┤
│                                      │
│   [Admin Device Management]          │
│                                      │
└──────────────────────────────────────┘
```

**Dynamic Tab Visibility:**
- **📜 Bills** - Always visible (no auth required)
- **👤 Account** - Only visible when signed in
- **🔐 Admin** - Only visible for nmcarducci@gmail.com
- **Sign In** button - Replaces tabs when not authenticated

---

## 📁 File Structure

```
backend/
├── App.jsx              # Main app with dynamic tab navigation
├── BillFeed.jsx         # Read-only legislative feed (public)
├── UserAccount.jsx      # User account dashboard
├── AdminDashboard.jsx   # Device management UI (admin only)
├── main.jsx             # React entry point
├── index.html           # HTML template
└── index.js             # Express backend
```

---

## 🚀 Development

### Running Locally

```bash
cd backend
npm install
npm run dev  # Starts Vite dev server
```

Visit: http://localhost:5173

### Building for Production

```bash
npm run build
```

Outputs to `dist/` directory.

---

## 🔮 Future Features

### Phase 1: Real Data Integration

- [ ] Connect BillFeed to backend API
- [ ] Fetch real bills from Congress.gov
- [ ] Add pagination/infinite scroll
- [ ] Add search and filtering

### Phase 2: User Accounts

- [ ] User sign-up with Apple/Google
- [ ] User profiles
- [ ] Personalized bill tracking

### Phase 3: Engagement Features

- [ ] Vote on bills (thumbs up/down)
- [ ] Comment on legislation
- [ ] Share bills on social media
- [ ] Email representatives

### Phase 4: Advanced Features

- [ ] Bill notifications
- [ ] Custom alerts (keywords, sponsors, topics)
- [ ] Representative contact info
- [ ] Voting record comparisons
- [ ] AI-powered bill summaries

---

## 🎯 Design Philosophy

### Consistency with Mobile App

The web app shares design language with the iOS app:
- Same color scheme
- Similar typography
- Matching UI patterns
- Unified data models

### Differences from Mobile

| Feature | Mobile App | Web App |
|---------|-----------|---------|
| **Authentication** | App Attest | Firebase Auth |
| **Engagement** | Full (vote/comment) | Read-only (for now) |
| **Notifications** | Push notifications | Email (future) |
| **Data sync** | iCloud | Firebase |
| **Target users** | iOS users | All users |

---

## 🛠️ Technical Stack

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **Firebase Auth** - Authentication
- Inline styling (matching admin dashboard)

### Backend
- **Express.js** - API server
- **Firebase Admin SDK** - Auth verification
- **Firestore** - Database
- **Congress.gov API** - Legislative data

---

## 📊 Data Flow

### Bill Feed (Future)
```
Congress.gov API
    ↓
Backend (/api/bills)
    ↓
Web App (BillFeed.jsx)
    ↓
User sees bills
```

### Admin Dashboard
```
User signs in with Apple
    ↓
Firebase ID token
    ↓
Backend verifies token + email
    ↓
Returns device list from Firestore
    ↓
Admin can revoke devices
```

---

## 🚨 Important Notes

### Mock Data

The bill feed currently uses **hardcoded mock data** in `BillFeed.jsx`. This is intentional for now:

1. **No backend endpoint yet** - `/api/bills` doesn't exist
2. **Congress API rate limits** - Don't want to hit the API unnecessarily
3. **Rapid iteration** - Easier to test UI changes

**When ready to connect real data:**
1. Create `/api/bills` endpoint in `index.js`
2. Add Congress.gov API integration
3. Update `BillFeed.jsx` to fetch from backend
4. Add caching layer (Redis/Firestore)

### Public Access

The bill feed is **intentionally public**:
- No authentication required
- Good for SEO
- Drives traffic to the full app
- Showcases Populist's value proposition

### Mobile-First Design

While responsive, the web app is optimized for **desktop viewing**:
- Wider max-width for bill cards
- More generous padding
- Side-by-side layouts

Mobile users should be directed to download the iOS app.

---

## 📱 Relationship to Mobile App

This web app is a **companion** to the Populist iOS app:

- **Same backend** - Shares API endpoints and database
- **Same data** - Bills, user votes, comments (future)
- **Different UX** - Optimized for browser vs native iOS
- **Cross-platform** - Web reaches non-iOS users

Think of it as:
- **Mobile app** = Full-featured, interactive, notifications
- **Web app** = Discovery, reading, admin tools

---

## 🔐 Security

### Bill Feed
- Public, no auth required
- Read-only, no mutations
- No sensitive data exposed

### Admin Dashboard
- Firebase ID token authentication
- Email-based authorization
- Backend validates all requests
- Audit trail in Firestore

See [ADMIN_DASHBOARD.md](ADMIN_DASHBOARD.md) for security details.

---

## 🎨 Styling Philosophy

### Why Inline Styles?

The web app uses **inline styles** instead of CSS files:

**Pros:**
- ✅ Component-scoped (no CSS conflicts)
- ✅ Dynamic styling with JS logic
- ✅ Faster initial development
- ✅ Matches admin dashboard pattern
- ✅ No build-time CSS processing

**Cons:**
- ❌ More verbose
- ❌ No CSS caching
- ❌ Harder to maintain at scale

**Future:** Consider moving to styled-components or CSS modules if the app grows significantly.

---

## 📈 Metrics to Track

When live, monitor:
- **Page views** - Total visitors
- **Time on page** - Engagement with bills
- **Click-through rate** - Bill cards → full details
- **Admin usage** - Device revocations
- **Bounce rate** - Users leaving immediately

---

## 🚀 Deployment

### Current Hosting
Digital Ocean App Platform serves:
- Backend API (Express)
- Frontend static files (React build)

### Environment Variables
```env
# Backend only, no new vars needed for web app
CONGRESS_API_KEY=...
CONGRESS_API_ENCRYPTION_KEY=...
FIREBASE_SERVICE_ACCOUNT=...
```

### Build Process
```bash
# Build frontend
cd backend
npm run build

# Digital Ocean automatically serves dist/ as static files
```

---

## 💡 Tips for Future Development

1. **Keep it simple** - Web app is a preview, not a replacement for mobile
2. **Mobile-first content** - Drive users to download iOS app
3. **SEO optimize** - Bills should be crawlable by search engines
4. **Fast loading** - Optimize images, lazy load components
5. **Analytics** - Track user behavior to inform mobile app features

---

## 📚 Related Documentation

- [ADMIN_DASHBOARD.md](ADMIN_DASHBOARD.md) - Admin features
- [PERPETUAL_KEYS_DEPLOYMENT.md](../PERPETUAL_KEYS_DEPLOYMENT.md) - API key system
- [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md) - Overall architecture

---

**🌐 Visit: https://youinpolitics.com**
