# eLearningU Design System

eLearningU is an online learning platform for the tourism industry — courses, certifications, and training for tourism professionals and destination organizations.

**Source material:** `uploads/eLearningU_Brand Cheat Sheet (1).pdf` (single-page brand cheat sheet: logo, colour palette, typography). No codebase, Figma file, or additional decks were provided — this system is built from that one document plus sound brand-system defaults layered on top where the sheet was silent (spacing scale, shadows, component states).

## Content fundamentals

The brand sheet is visual-only — no marketing copy or UI text was supplied — so voice/tone is inferred conservatively from headline examples on the sheet ("Building Digital Futures", "Empowering Every Learner") and the education/tourism category:
- **Aspirational, direct headlines.** Short noun-phrases, verb + adjective + noun ("Building Digital Futures"), no punctuation, capitalized as title case.
- **"Every" / inclusive framing** ("Empowering Every Learner") suggests an inclusive, encouraging tone rather than corporate/dry.
- No emoji present on the source sheet — treat emoji as **not** part of the brand voice.
- No first/second-person pattern is evidenced in source; default to direct address ("you") for product UI copy, consistent with most learning-platform product conventions, until real copy is provided.
- **Ask the user** for real product copy/UX writing samples to refine this section — everything here beyond the two headline examples is an inference, not sourced.

## Visual foundations

- **Colour:** Primary Navy `#11154b` is the dominant brand colour (logo, headline text, primary buttons). Text Dark `#181c2d` for body copy. Slate Grey `#708090` as a secondary/neutral. Link Blue `#067cbc` for links/interactive accents. Mint `#aadab6` as a light accent (badges, highlights, success-adjacent chips). Cream `#fcf5ec` as the primary page background (warm off-white, not stark white) with White `#ffffff` for cards/surfaces sitting on top of it.
- **Type:** Raleway (SemiBold for TITLE/42pt, Bold for HEADING/32pt) for display/heading type; Open Sans Regular for BODY/16pt. This is a classic geometric-display + humanist-body pairing — headlines feel confident and modern, body copy stays highly legible. Line spacing on display sizes is tight (1.0); body text should breathe more (we use 1.5–1.7).
- **Logo:** wordmark "eLearningU" set in Raleway-like rounded sans, with a distinctive mark combining a graduation cap and a paper-airplane forming the tail of the "e" — a direct visual pun on "digital learning + travel/tourism". Available as full lockup (icon+wordmark) and icon-only, in navy and white.
- **Backgrounds:** no photography, illustration, gradients, or textures were present on the source sheet. Flat colour fields only (navy, cream, white). Until real product screens are supplied, UI kit surfaces stay flat-colour; do not invent gradients or photographic treatments.
- **Shape language:** the logo mark is soft/rounded (cap corners, curved "e", curved plane). Components in this system use moderately rounded corners (6–16px) and pill shapes for tags/badges to match.
- **Shadows:** none specified in source; a soft, low-contrast navy-tinted shadow system was authored for cards/elevation (see `tokens/spacing.css`), since flat cream/white surfaces need some depth cue to separate cards from the page.
- **Motion, hover/press, borders:** not specified in source. Components use conservative, typical SaaS patterns: subtle darken-on-hover / scale-down-on-press for buttons, 1px `--border-subtle` borders on cards and inputs, no blur/glass effects (nothing in the source suggests translucency).
- **Corner radii:** `--radius-sm` 6px (inputs, small chips), `--radius-md` 10px (buttons, cards), `--radius-lg` 16px (large panels/modals), `--radius-pill` for tags/badges.

## Iconography

No icon set, icon font, or SVG sprite was included in the source material. **Lucide** icons (CDN, MIT-licensed, similar stroke-based/rounded style consistent with the logo's rounded shapes) are used as a substitution in components/UI kit — flagged here as a substitution, not a brand-sourced asset. Emoji are not used as icons.

## Fonts

Raleway and Open Sans are both used exactly as named on the source sheet — both are freely available on Google Fonts, so no substitution was necessary. Loaded via `tokens/fonts.css`.

## Index

- `styles.css` — root stylesheet, imports all tokens.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `fonts.css`.
- `assets/` — `logo-wordmark-navy.png`, `logo-wordmark-white.png`, `logo-icon-navy.png`, `logo-icon-white.png` (extracted + recoloured from the source PDF's vector logo).
- `guidelines/` — foundation specimen cards (`@dsCard`-tagged HTML) for the Design System tab: Colors, Type, Spacing, Brand groups.
- `components/` — reusable React primitives: `core/` (Button, IconButton, Badge, Tag, Card), `forms/` (Input, Select, Checkbox, Radio, Switch), `feedback/` (Toast, Tooltip, Dialog), `navigation/` (Tabs).
- `ui_kits/course-platform/` — click-through recreation of an eLearningU-style course platform (dashboard, course catalog, course player, login).
- `SKILL.md` — Claude Code-compatible skill wrapper.

## Intentional additions

No component or screen inventory was provided by any source (no codebase, no Figma). Per the from-scratch guidance, a standard component set (Button, IconButton, Input, Select, Checkbox, Radio, Switch, Card, Badge, Tag, Tabs, Dialog, Toast, Tooltip) was authored, sized to a course-platform product.

## Caveats — please help iterate

- The brand sheet gave colours, type, and logo only. Everything about **components, screens, spacing scale, shadows, motion, and copy voice** is a reasonable first pass invented to fit the brand, not sourced. If you have a live product, Figma file, or additional decks, attach them and this system should be rebuilt against that ground truth.
- Iconography is a Lucide substitution — if eLearningU has its own icon set, please provide it.
- No real product copy was available — the "Content fundamentals" section is inferred from two headline fragments only.
