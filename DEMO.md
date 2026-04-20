# Client Demo Walkthrough

Recommended click-path so every screen feels alive. ~8 minutes total.

## Before the call

```bash
# Seed the production DB (only once)
DIRECT_DATABASE_URL="<supabase-direct>" \
DATABASE_URL="<supabase-pooled>" \
node prisma/seed.js
```

Open the live URL on your laptop. Incognito window so no cached logins.

## 1. Open in Sarah's client account (3 min)

Click **Sarah Mitchell** demo button on the login screen.

**Home screen** — show the 4 macro rings animating to target, 6-tile action grid.
> "This is what a client sees every day. Their daily targets at a glance."

**Tap Progress (📊)** — shows weight trend, energy/sleep/stress bars, body measurements with +/- deltas.
> "Weekly check-ins flow into this automatically. Coaches see the same thing from their side."

Scroll down to the **🌙 Menstrual cycle tracker**.
> "For female clients, we detect the phase automatically and suggest phase-specific training intensity. Sarah's in follicular right now — strongest phase, prioritise compound lifts."

**Tap Home → Daily check-in (✅)**. Show the two styles.
> "Daily detailed for prep phases, weekly lifestyle for off-season."

Pick Detailed → scroll through — show photo tiles, supplement pills, sliders, measurements.
> "Everything her coach needs, 90 seconds to fill in. Photos upload direct to cloud storage."

Back out (don't submit).

**Tap Meal Plan (📋)** — pre-built 5-meal AI plan is there.
> "Claude generated this based on her 1800/150P/180C/60F targets. She can swap any meal with AI — but only because her coach enabled that permission."

Tap **🔄 AI Swap** on one meal if the Anthropic key is set up.

**Tap Recipes (🔍)** — 3-mode selector.
> "Three generation modes: exact macros, craving-based, or full meal plan."

Pick **Craving → Movie Night**, set budget, generate if AI is wired up. Otherwise show the 3 saved recipes in the Saved tab.

**Tap Book (📍)** — marketplace of Cape Town providers with map + list toggle.
> "She can book a posing coach, sports massage, biokineticist — direct from the app. Bio-Hacked takes a small commission."

Switch tab to **My bookings** — shows the pre-seeded Emma Clarke booking for Tuesday.

**Tap Learn (📚)** — verified educator videos with credentials badges.
> "Educator-uploaded content. Premium users get AI research summaries — here's one for creatine."

Tap the creatine paper → show the pre-generated AI breakdown.

## 2. Logout, switch to Coach (3 min)

Settings → Log out → demo button **Coach Alex**.

**Coach home** — 3 clients listed. Sarah has a green pending-checkin dot.

**Tap Sarah** → coach portal opens on Overview.
> "This is what the coach sees — macros, weight trend, body measurements, delta from last week."

Scroll to **Permissions** toggle.
> "This is where the coach gates AI meal swaps per client."

**Tap Check-ins tab** — weekly summary table + detail cards.
> "Every check-in Sarah submits shows up here. One-click to write feedback."

**Tap Program tab** — her Physique Shred program is there.
> "The coach built this. Seven days, exercises, sets, reps. Sarah sees it in her Training page with a per-set logger."

Tap **Edit program** → show the builder UI briefly. Cancel.

**Tap Notes tab** — 4 dated timeline entries.
> "Private notes only the coach sees. Helps track what worked week by week."

## 3. Logout, switch to Educator (1 min)

Demo button **Dr. Lauren**.

Land on the **Educator Dashboard** — stats at the top (4 videos, all approved, 23k total views).

Tap **+ Upload video** → show the upload modal.
> "Verified educators get auto-approval. Unverified ones go through review."

Cancel. Scroll through the video list.
> "Educator-authored content — credentials badge shows on every video in the main library."

## 4. Theme toggle (15 sec)

Any page → tap the sun/moon button in the top right → watch the whole app swap to light mode.
> "Full light and dark themes, remembers the preference."

## 5. Community forum (30 sec — optional)

Home → Forum (💬) → show the 4 seeded posts with real replies and likes.
> "Moderated community space. Swearing is auto-filtered. Coaches, educators, and clients can all post."

---

## Talking points throughout

- **"Real-time AI"** — recipe generation and meal swaps are live Claude calls. Each costs a fraction of a cent.
- **"Built for Cape Town"** — ZAR pricing, af-south-1 Supabase region, PayFast integration, local service providers seeded.
- **"Mobile-first"** — designed for a phone in the gym, not a desktop. Works on any size screen.
- **"Full three-sided marketplace"** — clients, coaches, educators all have distinct portals. Booking adds a fourth revenue stream on top of subscriptions.

## If the client asks about...

**"What happens when someone registers for real?"**
> They can pick Client, Coach, or Educator. Clients default to free tier with 3 recipes/week. Premium unlocks unlimited recipes + meal plans. Coaches pay a higher tier for client management. PayFast handles ZAR billing.

**"Can clients without coaches still use it?"**
> Yes — the AI acts as their coach. Meal plans, recipes, training log, check-ins for themselves. Adding a coach just unlocks the human feedback layer.

**"How do educators get verified?"**
> Manual for now — they submit credentials, we review. Scales later with a formal application flow.

**"Can I see my own data after signing up?"**
> Settings → Profile has all the editable fields. Data's yours, exports can be added easily.
