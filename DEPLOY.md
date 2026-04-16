# Deploying Bio-Hacked to Vercel + Supabase

This guide gets you from local dev to a live production URL in ~45 minutes.

## Prerequisites

- GitHub account (for Vercel to pull from)
- Vercel account (using your `arcticengines-projects` org)
- Supabase account
- Anthropic API key (production, not dev)
- PayFast live credentials (or keep sandbox for now)

---

## Step 1 — Create Supabase project (5 min)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**
2. Name: `biohacked-prod`
3. Database Password: generate a strong one — **save it**
4. Region: **Cape Town (af-south-1)** — closest to your users
5. Plan: Free tier is fine to start

Wait ~2 minutes for it to provision.

## Step 2 — Grab the connection strings

In your Supabase project dashboard:

1. **Settings → Database**
2. Scroll to **Connection string** section
3. Copy two strings:
   - **Session pooler** (looks like `postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-af-south-1.pooler.supabase.com:5432/postgres`) → this becomes `DATABASE_URL`
   - **Direct connection** (looks like `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`) → this becomes `DIRECT_DATABASE_URL`
4. Replace `[YOUR-PASSWORD]` in both with the password you set in step 1

Test from your terminal:

```bash
cd /Users/rigard/Desktop/biohacked
npm install

# Push the schema to Supabase (uses direct URL)
DIRECT_DATABASE_URL="<your-direct-url>" \
DATABASE_URL="<your-pooled-url>" \
npx prisma db push

# Seed it (demo accounts + sample data)
DIRECT_DATABASE_URL="<your-direct-url>" \
DATABASE_URL="<your-pooled-url>" \
node prisma/seed.js
```

You should see the seed confirmation message. Verify in Supabase **Table Editor** that you see `User`, `Checkin`, `MealPlan`, etc. tables populated.

## Step 3 — Configure Supabase Storage (3 min)

1. In the Supabase dashboard → **Storage** → **New bucket**
2. Name: `uploads`
3. **Public bucket**: ✅ ON (so photo URLs can be shared with coaches)
4. File size limit: `8 MB`
5. Allowed MIME types: `image/png, image/jpeg, image/webp, image/gif`
6. Click **Save**

Then set the bucket policy (still under Storage → uploads → Policies):

Supabase pre-generates policies. For a public bucket with authenticated uploads, the ones you want are:
- **SELECT**: public
- **INSERT**: enabled for authenticated service-role (we use the service key from the server)

If it's easier, just toggle **Public bucket** and let all users read it — since we hand-construct the path with userId prefix, there's no way for users to enumerate each other's files unless you share the URL.

## Step 4 — Grab the service role key

1. Supabase dashboard → **Settings → API**
2. Copy:
   - **Project URL** (e.g. `https://abcxyz.supabase.co`) → this is `SUPABASE_URL`
   - **service_role secret** (⚠️ NOT the anon key — use the `service_role` one) → this is `SUPABASE_SERVICE_ROLE_KEY`

Treat the service role key like a password. It bypasses Row Level Security, so it **only goes on the server**, never in client code.

## Step 5 — Push code to GitHub

If you haven't already:

```bash
cd /Users/rigard/Desktop/biohacked

# First time only
git init
git add .
git commit -m "Bio-Hacked production-ready"

# Create the repo on github.com/ArcticEng (via web UI), then:
git remote add origin git@github.com:ArcticEng/biohacked.git
git branch -M main
git push -u origin main
```

Confirm `.env` and `.env.local` are in `.gitignore` (they are) — your secrets should never be in git.

## Step 6 — Deploy to Vercel (10 min)

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → pick `ArcticEng/biohacked`
3. **Framework Preset**: Next.js (auto-detected)
4. **Root Directory**: `./` (default)
5. Build Command: `npm run build` (the package.json already includes `prisma generate && next build`)
6. Install Command: leave default (`npm install` → runs `postinstall` → which runs `prisma generate`)

Before clicking Deploy, click **Environment Variables** and add:

| Key                           | Value                                                    |
|-------------------------------|----------------------------------------------------------|
| `DATABASE_URL`                | Supabase **session pooler** URL                          |
| `DIRECT_DATABASE_URL`         | Supabase **direct** URL                                  |
| `JWT_SECRET`                  | run `openssl rand -hex 32` and paste the result          |
| `JWT_EXPIRES_IN`              | `7d`                                                     |
| `ANTHROPIC_API_KEY`           | your prod Claude key (`sk-ant-api03-...`)                |
| `PAYFAST_MERCHANT_ID`         | from PayFast dashboard                                   |
| `PAYFAST_MERCHANT_KEY`        | from PayFast dashboard                                   |
| `PAYFAST_PASSPHRASE`          | from PayFast dashboard                                   |
| `PAYFAST_MODE`                | `sandbox` for now, switch to `live` when ready           |
| `NEXT_PUBLIC_APP_URL`         | leave blank for now — you'll fill it after first deploy  |
| `STORAGE_PROVIDER`            | `supabase`                                               |
| `SUPABASE_URL`                | your project URL                                         |
| `SUPABASE_SERVICE_ROLE_KEY`   | the **service_role** secret                              |
| `SUPABASE_BUCKET`             | `uploads`                                                |

