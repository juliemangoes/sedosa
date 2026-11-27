# Sedosa Beauty Studio: booking site + studio dashboard

A self-hosted replacement for the studio's Acuity Scheduling page. Clients book
online exactly as before; the owner runs the calendar, deposits, clients, menu
and hours from a private dashboard.

It ships with the studio's real menu, copied from the old Acuity page:
**18 services in 6 categories, 11 add-ons, 2 locations (Covington and Decatur),
4 intake/consent forms, the booking policies and the banner graphics.**

## What clients get

- **A landing page designed as "The Powder Room"**, laid out like a boutique
  booking site: a rose-white page in a rose frame, condensed Oswald capitals
  for headings and Jost for everything else (see [DESIGN.md](DESIGN.md)).
  It includes:
  - A big rounded **hero photo** with SEDOSA in tall capitals: a brow-mapping
    shot, or any photo the owner marks as the hero in the dashboard.
  - **Next openings** right under it (inside the first screen on phones): the
    next three open times. Tapping one opens booking with that time selected.
  - **Meet your artist**: the owner's name and bio (from Settings) beside two
    photos; until those are filled in, a short studio welcome.
  - **Our services**: a photo card per category with its name on a wine pill
    and a one-line description. Built-in photos cover brows, lash lifts,
    packages, lash removal and PMU until the owner uploads their own in the
    dashboard (waxing needs one).
    Swipe on phones, a grid on larger screens, arrow keys for keyboard users;
    picking a card shows that category's services right below, and
    "Next: …" walks through them in order. Search
    looks across every category. Tapping a service opens a details sheet
    (description, deposit, consent forms, add-ons, prep). "Popular" badges
    come from real bookings.
  - Booking policies, prep checklists for brows, lash lifts and waxing, and
    payment info.
  - Business hours, locations and contact links, including "WhatsApp me"
    once the studio's WhatsApp number is set.
  - A photo wall of the owner's photos and the studio's results, and a Book
    button that stays within reach on phones.
  - All the text from the old policy graphics as real, readable text that
    search engines can see.
- **Client accounts** with passwordless sign-in (a 6-digit code or a one-tap
  link by email). Clients see upcoming and past appointments, manage or rebook
  them, and keep their details. When signed in, booking pre-fills their
  details and previous consent answers; consent boxes must be ticked again.
  Any booking can be turned into an account from the confirmation page.
- **A focused booking flow** with a progress stepper and a live price summary:
  location → extras + a day strip with morning/afternoon/evening times →
  details and consent forms → deposit → confirmation.
  - Returning clients can have their details remembered on their own device.
  - Phone numbers format as you type.
  - Every missing answer is pointed out at once.
- **Double booking is impossible**: every booking runs under a database lock,
  and two people racing for one slot get a "just taken" message.
- A $10 non-refundable deposit, collected one of two ways:
  - **Stripe connected**: card payment when booking, with the card saved for
    the no-show fee the waiver mentions. The slot is held for 30 minutes while
    the client pays.
  - **No Stripe**: Cash App / Zelle instructions. The owner marks the deposit
    paid in the dashboard.
- **A confirmation page** with the address, directions, Google/Apple calendar
  buttons, prep tips for the booked service, and self-service reschedule or
  cancel. The policy cutoffs are enforced online (24 h by default).
- Email confirmations, reschedule/cancel notices and day-before reminders.
  Clients who opt in get texts too, and can tick **"Send my reminder on
  WhatsApp"** when booking (or later from their account).
- **Motion**: one signature moment. Choosing a category card sends a light
  sheen across its photo, and a fresh booking's confirmation card gets the same
  sheen. Step content rises in briefly. Everything switches off for anyone with
  "reduce motion" on, and content never depends on it.
- Accessibility is checked automatically with axe (WCAG 2.1 AA, including
  contrast). The pages work by keyboard, respect reduced-motion settings, and
  have no horizontal scrolling on phones.

## What the owner gets (`/admin`)

A dashboard built for running the studio from a phone as much as a laptop: a
dark sidebar on desktop, bottom tabs (Home, Calendar, Clients, Finance, More)
and a "New" button on phones.

