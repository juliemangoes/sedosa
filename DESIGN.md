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
    fontFamily: "Jost Variable, Jost, Avenir Next, Futura, system-ui, sans-serif"
    fontSize: "clamp(3.4rem, 17vw, 14rem)"
    fontWeight: 500
    lineHeight: 0.86
    letterSpacing: "0.1em"
  headline:
    fontFamily: "Jost Variable, Jost, Avenir Next, Futura, system-ui, sans-serif"
    fontSize: "clamp(2.4rem, 6vw, 3.6rem)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Jost Variable, Jost, Avenir Next, Futura, system-ui, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 500
    lineHeight: 1.15
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
  pill: "999px"
spacing:
  gutter: "16px"
  gutter-wide: "24px"
  room: "80px"
  room-wide: "112px"
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
  reservation-card:
    backgroundColor: "{colors.rose-white}"
    textColor: "{colors.oxblood}"
    rounded: "{rounded.panel}"
    padding: "6px"
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

Sedosa is a members'-club powder room you step into: lacquered rose walls, oxblood velvet, brass hardware, and the booking waiting on the vanity like a reservation card. The client site is the room itself. Rose owns whole walls, the name is set in spaced capitals across the width, photographs hang in oval vanity mirrors, and the next open times sit in the first screen. After the menu, photos hang on an oxblood wall in brass-rimmed frames. Reading rooms (policies, prep, visit) step down to blush plaster, and the page closes back on the rose wall.

The owner's dashboard is the same house seen from the back office. It takes only type, palette, density and one signature move from the room: an oxblood rail, a plaster working ground with rose-white panels, standard controls, and large tabular headline figures like a reservation ledger.

The system refuses both category ruts: beige spa minimalism and the black-and-neon club flyer the studio's old graphics wore. Pink is the studio's binding colour; premium comes from craft and restraint, never claims.

**Key Characteristics:**
- Committed colour: lacquer rose carries whole regions on client surfaces; oxblood is the ink and the primary action.
- One family, Jost, carrying every role through size, weight, case and spacing; nothing thin or fussy to read.
- Oval mirrors in thin brass rims frame every photograph.
- Lacquer is suggested by light, not faked: soft falloffs on the rose field, no bevels, chrome or glitter.
- Motion is one authored moment: a light sheen across a mirror's glass when it is chosen.

## Colors

A rose, plaster and oxblood palette with brass used as hardware, every text pairing checked to WCAG AA.

### Primary
- **Lacquer Rose** (lacquer-rose): the walls. Hero, menu wall, headers and rose buttons. Text on it is always oxblood (5.38:1); never white.
- **Lacquer Rose, lit** (lacquer-rose-hi): hover on rose and the dado rail between walls.

### Secondary
- **Deep Lacquer** (deep-lacquer): links, current selection, focus rings and small accents on plaster or rose-white (5.36:1 on plaster). Pressed state: deep-lacquer-pressed.

### Tertiary
- **Brass** (brass): mirror rims, the inner rule of framed cards, hairline dividers in dark rooms. Never text on light grounds.
- **Brass, light** (brass-light): text and small details on oxblood (9.9:1): wordmark subline, group labels, Instagram handle.

### Neutral
- **Oxblood** (oxblood): body text everywhere, primary buttons, the closing room, the dashboard rail. Raised surfaces on it use oxblood-raised.
- **Blush Plaster** (blush-plaster): reading rooms and the dashboard ground; blush-plaster-deep for alternate rooms and quiet hovers.
- **Rose-white** (rose-white): panels, cards, inputs and sheets. Warm, never pure white.
- **Ink, soft** (ink-soft): secondary text on plaster (7.25:1) and rose-white.
- **Hairline** (hairline) for decorative dividers; **Control line** (control-line) for input and slot borders (3.88:1 on plaster).
- **State colours**: good (state-good), warning (state-warn), problem (state-bad), always as text plus a matching outline on rose-white, with a word, never colour alone.
- **Chart pair**: income (chart-income) and expenses (chart-expense), validated together for colour-blind separation (ΔE 20.2) and ≥3:1 on rose-white.

