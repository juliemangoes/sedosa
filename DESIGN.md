---
name: Sedosa Beauty Studio
description: A members'-club powder room for booking brows, lash lifts and waxing.
colors:
  lacquer-rose: "#dc7096"
  lacquer-rose-hi: "#e68baa"
  deep-lacquer: "#9e2d5a"
  deep-lacquer-pressed: "#86234b"
  blush-plaster: "#f7d9e1"
  blush-plaster-deep: "#f0cad5"
  rose-white: "#fff6f8"
  hairline: "#e5b3c3"
  control-line: "#9c5a70"
  oxblood: "#3a0f1c"
  oxblood-raised: "#4f1628"
  ink-soft: "#6b3445"
  brass: "#b08a4f"
  brass-light: "#e2c48f"
  state-good: "#1f6b4a"
  state-warn: "#7a4a00"
  state-bad: "#a61b2b"
  chart-income: "#9e2d5a"
  chart-expense: "#b8862c"
typography:
  display:
    fontFamily: "Oswald Variable, Oswald, Arial Narrow, Helvetica Neue, sans-serif"
    fontSize: "clamp(4.6rem, 19vw, 11.5rem)"
    fontWeight: 600
    lineHeight: 0.84
    letterSpacing: "0.03em"
  headline:
    fontFamily: "Oswald Variable, Oswald, Arial Narrow, Helvetica Neue, sans-serif"
    fontSize: "clamp(2.4rem, 7vw, 4.75rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "0.01em"
  title:
    fontFamily: "Oswald Variable, Oswald, Arial Narrow, Helvetica Neue, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 600
    lineHeight: 1.05
  figure:
    fontFamily: "Jost Variable, Jost, Avenir Next, Futura, system-ui, sans-serif"
    fontSize: "1.55rem"
    fontWeight: 500
    lineHeight: 1
    fontFeature: "\"tnum\", \"lnum\""
  body:
    fontFamily: "Jost Variable, Jost, Avenir Next, Futura, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Jost Variable, Jost, Avenir Next, Futura, system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 500
    letterSpacing: "0.16em"
rounded:
  field: "14px"
  control: "12px"
  panel-ops: "20px"
  panel: "28px"
  frame-inner: "22px"
  photo: "22px"
  pill: "999px"
spacing:
  gutter: "16px"
  gutter-wide: "24px"
  room: "64px"
  room-wide: "96px"
components:
  button-primary:
    backgroundColor: "{colors.oxblood}"
    textColor: "{colors.rose-white}"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.oxblood-raised}"
  button-rose:
    backgroundColor: "{colors.lacquer-rose}"
    textColor: "{colors.oxblood}"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
  button-rose-hover:
    backgroundColor: "{colors.lacquer-rose-hi}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.oxblood}"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
  field:
    backgroundColor: "{colors.rose-white}"
    textColor: "{colors.oxblood}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
  framed-card:
    backgroundColor: "{colors.rose-white}"
    textColor: "{colors.oxblood}"
    rounded: "{rounded.panel}"
    padding: "6px"
  openings-strip:
    backgroundColor: "{colors.blush-plaster}"
    textColor: "{colors.oxblood}"
    rounded: "{rounded.panel}"
    padding: "20px 32px"
  category-pill:
    backgroundColor: "{colors.oxblood}"
    textColor: "{colors.rose-white}"
    typography: "{typography.title}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  category-pill-selected:
    backgroundColor: "{colors.lacquer-rose}"
    textColor: "{colors.oxblood}"
  slot:
    backgroundColor: "transparent"
    textColor: "{colors.oxblood}"
    rounded: "16px"
  slot-selected:
    backgroundColor: "{colors.oxblood}"
    textColor: "{colors.rose-white}"
  ops-panel:
    backgroundColor: "{colors.rose-white}"
    textColor: "{colors.oxblood}"
    rounded: "{rounded.panel-ops}"
    padding: "20px"
  ops-nav-active:
    backgroundColor: "{colors.lacquer-rose}"
    textColor: "{colors.oxblood}"
    rounded: "{rounded.pill}"
---

# Design System: Sedosa Beauty Studio

## Overview

**Creative North Star: "The Powder Room"**

Sedosa is a members'-club powder room: lacquered rose, oxblood velvet, brass hardware, a warm rose-white page. The client site follows a boutique booking-page layout the owner pinned from a reference, recoloured in the studio's pink: a hero photo that fills the entire first screen with SEDOSA in tall condensed capitals under a transparent header, then (on scroll) the next open times, "Meet your artist", "Our services" as photo cards with wine pill labels, the selected category's menu, policies, prep, business hours and location, and a rose closing panel.

The owner's dashboard is the same house seen from the back office. It takes only type, palette, density and one signature move from the room: an oxblood rail, a plaster working ground with rose-white panels, standard controls, and large tabular headline figures like a reservation ledger.

