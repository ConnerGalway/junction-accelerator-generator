# Accelerator Plan Format

This is the exact format of an accelerator `plan.md`. A plan in this format uploads through Add Plan and produces a complete dashboard.

Every upload is checked before anything is created. A plan with a problem is rejected with a list of the lines to change. This file states every rule that check applies, so a plan written to it passes first time.

This file is tested: `npm test` fills the skeleton below with sample text and runs it through the upload check. If the format and the check ever disagree, the test fails.

---

## Skeleton

Copy this structure exactly. Replace every `[bracketed placeholder]` with real content. Keep every heading, label and symbol as written.

```markdown
# [Client Name]: Accelerator Implementation Plan

## Meta
Client Slug: [client-slug]
Has GBP Quick Wins: yes

## Goal
[One or more paragraphs. The client's 90-day goal in plain language, using their real numbers.]

## Strategic Positioning
[One or more paragraphs on what makes this client different and how they should position themselves.]

> **Your Strategic Positioning**
> [A 2-3 sentence positioning statement the client can use as a touchstone.]

## Welcome Message
[1-2 sentences of warm encouragement, specific to this client.]

---

## Tactic 1: [Full Tactic Title]
Phase: [Phase name]
Short Label: [2-4 words]
Subtitle: [One sentence describing this tactic.]

### What We Heard From You
[2-4 sentences of client-specific context that motivated this tactic.]

### What This Is
[2-3 sentences explaining what this tactic involves.]

### Why It Matters
[2-3 sentences on the reasoning: why this work, why now.]

### Implementation Steps

#### Part A: [Part Name]

1. **[Step title]**
   - [Specific instruction]
   - [Specific instruction]

2. **[Step title]**
   - [Specific instruction]

#### Part B: [Part Name]

3. **[Step title]**
   - [Specific instruction]

4. **[Step title]**
   - [Specific instruction]

#### Part C: [Part Name]

5. **[Step title]**
   - [Specific instruction]

6. **[Step title]**
   - [Specific instruction]

### Success Metrics
| Metric | 30 Days | 60 Days | 90 Days |
|--------|---------|---------|---------|
| [Metric name] | [Target] | [Target] | [Target] |
| [Metric name] | [Target] | [Target] | [Target] |

### Tips
- [Practical tip]
- [Practical tip]

### Resources
- [Resource name](https://example.com)
- [Resource name](https://example.com): [short description]

---

## Tactic 2: [Full Tactic Title]
Phase: [Phase name]
Short Label: [2-4 words]
Subtitle: [One sentence describing this tactic.]

### What We Heard From You
[2-4 sentences of client-specific context.]

### What This Is
[2-3 sentences.]

### Why It Matters
[2-3 sentences.]

### Implementation Steps

#### Part A: [Part Name]

1. **[Step title]**
   - [Specific instruction]

2. **[Step title]**
   - [Specific instruction]

#### Part B: [Part Name]

3. **[Step title]**
   - [Specific instruction]

4. **[Step title]**
   - [Specific instruction]

### Success Metrics
| Metric | 30 Days | 60 Days | 90 Days |
|--------|---------|---------|---------|
| [Metric name] | [Target] | [Target] | [Target] |

### Tips
- [Practical tip]
- [Practical tip]

### Resources
- [Resource name](https://example.com)

---

## Tactic 3: [Full Tactic Title]
Phase: [Phase name]
Short Label: [2-4 words]
Subtitle: [One sentence describing this tactic.]

### What We Heard From You
[2-4 sentences of client-specific context.]

### What This Is
[2-3 sentences.]

### Why It Matters
[2-3 sentences.]

### Implementation Steps

#### Part A: [Part Name]

1. **[Step title]**
   - [Specific instruction]

2. **[Step title]**
   - [Specific instruction]

#### Part B: [Part Name]

3. **[Step title]**
   - [Specific instruction]

4. **[Step title]**
   - [Specific instruction]

### Success Metrics
| Metric | 30 Days | 60 Days | 90 Days |
|--------|---------|---------|---------|
| [Metric name] | [Target] | [Target] | [Target] |

### Tips
- [Practical tip]
- [Practical tip]

### Resources
- [Resource name](https://example.com)

---

## Objectives

### Objective 1
Title: [Short title matching the outcome of Tactic 1]
Description: [1-2 sentences.]
Tactic Pill: Tactic 1 · Weeks 1-8

### Objective 2
Title: [Short title matching the outcome of Tactic 2]
Description: [1-2 sentences.]
Tactic Pill: Tactic 2 · Weeks 3-10

### Objective 3
Title: [Short title matching the outcome of Tactic 3]
Description: [1-2 sentences.]
Tactic Pill: Tactic 3 · Weeks 5-12

---

## 90-Day Roadmap

Month 1 Name: [Month name]
Month 2 Name: [Month name]
Month 3 Name: [Month name]

### Week 1: [Week title]
**Actions:**
- [Instruction] → links to: Tactic 1 / Step 1
- [Instruction] → links to: GBP Quick Wins
- [Instruction with no matching step]

**Checklist:**
- [ ] [Verifiable outcome]
- [ ] [Verifiable outcome]

### Week 2: [Week title]
**Actions:**
- [Instruction] → links to: Tactic 1 / Step 2
- [Instruction]

**Checklist:**
- [ ] [Verifiable outcome]
- [ ] [Verifiable outcome]

### Week 3: [Week title]
**Actions:**
- [Instruction] → links to: Tactic 1 / Step 3
- [Instruction] → links to: Tactic 2 / Step 1

**Checklist:**
- [ ] [Verifiable outcome]
- [ ] [Verifiable outcome]

### Week 4: [Week title]
**Actions:**
- [Instruction] → links to: Tactic 1 / Step 4
- [Instruction]

**Checklist:**
- [ ] [Verifiable outcome]
- [ ] [Verifiable outcome]

### Week 5: [Week title]
**Actions:**
- [Instruction] → links to: Tactic 2 / Step 2
- [Instruction] → links to: Tactic 3 / Step 1

**Checklist:**
- [ ] [Verifiable outcome]
- [ ] [Verifiable outcome]

### Week 6: [Week title]
**Actions:**
- [Instruction] → links to: Tactic 1 / Step 5
- [Instruction]

**Checklist:**
- [ ] [Verifiable outcome]
- [ ] [Verifiable outcome]

### Week 7: [Week title]
**Actions:**
- [Instruction] → links to: Tactic 2 / Step 3
- [Instruction]

**Checklist:**
- [ ] [Verifiable outcome]
- [ ] [Verifiable outcome]

### Week 8: [Week title]
**Actions:**
- [Instruction] → links to: Tactic 1 / Step 6
- [Instruction] → links to: Tactic 3 / Step 2

**Checklist:**
- [ ] [Verifiable outcome]
- [ ] [Verifiable outcome]

### Week 9: [Week title]
**Actions:**
- [Instruction] → links to: Tactic 2 / Step 4
- [Instruction]

**Checklist:**
- [ ] [Verifiable outcome]
- [ ] [Verifiable outcome]

### Week 10: [Week title]
**Actions:**
- [Instruction] → links to: Tactic 3 / Step 3
- [Instruction]

**Checklist:**
- [ ] [Verifiable outcome]
- [ ] [Verifiable outcome]

### Week 11: [Week title]
**Actions:**
- [Instruction] → links to: Tactic 3 / Step 4
- [Instruction]

**Checklist:**
- [ ] [Verifiable outcome]
- [ ] [Verifiable outcome]

### Week 12: [Week title]
**Actions:**
- [Instruction]
- [Instruction]

**Checklist:**
- [ ] [Verifiable outcome]
- [ ] [Verifiable outcome]

---

## GBP Quick Wins

### On the Google Business Profile
- **[Quick win title].** [What to do and why it matters.]
- **[Quick win title].** [What to do and why it matters.]

### On the Website
- **[Quick win title].** [What to do and why it matters.]
```

