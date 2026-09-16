# Standard Plan Format — Experience Design

Every experience design plan must follow this structure exactly.
This ensures Claude can generate the experience page reliably.

---

## File naming
`clients/[client-slug]/plan.md`
Where `client-slug` is lowercase, hyphens only. e.g. `salt-spring-kayak-co`

---

## Required Sections

```markdown
# [Operator Business Name] — Experience Design Implementation Plan

## Meta
Client Slug: [client-slug]
Price Point: $[N] per guest          ← OMIT THIS LINE if not yet set
Launch Target: [First departure date · Revenue target]   ← OMIT THIS LINE if not yet set
Has Bookability Checklist: yes       ← Write "no" or omit if not applicable

## Goal
[One paragraph. What this operator will have launched in 90 days, in plain language.
Must name the experience, the guest, the price and the first departure.]

## The Experience
[One sentence. The experience as agreed in Coaching Call 1, in the operator's words.
This is the sentence from the Call 1 exit condition. Do not rewrite it.]

## Strategic Positioning
[One paragraph. What makes this experience worth travelling for, and who it is not for.]

## Welcome Message
[1-2 sentences of warm encouragement for the welcome modal.
Acknowledge the operator's starting point and frame the 90 days as the runway
to their first paying guest. Keep it specific to this operator.]

---

## Track 1: Define the Experience
Phase: Design
Short Label: [2-4 words for sidebar nav e.g. Define It]
Subtitle: [1 sentence describing what this track delivers]

### What We Heard From You
[2-4 sentences of operator-specific context from the questionnaire and Call 1.
Reference something they actually said.]

### What This Is
[2-3 sentences explaining what this track involves]

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

## Track 2: Make It Operable
Phase: Operations
Short Label: [2-4 words for sidebar nav e.g. Make It Work]
Subtitle: [1 sentence describing what this track delivers]

[Same structure as Track 1. Content covers: costing and pricing, capacity planning,
staffing requirements, partner agreements, insurance, permits and licences,
safety protocols, weather contingency, cancellation policy.]

---

## Track 3: Make It Bookable
Phase: Launch
Short Label: [2-4 words for sidebar nav e.g. Go Live]
Subtitle: [1 sentence describing what this track delivers]

[Same structure as Track 1. Content covers: booking system setup, listing copy,
photography and shot list, pricing page, distribution channels, launch push,
first-booking follow-up.]

---

## Objectives

### Objective 1
Title: [Short title — matches Track 1 outcome]
Description: [1-2 sentences]
Track Pill: Track 1 · Weeks [X–Y]

### Objective 2
Title: [Short title — matches Track 2 outcome]
Description: [1-2 sentences]
Track Pill: Track 2 · Weeks [X–Y]

### Objective 3
Title: [Short title — matches Track 3 outcome]
Description: [1-2 sentences]
Track Pill: Track 3 · Weeks [X–Y]

---

## Launch Roadmap

Month 1 Name: [e.g. Design and Decide]
Month 2 Name: [e.g. Build and Cost]
Month 3 Name: [e.g. List and Launch]

### Week 1: [Week Title]
**Actions:**
- [Action bullet]
- [Action bullet]  ← add "→ links to: Track 1 / Step 2" if there's a how-to step
- [Action bullet] → links to: Track 1 / Step 3

**Checklist:**
- [ ] [Checklist item — the verifiable outcome of one or more actions]
- [ ] [Checklist item]

### Week 2: [Week Title]
[same structure]

[Continue through Week 12, or however many weeks the plan has]

---

## Bookability Checklist    ← OMIT THIS ENTIRE SECTION if Has Bookability Checklist: no

[The pre-launch readiness list. 5-8 items, each with a short title and a sentence
explaining why it matters. This replaces the GBP Quick Wins page from the
accelerator format.]

### [Item Title]
[One sentence on why this matters for launch readiness.]

### [Item Title]
[One sentence on why this matters for launch readiness.]

[Continue for 5-8 items total]
```

---

## The "→ links to:" annotation

This is the most important annotation for quality output. When you write the roadmap:

1. For each **Action bullet** that has a corresponding numbered step in the tracks section, add:
   ```
   - Write the experience description for your listing → links to: Track 3 / Step 4
   ```

2. For each **Checklist item** that verifies an action with a how-to link, no annotation needed. Claude derives it from the action bullet.

3. If a roadmap action doesn't have a matching track step (e.g. "Confirm insurance coverage with your broker"), leave no annotation.

**Annotation format:** `→ links to: Track [1/2/3] / Step [N]`

**Examples:**
```markdown
- Define your ideal guest persona → links to: Track 1 / Step 1
- Calculate your per-guest cost breakdown → links to: Track 2 / Step 3
- Upload photos to your Airbnb Experience listing → links to: Track 3 / Step 6
```

---

## Key differences from Accelerator format

| Element | Accelerator | Experience Design |
|---------|-------------|-------------------|
| Main sections | Tactics 1-3 | Tracks 1-3 |
| Section roadmap | 90-Day Roadmap | Launch Roadmap |
| Optional page | GBP Quick Wins | Bookability Checklist |
| Meta fields | Grant Budget, Target Milestone | Price Point, Launch Target |
| New section | — | The Experience (Call 1 sentence) |
| Phase names | Foundation, Paid Ads, Scale | Design, Operations, Launch |

---

## Notes for plan writers

- Use plain Markdown. No custom formatting needed.
- Steps must be numbered sequentially within each Part section (Part A starts at 1, Part B continues from where Part A ended. If Part A has 3 steps, Part B starts at 4).
- The checklist items should be **verifiable outcomes** ("Booking page is live and accepting reservations") not action descriptions ("Set up booking page").
- Actions should be **instructions** ("Configure your Fareharbor booking widget with the agreed pricing").
- Weeks don't have to be exactly 4 checklist items. Use as many as needed.
- The 12-week structure is standard but can flex to fewer weeks if the plan is shorter.
- **The Experience** section must be copied verbatim from Call 1 notes. Do not paraphrase or improve the operator's words.
- **Price Point** should only be included once pricing is confirmed. Leave it out during early planning.
- **Launch Target** should name a specific first-departure date and a revenue goal (e.g. "June 15, 2025 · $2,400 in first-month bookings").

---

## Track content guidance

### Track 1: Define the Experience
Focus on product design decisions:
- Guest persona and why they would book
- Experience format (duration, group size, inclusions)
- The narrative arc (beginning, middle, end)
- Unique selling proposition
- What is explicitly not included

### Track 2: Make It Operable
Focus on operational readiness:
- Cost breakdown per departure
- Pricing strategy and margin targets
- Capacity limits and scheduling
- Staffing and training needs
- Partner and supplier agreements
- Insurance requirements
- Permits, licences, certifications
- Safety protocols and emergency procedures
- Weather policy and contingency plans
- Cancellation and refund policy

### Track 3: Make It Bookable
Focus on go-to-market:
- Booking platform selection and setup
- Listing copy that converts
- Photography and visual assets
- Pricing page or rate card
- Distribution channels (OTAs, direct, partnerships)
- Launch campaign and first-booking push
- Review collection strategy
- Post-experience follow-up sequence