The system refuses both category ruts: beige spa minimalism and the black-and-neon club flyer the studio's old graphics wore. Pink is the studio's binding colour; premium comes from craft and restraint, never claims.

**Key Characteristics:**
- Committed colour: lacquer rose carries the header, the closing band and the footer; oxblood is the ink, the category pills and the primary action.
- Two voices: Oswald condensed capitals for headings, Jost for everything read, every figure, label and button.
- Big photography first: the hero photo fills the entire first screen, and every category leads with its photo.
- Photographs in clean rounded rectangles with a soft shadow; no ovals, rims or decorative frames.
- Lacquer is suggested by light, not faked: soft falloffs on the rose field, no bevels, chrome or glitter.
- Motion is one authored moment: a light sheen across a category photo when it is chosen.

## Colors

A rose, plaster and oxblood palette with brass used as hardware, every text pairing checked to WCAG AA.

### Primary
- **Lacquer Rose** (lacquer-rose): the header (once the page scrolls), the closing band, the footer, the selected category pill and rose buttons. Text on it is always oxblood (5.38:1); never white.
- **Lacquer Rose, lit** (lacquer-rose-hi): hover on rose and the dado rail between walls.

### Secondary
- **Deep Lacquer** (deep-lacquer): links, current selection, focus rings and small accents on plaster or rose-white (5.36:1 on plaster). Pressed state: deep-lacquer-pressed.

### Tertiary
- **Brass** (brass): the inner rule of framed cards, hairline dividers in dark rooms. Never text on light grounds.
- **Brass, light** (brass-light): text and small details on oxblood (9.9:1): wordmark subline, group labels, Instagram handle.

### Neutral
- **Oxblood** (oxblood): body text and headings everywhere, primary buttons, category pills, the dashboard rail. Raised surfaces on it use oxblood-raised.
- **Blush Plaster** (blush-plaster): the Next openings band, the Meet your artist card and the Booking policies panel, the booking flow and the dashboard ground; blush-plaster-deep for quiet hovers.
- **Rose-white** (rose-white): the page ground, panels, cards, inputs, and text over photographs. Warm, never pure white.
- **Ink, soft** (ink-soft): secondary text on plaster (7.25:1) and rose-white.
- **Hairline** (hairline) for decorative dividers; **Control line** (control-line) for input and slot borders (3.88:1 on plaster).
- **State colours**: good (state-good), warning (state-warn), problem (state-bad), always as text plus a matching outline on rose-white, with a word, never colour alone.
- **Chart pair**: income (chart-income) and expenses (chart-expense), validated together for colour-blind separation (ΔE 20.2) and ≥3:1 on rose-white.

### Named Rules
**The Oxblood-on-Rose Rule.** Anything set on a rose wall is oxblood. White or plaster text on rose fails contrast and is not used.

**The Brass Is Hardware Rule.** Brass draws rims, rules and small type on oxblood. It never fills a surface and never carries text on a light ground.

**The Warm White Rule.** The lightest surface is rose-white, and text over photographs is rose-white too. No pure #fff; the room is never sterile.

## Typography

**Heading Font:** Oswald (variable, 600), with Arial Narrow fallback
**Body Font:** Jost (variable), with Avenir Next / Futura fallback

**Character:** Tall condensed capitals for the name and every heading, poster-like the way the owner's reference sets them, over a geometric sans in the Futura tradition whose even strokes stay readable at every size. Both were chosen for legibility over a high-contrast serif.

### Hierarchy
- **Display** (Oswald 600, clamp 4.6–11.5rem, line-height 0.84, 0.03em tracking, capitals): SEDOSA in the hero only, rose-white over the photo or oxblood beside it.
- **Headline** (Oswald 600, clamp 2.4–4.75rem, line-height 1.05, capitals): section and page titles: Our services, Meet your artist, Booking policies, Business hours, booking step titles, the confirmation greeting.
- **Title** (Oswald 600, about 1.35–1.75rem, capitals): card titles that name a thing (Next openings, Your appointment, policy names, prep guides) and the category pills (0.95–1.02rem, 0.06em tracking). The header wordmark is Oswald at 1.55–1.9rem with 0.12em tracking.
- **Dashboard:** Jost throughout; page titles in Jost 500 at a fixed 2.3rem.
- **Figure** (Jost 500, 1.2–2.2rem, tabular lining numerals): prices, dates, times, headline numbers. Large figure over small label is the signature on every surface.
- **Body** (Jost 400, 1rem, up to 1.15rem in rooms, line-height about 1.5): reading text, kept within 65–75ch.
- **Label** (Jost 500, 0.72rem, 0.16em tracking, uppercase): labels for controls, groups and data fields. Never above a heading.

