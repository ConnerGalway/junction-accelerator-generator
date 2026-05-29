# Coach SOP: From Workshop to Live Accelerator Page
### Junction Internal · v1.0

**Who this is for:** Coaches who deliver the Accelerator program
**Time required:** 3–5 hours total (mostly writing)
**What you'll produce:** A live, interactive webpage the client can use for their entire 90-day plan

---

## Overview

There are three phases. Coaches own Phases 1 and 2 entirely. Phase 3 requires handing off to a technical team member (or Conner) for about 20 minutes.

| Phase | Who | Time | What happens |
|---|---|---|---|
| 1. Write the plan | Coach | 2–4 hrs | Google Doc → polished plan |
| 2. Generate the file | Coach | 20–30 min | Claude turns plan into a file |
| 3. Build and launch the page | Technical | 20–30 min | File becomes a live webpage |

---

# PHASE 1 — Write the Implementation Plan

**What you need:** Your workshop notes or discovery call transcript.

---

### Step 1 — Make a copy of the Google Doc template

1. Open this link: [PASTE LINK TO GOOGLE DOC TEMPLATE HERE]
2. Click **File → Make a copy**
3. Rename it: `YYYY.MM.DD — Accelerator Implementation Plan — [Client Name]`
4. Save it in the client's Google Drive folder

---

### Step 2 — Fill in the Page Settings at the top

The grey box at the very top of the document has 6 fields. These are internal — the client never sees them. Fill them in first, before writing anything else.

| Field | What to write |
|---|---|
| **Client Name** | Full business name exactly as it should appear on the page |
| **Client Slug** | Lowercase version with hyphens instead of spaces. e.g. `alberni-adventure-gear` |
| **Budget** | The grant amount if they have one, e.g. `$1,500`. Delete the line if no budget. |
| **Target Milestone** | A specific event or moment the plan is building toward, e.g. `September Toy Run Weekend · Sept 6–7 · $3,000+ target`. Delete the line if there isn't one. |
| **Quick Wins Section** | Write `Yes` if the client needs a Google Business Profile quick wins section. Otherwise `No`. |
| **Welcome Message** | 1–2 sentences that will appear on the welcome screen. Warm and specific to this client — not generic. Acknowledge where they are right now and frame the plan as the next step. |

> 💡 **Welcome Message tip:** Think about what would make this client feel seen on day one. Reference something specific — their first season, a milestone they just hit, a challenge they told you about.

---

### Step 3 — Write the plan

Work through each section of the document in order. Every section has a grey instruction box explaining what to write — read it before writing.

**The most important things to get right:**

**Goal and Strategic Positioning**
These appear on the client's dashboard every time they open their plan. They need to be specific enough that a stranger could read them and know exactly who this business is for and what the next 90 days will achieve.

**Implementation Steps (in each tactic)**
Number all steps sequentially. If Part A has 3 steps, Part B starts at Step 4. This numbering is critical — it's how the "how to" links work on the webpage. A client clicks "how to" next to a task and it jumps directly to the relevant step.

Each step needs:
- A clear title
- At least 2 sub-bullets with specific instructions (what to click, where to go, what to type)

**The 90-Day Roadmap**
This is the most time-consuming section but also the most valuable to the client. For each week:

- **Actions** = what to DO. Written as instructions. e.g. *"Install Google Analytics 4 on Squarespace"*
- **Checklist** = what to TICK OFF to confirm it's done. Written as outcomes. e.g. *"GA4 is active and showing live visits"*

**The `→ links to:` annotation** — This is what creates the "how to" buttons on the page. After writing each action bullet, check if it has a corresponding numbered step in the tactics section. If yes, add: `→ links to: Tactic [1/2/3] / Step [N]`

Example:
```
- Install Google Analytics 4 on Squarespace → links to: Tactic 1 / Step 1
- Install Meta Pixel on Squarespace → links to: Tactic 1 / Step 2
- Ask the client to confirm their login details
```
The third bullet has no matching tactic step, so it gets no annotation.

> ⏱ **Budget about 10 minutes** to go back through the roadmap and add these annotations after you've finished writing all the tactic steps. It makes a big difference to how useful the page is.

---

### Step 4 — Review the document

Before moving to Phase 2, read through the plan and check:

- [ ] All 6 Page Settings fields are filled in
- [ ] Goal and Positioning are specific to this client (not generic)
- [ ] All three tactics have: Phase, Sidebar Label, Subtitle, all four sub-sections, a metrics table, tips, and resources
- [ ] All steps across all tactics are numbered sequentially
- [ ] The 90-Day Roadmap has all 12 weeks (or however many weeks the plan runs)
- [ ] `→ links to:` annotations are added where applicable
- [ ] Welcome Message is written

---

# PHASE 2 — Generate the Plan File