---

## Rules the upload enforces

A plan that breaks any of these is rejected. Nothing is created until it passes.

### Top-level sections

| Section | Rule |
|---|---|
| `## Goal` | Required, with text under it |
| `## Strategic Positioning` | Required, with text under it |
| `## Objectives` | Required |
| `## Tactic N: Title` | 3 or 4 tactics, numbered 1, 2, 3 (and 4) in order, each with a title |
| `### Week N: Title` | Exactly 12 weeks, numbered 1 to 12 in order, each with a title |

All of these are level-2 headings (`##`), except weeks, which are level 3 (`###`).

### Each tactic

1. **Header.** Directly under the `## Tactic N: Title` line, three lines: `Phase:`, `Short Label:` and `Subtitle:`. All three are required.
2. **Seven sections,** each a level-3 heading with exactly this wording, and each with content:
   - `### What We Heard From You`
   - `### What This Is`
   - `### Why It Matters`
   - `### Implementation Steps`
   - `### Success Metrics`
   - `### Tips`
   - `### Resources`
3. **Implementation Steps.**
   - Every step sits under a Part heading: `#### Part A: Name`, `#### Part B: Name`, and so on. Each Part has a name and at least one step.
   - Each step is one line: a number, a full stop, a space, then the title in bold. Example: `3. **Set up conversion tracking**`.
   - Step numbers run 1, 2, 3 across the whole tactic. They never restart at a new Part.
   - Step detail goes underneath as bullets starting with `- `.
4. **Success Metrics.** A Markdown table with a header row, a `|---|` separator row and at least one data row. Every data row has all four columns filled. Write `n/a` where there is no target.
5. **Tips.** At least one line starting with `- `.
6. **Resources.** At least one line. Every line is a Markdown link with a full address: `- [Link text](https://...)`. A short description may follow after a colon.