- **Home**: a greeting and today at a glance: today's appointments, the week's
  bookings, profit this month and deposits still due. Below that:
  - **Next up**, with one-tap Call and WhatsApp.
  - Today's timeline.
  - **WhatsApp reminders to send** (when automatic sending isn't connected):
    one tap opens WhatsApp with the message written, and marks it sent.
  - **Needs attention**: possible clashes, and unpaid deposits with a
    WhatsApp "Ask" button that drafts the deposit request.
  - Quick actions.
- **Calendar**: a real week grid on desktop (appointments placed by time and
  length, side by side when they overlap, coloured by status, blocked time
  hatched, a "now" line) and a day-by-day agenda on phones. Filter by studio,
  include canceled ones, jump between weeks.
- **Appointment page**: Call, Text, Email and a **WhatsApp menu of
  ready-written messages** (confirmation, reminder, deposit request, running
  late, aftercare, thank you) filled in with the client's name, service, date,
  time, studio and manage link. Plus a **WhatsApp reminders** card: see what's
  queued, cancel it, or schedule one (1 day before, 2 hours before, the
  morning of, or any time you pick, with an editable message). Also: intake
  answers, deposit and payments, "charge card on file" for no-show and
  late-cancel fees, completed/no-show, reschedule, cancel, private notes and
  every message sent.
- **Finance**: track income and expenses.
  - Income fills itself in from every payment recorded on appointments
    (deposits, balances, tips, fees); add other income (product sales, gift
    cards) by hand.
  - Log expenses in a few taps, by category and payment method, with an
    optional receipt photo. Monthly costs (rent, software) can be set to repeat
    and logged again each month with one tap.
  - Totals for income, expenses, net profit and money still owed to you; a
    6-month income vs expenses chart (hover or focus for numbers, or view it
    as a table); income by payment method; where the money goes.
  - This month, last month, this year, last 12 months or any date range, a
    filterable ledger, and **CSV export** for your accountant.
- **New appointment**: book a client from a phone call or DM. Existing clients
  autofill; tick whether they agreed to WhatsApp reminders.
- **Clients**: search, avatars, one-tap Call and WhatsApp, visit history,
  total paid, no-shows, next visit, private notes and their reminder
  preferences.
- **Photos**: add up to 12 photos (several at once, straight from a phone) to
  the landing page's photo wall, describe them for screen readers, reorder or
  remove them. They hang after the menu, followed by the studio's real results;
  the first two also sit beside "Meet your artist", and **"Use as hero"** puts
  one at the top of the page (a wide, landscape photo works best).
- **Services, add-ons, forms**: edit names, prices, durations, deposits,
  buffers, which add-ons and forms each service uses, and the questions on
  each form. **Upload a photo and a one-line description for each category**
  (straight from your phone's camera roll); it appears on the category cards.
- **Hours & time off**: weekly hours per location (split shifts are OK),
  special hours for a date, blocked time.
- **Settings**: policies, booking rules, fees, Cash App/Zelle handles,
  your name and bio for **Meet your artist**,
  **WhatsApp** (studio number, automatic reminders on/off, how many hours
  before, the reminder wording and your quick messages), and a private
  **calendar feed** to subscribe to on your phone.
- **Messages**: a log of every email, text and WhatsApp message.

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
npm test          # availability engine, booking rules, Stripe flow (mocked), finance, WhatsApp scheduling, image processing
npm run e2e       # real browser: landing + category cards, booking, accounts, reschedule/cancel, race, dashboard, finance, WhatsApp, phone, accessibility
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
| `TWILIO_WHATSAPP_FROM` | optional | your WhatsApp Business sender (e.g. `+14045550000`), for automatic WhatsApp reminders |
| `TWILIO_WHATSAPP_CONTENT_SID` | optional | an approved WhatsApp template for reminders (see below) |
| `CRON_INTERVAL_MINUTES` | optional | how often the cron job runs; default `1440` (daily). Set `60` if you run it hourly |

**Client accounts need email.** Sign-in codes are sent with Resend, so on a
live site account sign-in only appears once `RESEND_API_KEY` and `EMAIL_FROM`
are set. In local development (and in the test suite, via
`DEV_LOGIN_CODES=1`) the code is shown on screen instead. Never set
`DEV_LOGIN_CODES` on a real deployment.

Until email or SMS is configured, messages are still recorded under
**Messages**, so nothing is lost while you set things up.

**Reminders** run from `/api/cron/reminders`. `vercel.json` schedules it daily
at 13:00 UTC (8 AM Eastern), which works on Vercel's free plan. Each run
sends email/text reminders for the next 24 hours, and any WhatsApp reminder
that falls due before the next run (so they go out a little early rather than
late). On Vercel Pro you can change it to hourly (and set
`CRON_INTERVAL_MINUTES=60`), or ping the URL hourly from any cron service
with the header `Authorization: Bearer $CRON_SECRET`.

**WhatsApp works in two modes:**

- **Out of the box (no setup):** every WhatsApp button opens WhatsApp on the
  owner's phone or computer with the message already written, ready to
  send. Scheduled reminders appear on Home when they're due ("WhatsApp
  reminders to send") and go out with one tap from the studio's own number.
- **Automatic:** with a WhatsApp Business sender on Twilio
  (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`), the
  cron job sends scheduled reminders on its own. WhatsApp only lets businesses
  start a conversation with a pre-approved template, so create one in Twilio
  for the reminder and set `TWILIO_WHATSAPP_CONTENT_SID`. Its variables are
  `{{1}}` first name, `{{2}}` service, `{{3}}` date, `{{4}}` time, `{{5}}` studio,
  `{{6}}` manage link. If a send fails, the reminder drops back onto Home for a
  manual send.

Reminders are only queued for clients who opted in. Rescheduling moves them,
and canceling removes them.

**Photos** (category pictures and receipts) are stored in the database, so
there is no extra storage service to set up. Uploads are resized on the phone
first, then re-encoded on the server (category photos cropped to 4:3, metadata
and location data stripped).

## Design system

The visual design was reworked with the [Impeccable](https://impeccable.style)
design skill, installed for Claude Code at `.claude/skills/impeccable/`.

- [PRODUCT.md](PRODUCT.md): who the product is for and the brand commitments
  (pink is the studio colour; premium but never white and sterile).
- [DESIGN.md](DESIGN.md): the Powder Room system: colour tokens with their
  contrast pairings, type roles, shapes, shadows, components and rules. Start
  here before adding a screen.
- `.impeccable/surfaces/`: the direction contracts for the client site and the
  dashboard. `.impeccable/design.json` carries shadows, motion and component
  snippets.

The skill's command-line engine downloads a binary on first use; it was not
run in the cloud session that did this work, so its automated slop detector has
not been run against the code yet. To use it locally, open the project in Claude
Code and run `/impeccable`.

## Things to know

- **One provider, two locations.** By default a booking at either location
  blocks that time at both, because one person works both. If each location
  gets its own staff, untick this in Settings.
- **Hours were seeded** from the posted hours (Mon–Sat 9:30 AM–8 PM, closed
  Sunday) for both locations. Adjust them under **Hours & time off**.
- **Prices, durations and forms** match the old Acuity page as of Nov 2026.
- Not included yet (Acuity has these): two-way Google Calendar sync (there is a
  one-way calendar feed), packages and gift certificates, a waitlist, staff
  logins and a CAPTCHA on the public form.

## Project layout

```
src/app/page.tsx                  public booking page
src/app/booking/[token]/          confirmation / manage page
src/app/admin/                    owner dashboard (home, calendar, finance, clients…) + server actions
src/app/api/                      availability, bookings, Stripe webhook, cron, calendar feed
src/components/booking/           booking flow UI (category cards, time grid, intake forms)
src/components/admin/             dashboard shell, finance chart, WhatsApp buttons, uploads
src/lib/availability.ts           slot engine (pure, unit tested)
src/lib/booking.ts                create / reschedule / cancel / deposit logic
src/lib/notify.ts                 email + SMS templates
src/lib/whatsapp.ts               WhatsApp links, templates, scheduled reminders
src/lib/finance.ts                income/expense ledger, periods, CSV
src/lib/media.ts                  photo processing (sharp) and storage
src/db/schema.ts, drizzle/        database schema + migrations
src/db/seed-data.ts               the studio's menu, forms and locations
src/components/landing/           landing page sections (hero, openings, artist, policies, prep, visit, photo wall)
src/content/prep.ts               prep checklists shown on the landing + confirmation pages
src/assets/brand/                 portrait and results photos cropped from the studio's graphics (origin noted in each file)
```
