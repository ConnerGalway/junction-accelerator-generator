# Junction Accelerator Page Generator

You are working inside the Junction Accelerator Generator. Your job is to produce
a polished, fully-functional HTML accelerator page for a client by reading their
`plan.md` and filling the template.

---

## When asked to generate a page

Command pattern:
> "Generate an accelerator page for [Client Name] using clients/[client-slug]/plan.md
> Coach email: [coach@email.com]
> Cohort start date: [YYYY-MM-DD]"

### Step 1 — Read both files
- Read `clients/[slug]/plan.md`
- Read `template/accelerator-template.html`
- Read `brand/elearningu-brand.md`

### Step 1.5 — Supabase integration additions (required for every page)

Every generated `index.html` must include the following for the live dashboard system.
These are non-negotiable — do not omit them even if the template doesn't show them.

**1. In `<head>` — Supabase JS SDK (before any other scripts):**
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

**2. On the `<body>` tag — client slug attribute:**
```html
<body data-client-slug="[client-slug]">
```
Use the exact client slug (e.g. `alberni-adventure-gear`). This is how `auth.js` and `progress.js` identify which client page they're on.

**3. On every week section container — week ID and data attribute:**
```html
<section id="week-N" class="week-block" data-week="N">
```
Both `id="week-N"` and `data-week="N"` must be on the same element. N = 1–12.
`data-week` is how `progress.js` knows which week a checkbox belongs to.

**4. On every checkbox in the 90-day roadmap — data-key attribute:**

| Checkbox type | Format | Example |
|---|---|---|
| Action item | `data-key="week-N-action-M"` | `data-key="week-3-action-2"` |
| Checklist item | `data-key="week-N-check-M"` | `data-key="week-3-check-1"` |

N = week number. M = index of that item within the week, starting at 1.
This is the primary key used to save and load progress in Supabase.

**5. Before `</body>` — shared scripts (in this exact order):**
```html
<script src="/shared/supabase-client.js"></script>
<script src="/shared/auth.js"></script>
<script src="/shared/progress.js"></script>
```

---

### Step 2 — Fill the simple placeholders
Replace every `{{PLACEHOLDER}}` token with the corresponding value from the plan.
See the full list in the template header comment.

**Deriving values that aren't spelled out in the plan:**
| Placeholder | How to derive it |
|---|---|
| `{{CLIENT_SLUG}}` | Lowercase, hyphens, no special chars. e.g. `alberni-adventure-gear` |
| `{{TOTAL_TASKS}}` | Count every checklist item across all roadmap weeks |
| `{{TACTIC_N_TOTAL}}` | Count checklist items assigned to that tactic in the roadmap |
| `{{TACTIC_N_NAV_LABEL}}` | Short 2-4 word label for the sidebar. Derive from tactic title. |
| `{{WM_SUBLINE}}` | 1-2 sentences of warm encouragement that acknowledges where the client is and frames the plan as the next step. Keep it specific to them, not generic. |
| `{{PAGE_SUBTITLE}}` | 1-sentence version of the goal — tighter than the goal paragraph |

### Step 3 — Handle optional blocks
- `<!-- IF:GRANT_BUDGET -->` — include only if plan has a grant budget. Remove the IF markers if keeping, remove the whole block if not.
- `<!-- IF:TARGET_MILESTONE -->` — include only if plan has a specific target event/milestone.
- `<!-- IF:GBP_QUICK_WINS -->` — include only if plan has a GBP Quick Wins section. Also show/hide the GBP nav item accordingly.

### Step 4 — Rebuild the tactic pages
Each tactic page needs full content. For each of the 3 tactics, rebuild:

**Overview tab** (section-blocks):
- "What We Heard From You" — client's specific context from the plan
- "What This Is" — what the tactic actually is
- "Why It Matters" — the reasoning for prioritising it

**Implementation Steps tab** (Part A, B, C sections):
- Numbered steps with sub-bullets
- Add `id="step-tN-N"` to each `<li class="step-item">` (used by "how to" links)
- Format: `id="step-t1-1"` through `id="step-t3-10"` (etc.)

**Success Metrics tab** — fill the metrics table with 30/60/90 day targets

**Tips & Resources tab** — tips from the plan + relevant resource links

### Step 5 — Rebuild the 90-Day Roadmap
For each of the 12 weeks (or however many the plan has):
- Set the week card `id="wc-N"` and week number badge
- Set the week title
- Fill "This Week's Actions" bullet list
- Fill "Completion Checklist" items

**"How to" links** — the plan.md annotates checklist items with `→ links to: Tactic X / Step N`.
For each annotated item, add a `<button class="howto-link" onclick="howToLink('tacticN','step-tN-N')">how to</button>` on the **corresponding action bullet** in "This Week's Actions" (not on the checklist item).