Click **Deploy**. Vercel will build in ~2 minutes.

## Step 7 — Set the public URL (2 min)

After the first successful deploy, Vercel gives you a URL like `biohacked-xxx.vercel.app`.

1. Back in Vercel project settings → **Environment Variables**
2. Edit `NEXT_PUBLIC_APP_URL` → set to `https://biohacked-xxx.vercel.app`
3. Trigger a redeploy (Deployments tab → latest → ⋯ → Redeploy)

## Step 8 — Custom domain (optional, 5 min)

If you've got a domain ready:

1. Vercel project → **Settings → Domains**
2. Add `bio-hacked.co.za` (or whatever)
3. Vercel shows you DNS records to add
4. Add the records at your registrar (Afrihost, Cool Ideas, etc.)
5. Wait for SSL cert (~5 min auto-issued)
6. Update `NEXT_PUBLIC_APP_URL` env var → trigger one more redeploy

## Step 9 — Smoke test

Visit your live URL and:

1. ✅ Click a demo account (should log you in)
2. ✅ Submit a detailed check-in with a photo — verify the photo uploads (Supabase Storage dashboard should show it in `uploads/users/<userId>/`)
3. ✅ Generate a recipe — AI call should work
4. ✅ Log out, log back in — cookie persists
5. ✅ As coach, view a client's check-in photos

## Step 10 — PayFast ITN webhook

1. Log into your PayFast merchant dashboard
2. **Settings → Integration** → Notify URL: `https://YOUR-DOMAIN/api/payments/itn`
3. PayFast will POST order confirmations to this endpoint when a subscriber pays

---

## Going to production checklist

- [ ] Switch `PAYFAST_MODE` from `sandbox` to `live`
- [ ] Use a real `JWT_SECRET` (not the dev placeholder)
- [ ] Tighten CORS — it already locks to `NEXT_PUBLIC_APP_URL` in prod (see `next.config.js`)
- [ ] Decide whether to keep demo accounts — remove `prisma/seed.js` demo data or gate it behind `NODE_ENV !== "production"`
- [ ] Enable Vercel Analytics (free) for traffic insight
- [ ] Enable Supabase database backups (Settings → Database → Backups)
- [ ] Add a `/privacy` and `/terms` page (POPIA requires this for ZA users)
- [ ] Point monitoring at the `/api/auth` endpoint (Uptime Kuma or BetterStack free tier)

## Common deploy issues

**Prisma OpenSSL error during build**
The schema has `binaryTargets = ["native", "rhel-openssl-3.0.x"]` — this is the fix. Already done.

**"Prepared statement doesn't exist" at runtime**
Means `DATABASE_URL` is pointing at the direct connection, not the pooler. Swap it to the session pooler URL. `DIRECT_DATABASE_URL` is only for migrations.

**"Too many connections" on Supabase free tier**
Means `DATABASE_URL` should have `?pgbouncer=true&connection_limit=1` appended. With the session pooler that's already configured upstream, but you can still add it as a safety net.

**Photos upload but 404 when rendering**
Check that the Supabase bucket is **Public**. If you need it private, you'd switch from `getPublicUrl` to `createSignedUrl` in `src/lib/storage.js`.

**Login returns 200 but you're redirected back to /login**
This was a separate bug (login page now uses `useAuth().login()` instead of raw fetch). Already fixed.

---

## Rolling back

If something breaks in prod:

1. Vercel dashboard → **Deployments** → find the last known good deploy
2. Click `⋯` → **Promote to Production**

Takes ~10 seconds to roll back.

For database changes that go wrong:

1. Supabase → **Database → Backups** → restore latest backup (Pro plan has automatic daily; free needs manual)
2. Or roll back the Prisma migration if you're using `prisma migrate` (recommended for prod over `db push`)

---

## Cost at scale

At your likely early-stage usage:

| Service         | Free tier covers                         | Paid trigger                 |
|-----------------|------------------------------------------|------------------------------|
| Vercel Hobby    | 100 GB bandwidth, 100k req/day           | $20/mo Pro                   |
| Supabase Free   | 500 MB DB, 1 GB storage, 2 GB bandwidth  | $25/mo Pro                   |
| Anthropic       | Pay-per-token                            | ~$3/M input tokens (Sonnet)  |
| PayFast         | 3.5% + R2.00 per transaction             | —                            |

You'll likely stay on free tiers for the first ~100 active users. After that, combined cost is ~$50/mo.
