# TripMelo — Roadmap

*One home for your whole trip. This document covers what's shipped and the phased plan for what's next. Working title in the PRD: Calm Trip.*

Status legend: ✅ shipped · 🔜 next · 🔭 later · ❌ deliberately out of scope

---

## Where we are today (v0.2, shipped & live)

Live at **https://tripmelo.vercel.app** · installable PWA (Add to Home Screen on iOS/Android) · local-first, no backend, no API keys, works offline.

| Feature | Moment it serves | State |
|---|---|---|
| Instant converter | at the till | ✅ |
| Expense log — any currency, totalled in home money | after every spend | ✅ |
| Itinerary (cost + indoor/outdoor per place) | planning the day | ✅ |
| Weather: 24h strip + 48h in-app sheet, night-aware, rain-risk badges | before heading out | ✅ |
| Stay card (full-screen, offline) | at immigration | ✅ |
| Multi-stop trips (per-stop dates, currency, weather, hotel) | landing in a new country | ✅ |
| Backup file (export / import JSON) | new phone, safety net | ✅ |
| Cloud backup scaffolding (Supabase, magic-link) | — | ⚙️ built, dormant until keys are set |

**Architectural through-line:** the whole trip is one JSON object in `localStorage`. Every phase below either syncs that object or splits pieces out of it — nothing gets rebuilt.

---

## Phase B1 — Accounts + cloud save

**Goal:** a trip survives a lost phone or a cleared browser, and follows the traveller across devices.

**Why now:** the success metric is "opened daily on a real trip." The single event that kills that is losing a week of expense logs. Backup file (shipped) covers the deliberate case; cloud save covers the accidental one.

**Effort:** ~2–3 days. The client code already exists (`app/src/cloud.js`, the account card in onboarding, `supabase/schema.sql`); B1 is mostly configuration + testing.

**Approach**
- **Supabase**, not a hand-built server. Postgres + auth + row-level security on a free tier, called straight from the client. Vercel keeps serving static files; there is still no server to maintain.
- **Passwordless magic-link sign-in** (+ optional Google). No password is ever created, stored, or leaked. Never build our own email+password system.
- **One `trips` row per user**, holding the same JSON we already save. Cloud save is a sync of an existing object, not a schema rewrite.
- **Local-first stays.** `localStorage` remains the source of truth; the app works signed-out and offline. Push on change (debounced), pull-if-newer on open. Last-write-wins is fine while a trip has one owner.
- **No login wall.** Onboarding stays account-free; "Sign in to back up" is an *offer* in Trip settings. A traveller at the airport must never hit a login screen before the converter.

**To turn it on** (see README → "Cloud backup"): create a Supabase project, run `supabase/schema.sql`, set Site URL, paste `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` into Vercel env vars, redeploy.

**Done when:** a user signs in on their phone, adds a spend, signs in on a laptop, and sees the same trip.

---

## Phase B2 — "Join spend": shared trips 🔜

**Goal:** a partner joins the same trip and logs into a shared expense list; both see live totals and who paid what.

**Why:** this is the PRD's "shared log with partner" roadmap item, and the natural reason the lazy single-blob model finally splits.

**Effort:** ~3–5 days (depends on B1).

**Approach**
- **Invite by link/code.** Owner taps Invite → shares a link → the other person signs in and lands in the same trip. New table: `trip_members (trip_id, user_id, role)`.
- **Expenses become their own table** (`trip_id, author_id, amount, currency, category, note, date`) instead of living inside the JSON. Reason: expenses are **append-only per person** — if you log ramen while your partner logs a taxi, two rows coexist with no conflict to resolve. Trip settings (stops, budget) stay in the blob with last-write-wins.
- **Realtime totals** via Supabase subscriptions; each expense shows who logged it.
- **Access enforced in the database** (row-level security: you can only read trips you're a member of), not in app code — that's what keeps a client-only app safe.

**Done when:** two people on two phones see each other's spends update live in one trip, with a "who paid what" view.

**Natural follow-on:** settle-up ("you owe me ¥3,000") falls straight out of the per-author expense table.

---

## Phase B3 — The unglamorous adult things 🔭

Once real users have accounts and emails on file:

- **Privacy policy + one-tap account & data deletion** — legally required in many regions the moment you store an email. Non-negotiable before promoting the app.
- **Data export of everything a user has** (GDPR-style) — cheap, reuses the backup export.
- **Metric upgrade:** measure "% of trip-days opened" across real users instead of guessing.
- **Error monitoring** (e.g. Sentry free tier) so a broken deploy is visible, not silent.

---

## Later / opportunistic 🔭

From the PRD roadmap and things noticed while building:

- **Packing checklist** — Med value / Low effort; the PRD's designated "Next."
- **Arrival info** (flight no., seat, booking code — text) — same slot.
- **"Find nearby"** in the itinerary — returns only when it earns its place.
- **Getting-around, budget-aware** — the PRD's v2 idea ("this taxi = 30% of today"), not generic routing (Google Maps owns that).
- **Native store listings via Capacitor** — wraps the *existing* PWA for App Store / Play Store with no rewrite. Costs: Apple $99/yr, Google $25 once. Only worth it if "download my app" is a goal the portfolio needs.

---

## Deliberately out of scope ❌

Kept here because saying no is part of the product story:

- **AI auto-planning the itinerary** — the research ritual is the fun part; we hold what you found, we don't replace the finding.
- **Transit routing** — Google Maps owns it. Returns in v2 only as *budget-aware*.
- **Document / PDF / photo vault** — heavy (binary storage, permissions); TripIt/Wanderlog already do it. Text is cheap, files are expensive: the stay card and text arrival info cover the real moments.

---

## What never changes across all phases

The PWA, the Vercel deployment, the keyless weather/FX APIs, offline-first behaviour, and the Capacitor path to app stores. **The backend is an addition, never a migration.** That's the portfolio thesis in one line: *launched with zero backend by design, and added one only when a user-visible job — sync, then sharing — demanded it.*