### Named Rules
**The Oxblood-on-Rose Rule.** Anything set on a rose wall is oxblood. White or plaster text on rose fails contrast and is not used.

**The Brass Is Hardware Rule.** Brass draws rims, rules and small type on oxblood. It never fills a surface and never carries text on a light ground.

**The Warm White Rule.** The lightest surface is rose-white. No pure #fff surfaces; the room is never sterile.

## Typography

**Display Font:** Jost (variable), with Avenir Next / Futura fallback
**Body Font:** Jost (variable), the same family

**Character:** A geometric sans in the Futura tradition: fashion-house capitals for the name, calm medium-weight headings, even strokes that stay readable at every size. The owner chose this over a high-contrast serif for legibility.

### Hierarchy
- **Display** (500, clamp 3.4–14rem, line-height 0.86, 0.1em tracking, capitals): the SEDOSA wordmark across the hero only.
- **Headline** (500, clamp 2.4–3.6rem, line-height 1.02, -0.015em tracking): room titles, booking step titles, confirmation greeting. Dashboard page titles at a fixed 2.3rem.
- **Title** (500, about 1.5–1.75rem): card titles that name a thing: Next openings, Your appointment, Booking policies' entries.
- **Figure** (500, 1.2–2.2rem, tabular lining numerals): prices, dates, times, headline numbers. Large figure over small label is the signature on every surface.
- **Body** (400, 1rem, up to 1.15rem in rooms, line-height about 1.5): reading text, kept within 65–75ch.
- **Label** (500, 0.72rem, 0.16em tracking, uppercase): labels for controls, groups and data fields. Never above a heading.

### Named Rules
**The One Family Rule.** Jost sets everything. Roles differ by size, weight (400 body, 500 headings and figures), case and tracking, never by adding a second family. No high-contrast serifs: the owner found them hard to read.

**The No Eyebrow Rule.** Tracked caps label controls and fields only. A heading is never introduced by a small label above it.

## Layout

Client surfaces are full-bleed rooms stacked vertically: rose wall (hero), brass dado rail, rose menu wall, plaster menu card, oxblood photo wall, plaster-deep policies, plaster prep, plaster-deep visit, rose closing wall, oxblood footer. Content sits in a centred container (72–80rem) with 16px gutters on phones and 24px from 640px up. Rooms breathe at 80px vertical padding, 112px from 640px up; more space sits above a heading than below it.

The hero composes as a triptych on desktop (tagline and Book | mirror | reservation card) under the full-width wordmark, and on phones as mirror-left with the tagline beside it, the reservation card below, all inside the first screen. Lists use hairline dividers and dotted leaders to prices instead of cards.

The dashboard is a fixed 16rem oxblood rail with a plaster content area (max 72rem) on desktop; phones get an oxblood top bar, bottom tabs and a More sheet. Grids collapse to a single column under 1024px, with minmax(0, 1fr) columns so nothing forces sideways scrolling.

## Elevation & Depth

A hybrid: the room is flat colour, and depth is reserved for objects placed in it. Shadows are warm (oxblood-tinted), always offset downward with a soft blur, never a zero-offset halo and never a hard block.

### Shadow Vocabulary
- **Object on the wall** (`0 24px 48px -24px rgba(58,15,28,0.55)`): reservation card, framed panels, the confirmation card.
- **Mirror** (`0 0 0 2px var(--color-brass), 0 22px 40px -22px rgb(58 15 28 / 0.65)`): the brass rim plus the mirror's fall-off shadow.
- **Lacquered button** (`inset 0 1px 0 rgb(255 255 255 / 0.12), 0 6px 16px -8px rgb(58 15 28 / 0.6)`): primary buttons.
- **Working panel** (`0 1px 0 rgba(58,15,28,0.04), 0 14px 30px -24px rgba(58,15,28,0.45)`): dashboard cards and figures.

### Named Rules
**The Objects Cast, Walls Don't Rule.** Rooms are flat. Only things set into the room (cards, mirrors, buttons, sheets) cast a shadow.

