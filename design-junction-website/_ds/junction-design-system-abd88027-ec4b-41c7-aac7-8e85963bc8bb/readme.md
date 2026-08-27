# Junction Design System

## Who this is for
Junction Consulting (wearejunction.com, @heyjunction) runs consulting engagements and
webinars for municipalities and small-business communities — e.g. "Visitor Economy Webinar
Series" for the Town of Okotoks. This design system captures Junction's presentation
style so future decks look consistent.

## Source material
- `uploads/2026.07.07 - Town of Okotoks - Visitor Readiness.pdf` — 36-slide webinar deck,
  "4,500 Visitors Are Coming. Are You Ready?" (Webinar 1 of 3, Visitor Economy Series).
  This is the ONLY source provided (no Figma file, no codebase). Every token, color,
  font, and layout motif below was measured directly from this PDF's embedded text,
  fill colors, and images — not guessed.
- No brand guideline doc, logo package, or codebase was attached. If one exists, re-attach
  it via the Import menu and this system can be tightened against it.

## Content fundamentals
- **Voice:** direct, plain-spoken, encouraging. Short declarative sentences. "This isn't
  just a sports event. It's a pop-up market of thousands of new customers at your doorstep."
- **You-focused, action-first:** copy speaks to the business owner as "you" and constantly
  converts advice into a checklist ("ACTION" callouts with numbered, sub-60-minute tasks).
- **No jargon, said explicitly:** the deck opens by promising "a no-jargon zone — every
  action today is doable in under an hour." Avoid consulting-speak; prefer concrete verbs
  (Confirm, Publish, Brief, Acknowledge) over abstractions.
- **Contrast structure for memorability:** repeated "X, not Y" framing — "They don't
  remember the transaction. They remember the interaction." Use this rhetorical device for
  key-takeaway slides.
- **Numbers do the persuading:** big stats stand alone on a slide ($900,000+ potential
  spend, 4,500 visitors, 450 returning) rather than being buried in paragraphs.
- **Sentence case throughout**, not Title Case, for body copy and buttons; slide titles use
  Title Case sparingly. No emoji in the deck body — the only informal touches are quoted
  first-person visitor lines used as evidence ("The lady at the coffee shop told us about
  the river walk...").
- **Sign-off is plain:** a single email address, no marketing flourish ("Email me:
  conner@wearejunction.com").

## Visual foundations
- **Palette:** deep navy/indigo (`--navy-900` #11154b, `--navy-800` #233f5f) carries
  headings and big stat numbers. A single warm gold (`--gold-500` #f2a900) marks every
  "ACTION" label and step badge — it is the only saturated, attention color in the deck,
  so use it sparingly and consistently for calls to action. Three pastel tints (sage
  `#dae9d3`, mint `#b5e5d6`, peach `#ffdaa4`) shade small chips/badges behind icons or
  short labels. Base surface is white; black is used for primary body text, not navy.
- **Type:** the deck is set in **Basis Grotesque Pro** (Light / Regular / Medium), a
  licensed Colophon Foundry face — no font files were provided. **Work Sans substitutes**
  here (flagged below). The signature move: large headlines run in the **Light** weight,
  never bold — confidence through restraint, not shouting. Body copy and stat labels use
  Regular/Medium.
- **Layout:** generous white space, one idea per slide. Big numbers get their own slide
  with a one-line caption. Three- and six-item grids are used for parallel lists (types of
  visitor-economy businesses, three digital priorities, before/during/after social posts).
- **Cards:** two card styles recur — (1) plain white cards with a thin pastel-tinted icon
  badge, no border, no shadow, used in grids; (2) a solid near-black rounded-rectangle
  panel (`--shadow-dark-panel`, `--radius-lg`) used to pull a quote or a key line out of a
  photo background — high-contrast white text on black, no gradient.
- **Photography:** real, unfiltered, warm daylight community photography (small-town main
  street, mountains-behind-suburb skylines) — not stock-glossy, not black & white, no
  heavy grain or duotone. Photos run full-bleed or as a single large rectangle, never
  collaged or cut into shapes.
- **Icons:** small (36–58px) solid-black flat glyph icons (dollar sign, lightbulb, mortar
  & pestle, pizza slice, speech bubble) — one flat-fill icon per concept, no outline
  style, no duotone, no emoji. These read as a generic flat icon set rather than a custom
  Junction icon font (see Iconography below).
- **Corners:** small UI elements (chips, badges) use a pill radius; larger panels use
  `--radius-lg` (20px); no sharp-cornered cards observed.
- **Motion / states:** the source is a static PDF, so no animation, hover, or press states
  exist in the material. Recommended defaults for on-brand interactive work: simple
  opacity/darken on hover, no bounce, ease-out ~150–200ms — kept deliberately understated
  to match the deck's restrained tone. Treat this as a reasonable default, not a measured fact.

## Iconography
No custom icon font or SVG sprite was found — the deck's icons are small flat black
raster glyphs dropped in per-slide (dollar sign, lightbulb, mortar & pestle, pizza slice,
speech bubble, gas pump, etc.), most likely pulled from a generic stock icon library.
**Substitution:** components here use **Font Awesome 6 Solid** via CDN as the closest
flat, solid-fill match to the deck's icon weight. Flagging this — if Junction has a
preferred icon set, swap `assets/` accordingly. No emoji or unicode glyphs are used as
icons anywhere in the source.

## Fonts — action needed
Missing: **Basis Grotesque Pro** (Regular, Light, Medium) webfont files. Work Sans
(Google Fonts) is wired up in `tokens/typography.css` as the nearest free substitute.
**Please send the licensed Basis Grotesque Pro `.woff2` files** if you have access, and
they can be dropped into `assets/fonts/` with a one-line edit to `tokens/typography.css`.

## Intentional additions
No component library or codebase was provided — only a slide deck. The components below
are the deck's own recurring visual widgets (stat callouts, action tags, pastel chips,
icon badges, dark quote panels), not a generic invented UI kit. No standard web
primitives (Button, Input, Tabs, etc.) were added since the source never shows a UI,
only slides.

## Index
- `styles.css` — global stylesheet entry (imports `tokens/*`)
- `tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css` — design tokens
- `assets/logo/` — Junction wordmark; an example client logo (Town of Okotoks) kept for
  reference only, not part of Junction's own brand
- `assets/photography/` — source photography pulled from the deck
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand)
- `components/slides/` — StatCallout, ActionTag, PastelChip, IconBadge, QuoteCard
- `templates/consulting-deck/` — a sample webinar-deck template built from these pieces
- `SKILL.md` — portable skill file for use in Claude Code
