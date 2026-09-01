# BRIEF — Patient Reactivation System

## Client
A dental clinic (anonymized for build-in-public; "ClearSmile Dental" used as the working brand).

## Problem
A meaningful share of the clinic's patient list hasn't booked in 6+ months. No systematic
way to re-engage them, remind them, or catch no-shows — so patients silently lapse and
appointment gaps go unfilled.

## What we're building
A trigger-based patient reactivation system:
- **Overdue scan** — flags any patient with no visit in 6+ months (suppressing recent
  contacts + opted-out).
- **Reactivation email sequence** — follows up the flagged list (day 0 / 7 / 14).
- **Self-serve booking** — lets a responding patient pick a real slot and confirms/reminds.
- **No-show recovery** — auto-reschedules missed appointments.
- **Staff handoff queue** — patient questions route to the front desk.
- **Admin dashboard** — the operations view tracking every patient through the status
  pipeline (none → overdue → contacted → responded → booked → suppressed/opted_out).

## Proof of work (what the deliverable shows)
1. The admin dashboard, seeded with realistic test data, showing a professional
   operations view (stats + conversion funnel + priority/recent lists) — NOT a
   build-pipeline diagram.
2. Reactivation emails actually sent, visible in a real inbox.

## Scope notes
- Dashboard is the primary deliverable.
- Booking page is a backend necessity but not a proof focus.
- Statuses and counts are real, from the shared InsForge database.
- mode: collaborative · approval gates per video playbook.

## Stack
Vercel serverless functions + InsForge Postgres + Resend (SMTP) + React/Tailwind frontend.