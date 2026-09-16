# Junction Dashboard Generator

You are working inside the Junction Dashboard Generator. Your job is to produce
polished, fully-functional HTML dashboard pages by reading a client's `plan.md`
and filling the appropriate template.

---

# Part 1: Shared Preamble

These rules apply to **every dashboard type** (accelerator, experience, etc.).

---

## Generation method (hard constraint)

**NEVER write a dashboard file from scratch. NEVER regenerate the whole document in one pass. NEVER use a subagent task to generate the dashboard.**

The templates are roughly 6,000 lines. Writing them wholesale drops sections, corrupts the JS arrays, and takes hours. Every change must be a targeted edit against a copied file.

**Required procedure:**
1. Copy the template to the output path first: `cp template/[template].html [output-dir]/[slug]/index.html`
2. Edit that copy in place with targeted replacements, one region at a time:
   - Placeholders
   - The three Track/Tactic pages
   - The twelve roadmap weeks
   - The four JS arrays
   - The tour text

---

## Writing style rules

**Never use em dashes.** All dashboards, assessments, and reports must avoid em dashes (the long dash character). Instead:
- Use a colon to introduce a list or elaboration
- Use a period to start a new sentence
- Use a comma for light pauses
- Use "and" or rewrite the sentence

Examples:
- Wrong: "Five things worth fixing this week — these land on your plan"
- Right: "Five things worth fixing this week. These land on your plan"
- Wrong: "Week 3 — Getting Found on Google"
- Right: "Week 3: Getting Found on Google"

**Use Canadian spelling.** Use Canadian/British spelling for most words (e.g., "colour", "favourite", "optimise"). Exception: always use "program" (not "programme").

---

## Supabase integration (required for every page)

Every generated `index.html` must include the following for the live dashboard system.
These are non-negotiable. Do not omit them even if the template doesn't show them.

**1. In `<head>`: Supabase JS SDK (before any other scripts)**
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

**2. On the `<body>` tag: client slug attribute**
```html
<body data-client-slug="[client-slug]">
```
Use the exact client slug (e.g. `alberni-adventure-gear`). This is how `auth.js` and `progress.js` identify which client page they're on.

**3. On every week section container: data-week attribute**
```html
<div class="week-card" id="wc-N" data-week="N">
```
The `data-week="N"` attribute is required on the week container element. N = 1-12.
`data-week` is how `progress.js` knows which week a checkbox belongs to.
The container can use any class/id naming (e.g., `week-card`, `week-block`), but must have `data-week`.

**4. On every checkbox in the roadmap: data-key attribute**

| Checkbox type | Format | Example |
|---|---|---|
| Action item | `data-key="week-N-action-M"` | `data-key="week-3-action-2"` |
| Checklist item | `data-key="week-N-check-M"` | `data-key="week-3-check-1"` |

N = week number. M = index of that item within the week, starting at 1.
This is the primary key used to save and load progress in Supabase.

Example checkbox HTML:
```html
<input type="checkbox" class="check-input" id="rw1_d1" data-key="week-1-check-1" onchange="onCheck(this)">
```
The `id` attribute (e.g., `rw1_d1`) is used by the inline localStorage backup system.
The `data-key` attribute (e.g., `week-1-check-1`) is used by `progress.js` for Supabase sync.

**5. Before `</body>`: shared scripts (in this exact order)**
```html
<script src="/shared/supabase-client.js"></script>
<script src="/shared/auth.js"></script>
<script src="/shared/progress.js"></script>
```

**6. Progress counting must read from DOM**

The inline `countChecked()` function must read checkbox state from the DOM, not from the `state.checks` object. This ensures progress trackers update correctly when `progress.js` loads/changes checkboxes from Supabase.

```javascript
// CORRECT: Read from DOM
function countChecked(ids) {
  return ids.filter(id => {
    const el = document.getElementById(id);
    return el && el.checked;
  }).length;
}

// WRONG: Read from state object (won't reflect Supabase changes)
function countChecked(ids) {
  return ids.filter(id => state.checks[id]).length;
}
```