### Named Rules
**The Two Voices Rule.** Oswald speaks only in headings: always capitals, always 600, never for running text, prices or buttons. Jost carries everything else. No third family and no high-contrast serif (the owner found them hard to read). Condensed capitals belong to the client site; the dashboard stays in Jost.

**The No Eyebrow Rule.** Tracked caps label controls and fields only. A heading is never introduced by a small label above it.

## Layout

The landing page runs edge to edge on a rose-white ground, content centred in 64–72rem containers with 16px gutters on phones and 24px from 640px up. Top to bottom: the hero photo, filling the entire first screen (100svh) under the transparent sticky header; the Next openings band (full-width blush), reached by scrolling; Meet your artist (blush card, text left, two staggered 3:4 photos right, stacked under the text on phones); Our services (centred title, search, category cards in 3 columns from 640px and a swipe row on phones); the selected category's list; the photo wall (only once the owner has added photos); Booking policies in an inset blush panel; How to prepare; Business hours | Location | Say hello in three centred columns; then the rose closing band running into the rose footer. Sections breathe at 64px vertical padding, 80–96px from 640px up; more space sits above a heading than below it.

The hero photo fills the whole first screen with SEDOSA centred low in rose-white over a soft wine gradient, then "Beauty Studio", the cities and a rose Book button; a second wine veil at the top keeps the transparent header readable. It shows the built-in brow-mapping photo until the owner picks one of their own (Photos, "Use as hero"; wide photos crop best). The owner asked for the open times to come after the first screen, on scroll. Lists use hairline dividers and dotted leaders to prices instead of cards. The booking flow, confirmation and account pages sit on blush plaster under the same rose header.

The dashboard is a fixed 16rem oxblood rail with a plaster content area (max 72rem) on desktop; phones get an oxblood top bar, bottom tabs and a More sheet. Grids collapse to a single column under 1024px, with minmax(0, 1fr) columns so nothing forces sideways scrolling.

## Elevation & Depth

A hybrid: the room is flat colour, and depth is reserved for objects placed in it. Shadows are warm (oxblood-tinted), always offset downward with a soft blur, never a zero-offset halo and never a hard block.

### Shadow Vocabulary
- **Object on the wall** (`0 24px 48px -24px rgba(58,15,28,0.55)`): framed panels, the confirmation card.
- **Photo** (`0 22px 40px -24px rgb(58 15 28 / 0.6)`): photographs and category cards.
- **Pill** (`0 10px 20px -12px rgba(58,15,28,0.7)`): the category label pill lifting off its photo.
- **Lacquered button** (`inset 0 1px 0 rgb(255 255 255 / 0.12), 0 6px 16px -8px rgb(58 15 28 / 0.6)`): primary buttons.
- **Working panel** (`0 1px 0 rgba(58,15,28,0.04), 0 14px 30px -24px rgba(58,15,28,0.45)`): dashboard cards and figures.

### Named Rules
**The Objects Cast, Walls Don't Rule.** Rooms are flat. Only things set into the room (cards, photos, buttons, sheets) cast a shadow.

## Shapes

Soft, generous corners and one true curve. Buttons, chips and category labels are full pills; the hero and the closing band run square to the screen edges; client panels at 28px with a 22px inner frame; inputs at 14px; dashboard panels at 20px and dashboard inputs at 12px. Photographs are rounded rectangles: 22px for category cards (4:5 on phones, square on tablets, 5:4 on desktop) and Meet your artist (3:4), 24px on the photo wall, 12px for dashboard thumbnails. No ovals, arches or circles for photos. A framed card is a rose-white panel with a 1px brass rule set 6px inside its edge.

## Components

### Buttons
Lacquered, confident pills.
- **Shape:** full pill (999px), minimum height 44px.
- **Primary:** oxblood with rose-white text, Jost 500 tracked caps (0.8rem, 0.14em).
- **Rose:** lacquer rose with oxblood text; used on oxblood grounds where an oxblood button would vanish.
- **Secondary:** transparent with a 1px oxblood outline.
- **Light / ghost-light:** for oxblood rooms (rose-white fill, or a plaster outline).
- **Hover / Active:** a step lighter (oxblood-raised, lacquer-rose-hi) and a 160ms press to 0.97 scale.
- **Dashboard buttons:** the same pills in sentence case at 0.875rem.

### Chips and status
- **Style:** rose-white pill, 1px outline in the state colour, text in the state colour, always with a word.
- **Popular / Most openings:** tracked caps in deep lacquer (or brass-light on oxblood) with a 1px outline.

