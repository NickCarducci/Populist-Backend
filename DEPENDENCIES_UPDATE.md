# Backend Dependencies Update

## New Dependency Required

Add the `cbor` package for App Attest attestation object decoding:

```bash
npm install cbor
```

## Updated package.json

Add to your `dependencies` section:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "firebase-admin": "^11.10.1",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^6.10.0",
    "apple-signin-auth": "^1.7.5",
    "dotenv": "^16.3.1",
    "cbor": "^9.0.0"  // ← NEW
  }
}
```

## What is CBOR?

**CBOR** (Concise Binary Object Representation) is a binary data format used by Apple for App Attest attestation objects. It's more compact than JSON and is the format Apple uses for cryptographic attestations.

## Installation

```bash
cd backend
npm install cbor
npm audit fix  # Fix any vulnerabilities
```

## Verification

Check that it's installed:

```bash
npm list cbor
```

Should output:
```
backend@1.0.0 /path/to/backend
└── cbor@9.0.0
```

## Alternative: Auto-install

If using Digital Ocean App Platform, it will automatically install dependencies from `package.json` when you push updates.

Just make sure `cbor` is listed in `dependencies` (not `devDependencies`).