Match action bullets to checklist items semantically — the action that produces the checklist outcome gets the "how to" link.

### Step 6 — Update JavaScript arrays
Find these three JS arrays/objects and update them to match the new checklist IDs:

```javascript
const ALL_CHECK_IDS = [/* all rw checklist IDs */];
const WEEK_CHECKS   = { 1: ['rw1_d1', ...], 2: [...], ... };
const TACTIC_CHECKS = { 1: ['rw1_d1', ...], 2: [...], 3: [...] };
```

Also update `MONTH_CHECKS` if present.

The checklist ID convention is `rwWEEK_dN` — e.g. `rw1_d1`, `rw3_d2`, etc.

### Step 7 — Adapt the onboarding tour
The tour already has 8 steps. Update the `desc` (and `mobileDesc` where present)
in `TOUR_STEPS` to match this client's context. Keep the structure and target IDs
the same — only change the descriptive text to feel relevant to this client.

### Step 8 — Generate plan.json

Write a second output file to `clients/[slug]/plan.json`. This file powers the weekly email system.

**Structure:**
```json
{
  "client_name": "Alberni Adventure Gear",
  "client_slug": "alberni-adventure-gear",
  "goal": "...",
  "coach_email": "coach@email.com",
  "weeks": [
    {
      "week": 1,
      "month": 1,
      "title": "Week 1 — Getting Found Online",
      "actions": ["plain text action 1", "plain text action 2"],
      "checklist": ["plain text item 1", "plain text item 2"],
      "deep_link": "https://accelerator.elearningu.com/alberni-adventure-gear/#week-1"
    }
  ]
}
```

**Rules:**
- `client_name`: slug formatted as title case (hyphens → spaces, capitalise each word)
- `client_slug`: exact slug, lowercase with hyphens
- `goal`: copy **verbatim** from the `## Goal` section of `plan.md` — no edits, no summarising
- `coach_email`: use the value from the generation command `Coach email:` parameter
- `weeks`: always exactly **12 objects** — one per roadmap week
- `month`: 1 for weeks 1–4, 2 for weeks 5–8, 3 for weeks 9–12
- `title`: the week heading from the roadmap (e.g. `"Week 3 — Getting Found on Google"`)
- `actions`: bullet points from "This Week's Actions" in the roadmap — **plain text only**, strip all markdown (no `**bold**`, no links, no bullet characters)
- `checklist`: items from "Completion Checklist" in the roadmap — plain text only
- `deep_link`: always `https://accelerator.elearningu.com/[client-slug]/#week-N`

**Quality checks:**
- [ ] Exactly 12 week objects — no more, no fewer
- [ ] `goal` is copied verbatim (check for accidental paraphrasing)
- [ ] All markdown stripped from `actions` and `checklist` strings
- [ ] `deep_link` uses `#week-N` anchor (hash, not slash)
- [ ] `coach_email` matches the parameter from the generation command

---

### Step 9 — Output and git
1. Write the completed file to `clients/[slug]/index.html`
2. Write `clients/[slug]/plan.json`
3. Copy both to `/tmp/[slug]-review/` as a preview copy
4. Report: placeholder count resolved, optional blocks included/excluded,
   total checklist items, total "how to" links, total weeks in plan.json

---

## When asked to update an existing page

> "Update the accelerator page for [Client] — [what changed]"

1. Read the existing `clients/[slug]/index.html` and `clients/[slug]/plan.md`
2. Apply only the changes described
3. Do NOT regenerate sections that weren't mentioned
4. Commit with a clear message describing what changed

---

## Quality checklist (run mentally before writing the file)

- [ ] No `{{PLACEHOLDER}}` tokens remain in the output
- [ ] No `<!-- IF:... -->` markers remain (all resolved)
- [ ] ALL_CHECK_IDS matches the actual checklist item count
- [ ] Every "how to" link points to a real `step-tN-N` id that exists in the page
- [ ] Optional sections correctly included or excluded per the plan
- [ ] Tour step descriptions feel specific to this client, not generic
- [ ] localStorage keys use `{{CLIENT_SLUG}}` (not `aag_`)

---

## File locations

| File | Purpose |
|---|---|
| `template/accelerator-template.html` | Source template — never edit directly for a client |
| `clients/[slug]/plan.md` | Client implementation plan (input) |
| `clients/[slug]/index.html` | Generated page (output) |
| `brand/elearningu-brand.md` | Brand colours, fonts, logo rules |
| `PLAN_FORMAT.md` | The standard format all plan.md files must follow |