Also ensure `updateProgress` is globally accessible so `progress.js` can call it:
```javascript
// Define at top level of script (not inside a function)
function updateProgress() { ... }
```

---

## JavaScript array conventions

Every dashboard has these four arrays/objects that must match the actual checklist IDs:

```javascript
const ALL_CHECK_IDS = [/* all rw checklist IDs */];
const WEEK_CHECKS   = { 1: ['rw1_d1', ...], 2: [...], ... };
const MONTH_CHECKS  = { 1: [...], 2: [...], 3: [...] };
const TACTIC_CHECKS = { 1: ['rw1_d1', ...], 2: [...], 3: [...] };
```

The checklist ID convention is `rwWEEK_dN`, e.g. `rw1_d1`, `rw3_d2`, etc.

---

## General quality checklist

Run this mentally before writing any dashboard file:

- [ ] No `{{PLACEHOLDER}}` tokens remain in the output
- [ ] No `<!-- IF:... -->` markers remain (all resolved)
- [ ] ALL_CHECK_IDS matches the actual checklist item count
- [ ] Every "how to" link points to a real `step-tN-N` id that exists in the page
- [ ] Optional sections correctly included or excluded per the plan
- [ ] Tour step descriptions feel specific to this client, not generic
- [ ] localStorage keys use the client slug (not a hardcoded prefix)
- [ ] Strategy page has goal, positioning, and all 3 objectives filled
- [ ] Print-only content has correct client name, goal, and coach email

---

# Part 2: Routing Table

Determine which type to generate based on the command:

| Command says | Plan format | Template | Output directory |
|---|---|---|---|
| "accelerator page" | `PLAN_FORMAT.md` | `template/accelerator-dashboard-template.html` | `clients/[slug]/` |
| "experience dashboard" | `PLAN_FORMAT_EXPERIENCE.md` | `template/experience-template.html` | `my-clients/[slug]/` |

---

# Part 3: Type-Specific Generation Steps

---

## Type A: Accelerator Page (Marketing)

Command pattern:
> "Generate an accelerator page for [Client Name] using clients/[client-slug]/plan.md
> Coach email: [coach@email.com]
> Cohort start date: [YYYY-MM-DD]
> Assessment date: [YYYY-MM-DD]"

### Step 1: Read both files
- Read `clients/[slug]/plan.md`
- Read `template/accelerator-dashboard-template.html`
- Read `brand/elearningu-brand.md`

### Step 2: Fill the simple placeholders
Replace every `{{PLACEHOLDER}}` token with the corresponding value from the plan.
See the full list in the template header comment.

