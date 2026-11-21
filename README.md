# Sedosa Beauty Studio: booking site + studio dashboard

A self-hosted replacement for the studio's Acuity Scheduling page. Clients book
online exactly as before; the owner runs the calendar, deposits, clients, menu
and hours from a private dashboard.

It ships with the studio's real menu, copied from the old Acuity page:
**18 services in 6 categories, 11 add-ons, 2 locations (Covington and Decatur),
4 intake/consent forms, the booking policies and the banner graphics.**

## What clients get

- The same flow as Acuity: category → service → location ("Any available",
  Covington or Decatur) → add-ons + weekly time grid → details + intake forms
  → deposit → confirmation.
- The same look: pink/plum palette, Alegreya type, black buttons and the policy banner.
- Live availability in 30-minute steps. It respects hours, add-on time,
  buffers, 12-hour minimum notice, blocked time and special hours.
- **Double booking is impossible**: every booking runs under a database lock,
  and two people racing for one slot get a "just taken" message.
- A $10 non-refundable deposit, collected one of two ways:
  - **Stripe connected**: card payment when booking, with the card saved for
    the no-show fee the waiver mentions. The slot is held for 30 minutes while
    the client pays.
  - **No Stripe**: Cash App / Zelle instructions. The owner marks the deposit
    paid in the dashboard.
- A confirmation page with an address, Google/Apple calendar buttons and
  self-service reschedule/cancel. The policy cutoffs are enforced online
  (24 h by default).
- Email confirmations, reschedule/cancel notices and day-before reminders.
  Clients who opt in get texts too.

## What the owner gets (`/admin`)

- **Appointments**: week agenda by location, today's count and a "needs
  attention" list (unpaid deposits, possible clashes).
- **Appointment page**: intake answers, deposit and payments (cash, Cash App,
  Zelle, card), "charge card on file" for no-show and late-cancel fees,
  completed/no-show, reschedule (with an outside-hours override), cancel,
  private notes, and every message sent.
- **New appointment**: book a client from a phone call or DM. Existing clients
  autofill.
- **Clients**: search, visit history, no-show count, private notes.
- **Services, add-ons, forms**: edit names, prices, durations, deposits,
  buffers, which add-ons and forms each service uses, and the questions on
  each form.
- **Hours & time off**: weekly hours per location (split shifts are OK),
  special hours for a date, blocked time.
- **Settings**: policies, booking rules, fees, Cash App/Zelle handles, and a
  private **calendar feed** to subscribe to on your phone.
- **Messages**: a log of every email and text.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 for the booking page and http://localhost:3000/admin
for the dashboard (local password: `admin`). An embedded Postgres (PGlite) is
created in `.data/` and filled with the studio's menu automatically, so there
is nothing to install.

## Tests

```bash
npm test          # availability engine, booking rules, Stripe flow (mocked)
npm run e2e       # real browser: booking, reschedule/cancel, race, dashboard, phone layout
```

`npm run e2e` builds the app and serves it on port 3100 with a throwaway
database. Stop `npm run dev` first if Next.js complains about another instance.

## Deploy (Vercel + Neon, about 15 minutes)

1. **Database**: create a free Postgres database at [neon.tech](https://neon.tech)
   (Vercel Postgres or Supabase work too) and copy the connection string.
2. **Vercel**: import this GitHub repo. Add the environment variables below and
   deploy. The build (`vercel.json`) creates the tables and loads the menu on
   first deploy.
3. **Stripe** (optional but recommended): in Stripe → Developers → Webhooks, add
   an endpoint at `https://YOUR-DOMAIN/api/stripe/webhook` for
   `checkout.session.completed`, `checkout.session.expired` and
   `checkout.session.async_payment_succeeded`. Put its signing secret in
   `STRIPE_WEBHOOK_SECRET`.
4. **Email**: create a [Resend](https://resend.com) account, verify your
   domain, and set `RESEND_API_KEY` and `EMAIL_FROM`.
5. **Texts** (optional): get a Twilio number. US business texting requires
   **A2P 10DLC registration** in Twilio before messages are delivered.
6. Point your domain at Vercel, put the link in your Instagram bio, re-enter
   any upcoming Acuity appointments under **New appointment**, then turn
   Acuity off.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `APP_URL` | yes | e.g. `https://book.sedosabeauty.com`, used in links |
| `ADMIN_PASSWORD` | yes | dashboard password |
| `SESSION_SECRET` | yes | long random string (`openssl rand -base64 32`) |
| `CRON_SECRET` | recommended | protects the reminder job |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | optional | card deposits + no-show fees |
| `RESEND_API_KEY`, `EMAIL_FROM` | optional | emails |
| `OWNER_EMAIL` | optional | email the owner on every booking |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | optional | texts |

Until email or SMS is configured, messages are still recorded under
**Messages**, so nothing is lost while you set things up.

**Reminders** run from `/api/cron/reminders`. `vercel.json` schedules it daily
at 13:00 UTC (8 AM Eastern), which works on Vercel's free plan. Each run
sends reminders for the next 24 hours. On Vercel Pro you can change it to
hourly, or ping the URL hourly from any cron service with the header
`Authorization: Bearer $CRON_SECRET`.

## Things to know

- **One provider, two locations.** By default a booking at either location
  blocks that time at both, because one person works both. If each location
  gets its own staff, untick this in Settings.
- **Hours were seeded** from the posted hours (Mon–Sat 9:30 AM–8 PM, closed
  Sunday) for both locations. Adjust them under **Hours & time off**.
- **Prices, durations and forms** match the old Acuity page as of Nov 2026.
- Not included yet (Acuity has these): two-way Google Calendar sync (there is a
  one-way calendar feed), packages and gift certificates, client logins,
  waitlist, staff logins and a CAPTCHA on the public form.

## Project layout

```
src/app/page.tsx                  public booking page
src/app/booking/[token]/          confirmation / manage page
src/app/admin/                    owner dashboard + server actions
src/app/api/                      availability, bookings, Stripe webhook, cron, calendar feed
src/components/booking/           booking flow UI (time grid, intake forms)
src/lib/availability.ts           slot engine (pure, unit tested)
src/lib/booking.ts                create / reschedule / cancel / deposit logic
src/lib/notify.ts                 email + SMS templates
src/db/schema.ts, drizzle/        database schema + migrations
src/db/seed-data.ts               the studio's menu, forms and locations
```
