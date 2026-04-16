# Bio-Hacked

AI-powered fitness coaching platform. Next.js 14 + PostgreSQL + Prisma + Anthropic Claude + PayFast.

## Quick start

```bash
# 1. Install deps (already done)
npm install

# 2. Database (assumes local Postgres running on 5432)
npx prisma generate
npx prisma db push
node prisma/seed.js

# 3. Dev server
npm run dev
```

Visit http://localhost:3000

## Demo accounts (all password `password123`)

| Role     | Email                       | Notes                               |
|----------|-----------------------------|-------------------------------------|
| Coach    | coach@biohacked.co.za       | Manages Sarah, James, Marcus        |
| Educator | educator@biohacked.co.za    | Verified, has 4 seed videos         |
| Client   | sarah@example.com           | Female, CUT, cycle tracking enabled |
| Client   | james@example.com           | Male, BUILD                         |
| Client   | marcus@example.com          | Free tier (upgrade flow available)  |

## Environment

`.env` must contain:

```
DATABASE_URL="postgresql://<user>@localhost:5432/biohacked?schema=public"
JWT_SECRET="..."
ANTHROPIC_API_KEY="sk-ant-..."
PAYFAST_MERCHANT_ID="..."
PAYFAST_MERCHANT_KEY="..."
PAYFAST_PASSPHRASE="..."
NEXT_PUBLIC_URL="http://localhost:3000"
```

## Feature map

### Client portal (`sarah@example.com`)
- **Home** — daily macro rings, 6-tile action grid
- **Daily check-in** — two styles:
  - **Detailed** — weight, calories, protein, hydration, caffeine, cravings/appetite, digestion, steps, cardio, training status/rating, sleep, energy, stress, soreness, supplements checklist, progress photos (front/side/back/training/posing), body measurements (arms/shoulders/back/waist/hips/glutes/quads), coach notes
  - **Lifestyle** — 8 open-ended weekly prompts (Training, Recovery, Diet, Steps, Hydration, Events, Biggest Win, From Your Coach)
- **Training** — per-set logging against assigned program OR freeform session logging with per-set reps/weight/RPE
- **Meal plan** — shows current plan, AI meal swap per meal (if coach allows), swap timestamps, inline per-meal editing when plan is hybrid/manual mode
- **Recipe AI** — 3 generation modes:
  - **Macro** — hit exact calorie/macro targets
  - **Craving** — Movie Night / Date Night / Quick Prep / Post-Workout presets with prep-time budgets
  - **Meal plan** — full-day multi-meal generation
- **Progress** — weight trend chart, energy/sleep/stress bar chart, body measurements with deltas, **menstrual cycle tracker** with phase detection and phase-specific training tips (females only)
- **Booking marketplace** — sports massage, posing coaches, biokineticists, physios across Cape Town; list + map view; direct booking
- **Education library** — verified educator videos with credentials badges, research papers with AI summaries (premium), AI topic analyser
- **Community** — moderated forum with post/reply/like
- **Settings** — profile, macro targets, cycle tracking, educator/coach credentials

### Coach portal (`coach@biohacked.co.za`)
- **Clients tab** — grid of clients with pending check-in indicator
- **Inbox tab** — pending check-ins across all clients
- **Per-client drill-down** (5 tabs):
  - **Overview** — macros, weight chart, measurements, **meal-swap permission toggle**
  - **Check-ins** — weekly summary table + detailed cards with feedback action
  - **Program builder** — create/edit/deactivate weekly training programs with 7-day builder (focus + exercises with sets/reps/weight/notes); active program display
  - **Meal plan** — generate AI meal plans for this client
  - **Notes** — private coaching timeline (add/delete)
- Add new clients by email

### Educator portal (`educator@biohacked.co.za`)
- Dashboard stats (videos / approved / total views)
- Upload new video (title, description, URL, category, duration)
- Auto-approval if verified; pending review otherwise
- My videos list with delete

## Tech stack

- **Frontend**: Next.js 14 App Router, React 18, recharts, lucide-react
- **Styling**: inline CSS-in-JS with shared `C` color tokens and `ui.js` component library
- **Backend**: Next.js API routes, Prisma ORM, PostgreSQL
- **Auth**: JWT in httpOnly cookie, bcrypt password hashing
- **AI**: Anthropic Claude Sonnet 4 via `@anthropic-ai/sdk`
- **Payments**: PayFast (ZAR subscriptions)
- **File uploads**: local `/public/uploads/` dev-grade endpoint (swap for S3/R2/Supabase Storage in prod)

## Key API endpoints

| Endpoint                                     | Description                                      |
|---------------------------------------------|--------------------------------------------------|
| `POST   /api/auth`                          | `action=register|login|logout`                   |
| `GET    /api/auth`                          | Current user                                     |
| `PATCH  /api/auth`                          | Update profile (macros, cycle, credentials)      |
| `POST   /api/uploads`                       | Multipart image upload → `{ url }`               |
| `POST   /api/checkins`                      | Submit check-in (detailed or lifestyle)          |
| `POST   /api/checkins` action=feedback      | Coach feedback on check-in                       |
| `GET    /api/checkins?clientId=`            | Coach reads client's check-ins                   |
| `POST   /api/training`                      | Log session                                      |
| `POST   /api/training?action=program`       | Coach create/update program                      |
| `DELETE /api/training?programId=`           | Coach deactivate program                         |
| `POST   /api/meal-plans`                    | Generate plan (mode=ai\|hybrid\|manual)          |
| `POST   /api/meal-plans` action=swap        | AI-swap a single meal                            |
| `POST   /api/meal-plans` action=update_meal | Manual edit a meal                               |
| `POST   /api/recipes`                       | Generate recipe (mode=macro\|craving\|mealplan)  |
| `GET    /api/clients`                       | Coach's client list                              |
| `POST   /api/clients` action=update_permissions | Toggle `allowMealSwap` per client             |
| `POST   /api/notes`                         | Add coaching note                                |
| `GET    /api/notes?clientId=`               | Notes timeline                                   |
| `GET    /api/bookings`                      | Providers list (or `?mine=1` for user bookings)  |
| `POST   /api/bookings`                      | Create booking                                   |
| `GET    /api/education`                     | Videos (or `?type=papers`, `?mine=1`)            |
| `POST   /api/education` action=upload_video | Educator uploads video                           |
| `POST   /api/education` action=analyse      | AI research topic breakdown (premium)            |
| `POST   /api/forum`                         | Create post                                      |
| `POST   /api/payments`                      | Initiate PayFast checkout                        |

## Production checklist

- [ ] Move file uploads from `/public/uploads/` to object storage
- [ ] Enable Vercel / Railway deployment
- [ ] Connect real PayFast credentials (ITN webhook already at `/api/payments/itn`)
- [ ] Add email verification (send via Resend)
- [ ] CDN thumbnails for educator videos
- [ ] Replace placeholder community posts with fresh seed
- [ ] Rate-limit upload endpoint