**Deriving values that aren't spelled out in the plan:**
| Placeholder | How to derive it |
|---|---|
| `{{CLIENT_SLUG}}` | Lowercase, hyphens, no special chars. e.g. `alberni-adventure-gear` |
| `{{CLIENT_NAME}}` | Title-cased client name. e.g. `Alberni Adventure Gear` |
| `{{TOTAL_TASKS}}` | Count every checklist item across all roadmap weeks |
| `{{TACTIC_N_TOTAL}}` | Count checklist items assigned to that tactic in the roadmap |
| `{{TACTIC_N_NAV_LABEL}}` | Short 2-4 word label for the sidebar. Derive from tactic title. |
| `{{WM_SUBLINE}}` | 1-2 sentences of warm encouragement that acknowledges where the client is and frames the plan as the next step. Keep it specific to them, not generic. |
| `{{PAGE_SUBTITLE}}` | 1-sentence version of the goal, tighter than the goal paragraph |
| `{{GOAL_TEXT}}` | The full goal paragraph from the plan. Used in Strategy page and print header |
| `{{STRATEGIC_POSITIONING}}` | The strategic positioning statement from the plan |
| `{{ASSESSMENT_DATE}}` | Date of the client's assessment (from command or plan). Format: `Month DD, YYYY` |
| `{{COHORT_START_DATE}}` | Cohort start date from the command. Format: `Month DD, YYYY` |
| `{{COACH_EMAIL}}` | Coach email from the command. Used in print footer |
| `{{OBJECTIVE_N_TITLE}}` | Short title for objective N (1-3). From the Objectives section of the plan. |
| `{{OBJECTIVE_N_DESCRIPTION}}` | 1-2 sentence description for objective N. |
| `{{OBJECTIVE_N_TACTIC_PILL}}` | Tactic pill text, e.g. `Tactic 1 · Weeks 1-4` |
| `{{OVERALL_SCORE}}` | Numeric score (0-100) from the assessment |
| `{{OVERALL_GRADE}}` | Letter grade (A, B+, C, etc.) from the assessment |
| `{{ASSESSMENT_SUMMARY}}` | 1-2 sentence summary of the assessment findings |
| `{{REPORT_STRENGTHS}}` | `<li>` items for key strengths (4-5 items) |
| `{{REPORT_GAPS}}` | `<li>` items for critical gaps (4-5 items) |
| `{{PRIORITY_1_TEXT}}` | Text describing the #1 priority from the assessment |
| `{{REPORT_QUICK_WINS}}` | `<li>` items for quick wins (5 items) |
| `{{REPORT_CATEGORIES}}` | HTML for the 8 category breakdown items (see template structure) |
| `{{REPORT_RECOMMENDATIONS}}` | HTML for 4 priority recommendations (see template structure) |

### Step 3: Handle optional blocks
- `<!-- IF:GRANT_BUDGET -->`: include only if plan has a grant budget. Remove the IF markers if keeping, remove the whole block if not.
- `<!-- IF:TARGET_MILESTONE -->`: include only if plan has a specific target event/milestone.
- `<!-- IF:GBP_QUICK_WINS -->`: include only if plan has a GBP Quick Wins section. Also show/hide the GBP nav item accordingly.

### Step 3.5: Build the Assessment page

The Assessment page displays the client's digital marketing audit results. Rebuild the entire `<section id="page-assessment">` content based on the client's assessment data.

**Required sections:**
1. **Assessment Hero**: Title, assessment date, and "Complete" badge
2. **Summary Section**: Overall grade with breakdown:
   - Overall grade badge (A/B/C/D/F)
   - Grade breakdown metrics (e.g., Website: B+, SEO: C, Social: A-)
   - Key summary points as bullet list
3. **Recommendations Section**: Priority recommendations:
   - Use `.recommendation-card` for each recommendation
   - Include priority level, category, and description
4. **Audit Sections**: Detailed findings per category:
   - Website Performance (with metrics grid)
   - SEO Analysis (with keyword data if available)
   - Social Media Analysis (with platform-specific cards)
   - Google Business Profile (if applicable)

**Assessment content sources:**
- Assessment date from command parameter or plan meta
- Grades and metrics from the client's audit data
- Recommendations prioritized by impact

### Step 3.6: Build the Strategy page

The Strategy page presents the 90-day plan overview. Fill in the following sections:

**1. Goal Section** (`.strategy-goal`)
- Copy the full `{{GOAL_TEXT}}` from the plan's Goal section

**2. Strategic Positioning** (`.strategy-positioning`)
- Copy `{{STRATEGIC_POSITIONING}}` from the plan

**3. Objectives Cards** (`.strategy-objectives`)
Build 3 objective cards, one per objective from the plan:
```html
<div class="objective-card">
  <div class="objective-number">1</div>
  <h3 class="objective-title">{{OBJECTIVE_1_TITLE}}</h3>
  <p class="objective-description">{{OBJECTIVE_1_DESCRIPTION}}</p>
  <span class="objective-tactic-pill">{{OBJECTIVE_1_TACTIC_PILL}}</span>
</div>
```

