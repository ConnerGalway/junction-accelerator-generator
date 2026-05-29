# Standard Plan Format — Junction Accelerator

Every client plan must follow this structure exactly.
This ensures Claude can generate the accelerator page reliably.

---

## File naming
`clients/[client-slug]/plan.md`
Where `client-slug` is lowercase, hyphens only. e.g. `alberni-adventure-gear`

---

## Required Sections

```markdown
# [Client Name] — Accelerator Implementation Plan

## Meta
Client Slug: [client-slug]
Grant Budget: $1,500          ← OMIT THIS LINE if no grant
Target Milestone: [Name · Date · Revenue target]  ← OMIT THIS LINE if none
Has GBP Quick Wins: yes       ← Write "no" or omit if not applicable

## Goal
[One paragraph — the client's 90-day goal in plain language]

## Strategic Positioning
[One paragraph — the positioning statement]

## Welcome Message
[1-2 sentences of warm encouragement for the welcome modal.
Acknowledge where the client currently is and frame the plan as the next step.
Keep it specific to this client.]

---

## Tactic 1: [Full Tactic Title]
Phase: [Phase name e.g. Foundation / Setup / Month 1]
Short Label: [2-4 words for sidebar nav e.g. Tracking & SEO]
Subtitle: [1 sentence describing the tactic for the page header]

### What We Heard From You
[2-4 sentences of client-specific context that motivated this tactic]

### What This Is
[2-3 sentences explaining what the tactic involves]

### Why It Matters
[2-3 sentences on the strategic reasoning]

### Implementation Steps

#### Part A: [Section Name]
1. **[Step Title]**
   - Sub-bullet with specific instructions
   - Sub-bullet

2. **[Step Title]**
   - Sub-bullet

#### Part B: [Section Name]
3. **[Step Title]**
   ...

#### Part C: [Section Name]
...

### Success Metrics
| Metric | 30 Days | 60 Days | 90 Days |
|--------|---------|---------|---------|
| [Metric name] | [target] | [target] | [target] |

### Tips
- [Tip text]
- [Tip text]

### Resources
- [Link text](URL)
- [Link text](URL)

---

## Tactic 2: [Full Tactic Title]
[Same structure as Tactic 1]

---

## Tactic 3: [Full Tactic Title]
[Same structure as Tactic 1]

---

## Objectives

### Objective 1
Title: [Short title — matches Tactic 1 outcome]
Description: [1-2 sentences]
Tactic Pill: Tactic 1 · Weeks [X–Y]

### Objective 2
Title: [Short title]
Description: [1-2 sentences]
Tactic Pill: Tactic 2 · Weeks [X–Y]

### Objective 3
Title: [Short title]
Description: [1-2 sentences]
Tactic Pill: Tactic 3 · Weeks [X–Y]

---

## 90-Day Roadmap

Month 1 Name: [e.g. Foundation]
Month 2 Name: [e.g. Paid Ads]
Month 3 Name: [e.g. Scale]

### Week 1: [Week Title]
**Actions:**
- [Action bullet]
- [Action bullet]  ← add "→ links to: Tactic 1 / Step 2" if there's a how-to step
- [Action bullet] → links to: Tactic 1 / Step 3

**Checklist:**
- [ ] [Checklist item — the verifiable outcome of one or more actions]
- [ ] [Checklist item]

### Week 2: [Week Title]
[same structure]

[Continue through Week 12, or however many weeks the plan has]

---

## GBP Quick Wins    ← OMIT THIS ENTIRE SECTION if Has GBP Quick Wins: no

[Content of the GBP Quick Wins page — structured however the plan requires]
```

---

## The "→ links to:" annotation

This is the most important annotation for quality output. When you write the roadmap:

1. For each **Action bullet** that has a corresponding numbered step in the tactics section, add:
   ```
   - Install Google Analytics 4 on Squarespace → links to: Tactic 1 / Step 1
   ```

2. For each **Checklist item** that verifies an action with a how-to link, no annotation needed — Claude derives it from the action bullet.

3. If a roadmap action doesn't have a matching tactic step (e.g. "Ask customers for reviews"), leave no annotation.

**Annotation format:** `→ links to: Tactic [1/2/3] / Step [N]`

---

## Notes for plan writers

- Use plain Markdown — no custom formatting needed
- Steps must be numbered sequentially within each Part section (Part A starts at 1, Part B continues from where Part A ended — e.g. if Part A has 3 steps, Part B starts at 4)
- The checklist items should be **verifiable outcomes** ("GA4 is active and showing live visits") not action descriptions ("Install GA4")
- Actions should be **instructions** ("Install Google Analytics 4 on Squarespace")
- Weeks don't have to be exactly 4 checklist items — use as many as needed
- The 12-week structure is standard but can flex to fewer weeks if the plan is shorter
