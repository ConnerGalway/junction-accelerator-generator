# SOP: Generating an Accelerator Page
### Junction Internal · v1.0

**Time to complete:** ~45–90 minutes per client (mostly writing the plan)
**Who does this:** Any team member with access to Claude Code and GitHub

---

## Prerequisites (one-time setup)

- [ ] Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)
- [ ] Git installed and authenticated with GitHub
- [ ] Access to the `junction-accelerator-generator` repo (ask Conner for access)
- [ ] Netlify account access (for deployment)

**Clone the generator repo (first time only):**
```bash
git clone https://github.com/ConnerGalway/junction-accelerator-generator.git
cd junction-accelerator-generator
```

---

## Step 1 — Write the Client Plan

Using `PLAN_FORMAT.md` as your guide, write the client's implementation plan in
`clients/[client-slug]/plan.md`.

**Checklist for a complete plan.md:**
- [ ] All Meta fields filled (slug, grant budget if applicable, milestone if applicable)
- [ ] Goal paragraph written
- [ ] Strategic Positioning written
- [ ] Welcome Message written (warm, specific to this client)
- [ ] All 3 Tactics complete: title, phase, short label, subtitle, overview text, steps, metrics, tips, resources
- [ ] All 3 Objectives complete: title, description, tactic pill
- [ ] Roadmap weeks complete: actions + checklist items for all weeks
- [ ] **`→ links to:` annotations added** to action bullets that have matching tactic steps
- [ ] GBP Quick Wins section included (or confirmed not needed)

> 💡 **The `→ links to:` annotation is the most important quality step.** Take 10 minutes to go through the roadmap and match each action bullet to its corresponding tactic step. This is what creates the "how to" links that make the page useful.

---

## Step 2 — Open Claude Code in the Generator Repo

```bash
cd junction-accelerator-generator
claude
```

Claude Code will automatically read `CLAUDE.md` and understand what the repo does.

---

## Step 3 — Run the Generation Command

Type this exact prompt:

```
Generate an accelerator page for [Client Name] using clients/[client-slug]/plan.md
```

**Example:**
```
Generate an accelerator page for Westholme Tea Co using clients/westholme-tea-co/plan.md
```

Claude will:
1. Read the plan and template
2. Fill all placeholder values
3. Rebuild the three tactic pages with the client's content
4. Rebuild the 90-day roadmap with the client's weeks
5. Map "how to" links from roadmap actions to tactic steps
6. Adapt the onboarding tour descriptions to the client
7. Write the output to `clients/[client-slug]/index.html`

This takes about 5–10 minutes. You'll see Claude working through the steps.

---

## Step 4 — Review the Output

Open the generated file in a browser:
```bash
npx serve -l 3458 clients/[client-slug]
# Then open http://localhost:3458
```

**Review checklist:**
- [ ] Welcome modal shows correct client name, goal, and welcome message
- [ ] All 8 tour steps highlight the right elements and describe the right things
- [ ] Dashboard: Goal banner, Objectives, Tactic cards all correct
- [ ] Progress ring shows correct total task count
- [ ] Grant budget line visible (or hidden if no grant)
- [ ] Target Milestone card visible (or hidden if no milestone)
- [ ] Each tactic page: title, subtitle, content all match the plan
- [ ] Implementation Steps have correct IDs (step-t1-1, step-t2-1, etc.)
- [ ] 90-Day Roadmap: all weeks present, correct content
- [ ] "HOW TO" buttons appear on action items and navigate to the correct step
- [ ] Note toggles work (pencil icon opens text area)
- [ ] Checking a box saves and persists on reload
- [ ] GBP Quick Wins appears (or doesn't) as expected
- [ ] No `{{PLACEHOLDER}}` tokens visible anywhere on the page

**If something needs fixing:**
Tell Claude what to change:
```
The goal text on the dashboard is wrong — it should be: "[correct text]"
```
```
Week 4 is missing the "Link Google Ads to GA4" action bullet
```
Claude will make targeted edits without regenerating the whole page.

---

## Step 5 — Create the Client GitHub Repo

```bash
cd clients/[client-slug]
git init
git add index.html
git commit -m "Initial accelerator page for [Client Name]"
gh repo create ConnerGalway/[client-slug]-accelerator --public --source=. --push
```

---

## Step 6 — Connect to Netlify

1. Log in to netlify.com
2. "Add new site" → "Import an existing project" → GitHub
3. Select the `[client-slug]-accelerator` repo
4. Build settings: **leave blank** (no build command, publish directory is `/`)
5. Deploy

Netlify will give you a URL like `[client-slug]-accelerator.netlify.app`.

To connect a custom subdomain (e.g. `plan.clientdomain.com`), go to
Site settings → Domain management → Add custom domain.

---

## Step 7 — Future Updates

When a plan changes (tactics updated, new tasks added, etc.):

1. Edit `clients/[client-slug]/plan.md` with the changes
2. Open Claude Code in the generator repo:
   ```
   Update the accelerator page for [Client Name] — [describe what changed]
   ```
   Example: `Update the accelerator page for Westholme Tea Co — we're replacing Tactic 3 entirely, the new tactic is in plan.md under "Tactic 3"`
3. Claude updates only the affected sections
4. Review → commit → push → Netlify auto-deploys

---

## Reference: What Claude generates vs. what's fixed in the template

| Element | Fixed in template | Generated per client |
|---|---|---|
| CSS / styling | ✅ | |
| Progress tracking JS | ✅ | |
| localStorage / notes | ✅ | |
| Onboarding structure | ✅ | |
| Brand / logo | ✅ | |
| Client name, goal, positioning | | ✅ |
| Objectives (3×) | | ✅ |
| Tactic page content | | ✅ |
| Roadmap weeks (all) | | ✅ |
| "How to" link mapping | | ✅ |
| Tour step descriptions | | ✅ |
| GBP Quick Wins page | | ✅ (optional) |
| Grant budget line | | ✅ (optional) |
| Target milestone | | ✅ (optional) |

---

## Troubleshooting

**"Placeholder tokens still visible in the output"**
Tell Claude: `There are still unfilled placeholders — scan the page for {{ and resolve them all`

**"How to links don't navigate to the right step"**
Check that the `→ links to: Tactic X / Step N` annotations in plan.md are correct,
then tell Claude: `Re-map all how-to links from the plan annotations`

**"Tour step descriptions are generic"**
Tell Claude: `Rewrite the tour step descriptions — make them specific to [Client Name]'s situation`

**"The page looks right but progress tracking is broken"**
Tell Claude: `The ALL_CHECK_IDS array is probably out of sync — count the checklist items and fix it`
