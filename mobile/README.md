# Travel Companion — Mobile (Expo)

Cross-platform iOS + Android app that reuses the web project's `/api/plan` backend.
The `App.js` in this folder is the whole UI; Expo provides the rest.

## Run it in development

**Prereqs:** Node 18+, the **Expo Go** app on your phone (App Store / Play Store).

1. **Scaffold an Expo project** (this pins compatible versions for you):
   ```bash
   cd "travel-companion"
   npx create-expo-app@latest mobile-app --template blank
   ```
2. **Drop in this UI:** copy `mobile/App.js` over `mobile-app/App.js`.
3. **Point it at your backend.** Open `App.js`, set `API_BASE` to your Mac's LAN IP so your phone can reach the Node server:
   ```bash
   ipconfig getifaddr en0      # e.g. 192.168.1.42
   ```
   → `const API_BASE = "http://192.168.1.42:3000";`
4. **Start both:**
   ```bash
   # terminal 1 — the backend (from travel-companion/)
   export ANTHROPIC_API_KEY=sk-ant-...
   node server.js

   # terminal 2 — the app
   cd mobile-app && npx expo start
   ```
   Scan the QR code with Expo Go. Same experience as the web app, on your phone. ✅

> Your phone and Mac must be on the same Wi-Fi. No Apple/Google account needed for this step.

---

## Shipping to the App Store & Play Store — the real roadmap

Publishing genuinely boosts PM credibility (you'll have navigated app review and shipped to real users). Here's the honest path, in order, with costs.

### Step 0 — Deploy the backend (required)
A store app can't depend on your laptop. Deploy the Node server so it has a stable **https** URL, then set `API_BASE` to it. Free/cheap options: **Render**, **Railway**, or **Fly.io** — set `ANTHROPIC_API_KEY` (and optional `GEOAPIFY_API_KEY`) as env vars there. *(~1 evening.)*

### Step 1 — Accounts (the money)
| Store | Cost | Notes |
|---|---|---|
| **Apple Developer Program** | **$99 / year** | Needed to publish to the App Store + TestFlight |
| **Google Play Console** | **$25 one-time** | Cheaper and faster to approve — good place to start |

**Recommendation: ship to Google Play first.** Lower cost, faster review — you get a live listing (the credibility win) sooner and with less friction, then add iOS.

### Step 2 — Build & submit with EAS
Expo's build service handles the native builds and store uploads:
```bash
npm install -g eas-cli
eas login
eas build --platform android      # (or ios)
eas submit --platform android
```

### Step 3 — Store listing requirements (plan for these)
- App **icon** + **splash screen**
- A **privacy policy URL** (required by both stores — even a simple hosted page)
- **Screenshots** for each device size
- Short + full **description**
- Content rating questionnaire

### Realistic timeline
Backend deploy (1 evening) → listing assets (1 evening) → first Play submission → review (hours–2 days for Google, ~1–3 days for Apple). Budget **a weekend** to your first live Android listing.

> Do Step 0 and a Play Store listing **before** paying Apple's $99 — get one store live, then decide if iOS is worth it for your goal.