**4. Tactics Overview** (`.tactics-overview`)
Build 3 tactic overview cards showing:
- Tactic number and title
- Tactic subtitle/description
- Phase label (e.g., "Foundation", "Growth", "Scale")

### Step 4: Rebuild the tactic pages
Each tactic page needs full content. For each of the 3 tactics, rebuild:

**Overview tab** (section-blocks):
- "What We Heard From You": client's specific context from the plan
- "What This Is": what the tactic actually is
- "Why It Matters": the reasoning for prioritising it

**Implementation Steps tab** (Part A, B, C sections):
- Numbered steps with sub-bullets
- Add `id="step-tN-N"` to each `<li class="step-item">` (used by "how to" links)
- Format: `id="step-t1-1"` through `id="step-t3-10"` (etc.)

**Success Metrics tab**: fill the metrics table with 30/60/90 day targets

**Tips & Resources tab**: tips from the plan + relevant resource links

### Step 4.5: Tactic Page Enhancements (Optional)

The template includes CSS and JS for enhanced tactic step presentations. Use these when the plan includes screenshots, mockups, or external resources.

**Resource Links** (`.tactic-step-resource`)
Add links to official documentation below step bullets:
```html
<a href="https://support.google.com/..." class="tactic-step-resource" target="_blank">View GA4 documentation</a>
```

**Browser Mockups** (`.tactic-mockup`)
Wrap screenshots in a browser frame for context:
```html
<div class="tactic-mockup">
  <div class="tactic-mockup-chrome">
    <span class="tactic-mockup-dot red"></span>
    <span class="tactic-mockup-dot yellow"></span>
    <span class="tactic-mockup-dot green"></span>
    <div class="tactic-mockup-url">analytics.google.com</div>
  </div>
  <div class="tactic-mockup-body">
    <img src="/assets/client-mockups/screenshot.png" alt="Description" class="lightbox-trigger" onclick="openLightbox(this.src, this.alt)">
  </div>
  <div class="tactic-mockup-label">Caption text here</div>
</div>
```

**Two-Column Layout** (`.tactic-step-row`)
Place text and media side-by-side:
```html
<div class="tactic-step-row">
  <div class="tactic-step-text-col">
    <div class="tactic-step-title">Step Title</div>
    <ul class="tactic-step-bullets">...</ul>
  </div>
  <div class="tactic-step-media-col">
    <div class="tactic-mockup">...</div>
  </div>
</div>
```

**Lightbox Images**
**IMPORTANT:** ALL images in tactic pages (mockups, screenshots, shot lists, galleries) MUST have lightbox functionality. Add `class="lightbox-trigger"` and `onclick="openLightbox(this.src, this.alt)"` to every content image. The only exceptions are UI elements like logos and icons.

Example:
```html
<img src="/assets/client-mockups/screenshot.png" alt="Description" class="lightbox-trigger" onclick="openLightbox(this.src, this.alt)">
```

### Step 5: Rebuild the 90-Day Roadmap
For each of the 12 weeks (or however many the plan has):
- Set the week card `id="wc-N"` and week number badge
- Set the week title
- Fill "This Week's Actions" bullet list
- Fill "Completion Checklist" items

**"How to" links**: the plan.md annotates checklist items with `→ links to: Tactic X / Step N`.
For each annotated item, add a `<button class="howto-link" onclick="howToLink('tacticN','step-tN-N')">how to</button>` on the **corresponding action bullet** in "This Week's Actions" (not on the checklist item).

Match action bullets to checklist items semantically. The action that produces the checklist outcome gets the "how to" link.

**PDF Download feature**: The roadmap header includes a "Download PDF" button that triggers `printRoadmap()`. The template includes print-only content that appears when printing:
- Print header with logo, title, client name, and cohort start date
- "About this document" section
- "How to use this roadmap" section
- Goal summary
- Print footer with coach email

All interactive elements (nav, buttons, checkboxes) are hidden in print via `.no-print` class and `@media print` styles. The print layout is optimized for A4/Letter paper.