### Cards / Containers
- **Framed card:** rose-white, 28px corners, 1px brass rule 6px inside, object shadow. Used for Your appointment, the confirmation card, How to pay and sign-in.
- **Openings strip:** blush, 22–26px corners; Next openings and the service on the left, three slot buttons, then See all times. Hidden when nothing is open.
- **Plain panel:** rose-white, 28px, 1px hairline ring. Booking forms, manage booking, prep.
- **Dashboard panel:** rose-white, 20px, hairline ring, working-panel shadow.
- **Internal padding:** 20–32px.

### Inputs / Fields
- **Style:** rose-white fill, 1px control-line border, 14px radius, deep-lacquer caret, ink-soft placeholder.
- **Focus:** border shifts to deep lacquer with a 3px deep-lacquer glow at 22% opacity.
- **Error:** state-bad border and message in state-bad text naming the problem and the fix.

### Navigation
- **Client header:** transparent with rose-white text over the landing hero, then lacquer rose with oxblood text once the page scrolls (and always on other pages); type wordmark (spaced-capital name over a tracked-caps subline), tracked-caps links with an underline on hover, account circle and an oxblood Book now pill. Gains a faint oxblood hairline and soft shadow once scrolled.
- **Dashboard rail:** oxblood; brass-light group labels; links in plaster with brass-light icons; the current section is a rose pill with oxblood text. Phones: rose-white bottom tabs under a brass rule, current tab in deep lacquer.

### Photo frame
A clean rounded rectangle with a soft fall-off shadow, holding the photo edge to edge (object-fit: cover). Used for the hero, category cards, Meet your artist, the photo wall and dashboard thumbnails.

### Category card
A photo frame with the category name on a pill across its bottom edge, half on the photo and half off: an oxblood pill with rose-white Oswald capitals. Below it, the category's short line in tracked caps (two lines at most) and "From $price" in deep lacquer. The photo is the owner's upload for that category, else a built-in licensed photo matched on the category's name (brows, lash lift, lash and brow packages, lash removal, PMU); a category with neither (waxing, for now) shows a blush card with its initial in deep-lacquer Oswald. Cards are tabs: the chosen one turns its pill lacquer rose with oxblood text and plays one light sheen across its photo (1.4s, exponential ease-out). When the list below is out of sight (the desktop grid), choosing a card scrolls it into view.

### Meet your artist
A blush card: the heading, the owner's name in deep-lacquer Oswald, then the bio from Settings with its line breaks kept. Beside it, two staggered 3:4 photos: the first two photo-wall photos, or the studio's two brow results. With no name or bio entered, the heading reads "Welcome to the studio" over a short studio introduction; nothing is invented about the owner.

### Photo wall
The owner's photos (added under Photos in the dashboard, up to 12, in the order set there) line up after the menu under "Fresh from the chair", followed by the studio's two real brow results. The wall appears once the owner has added a photo. All photos share one 4:5 rounded frame in a centred row that becomes a swipeable strip when it overflows. Each photo carries the owner's description as its alt text. The photos rise in once as the wall scrolls into view.

### Slot and date buttons
Outlined rounded rectangles (16px) with the time in large tabular figures and AM/PM in tracked caps; selected is an oxblood fill with rose-white text. The same anatomy appears in the Next openings strip, on rose-white.

## Do's and Don'ts

### Do:
- **Do** set every text on lacquer rose in oxblood (5.38:1).
- **Do** show photographs in plain rounded rectangles, edge to edge.
- **Do** set prices, dates, times and headline numbers as large medium-weight tabular figures.
- **Do** let the hero photo fill the entire first screen, edge to edge, and keep the rest of the page on rose-white with blush cards and bands.
- **Do** set headings in Oswald capitals and everything else in Jost.
- **Do** lead with photography: a big hero photo and a photo on every category card.
- **Do** keep motion to one authored moment per surface (the category sheen) and 150–250ms state transitions in the dashboard.
- **Do** theme browser surfaces: rose selection with oxblood text, deep-lacquer caret, deep-lacquer scrollbar, deep-lacquer focus ring (brass-light on oxblood).

### Don't:
- **Don't** return to the black-satin and neon look (neon glows, sparkles, black grounds).
- **Don't** use pure white surfaces or a beige spa palette.
- **Don't** put a small label or eyebrow above a heading.
- **Don't** draw a bar down one side of a box to mark state; use a full outline or a tint.
- **Don't** use glyphs or emoji as icons; icons are drawn SVG in one stroke weight.
- **Don't** fake materials with bevels, chrome gradients or glitter; lacquer is light on a flat field.
- **Don't** put photos in ovals, arches, circles or brass rims (rejected by the owner).
- **Don't** bring back a high-contrast serif or add a third family; Oswald is for headings only and never for running text.
- **Don't** drift from the layout the owner pinned (full-screen hero photo with a condensed title, Meet your artist, photo-card services with pills, business hours and location) without asking.
- **Don't** nest frames: no rose border around a white sheet around a rounded hero (the owner found it funky).
