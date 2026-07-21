# 🧭 TripMelo

**One home for your whole trip — so you stop the scavenger hunt across apps, emails and PDFs, and travel to your own melody.**

A PM portfolio project: from a [locked product brief](Trip-PRD.docx) (working title *Calm Trip*) to a working, installable product. Live app in [`app/`](app/).

---

## The problem

Independent travellers plan their own trips, then spend the trip juggling three quiet anxieties — each in a separate app:

| Anxiety | The worry |
|---|---|
| 💸 Money | "Am I overspending?" — counting cash, Googling the rate at the till |
| 🌧 Logistics | "Will it rain on my outdoor plans?" |
| 🛂 Where is it?! | "Where's my hotel address at immigration? My booking code?" |

## The product

**An execution companion, not a planner.** It runs the trip you already researched — it doesn't research for you (that ritual is the fun part; AI auto-planning is explicitly out of scope).

**The itinerary is the spine — money and weather hang off it.** Each place you capture carries a cost (which feeds your budget) and an indoor/outdoor flag (which feeds a weather-risk check against the hourly forecast):

> *"Your 15:00 temple is outdoors in a 70% rain window — and costs ~150k IDR, leaving 400k for the day."*

No other app holds all three. TripIt and Wanderlog organise trips; Google Maps routes them; none are **money-aware about your day**. That's the wedge.

## MVP — five features, each sharpened to its moment

Plus, since v0.2: **multi-stop trips** (each stop has its own dates, currency, weather and hotel — the app follows the country you're in) and **any-currency money** (log ¥1,200 in Tokyo; every total lands in your home currency).

- **Instant converter** — the till moment. Rate cached, converts as you type, works offline.
- **Expense log** — per-day and running trip totals against your daily budget, in both currencies.
- **Itinerary** — capture places by day, each with cost + indoor/outdoor.
- **Weather by time** — hourly forecast; outdoor places get a rain-risk badge for their exact hour.
- **Stay card** — hotel + address + booking note, as a full-screen card readable at the immigration desk.

## Key product decisions

1. **Execution, not planning** — hold what the traveller found, don't replace the finding.
2. **Itinerary as the spine** — one connected day, not three widgets.
3. **The moment is the feature** — converter at the till, stay card at immigration.
4. **Store locally first** — no accounts, no backend; localStorage until sync is genuinely needed.
5. **Text is cheap, files are expensive** — a stay-card text field now beats a PDF vault later.

Decision 4 has an architectural consequence: with no AI and no server, every data source (Open-Meteo weather + geocoding, open.er-api FX) is keyless and called straight from the client. The whole product is a **static, installable PWA** — free to host, works offline, and can be wrapped with Capacitor for App Store / Play Store listings later with no rewrite.

## Run it

```bash
cd app
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in app/dist
```

No API keys, no environment variables — the core app is fully local.

## Cloud backup (optional, Phase B1)

Local-first stays: localStorage is the source of truth and the app works
with no account. Setting two env vars adds passwordless sign-in (email
magic link via Supabase) and an automatic cloud copy of the trip:

1. Create a free project at supabase.com.
2. SQL Editor → paste and run [`supabase/schema.sql`](supabase/schema.sql)
   (a `trips` table with row-level security — users can only reach their own row).
3. Authentication → URL Configuration → set Site URL to your deployed URL.
4. Project Settings → API → copy the URL + anon key into
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (locally in `app/.env`,
   and in Vercel → Project → Settings → Environment Variables), then redeploy.

Without the vars, every cloud surface stays hidden. Phase B2 (planned):
shared trips — invite a partner, log spends into the same trip.

## Deploy (free)

The build output is static. Either:
- **Netlify / Vercel**: connect the repo, set base directory `app`, build `npm run build`, output `dist` — or just drag-and-drop `app/dist` onto Netlify.
- **GitHub Pages**: publish `app/dist`.

On a phone, "Add to Home Screen" installs it as an app (offline-capable, full-screen).

## Success metric

**% of trip-days the app is opened** on a real trip. Secondary: expenses logged per day. If it isn't reached for daily, it failed — no vanity metrics.

## Roadmap

See **[ROADMAP.md](ROADMAP.md)** for the full phased plan. In short:

- **Now (shipped):** the five MVP features, plus multi-stop trips, any-currency money, and backup file.
- **B1 — accounts + cloud save:** passwordless sign-in (Supabase magic link) syncing the trip across devices. Client code is built; needs keys (see "Cloud backup" above).
- **B2 — "join spend":** invite a partner into a shared trip with a live, per-person expense list.
- **Later:** packing checklist · arrival info · budget-aware getting-around · native store listings via Capacitor.

---

*TripMelo (PRD working title: Calm Trip) · Product Brief v0.1 · a PM portfolio project. The earlier AI-planner prototype this repo started as lives in `server.js` / `lib/` and is superseded by this product.*