### Step 6: Update JavaScript arrays
Update ALL_CHECK_IDS, WEEK_CHECKS, MONTH_CHECKS, and TACTIC_CHECKS to match the actual checklist IDs in the roadmap.

### Step 7: Adapt the onboarding tour
The tour already has 8 steps. Update the `desc` (and `mobileDesc` where present)
in `TOUR_STEPS` to match this client's context. Keep the structure and target IDs
the same. Only change the descriptive text to feel relevant to this client.

### Step 8: Generate plan.json

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
      "title": "Week 1: Getting Found Online",
      "actions": ["plain text action 1", "plain text action 2"],
      "checklist": ["plain text item 1", "plain text item 2"],
      "deep_link": "https://accelerator.elearningu.com/alberni-adventure-gear/#week-1"
    }
  ]
}
```

**Rules:**
- `client_name`: slug formatted as title case (hyphens to spaces, capitalise each word)
- `client_slug`: exact slug, lowercase with hyphens
- `goal`: copy **verbatim** from the `## Goal` section of `plan.md`. No edits, no summarising
- `coach_email`: use the value from the generation command `Coach email:` parameter
- `weeks`: always exactly **12 objects**, one per roadmap week
- `month`: 1 for weeks 1-4, 2 for weeks 5-8, 3 for weeks 9-12
- `title`: the week heading from the roadmap (e.g. `"Week 3: Getting Found on Google"`)
- `actions`: bullet points from "This Week's Actions" in the roadmap, **plain text only**. Strip all markdown (no `**bold**`, no links, no bullet characters)
- `checklist`: items from "Completion Checklist" in the roadmap, plain text only
- `deep_link`: always `https://accelerator.elearningu.com/[client-slug]/#week-N`

**Quality checks:**
- [ ] Exactly 12 week objects, no more, no fewer
- [ ] `goal` is copied verbatim (check for accidental paraphrasing)
- [ ] All markdown stripped from `actions` and `checklist` strings
- [ ] `deep_link` uses `#week-N` anchor (hash, not slash)
- [ ] `coach_email` matches the parameter from the generation command

### Step 9: Output and git
1. Write the completed file to `clients/[slug]/index.html`
2. Write `clients/[slug]/plan.json`
3. Copy both to `/tmp/[slug]-review/` as a preview copy
4. Report: placeholder count resolved, optional blocks included/excluded,
   total checklist items, total "how to" links, total weeks in plan.json

### Accelerator-specific quality checklist
In addition to the general checklist:
- [ ] Assessment page has all required sections filled with client audit data
- [ ] `{{COHORT_START_DATE}}` is filled with the date from the command

---

## Type B: Experience Dashboard

Command pattern:
> "Generate an experience dashboard for [Operator Name] using clients/[client-slug]/plan.md
> Coach email: [coach@email.com]"

Note: Experience dashboards do NOT take a cohort start date. The operator sets this themselves via the UI.

### Step 1: Copy template, then edit in place (hard constraint)

**NEVER write the file from scratch. NEVER regenerate the whole document in one pass. NEVER use a subagent task to generate the dashboard.**

The template is roughly 6,000 lines. Writing it wholesale drops sections, corrupts the JS arrays, and takes hours. Every change must be a targeted edit against the copied file.

**Required procedure:**
1. Read `clients/[slug]/plan.md` (follows `PLAN_FORMAT_EXPERIENCE.md`)
2. Read `brand/elearningu-brand.md`
3. Copy the template to the output path: `cp template/experience-template.html my-clients/[slug]/index.html`
4. Edit that copy in place with targeted replacements, one region at a time:
   - Placeholders
   - The three Track pages
   - The twelve roadmap weeks
   - The four JS arrays
   - The tour text

### Step 2: Fill placeholders