### Objectives

- One `### Objective N` block for each tactic. A plan with four tactics has four objectives.
- Each block has three lines: `Title:`, `Description:` and `Tactic Pill:`.

### Roadmap

- Each week has a line `**Actions:**` followed by at least one `- ` bullet, then a line `**Checklist:**` followed by at least one `- [ ]` item. Actions come before the Checklist.
- A "how to" link is written at the end of an action: `→ links to: Tactic 2 / Step 5`. The tactic and the step must exist.
- An action may instead point at the Quick Wins page: `→ links to: GBP Quick Wins`. This is allowed only when the plan has a Quick Wins section.
- Put "how to" links on actions only, never on checklist items.

### Quick Wins

- To include the Quick Wins page, Meta must say `Has GBP Quick Wins: yes` and the plan must end with a `## GBP Quick Wins` section.
- Items are bullets under group headings (`### On the Google Business Profile`). Every item must sit under a group heading.
- Write each item as `- **Title.** What to do and why.`
- To leave the page out, write `Has GBP Quick Wins: no` and omit the section.

### Never include

- Placeholder text in square brackets left over from the skeleton, such as `[Step title]`.
- Template tokens in double braces, such as `{{NAME}}`.

---

## What the upload warns about

These do not block the upload, but each one means something will be missing or look wrong.

| Warning | What happens |
|---|---|
| No `## Welcome Message` | The welcome screen falls back to the start of the goal |
| No `Month 1 Name:` (or 2, 3) line | The month is labelled "Month 1" |
| No `## Meta` section | Nothing breaks, but the slug cannot be cross-checked |
| `Client Slug:` differs from the slug typed on the form | The form's slug is used |
| A table in the Goal | The table is not shown. The goal appears as paragraphs only |
| `Has Projections: yes` | The dashboard is built without a projections section |
| A `## GBP Quick Wins` section without `Has GBP Quick Wins: yes` | The section is left out |
| A line under a step, or under Actions or Checklist, that is not a bullet | That line does not appear |
| A step with no bullets | The step shows its title only |
| A Short Label longer than 28 characters | It may not fit the sidebar |
| `[CONFIRM ...]` markers | They appear on the dashboard exactly as written |
| Em dashes in body text | Style only. Use a colon, a comma or a new sentence |

---

## How the dashboard uses each part

| Part of the plan | Where it appears |
|---|---|
| Goal | Strategy page, welcome screen and the printed roadmap. Paragraphs only |
| Strategic Positioning | Strategy page. A blockquote with a bold first line is shown as a labelled statement |
| Welcome Message | Welcome screen |
| Tactic title, Phase, Short Label, Subtitle | Tactic page header, sidebar and dashboard cards |
| What We Heard From You, What This Is, Why It Matters | Tactic Overview tab |
| Part names | "What This Breaks Into" on the Overview tab, one card per Part |
| Steps and their bullets | Implementation Steps tab, grouped by Part |
| Success Metrics | Measurement tab. The first four columns are used |
| Tips and Resources | Tips and Resources tab |
| Objectives | Strategy page |
| Weeks, Actions, Checklist | 90-Day Roadmap. Checklist items become the tick boxes that track progress |
| `→ links to:` notes | A "how to" button on that action. The note itself is not shown |
| GBP Quick Wins | Quick Wins page, with a tick box per item |

`Grant Budget:` and `Target Milestone:` may be written in Meta but are not shown on the dashboard.

Within body text, `**bold**`, `*italic*`, `` `code` `` and `[links](https://...)` are shown as formatted text. Titles, labels and headings are shown as plain text.

---

## Writing guidance

- Actions are instructions ("Install Google Analytics 4 on Squarespace").
- Checklist items are verifiable outcomes ("GA4 is active and showing live visits"), not instructions.
- A week can have as many actions and checklist items as it needs.
- Tactics usually overlap across the 12 weeks. Each tactic's progress on the dashboard is counted from the "how to" links, so link every action that has a matching step.
- A tactic may have any number of Parts. Three or four is typical.
- A step title may be followed by a short note on the same line, for example `3. **Track the booking path.** *(contractor task, $800 to $1,200)*`.
- The Tactic Pill text is shown as written. Use the form `Tactic 1 · Weeks 1-8` and make the weeks match the roadmap.
- Never use em dashes.

## Small variations the upload accepts

Write plans exactly as in the skeleton. These variations are tolerated if they slip in, and are read the same way:

- `## Tactic #1 - Title` in place of `## Tactic 1: Title`, and the same for weeks and Parts
- `**Phase:** Foundation` in place of `Phase: Foundation`
- `Actions:` without the bold
- `*` in place of `-` for bullets, and `- []` in place of `- [ ]`
- `->` in place of `→`
- Header lines (`Phase:`, `Short Label:`, `Subtitle:`) in any order, with blank lines between them
- A step written as `**1. Step title**`
