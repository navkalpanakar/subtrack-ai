# SubTrack AI — Production Deployment & Play Store Guide

## Priority 1: Environment Variables (CRITICAL — do this first)

### File: `.env` (create this file at the project root)

```env
# ─── Database ──────────────────────────────────────────────────
# Option A: SQLite (works for low traffic / single server)
DATABASE_URL="file:./db/custom.db"

# Option B: PostgreSQL (RECOMMENDED for production)
# Sign up at supabase.com (free tier) or neon.tech (free tier)
# DATABASE_URL="postgresql://user:pass@host:5432/subtrack?schema=public"

# ─── NextAuth ──────────────────────────────────────────────────
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-random-32-char-secret-here"
# Your public domain (NO trailing slash, NO localhost)
NEXTAUTH_URL="https://your-domain.com"

# ─── Google OAuth ──────────────────────────────────────────────
# 1. Go to console.cloud.google.com
# 2. Create project → APIs & Services → Credentials → Create OAuth client ID
# 3. Application type: Web application
# 4. Authorized redirect URI: https://your-domain.com/api/auth/callback/google
GOOGLE_CLIENT_ID="xxxxxxxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxx"

# ─── Microsoft OAuth (Azure AD) ────────────────────────────────
# 1. Go to portal.azure.com → Microsoft Entra ID → App registrations → New
# 2. Name: SubTrack AI, Account type: Any org + personal
# 3. Redirect URI (Web): https://your-domain.com/api/auth/callback/azure-ad
# 4. Certificates & secrets → New client secret → copy value
AZURE_AD_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
AZURE_AD_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
AZURE_AD_TENANT_ID="common"

# ─── Apple Sign In (requires $99/yr Apple Developer account) ───
# 1. developer.apple.com → Certificates, Identifiers & Profiles
# 2. Register a Services ID (for Sign in with Apple on web)
# 3. Configure return URL: https://your-domain.com/api/auth/callback/apple
# 4. Create a private key with "Sign in with Apple" enabled
# 5. Generate the client secret JWT (see NextAuth Apple docs)
APPLE_CLIENT_ID="com.subtrack.ai"
APPLE_CLIENT_SECRET="eyJxxxxxxxxxxxxx"

# ─── Email Sending (Resend — free 3,000/month) ────────────────
# 1. Sign up at resend.com (free, no credit card)
# 2. Create API key
# 3. For production: add your domain + verify DNS records
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
EMAIL_FROM="SubTrack AI <noreply@yourdomain.com>"
```

---

## Priority 2: Deploy the Web App

### Option A: Vercel (EASIEST — recommended)

1. Push your code to GitHub
2. Go to **vercel.com** → New Project → import your repo
3. Add ALL env vars from `.env` in the Vercel dashboard
4. Click **Deploy**
5. Your app is live at `https://your-project.vercel.app`
6. Add a custom domain: Settings → Domains → add `yourdomain.com`

### Option B: Any Node.js host (Railway, Render, DigitalOcean)

```bash
# On the server:
bun install
bun run build
bun run start   # serves the standalone build on port 3000
```

### Option C: Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json bun.lock ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Priority 3: Update OAuth Redirect URIs

After deploying, update the redirect URIs in each provider's console:

| Provider | Redirect URI to set |
|---|---|
| Google Cloud Console | `https://yourdomain.com/api/auth/callback/google` |
| Azure Portal | `https://yourdomain.com/api/auth/callback/azure-ad` |
| Apple Developer | `https://yourdomain.com/api/auth/callback/apple` |

---

## Priority 4: Wrap as Android App (TWA) for Play Store

### What is TWA?
Trusted Web Activity wraps your PWA into a native Android app. No code changes needed — it's just a container around your web URL.

### Step 1: Install Bubblewrap CLI
```bash
npm install -g @bubblewrap/cli
```

### Step 2: Initialize the TWA project
```bash
bubblewrap init --manifest https://yourdomain.com/manifest.webmanifest
```
- This generates an Android project from your PWA manifest
- It will ask for:
  - **Application name**: SubTrack AI
  - **Package name**: com.subtrack.ai (or your domain reversed)
  - **Signing key**: create a new keystore (save the password!)