**Standard placeholders** (same as accelerator):
| Placeholder | How to derive it |
|---|---|
| `{{CLIENT_SLUG}}` | Lowercase, hyphens, no special chars |
| `{{CLIENT_NAME}}` | Title-cased client name |
| `{{TOTAL_TASKS}}` | Count every checklist item across all roadmap weeks |
| `{{WM_SUBLINE}}` | From the `## Welcome Message` section of the plan |
| `{{PAGE_SUBTITLE}}` | 1-sentence version of the goal |
| `{{GOAL_TEXT}}` | Full goal paragraph from `## Goal` |
| `{{STRATEGIC_POSITIONING}}` | From `## Strategic Positioning` |
| `{{COACH_EMAIL}}` | From command |
| `{{COHORT_START_DATE}}` | Human-readable placeholder for print header (e.g. "To be set") |

**Experience-specific placeholders:**
| Placeholder | How to derive it |
|---|---|
| `{{EXPERIENCE_SENTENCE}}` | Verbatim from `## The Experience` section. Do not edit. |
| `{{PRICE_POINT}}` | From `Meta: Price Point` if present |
| `{{LAUNCH_TARGET_TITLE}}` | First part of `Meta: Launch Target` (the date) |
| `{{LAUNCH_TARGET_DESC}}` | Second part of `Meta: Launch Target` (the revenue goal) |
| `{{TACTIC_N_SUBTITLE}}` | From `Subtitle:` line under each Track header |
| `{{TACTIC_N_NAV_LABEL}}` | From `Short Label:` line under each Track header |
| `{{MONTH_N_NAME}}` | From `Month N Name:` in the Launch Roadmap section |
| `{{OBJECTIVE_N_TITLE}}` | From `### Objective N` Title line |
| `{{OBJECTIVE_N_DESC}}` | From `### Objective N` Description line |
| `{{OBJECTIVE_N_TACTIC_PILL}}` | From `### Objective N` Track Pill line |

**Guide page placeholders:**
| Placeholder | Value |
|---|---|
| `{{GUIDE_URL}}` | URL to the operator's guide document, or `#` if not yet available |
| `{{GUIDE_STATUS}}` | `ready` if URL exists, `coming` if not |
| `{{GUIDE_BUTTON_TEXT}}` | `Open Guide` if ready, `Coming Soon` if not |

**Materials page placeholders (12 total):**
| Placeholder | Purpose |
|---|---|
| `{{MATERIAL_QUESTIONNAIRE_URL}}` | URL or `#` |
| `{{MATERIAL_QUESTIONNAIRE_STATUS}}` | `available` or `coming` |
| `{{MATERIAL_QUESTIONNAIRE_BUTTON}}` | `View Questionnaire` or `Coming Soon` |
| `{{MATERIAL_SESSION1_URL}}` | URL or `#` |
| `{{MATERIAL_SESSION1_STATUS}}` | `available` or `coming` |
| `{{MATERIAL_SESSION1_BUTTON}}` | `Watch Recording` or `Coming Soon` |
| `{{MATERIAL_SESSION2_URL}}` | URL or `#` |
| `{{MATERIAL_SESSION2_STATUS}}` | `available` or `coming` |
| `{{MATERIAL_SESSION2_BUTTON}}` | `Watch Recording` or `Coming Soon` |
| `{{MATERIAL_CALCULATOR_URL}}` | URL or `#` |
| `{{MATERIAL_CALCULATOR_STATUS}}` | `available` or `coming` |
| `{{MATERIAL_CALCULATOR_BUTTON}}` | `Open Calculator` or `Coming Soon` |

For initial generation, set all materials to `coming` status with `#` URLs unless the plan specifies otherwise.

### Step 3: Handle optional blocks
- `<!-- IF:PRICE_POINT -->`: include only if `Meta: Price Point` exists in the plan
- `<!-- IF:LAUNCH_TARGET -->`: include only if `Meta: Launch Target` exists in the plan
- `<!-- IF:BOOKABILITY_CHECKLIST -->`: include only if `Meta: Has Bookability Checklist: yes`

