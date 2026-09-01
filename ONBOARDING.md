# ONBOARDING — Clone & Set Up Guide

This guide walks you through getting this **Patient Reactivation System** running from a clean
copy, end to end. Follow it top to bottom. It is written so a new developer (or a client-side
dev) can go from `git clone` to a live, working dashboard.

> **Time estimate:** ~20 minutes of hands-on work once you have the credentials ready.

---

## Before you start — what you need

You need three pieces of "plumbing" configured before anything will run. Have these ready:

| # | Service | What it's for | What you need from it |
|---|---------|---------------|------------------------|
| 1 | **InsForge** (Postgres BaaS) | The database | Project **base URL** + an **API key** |
| 2 | **Resend** (email) | Sending emails | SMTP host, user, **API key** |
| 3 | **Vercel** (optional, for production) | Hosting | A Vercel account |

For **local development** you only need #1 and #2. Skip Vercel until you're ready to deploy.

---

## Step 1 — Clone the repository

```bash
git clone https://github.com/comfortokonfriday15-web/clearsmile-patient-reactivation.git
cd clearsmile-patient-reactivation
```

> **Private repo:** you must have access to the GitHub repo. If you were invited as a
> collaborator, accept the invite first.

---

## Step 2 — Install dependencies

```bash
npm install
```

This installs the frontend build (Vite/React), the serverless-function tooling, and the
InsForge SDK.

---

## Step 3 — Create your environment file

The project ships a safe template called `.env.example`. Copy it to your local file:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env.local

# macOS / Linux
cp .env.example .env.local
```

`.env.local` is **git-ignored**, so your real keys will never be committed. This is where all
your credentials live.

---

## Step 4 — Set up InsForge (the database)

1. Sign in at [InsForge](https://insforge.dev) and create a project (or use your existing one).
2. From the project dashboard, copy:
   - **Base URL** — looks like `https://<your-project>.us-east.insforge.app`
   - **API key** — looks like `ik_...`
3. Open `.env.local` and fill in:

   ```
   INSFORGE_URL=https://<your-project>.us-east.insforge.app
   INSFORGE_API_KEY=ik_your_api_key_here
   ```

### Apply the database schema

The tables are defined in `migrations/20260901000000_create-tables.sql`. Apply them to your
InsForge project using the InsForge CLI:

```bash
# install helper
npm i -D @insforge/cli

# link this project to your InsForge project (you'll be prompted / use --project)
npx @insforge/cli login
npx @insforge/cli link --project <your-project-id>
npx @insforge/cli db migrations up --all
```

> If you're not using the InsForge CLI, you can run the SQL in the migration file directly
> against your Postgres instance. The five tables created are:
> `patient`, `appointment`, `followup`, `emaillog`, `staffhandoff`.

---

## Step 5 — Set up Resend (email)

Email is sent through Resend's SMTP. You need an account and an API key.

