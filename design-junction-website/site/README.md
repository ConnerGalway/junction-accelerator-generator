# Junction Consulting: website

A built homepage, not an artboard. Plain HTML, one stylesheet, one script, no
build step and no dependencies. Open `index.html` through any static server.

```bash
python3 -m http.server 4321 --directory design-junction-website/site
```

## Files

| File | What it holds |
| --- | --- |
| `index.html` | The homepage |
| `styles.css` | Tokens and every component. Sections 1 to 9, signposted in the file |
| `motion.js` | Reveals, counters, route drawing, mobile menu, newsletter |
| `assets/` | Wordmark, client logos, photography |

## Decisions made here, and why

**Gold went back to meaning one thing.** The brand rules reserve `#f2a900` for
action, but the previous design also used it for link underlines, a play button,
a progress bar and a step badge. When the action colour marks six different
things it stops marking any of them. Gold now appears on primary buttons, on the
one list item that is a guarantee rather than a deliverable, and nowhere else.
Link underlines moved to green.

**The wayfinding concept became structure.** It had been labels only ("Pick your
route", "Route 01"), which is the sign-panel costume the brand rules rule out.
Now a single line arrives above the two service cards, splits, and lands on each
one. At the foot of the page the two branches converge back into one and point at
the enquiry form. One motif, used twice, doing the work the labels were only
describing.

**Rhythm replaced a stack of equal blocks.** Every section previously ran at the
same `88px 44px`. Backgrounds now alternate paper, green, paper, sunk paper,
surface, green, and section padding varies with importance.

**Cards need a ground darker than themselves.** The tools sit on `--paper-sunk`
rather than on `--surface`, which is the colour the cards are made of.

**`#857D6E` failed contrast.** It ran about 3.4:1 on paper and carried 11px mono
labels. Now `#6E6659`, about 4.7:1.

**The homepage was missing its lead engines.** The site strategy names the
Digital Snapshot and the Program Builder as the flagship conversion tools. Both
now have a section.

## Motion

Custom easing, because the built-in CSS curves are too weak to read as
intentional:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);   /* enter and exit */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1); /* movement on screen */
```

- Every pressable element scales to `0.97` on `:active`.
- Hover is gated behind `@media (hover: hover) and (pointer: fine)` so taps on
  touch devices do not trigger hover states.
- Groups marked `data-stagger` cascade their children 60ms apart.
- Counters run on `requestAnimationFrame` with an ease-out cubic, and reserve
  their final width before counting so digits do not reflow the layout.
- The progress bar animates `transform: scaleX()`, not `width`.
- The mobile menu enters in 260ms and leaves in 160ms. Leaving should feel
  immediate.
- `prefers-reduced-motion` removes movement and keeps opacity.

**Motion never gates content.** `data-motion` is set before first paint so
nothing flashes in and then hides, and a 1500ms timer removes it if `motion.js`
never arrives. With JS off, nothing is hidden in the first place.

## Adding a page

Reuse `styles.css` as is. A section is:

```html
<section class="section wrap" id="name">
  <p class="label label--green" data-reveal>Eyebrow</p>
  <h2 class="h2" data-reveal>Heading</h2>
  <div class="trio" data-stagger>
    <a href="#" class="card" data-reveal>...</a>
  </div>
</section>
```

Put `data-reveal` on anything that should animate in, and `data-stagger` on its
container to cascade the children. Backgrounds: `panel--green`, `panel--surface`,
`panel--sunk`, or nothing for paper.

## Known gaps

- Nav links and card links point at on-page anchors. They need real URLs once
  the other pages exist.
- The newsletter form confirms in place. No endpoint is wired up.
- The play button on the JunctionU card has no video behind it.
- Type substitutes Work Sans for Basis Grotesque Pro in the design system, but
  this site uses Overpass per the locked brand decisions in `../CLAUDE.md`. The
  two disagree and someone should settle it.