### Step 4: Map Tracks to Tactic pages

**CRITICAL:** The plan uses "Track 1/2/3" terminology, but the HTML template uses "tactic1/2/3" for page IDs and step anchors. You must translate:

| Plan says | HTML uses |
|---|---|
| `## Track 1:` | `<section id="page-tactic1">` |
| `## Track 2:` | `<section id="page-tactic2">` |
| `## Track 3:` | `<section id="page-tactic3">` |
| `Track 1 / Step 3` | `step-t1-3` |
| `Track 2 / Step 5` | `step-t2-5` |
| `Track 3 / Step 1` | `step-t3-1` |

**Worked example:**

The plan contains:
```markdown
## Track 2: Make It Operable
### Implementation Steps
#### Part A: Costing
1. **Calculate fixed costs per departure**
   - List venue rental, equipment, supplies
#### Part B: Pricing
2. **Set your per-guest price**
   - Use the cost-plus method
3. **Build a pricing tier structure**
   - Early bird, standard, premium
```

In the HTML, this becomes:
```html
<section id="page-tactic2" class="page">
  ...
  <li class="step-item" id="step-t2-1">
    <div class="step-num">1</div>
    <div class="step-title">Calculate fixed costs per departure</div>
    ...
  </li>
  <li class="step-item" id="step-t2-2">
    <div class="step-num">2</div>
    <div class="step-title">Set your per-guest price</div>
    ...
  </li>
  <li class="step-item" id="step-t2-3">
    <div class="step-num">3</div>
    <div class="step-title">Build a pricing tier structure</div>
    ...
  </li>
```

And a roadmap action annotated `→ links to: Track 2 / Step 2` becomes:
```html
<button class="howto-link" onclick="howToLink('tactic2','step-t2-2')">how to</button>
```

### Step 5: Rebuild the Launch Roadmap

For each of the 12 weeks:
- Set week card `id="wc-N"` with `data-week="N"`
- Fill week title from `### Week N:` heading
- Fill "This Week's Actions" from the `**Actions:**` list
- Fill "Completion Checklist" from the `**Checklist:**` list

**"How to" links:** When an action bullet has `→ links to: Track X / Step Y`:
1. Strip the annotation from the display text
2. Add a howto button: `<button class="howto-link" onclick="howToLink('tacticX','step-tX-Y')">how to</button>`
3. Place the button on the action bullet, not the checklist item

### Step 6: Update JavaScript arrays

Update these arrays from roadmap checklist items ONLY:
```javascript
const ALL_CHECK_IDS = ['rw1_d1', 'rw1_d2', ...];  // All checklist IDs
const WEEK_CHECKS   = { 1: ['rw1_d1', ...], 2: [...], ... };
const MONTH_CHECKS  = { 1: [...], 2: [...], 3: [...] };
const TACTIC_CHECKS = { 1: [...], 2: [...], 3: [...] };
```

**IMPORTANT:** The guide section checkboxes (`gs1` through `gs5`) are NOT included in any of these arrays. They have separate tracking via `updateGuideProgress()`.

### Step 7: Set data-cohort-start to empty

Always set `data-cohort-start=""` on the body tag. Never pre-fill a date. The operator chooses their start date via the dashboard UI.

```html
<body data-client-slug="salt-spring-kayak"
      data-client-name="Salt Spring Kayak Co"
      data-client-type="experience"
      data-cohort-start=""
      data-total-days="90"
      data-total-weeks="12">
```

### Step 8: Build the Bookability Checklist page (if applicable)

If `Has Bookability Checklist: yes`, rebuild the `page-bookability` section with items from `## Bookability Checklist`. Each item has a title and description. The checkboxes use IDs `bookability_1` through `bookability_N` with corresponding `data-key` attributes.

### Step 9: Generate plan.json

Write to `my-clients/[slug]/plan.json`:

```json
{
  "client_name": "Salt Spring Kayak Co",
  "client_slug": "salt-spring-kayak",
  "goal": "...",
  "coach_email": "coach@email.com",
  "weeks": [
    {
      "week": 1,
      "month": 1,
      "title": "Week 1: Define Your Guest",
      "actions": ["plain text action 1", "plain text action 2"],
      "checklist": ["plain text item 1", "plain text item 2"],
      "deep_link": "https://accelerator.elearningu.com/salt-spring-kayak/#week-1"
    }
  ]
}
```

### Step 10: Output
1. Write `my-clients/[slug]/index.html`
2. Write `my-clients/[slug]/plan.json`
3. Report: placeholder count resolved, optional blocks included/excluded, total checklist items, total "how to" links

---

# Part 4: Materials Update Command

This is a supported operation for experience dashboards:

> "Update the experience dashboard for [Operator] - the [material] is now available at [URL]. Change only that card's status, URL and button text."

**Procedure:**
1. Read `my-clients/[slug]/index.html`
2. Find the material card by its placeholder pattern (e.g., `MATERIAL_SESSION1_*`)
3. Update only these three values:
   - URL: from `#` to the provided URL
   - Status: from `coming` to `available`
   - Button text: from `Coming Soon` to the appropriate action text
4. Do NOT regenerate any other sections
5. Write the updated file

**Material types and their button text when available:**
| Material | Button text |
|---|---|
| Questionnaire | View Questionnaire |
| Session 1 | Watch Recording |
| Session 2 | Watch Recording |
| Calculator | Open Calculator |
| Guide | Open Guide |

---

# Part 5: Experience-Specific Quality Checklist

In addition to the general quality checklist, verify these for experience dashboards:

- [ ] No Assessment nav item or `page-assessment` section exists (experience dashboards have no assessment)
- [ ] `data-cohort-start` is empty (never pre-filled)
- [ ] Guide page has five section cards with checkboxes `gs1` through `gs5`
- [ ] `gs1` through `gs5` are NOT in ALL_CHECK_IDS, WEEK_CHECKS, MONTH_CHECKS, or TACTIC_CHECKS
- [ ] Materials page has five cards with correct statuses (`available` or `coming`)
- [ ] Every "how to" button targets a `step-tN-M` id that actually exists on the page
- [ ] The Experience sentence appears verbatim on the Strategy page (in the `.strategy-goal` section)
- [ ] The Experience sentence appears in the print cover content
- [ ] Track/Tactic mapping is correct (Track 1 = tactic1, etc.)
- [ ] All `→ links to:` annotations are stripped from display text and converted to howto buttons

---

# Part 6: Update Commands

## Accelerator update
> "Update the accelerator page for [Client] - [what changed]"

1. Read `clients/[slug]/index.html` and `clients/[slug]/plan.md`
2. Apply only the changes described
3. Do NOT regenerate sections that weren't mentioned
4. Commit with a clear message describing what changed

## Experience update
> "Update the experience dashboard for [Operator] - [what changed]"

1. Read `my-clients/[slug]/index.html` and `clients/[slug]/plan.md`
2. Apply only the changes described
3. Do NOT regenerate sections that weren't mentioned
4. Commit with a clear message describing what changed

---

# Part 7: File Locations

| File | Purpose |
|---|---|
| `template/accelerator-dashboard-template.html` | Accelerator template. Never edit directly for a client. |
| `template/experience-template.html` | Experience template. Never edit directly for a client. |
| `clients/[slug]/plan.md` | Client plan (input for both types) |
| `clients/[slug]/index.html` | Generated accelerator page (output) |
| `my-clients/[slug]/index.html` | Generated experience dashboard (output) |
| `brand/elearningu-brand.md` | Brand colours, fonts, logo rules |
| `PLAN_FORMAT.md` | Standard format for accelerator plans |
| `PLAN_FORMAT_EXPERIENCE.md` | Standard format for experience design plans |