**What you need:** Your completed Google Doc from Phase 1, and a Claude.ai account.

---

### Step 5 — Open the Accelerator Plan Writer project in Claude

1. Go to [claude.ai](https://claude.ai)
2. In the left sidebar, find **Projects**
3. Open the project called **Accelerator Implementation Plan Writer**

> If you don't see this project, ask Conner to add you to it.

---

### Step 6 — Start a new conversation

Click **New conversation** inside the project (not outside it — the project needs to be active for Claude to have the right instructions and reference files).

---

### Step 7 — Paste in your plan content

Copy everything from your Google Doc — the complete document including the Page Settings block — and paste it into the Claude conversation. Then type:

> `Write a complete implementation plan for this client.`

Claude will ask you to confirm a few details (mainly the client slug and any optional fields), then work through the plan systematically. This takes a few minutes.

---

### Step 8 — Review Claude's output

Claude will produce the complete plan as a code block — a long text file with all sections filled in.

Read through it and check:
- Does the goal text sound right?
- Do the tactic sections match what you wrote?
- Does the roadmap have all the weeks?
- Are the `→ links to:` annotations present on the right action bullets?

If anything is wrong or missing, just tell Claude in the same conversation:
> `The goal paragraph is off — it should focus more on bookings and less on visibility`
> `Week 4 is missing the Google Ads account setup action`
> `Tactic 2 Step 3 should mention Expert Mode specifically`

Claude will fix it and give you an updated version.

---

### Step 9 — Copy the final output

When you're happy with it, click the copy icon on the code block (or select all the text inside it and copy it).

---

### Step 10 — Save it as a file and send to the technical team member

1. Open a plain text editor — on Mac, open **TextEdit**, then go to Format → Make Plain Text
2. Paste the content
3. Save the file as `plan.md` (make sure it saves as `.md`, not `.txt`)
4. Email or Slack the file to your technical team member (or Conner) with the client name in the subject line

> 💡 **Alternative:** If you have access to the generator folder on your computer, save the file directly to `clients/[client-slug]/plan.md` and let your technical person know it's ready.

---

# PHASE 3 — Build and Launch the Page

**This phase is handled by the technical team member.** Instructions for them are in the `SOP.md` file in the generator repo. The short version:

1. They receive your `plan.md` file
2. They open Claude Code in the generator repo and run one command
3. Claude generates the full HTML page (takes ~10 minutes)
4. They review it, create a GitHub repo, connect it to Netlify
5. They send you a live URL — usually within 30 minutes of receiving your file

---

# QUICK REFERENCE

### How long does each section take?

| Section | Time |
|---|---|
| Page Settings | 5 min |
| Goal + Positioning | 15–20 min |
| Objectives | 10 min |
| Each tactic (all sub-sections) | 30–45 min |
| 90-Day Roadmap (all weeks) | 45–60 min |
| Adding `→ links to:` annotations | 10 min |
| Total writing time | ~3.5–4.5 hours |
| Claude conversion (Phase 2) | 20–30 min |

---

### What makes a plan good vs. average?

**Good:**
- Goal mentions specific numbers or outcomes (bookings, revenue, review count)
- "What We Heard From You" references something the client actually said
- Every implementation step has sub-bullets specific enough to follow without asking for help
- The roadmap actions are in the right order — things that depend on each other are sequenced correctly
- `→ links to:` annotations are on every action that has a corresponding step

**Average:**
- Goal is vague ("build a stronger online presence")
- "What We Heard From You" could apply to any business
- Steps say what to do but not how
- Roadmap is complete but the how-to links are missing

---

### Common mistakes

**Wrong: Action written as an outcome**
`- GA4 is active and showing visits` ← this belongs in the Checklist, not Actions

**Right: Action written as an instruction**
`- Install Google Analytics 4 on Squarespace → links to: Tactic 1 / Step 1`

---

**Wrong: Checklist item written as an instruction**
`- Install Google Analytics 4 on Squarespace` ← this belongs in Actions

**Right: Checklist item written as a verifiable outcome**
`- [ ] GA4 is active and showing live visits`

---

**Wrong: Steps restart numbering at each Part**
Part A: Steps 1–3
Part B: Steps 1–2 ← should be 4–5

**Right: Steps are numbered sequentially**
Part A: Steps 1–3
Part B: Steps 4–5
Part C: Steps 6–7

---

### Who to contact if something goes wrong

| Issue | Who to ask |
|---|---|
| Can't access the Claude project | Conner |
| Claude output looks wrong or incomplete | Tell Claude in the same conversation and ask it to fix it |
| Need the plan turned into a webpage | Hand the `plan.md` file to the technical team member |
| Something looks wrong on the live page | Technical team member |

---

*Junction · Internal use only · Last updated [DATE]*