### Step 3: Build the AAB (Android App Bundle)
```bash
bubblewrap build
```
- This generates `app-release-bundle.aab` — the file you upload to Play Store
- Takes ~5 minutes

### Step 4: Create Google Play Developer Account
1. Go to **play.google.com/console**
2. Pay the **$25 one-time registration fee**
3. Complete identity verification (1-48 hours for new accounts)

### Step 5: Create the App Listing
1. Play Console → **Create app**
2. App name: **SubTrack AI**
3. Default language: English
4. App type: **App**
5. Pricing: **Free**

### Step 6: Complete the Store Listing
Fill in ALL required sections in the Play Console:

**Main Store Listing:**
- App name: SubTrack AI — AI Subscription Tracker
- Short description: Track subscriptions, earn rewards, save money with Savvy AI
- Full description: (copy from your app's metadata description)
- App icon: 512x512 PNG (use your `icon-512.svg` converted to PNG)
- Feature graphic: 1024x500 PNG (create a banner with the Savvy mascot)
- Phone screenshots: 2-8 screenshots (take from the preview panel)
- App category: Finance
- Tags: subscription tracker, budget, savings, AI

**Privacy Policy:**
- Create a privacy policy page at `yourdomain.com/privacy` (required by Google)
- Include: what data you collect (email, subscriptions, location), how you use it, third-party services (Resend, Google OAuth)

**Content Rating:**
- Fill the IARC questionnaire → everyone (no mature content)

**Target Audience:**
- 18+ (financial app)

**Data Safety:**
- Declares: email, payment info (if you add billing), app activity
- Encryption: yes (HTTPS)

### Step 7: Upload the AAB
1. Play Console → **Production** → **Create release**
2. Upload `app-release-bundle.aab`
3. Add release notes: "Initial release of SubTrack AI"
4. Click **Review release** → **Start rollout**

### Step 8: Wait for Review
- Google reviews first submissions in **1-7 days**
- You'll get an email when it's approved/published
- Check the Play Console for any policy violations

---

## Priority 5: Files to Review/Change for Production

### Files that need your attention:

| File | What to change | Priority |
|---|---|---|
| `.env` | Add all env vars (see Priority 1) | 🔴 Critical |
| `src/lib/email.ts` | Already done — uses Resend when API key is set | ✅ Done |
| `src/app/api/scan/gmail/route.ts` | Replace preview data with real Gmail API (OAuth scope: `gmail.readonly`) | 🟡 Medium |
| `src/app/api/scan/outlook/route.ts` | Replace preview data with real Microsoft Graph API (scope: `Mail.Read`) | 🟡 Medium |
| `src/app/api/scan/apple/route.ts` | Replace preview data with real iCloud Mail API (very restricted) | 🟡 Medium |
| `src/lib/auth.ts` | Remove `seedDemoSubscriptions` call from the demo-login if you don't want demo data in production | 🟢 Low |
| `public/manifest.webmanifest` | Update `start_url` to your domain | 🟢 Low |
| `public/icons/` | Generate PNG versions of icons (some Android devices don't support SVG) | 🟡 Medium |

### What's already production-ready (no changes needed):
- ✅ Email OTP (Resend) — works when `RESEND_API_KEY` is set
- ✅ Google/Microsoft/Apple OAuth — works when env vars are set
- ✅ AI features (LLM, VLM, ASR, web search) — work via z-ai-web-dev-sdk
- ✅ Price verification — web searches real prices
- ✅ AI Insights — uses live web prices + user profile
- ✅ Gamification — points, levels, spin wheel, scratch cards, leaderboard
- ✅ Currency detection — geolocation + country picker
- ✅ PWA manifest + icons — installable on Android
- ✅ Token-based auth — works in iframes and cross-origin

---

## Priority 6: Generate PNG Icons (for Play Store)

SVG icons work for PWA but Play Store requires PNG. Run this:

```bash
# Install sharp (already in dependencies)
# Convert SVG to PNG:
node -e "
const sharp = require('sharp');
const fs = require('fs');
const svg = fs.readFileSync('public/icons/icon-512.svg');
sharp(svg).resize(512, 512).png().toFile('public/icons/icon-512.png');
sharp(svg).resize(192, 192).png().toFile('public/icons/icon-192.png');
console.log('PNG icons generated');
"
```

---

## Priority 7: Privacy Policy + Terms of Service

Google Play REQUIRES a privacy policy URL. Create a simple page:

### File: `src/app/privacy/page.tsx`
Create a basic privacy policy covering:
- Data collected: email, subscriptions, location (country/city), usage data
- Third-party services: Google OAuth, Microsoft OAuth, Apple Sign In, Resend (email), z-ai (AI features)
- Data storage: encrypted at rest, HTTPS in transit
- User rights: delete account (available in Profile → Delete account)
- Contact: your email

### File: `src/app/terms/page.tsx`
Basic terms of service covering:
- Service description
- User responsibilities
- Limitation of liability
- Subscription (the app is free, no in-app purchases currently)

---

## Quick Checklist (print this)

```
☐ 1. Create .env with all variables
☐ 2. Deploy to Vercel (or your host)
☐ 3. Update OAuth redirect URIs to production domain
☐ 4. Test email OTP (real email via Resend)
☐ 5. Test Google/Microsoft/Apple sign-in
☐ 6. Generate PNG icons
☐ 7. Create privacy policy page
☐ 8. Install Bubblewrap CLI
☐ 9. Run `bubblewrap init` with your manifest URL
☐ 10. Run `bubblewrap build` → get AAB file
☐ 11. Create Google Play Developer account ($25)
☐ 12. Complete identity verification
☐ 13. Create app listing in Play Console
☐ 14. Upload AAB
☐ 15. Fill all store listing sections
☐ 16. Submit for review
☐ 17. Wait 1-7 days for approval
☐ 18. 🎉 Published on Play Store!
```

---

## Timeline Estimate

| Step | Time |
|---|---|
| Create .env + deploy | 30 min |
| Get OAuth credentials | 30 min |
| Get Resend API key | 5 min |
| Test everything works | 30 min |
| Generate icons + privacy policy | 30 min |
| Bubblewrap TWA setup + build | 30 min |
| Play Console listing | 1 hour |
| Google review (waiting) | 1-7 days |
| **Total active work** | **~4 hours** |
| **Total with review wait** | **1-8 days** |

---

## What I've Already Removed (fake/preview data)

- ❌ Removed: `/api/auth/oauth-preview` (fake OAuth user creation)
- ❌ Removed: `/api/auth/email-login` (passwordless, no OTP)
- ❌ Removed: `/api/auth/phone-send` + `phone-verify` (mock SMS OTP)
- ❌ Removed: `signInOAuthPreview` from auth hooks
- ✅ Kept: `/api/auth/demo-login` (uses real localized prices per currency)
- ✅ Kept: `/api/auth/email-send` + `email-verify` (real Resend email OTP)
- ✅ Kept: `/api/scan/gmail|outlook|apple` (need real API wiring — see Priority 5)

## What Still Uses "Preview" Data (and how to fix)

### Gmail/Outlook/Apple inbox scan routes
These return hardcoded demo subscriptions. To make them real:

**Gmail** (`src/app/api/scan/gmail/route.ts`):
1. Add `gmail.readonly` scope to the Google OAuth provider in `src/lib/auth.ts`
2. Use the Google Gmail API to fetch billing emails
3. Parse them with the existing `parseEmailForSubscriptions()` function

**Outlook** (`src/app/api/scan/outlook/route.ts`):
1. Add `Mail.Read` scope to the Azure AD provider
2. Use Microsoft Graph API to fetch emails
3. Parse with `parseEmailForSubscriptions()`

**Apple** (`src/app/api/scan/apple/route.ts`):
1. Apple's iCloud Mail API is very restricted — you may need to keep this as a manual paste-email flow
2. The existing "paste an email" tab in Quick Add already works

These are medium priority — the app works fully without them (users can add subscriptions manually or via AI quick-add).