## Shapes

Soft, generous corners and one true curve. Buttons and chips are full pills; client panels round at 28px with a 22px inner frame; inputs at 14px; dashboard panels at 20px and dashboard inputs at 12px. The signature silhouette is the tall ellipse of the vanity mirror (border-radius 50% on a 3:4 or 490:710 box), always rimmed in a 2px brass line. On the photo wall it alternates with two sister frames: an arch (fully rounded top, 24px bottom corners, 3:4) and a round mirror (1:1). A framed card is a rose-white panel with a 1px brass rule set 6px inside its edge.

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
- **Reservation card (framed):** rose-white, 28px corners, 1px brass rule 6px inside, object shadow. Used for Next openings, Your appointment, the confirmation card, How to pay and sign-in.
- **Plain panel:** rose-white, 28px, 1px hairline ring. Booking forms, manage booking, prep.
- **Dashboard panel:** rose-white, 20px, hairline ring, working-panel shadow.
- **Internal padding:** 20–32px.

### Inputs / Fields
- **Style:** rose-white fill, 1px control-line border, 14px radius, deep-lacquer caret, ink-soft placeholder.
- **Focus:** border shifts to deep lacquer with a 3px deep-lacquer glow at 22% opacity.
- **Error:** state-bad border and message in state-bad text naming the problem and the fix.

### Navigation
- **Client header:** on the rose wall; type wordmark (spaced-capital name over a tracked-caps subline), tracked-caps links with an underline on hover, account circle and an oxblood Book now pill. Gains a brass hairline and soft shadow once scrolled.
- **Dashboard rail:** oxblood; brass-light group labels; links in plaster with brass-light icons; the current section is a rose pill with oxblood text. Phones: rose-white bottom tabs under a brass rule, current tab in deep lacquer.

### Vanity Mirror (signature)
A tall ellipse holding a photograph in a 2px brass rim, with a soft-light glass highlight. Used for the hero portrait, menu categories and results. Without a photo, the glass is a rose gradient with the category's initial in Jost. Choosing a menu mirror adds an outer oxblood ring and plays one light sheen across the glass (1.4s, exponential ease-out).

### Photo wall
The owner's photos (added under Photos in the dashboard, up to 12, in the order set there) hang on the oxblood wall after the menu, followed by the studio's two real brow results. Frames cycle oval, arch, round with every second frame dropped 32px, in a centred row that becomes a swipeable strip when it overflows. Each photo carries the owner's description as its alt text. The frames rise in once as the wall scrolls into view.

### Slot and date buttons
Outlined rounded rectangles (16px) with the time in large tabular figures and AM/PM in tracked caps; selected is an oxblood fill with rose-white text. The same anatomy appears in the hero's reservation card.

## Do's and Don'ts

### Do:
- **Do** set every text on lacquer rose in oxblood (5.38:1).
- **Do** frame photographs in the vanity mirror with its 2px brass rim.
- **Do** set prices, dates, times and headline numbers as large medium-weight tabular figures.
- **Do** use rose-white for panels and inputs, plaster for reading rooms, oxblood for the closing room.
- **Do** keep motion to one authored moment per surface (the mirror sheen) and 150–250ms state transitions in the dashboard.
- **Do** theme browser surfaces: rose selection with oxblood text, deep-lacquer caret, deep-lacquer scrollbar, deep-lacquer focus ring (brass-light on oxblood).

### Don't:
- **Don't** return to the black-satin and neon look (neon glows, sparkles, black grounds).
- **Don't** use pure white surfaces or a beige spa palette.
- **Don't** put a small label or eyebrow above a heading.
- **Don't** draw a bar down one side of a box to mark state; use a full outline or a tint.
- **Don't** use glyphs or emoji as icons; icons are drawn SVG in one stroke weight.
- **Don't** fake materials with bevels, chrome gradients or glitter; lacquer is light on a flat field.
- **Don't** bring back a high-contrast serif or a second display family; legibility comes first.
