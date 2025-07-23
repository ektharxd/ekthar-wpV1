# 🔐 Google Authentication Setup Guide

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "New Project"
3. Name it "Beesoft Authentication"
4. Click "Create"

## Step 2: Enable Google+ API

1. In your project, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Name it "Beesoft Desktop App"
5. Add these to "Authorized JavaScript origins":
   - `http://localhost`
   - `http://localhost:3000`
   - `file://`
6. Add these to "Authorized redirect URIs":
   - `http://localhost/oauth/callback`
   - `http://localhost:3000/oauth/callback`
7. Click "Create"
8. **Copy the Client ID** - you'll need this!

## Step 4: Update Your App

Replace `YOUR_GOOGLE_CLIENT_ID` in index.html with your actual Client ID:

```javascript
const GOOGLE_CLIENT_ID = "your-actual-client-id-here.apps.googleusercontent.com";
```

## Step 5: Test Authentication

1. Run `npm start`
2. Click "Login with Google"
3. Complete the OAuth flow
4. You should be authenticated!

## 🆓 Free Tier Limits

- **Google OAuth**: Completely free
- **API Calls**: 100,000 requests/day (free)
- **Users**: Unlimited

## 🔧 Advanced Setup (Optional)

For a more robust system, you can add:
- Firebase for user management
- Cloud Firestore for trial tracking
- Cloud Functions for admin operations

All of these have generous free tiers!