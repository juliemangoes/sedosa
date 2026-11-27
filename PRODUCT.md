# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Clients** of Sedosa Beauty Studio booking brows (sculpt, wax, thread, tint, lamination), Korean lash lifts, waxing and permanent-makeup consultations at the studio's two locations, Covington GA and Decatur GA. Most arrive from the studio's Instagram and book on their phones (inferred from the product: the booking link is meant for the Instagram bio, and the site is built phone-first).
- **The owner**, one provider working both locations, who runs the studio from the dashboard on a phone and a laptop: the day's appointments, deposits, clients, the menu, hours, money in and out, and WhatsApp messages to clients.

## Product Purpose

A self-hosted replacement for the studio's Acuity Scheduling page. Clients see the menu, pick a service, time and location, answer intake/consent forms, pay or arrange a deposit, and manage their booking or account afterwards. The owner gets a private dashboard. Success for the current redesign: the whole product looks premium, as high-end as the work itself.

## Positioning

The studio's own booking home rather than a marketplace listing: real availability across both studios from one calendar, the studio's own policies and consent forms, deposits, and client accounts that remember past answers.

## Operating Context

- Clients book in short sessions on a phone, often straight from an Instagram profile.
- Deposits: $10 non-refundable, by card when Stripe is connected, otherwise Cash App / Zelle and marked paid by the owner.
- Street addresses are only shown after booking; before that the site shows the city.
- The owner works alone across two studios, so a booking at one blocks that time at both (configurable).

## Capabilities and Constraints

- 18 services in 6 categories, 11 add-ons, 4 intake/consent forms, 2 locations, booking policies (all from the old Acuity page).
- Booking flow, confirmation/manage page with reschedule and cancel, passwordless client accounts.
- Dashboard: home overview, calendar, appointments, clients, finance (income/expenses, CSV), services/add-ons/forms editing with category photos, hours and time off, settings, message log, WhatsApp click-to-chat and scheduled reminders.
- Next.js App Router, React, Tailwind CSS v4. Accessibility and the booking/dashboard behaviour are covered by unit, end-to-end and axe tests that must keep passing.

## Brand Commitments

- Name: Sedosa Beauty Studio.
- **Pink is the studio colour** (confirmed binding). Its shade and use may change.
- Not binding (confirmed free to replace): the chrome logo, the black-satin and neon look of the current graphics, and the playful copy voice.
- The feel to reach: high class and premium, but not white and sterile.
- Landing layout pinned by the owner (2026-11): a boutique booking-site layout from a reference they shared (big hero photo with a condensed title, Meet your artist, photo-card services with pill labels, business hours and location), in Sedosa's pink.

## Evidence on Hand

- `src/assets/brand/portrait.png`: a styled studio portrait (a neon ring and sparkles are baked into the image; the inner photograph can be cropped).
- `src/assets/brand/results.jpg`: two real brow results shown inside phone frames.
- `photos/`: six treatment photos (brow mapping, brow tinting, lash work, microblading) the owner holds a licence for. Resized copies in `src/assets/photos/` serve as the default hero and category photos. They show the services, not this studio's clients, so they are never presented as Sedosa's own results.
- Category photos, photo-wall photos and an optional hero photo the owner uploads in the dashboard (stored in the database).
- The owner's name and bio for "Meet your artist", once entered in Settings.
- The real menu with prices, durations and deposits; policies; hours; city names.
- Absent, and not to be invented: reviews, ratings, testimonials, client counts, press, awards, years in business, and the provider's name or biography until the owner enters them.

## Product Principles

1. Booking is the point: every client surface leads to an open time in as few taps as possible.
2. Premium through craft and restraint in the details, never through claims.
3. Phone first; the laptop gets the same product with more room.
4. The owner's screens are tools first: fast to scan, consistent, calm.
5. Show only true facts: real prices, real policies, real photos.

## Accessibility & Inclusion

WCAG 2.1 AA, checked with axe in the end-to-end suite (including colour contrast). Everything works by keyboard, respects reduced-motion settings, and never scrolls sideways on phones.