1. Sign in at [Resend](https://resend.com) and get an API key (`re_...`).
2. Open `.env.local` and fill in:

   ```
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=465
   SMTP_USER=resend
   SMTP_PASS=re_your_api_key_here
   EMAIL_FROM=onboarding@resend.dev
   ```

> **Testing tip:** Resend's free `onboarding@resend.dev` sender only delivers to a verified
> address on your account. For local tests, point `recipient email` at your own inbox. Once you
> add a verified **domain** in Resend, swap `EMAIL_FROM` to something like
> `no-reply@yourclinic.com` and it can send to anyone.

### Keep the safety guard ON

By default the app **will not actually send email** unless you tell it to:

```
EMAIL_LIVE=true    # set to true only when you're ready to really send
```

With `EMAIL_LIVE` unset or `false`, every email is logged as "would send" but never
transmitted, and each run is capped per recipient (`MAX_EMAILS_PER_RUN`). Leave it off while
you verify the UI, and only flip it on for live campaigns.

---

## Step 6 — Check the other settings (optional but recommended)

These control trigger timing, clinic identity, and booking hours. They all already have
sensible defaults:

```
CLINIC_NAME="ClearSmile Dental"        # shown in emails + dashboard
OVERDUE_MONTHS=6                        # flag patients with no visit in 6+ months
SUPPRESSION_DAYS=90                     # don't re-contact within 90 days of a message
FOLLOWUP_DAYS="0,7,14"                  # follow-up on day 0, then 7, then 14
BUSINESS_HOURS_START=8                  # booking slot window: Mon–Fri
BUSINESS_HOURS_END=18
SATURDAY_HOURS_START=9
SATURDAY_HOURS_END=16
BOOKING_URL_BASE=http://localhost:3000/book   # set to your live URL when deployed
```

---

## Step 7 — Run it locally

```bash
npm run dev
```

Open **http://localhost:3000** — you'll see the landing page with links to:

- **Book Appointment** → `/book` (self-serve booking)
- **Admin Dashboard** → `/admin` (the operations view)

The booking page is real: pick a slot, submit, and it writes a patient + appointment to the
database and (when email is live) sends a confirmation.

---

## Step 8 — Seed demo data (so the dashboard looks alive)

The dashboard looks best, and is easiest to demo, with realistic data. There's a seed endpoint
behind a flag:

1. In `.env.local`, set `SEED_ENABLED=true`.
2. Call the seed from a terminal:

   ```bash
   curl -X POST http://localhost:3000/api/admin/seed-demo
   ```

3. Reload `/admin` — you should see a full funnel: overdue / contacted / responded / booked /
   suppressed counts, a priority follow-up list, and recent email activity.
4. Set `SEED_ENABLED=false` again when you're done so it isn't publicly open.

---

## Step 9 — Deploy to production (Vercel)

1. Push your repo to GitHub, then import it in [Vercel](https://vercel.com) (New Project →
   select this repo). Vercel auto-detects the build.
2. In the project settings → **Environment Variables**, add **the same keys** you put in
   `.env.local` (for Production). Don't commit keys to the repo.
3. Vercel builds the React app and exposes `/api/*` as serverless functions automatically.
4. For the booking links in emails to point at your live site, set:

   ```
   BOOKING_URL_BASE=https://<your-app>.vercel.app/book
   ```

5. Deploy. Visit `<your-app>.vercel.app/admin` to confirm the dashboard loads.

### Setting up scheduled jobs (optional)

The four automation jobs (`scan-overdue`, `process-followups`, `send-reminders`,
`handle-no-shows`) run through `POST /api/cron/run?type=...`. Set a `CRON_SECRET` env var and
call the endpoint from Vercel Cron (or any scheduler) with an `x-cron-secret` header. Example
crons:

| Job                 | When it should run       |
| ------------------- | ------------------------ |
| `scan-overdue`      | daily                     |
| `process-followups` | hourly (during the day)   |
| `send-reminders`    | every morning             |
| `handle-no-shows`   | after appointment windows |

---

## Common issues & fixes

| Symptom                              | Likely cause                                       | Fix                                                |
| ------------------------------------ | -------------------------------------------------- | -------------------------------------------------- |
| Blank white dashboard at `/admin`    | Stale browser cache of an old bundle               | Hard refresh (`Ctrl/Cmd+Shift+R`) or incognito      |
| "Unauthorized" on cron               | `CRON_SECRET` not sent as `x-cron-secret` header   | Send the header to match the env value              |
| Emails logged but never arrive       | `EMAIL_LIVE` not `true`, or SMTP missing           | Set `EMAIL_LIVE=true`; verify `SMTP_HOST/PORT/USER/PASS` |
| Resend rejects the recipient         | Free sender can only reach your verified inbox     | Use your account email for tests, or add a verified domain |
| Booking slots look wrong             | `BUSINESS_HOURS_*` or timezone                     | Audit `BUSINESS_HOURS_*`; slots generate for Mon–Sat |

---

## Quick file map

- `src/App.tsx` — routes `/`, `/book`, `/admin`
- `src/components/AdminApp.tsx` — the dashboard UI (funnel, lists, patients, logs)
- `src/components/BookingApp.tsx` — the booking flow
- `src/lib/reactivation.ts` — the automation logic (scan, follow-ups, reminders, no-shows)
- `src/lib/email.ts` — SMTP send + the email safety guard
- `api/cron/run.ts` — the four scheduled jobs
- `migrations/20260901000000_create-tables.sql` — the database schema

---

That's it. Once `npm run dev` shows a working dashboard at `/admin` and your booking flow
writes records, the system is up and running. From here you can enable live email, seed a real
patient import, and schedule the automation jobs.