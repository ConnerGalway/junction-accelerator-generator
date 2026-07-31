# Accelerator Dashboard Template — Placeholder Reference

This document maps the sample content from the Claude Design file to template placeholders.

---

## Client Identifiers

| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{CLIENT_NAME}}` | The Station | Business name |
| `{{CLIENT_SLUG}}` | the-station | URL-safe slug |
| `{{CLIENT_INITIALS}}` | TS | Initials for avatar |

---

## Dashboard View

### Progress Card
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{TOTAL_TASKS}}` | 24 | Total roadmap tasks |
| `{{TASKS_DONE}}` | 6 | Completed tasks count |
| `{{PROGRESS_PCT}}` | 25% | Overall progress percentage |
| `{{CURRENT_DAY}}` | 15 | Day number of 90 |
| `{{DAYS_REMAINING}}` | 75 | Days remaining in 90-day plan |
| `{{CURRENT_WEEK}}` | 3 | Current week number |
| `{{TOTAL_WEEKS}}` | 12 | Total weeks in plan |
| `{{CURRENT_WEEK_TITLE}}` | Set Up Foundations | Title of current week |
| `{{STREAK_DAYS}}` | 4 | Current streak in days |

### Phases (Static framework copy — same for all clients)
```
Week 1–4: Foundation — Set up systems
Week 5–8: Rhythm — Build habits
Week 9–12: Scale — Amplify results
Ongoing: Sustain — Maintain momentum
```

### Next Step Card
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{NEXT_STEP_TITLE}}` | Set up Meta Business Suite and connect Instagram | Current task title |
| `{{NEXT_STEP_TACTIC}}` | Social Media Content System | Parent tactic name |
| `{{NEXT_STEP_TIME}}` | 40 min | Estimated time |
| `{{NEXT_STEP_WHO}}` | You | Person responsible |
| `{{NEXT_STEPS}}` | (array) | Next 3 action items |

### Tactic Pills
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{TACTIC_PILLS}}` | (array) | Progress per tactic: name, tasks done/total, color |

### Current Week Progress
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{CURRENT_WEEK_DONE}}` | 3 | Tasks done in current week |
| `{{CURRENT_WEEK_TOTAL}}` | 8 | Total tasks in current week |
| `{{CURRENT_WEEK_PCT}}` | 37% | Current week progress percentage |
| `{{CURRENT_PHASE_NAME}}` | Foundation | Current phase name |
| `{{NEXT_STEP_TACTIC_NAV}}` | tactic-1 | Nav ID for the next step's tactic |

### Sidebar Tactic Progress
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{TACTIC_1_PROGRESS}}` | 2/8 | Tactic 1 tasks done/total |
| `{{TACTIC_2_PROGRESS}}` | 0/6 | Tactic 2 tasks done/total |
| `{{TACTIC_3_PROGRESS}}` | 0/4 | Tactic 3 tasks done/total |

---

## Assessment View

### Overall Score
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{OVERALL_SCORE}}` | 52 | Numeric score out of 100 |
| `{{OVERALL_GRADE}}` | C+ | Letter grade |
| `{{SCORE_COLOR}}` | #067cbc | Ring color (computed from grade) |
| `{{GRADE_BG}}` | #067cbc | Badge background |
| `{{GRADE_TEXT}}` | #fff | Badge text color |
| `{{ASSESSMENT_DATE}}` | July 2026 | Date of assessment |
| `{{ASSESSMENT_SUMMARY}}` | The room, the food... | 1-2 sentence summary |
| `{{SCORE_RING_OFFSET}}` | 217.2 | SVG stroke-dashoffset for score ring |
| `{{ASSESSMENT_TOP_PRIORITY}}` | Move the booking link into the main nav | Top priority recommendation |
| `{{ASSESSMENT_TOP_PRIORITY_IMPACT}}` | HIGH IMPACT | Impact level badge |

### Channels Overview
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{CHANNELS}}` | (array) | Per-channel scores, tags, notes |

Sample data:
```javascript
channels = [
  { name: 'Social content', score: 48, tag: 'BIGGEST LEVER', tone: 'warning', note: 'Equipment and talent in place; no rhythm or calendar.' },
  { name: 'Google Profile', score: 70, tag: 'QUICK WINS', tone: 'info', note: 'Claimed and active, four fields short of complete.' },
  { name: 'Website', score: 62, tag: 'GOOD ENOUGH', tone: 'success', note: 'Loads fast, reads well. Not a priority this quarter.' },
  { name: 'Paid ads', score: 15, tag: 'NOT STARTED', tone: 'muted', note: 'No pixel, no audiences, occasional boosted posts.' }
]
```

### Working / Leaking Findings
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{ASSESSMENT_WORKING}}` | (array) | What's working well |
| `{{ASSESSMENT_LEAKING}}` | (array) | Critical gaps |

Sample data:
```javascript
working = [
  'Professional cameras and lighting already owned — no kit to buy.',
  'Aaron and Corey are comfortable on camera once there's a plan.',
  'The 24-tap wall and the room are genuinely distinctive assets.',
  'Website loads fast and reads clearly on a phone.'
]

leaking = [
  'No posting rhythm — bursts of five posts, then three weeks quiet.',
  'Google Profile 30% incomplete, with the old logo still showing.',
  'Nobody asks for reviews, so 30 is where you've stalled.',
  'No pixel, so every pound of past ad spend is unmeasurable.'
]
```

### Assessment Quick Wins
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{ASSESSMENT_QUICK_WINS}}` | (array) | 5 quick fixes with time estimates |

Sample data:
```javascript
assessmentQuickWins = [
  { text: 'Fix the mobile menu — three taps to find hours today', desc: 'Move hours and phone number above the fold on mobile.', time: '20 min' },
  { text: 'Turn on Instagram Shopping tags for the food posts', desc: 'Free, and it lets people tap straight from a photo to the menu.', time: '15 min' },
  { text: 'Add the booking link to the Instagram bio', desc: 'It's currently buried in a linktree with four other links.', time: '5 min' },
  { text: 'Reply to the three unanswered Google reviews', desc: 'All from the last 60 days — a fast reply now still reads as timely.', time: '20 min' },
  { text: 'Add alt text to the ten most-viewed website photos', desc: 'Small SEO lift, and it is accessibility work either way.', time: '30 min' }
]
```

### Assessment Categories (8 total)
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{ASSESSMENT_CATEGORIES}}` | (array) | Full category data with grades, stats, findings, recs |

Sample structure per category:
```javascript
{
  key: 'website',
  name: 'Website & Technical Foundation',
  grade: 'D+',
  oneLiner: 'Loads slowly on mobile and buries the booking link three menus deep.',
  body: 'The site reads well on desktop but mobile performance...',
  stats: [
    { label: 'MOBILE PAGESPEED', value: '41/100', tone: 'danger' },
    { label: 'DESKTOP PAGESPEED', value: '68/100', tone: 'warning' },
    { label: 'BOOKING LINK DEPTH', value: '3 taps', tone: 'danger' },
    { label: 'SSL & SECURITY', value: 'Passing', tone: 'success' }
  ],
  findings: [
    { text: 'Hero image alone is 4.2MB and blocks first paint on mobile', positive: false },
    { text: 'Booking link is not in the main nav — buried under "More"', positive: false },
    { text: 'HTTPS and basic security headers are correctly configured', positive: true }
  ],
  recs: [
    'Compress and lazy-load the hero and menu photography',
    'Move "Book a Table" into the primary nav and the sticky header'
  ]
}
```

### Assessment Priorities
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{ASSESSMENT_PRIORITIES}}` | (array) | Top 4 priority recommendations |

Sample data:
```javascript
assessmentPriorities = [
  { text: 'Move the booking link into the primary nav...', impact: 'high Impact', tone: 'danger' },
  { text: 'Start asking for reviews at the table...', impact: 'high Impact', tone: 'danger' },
  { text: 'Lock a weekly content capture session...', impact: 'medium Impact', tone: 'warning' },
  { text: 'Install the Meta pixel before any further ad spend...', impact: 'medium Impact', tone: 'warning' }
]
```

---

## Strategy View

| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{GOAL_TEXT}}` | Fill Tuesday-to-Thursday tables by making The Station the taphouse people in Twin City already feel they know. | The 90-day goal |
| `{{STRATEGIC_POSITIONING}}` | The 24-tap wall and the kitchen are the draw, but the reason people come back is the room and the people in it. Lead with atmosphere and staff; let the beer list be the proof, not the pitch. | Positioning statement |
| `{{NOT_DOING_TEXT}}` | No new channels, no website rebuild, no daily posting. Three posts a week done for twelve straight weeks beats a burst of ten and a month of silence. | What's explicitly out of scope |

### Objectives (3 total)
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{OBJECTIVE_1_TITLE}}` | A rhythm that survives a busy week | Objective title |
| `{{OBJECTIVE_1_BODY}}` | Three posts a week for twelve weeks, filmed in one hour, from four rotating pillars. | Description |
| `{{OBJECTIVE_1_MEASURE}}` | no missed weeks by day 60 | Success metric |
| `{{OBJECTIVE_2_TITLE}}` | Paid reach behind proven content | |
| `{{OBJECTIVE_2_BODY}}` | A small permanent local budget behind creative that already earned attention organically. | |
| `{{OBJECTIVE_2_MEASURE}}` | stable cost per reach by day 90 | |
| `{{OBJECTIVE_3_TITLE}}` | Local trust that compounds | |
| `{{OBJECTIVE_3_BODY}}` | A complete Google Profile and a team habit of asking, so reviews accumulate without effort. | |
| `{{OBJECTIVE_3_MEASURE}}` | 80+ reviews and rising | |

---

## Roadmap View

### Weeks (4 weeks in sample, 12 in full plan)
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{ROADMAP_WEEKS}}` | (array) | Week data with tasks |
| `{{ROADMAP_PHASES}}` | (array) | Phase timeline sidebar items |

Sample structure:
```javascript
weeks = [
  {
    id: 'w1',
    label: 'W1',
    title: 'Set Up Foundations',
    tasks: [
      { id: 't101', text: 'Define your four content pillars and write them down', tactic: 'content', done: true },
      { id: 't102', text: 'Build a content calendar with pillar rotation', tactic: 'content' },
      { id: 't103', text: 'Set up Meta Business Suite and connect Instagram', tactic: 'meta', done: true },
      // ...
    ]
  },
  // ...
]
```

---

## Tactic Detail Views (3 tactics)

### Tactic 1 (Content System example)
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{TACTIC_1_TITLE}}` | Social Media Content System | Tactic name |
| `{{TACTIC_1_NAV_LABEL}}` | Content System | Short nav label |
| `{{TACTIC_1_PHASE}}` | FOUNDATION | Phase name |
| `{{TACTIC_1_SUBTITLE}}` | A weekly filming and posting rhythm that shows the whole Station experience, not just the food. | One-line description |
| `{{TACTIC_1_WHAT_THIS_IS}}` | A repeatable weekly content rhythm using the gear you already own... | What this tactic is |
| `{{TACTIC_1_HEARD}}` | "The equipment is ready. The talent is in-house." The gap is workflow structure and consistency — not capability. | Client quote/context |
| `{{TACTIC_1_WHY}}` | Consistent content builds organic reach beyond existing followers and gives paid ads warm, proven creative to spend behind. | Why it matters |
| `{{TACTIC_1_TIME}}` | 3 | Time value (number) |
| `{{TACTIC_1_TIME_LABEL}}` | hours / week | Time unit |
| `{{TACTIC_1_PCT}}` | 25% | Progress percentage |
| `{{TACTIC_1_RING_OFFSET}}` | 146.1 | SVG stroke-dashoffset for progress ring |

### Tactic 2
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{TACTIC_2_TITLE}}` | Paid Amplification | Tactic name |
| `{{TACTIC_2_NAV_LABEL}}` | Paid Ads | Short nav label |
| `{{TACTIC_2_PHASE}}` | RHYTHM | Phase name |
| `{{TACTIC_2_SUBTITLE}}` | A small permanent budget behind content that already works. | One-line description |
| `{{TACTIC_2_WHAT_THIS_IS}}` | A permanent £5–10/day budget running behind your best-performing organic content. | What this tactic is |
| `{{TACTIC_2_HEARD}}` | "We've boosted posts before but never knew if it worked." | Client quote/context |
| `{{TACTIC_2_WHY}}` | Paid reach extends proven content to people who haven't followed yet. | Why it matters |
| `{{TACTIC_2_TIME}}` | 1 | Time value (number) |
| `{{TACTIC_2_TIME_LABEL}}` | hour / week | Time unit |
| `{{TACTIC_2_PCT}}` | 0% | Progress percentage |
| `{{TACTIC_2_RING_OFFSET}}` | 194.8 | SVG stroke-dashoffset for progress ring |
| `{{TACTIC_2_PARTS}}` | (array) | Implementation parts |
| `{{TACTIC_2_METRICS}}` | (array) | Success metrics |
| `{{TACTIC_2_CHECKPOINTS}}` | (array) | 30/60/90 day checkpoints |
| `{{TACTIC_2_METRIC_NOTE}}` | Focus on cost per reach, not clicks. | What to measure vs ignore |
| `{{TACTIC_2_REVIEW_RHYTHM}}` | Check campaigns every Monday morning. | Review cadence |
| `{{TACTIC_2_TIPS}}` | (array) | Tips with optional media |

### Tactic 3
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{TACTIC_3_TITLE}}` | Google & Reviews | Tactic name |
| `{{TACTIC_3_NAV_LABEL}}` | Google & Reviews | Short nav label |
| `{{TACTIC_3_PHASE}}` | SCALE | Phase name |
| `{{TACTIC_3_SUBTITLE}}` | A complete profile and a team habit of asking for reviews. | One-line description |
| `{{TACTIC_3_WHAT_THIS_IS}}` | A finished Google Business Profile with a process for accumulating reviews. | What this tactic is |
| `{{TACTIC_3_HEARD}}` | "We've been stuck at 30 reviews for over a year." | Client quote/context |
| `{{TACTIC_3_WHY}}` | Google trusts businesses with complete profiles and recent reviews. | Why it matters |
| `{{TACTIC_3_TIME}}` | 30 | Time value (number) |
| `{{TACTIC_3_TIME_LABEL}}` | min / week | Time unit |
| `{{TACTIC_3_PCT}}` | 0% | Progress percentage |
| `{{TACTIC_3_RING_OFFSET}}` | 194.8 | SVG stroke-dashoffset for progress ring |
| `{{TACTIC_3_PARTS}}` | (array) | Implementation parts |
| `{{TACTIC_3_METRICS}}` | (array) | Success metrics |
| `{{TACTIC_3_CHECKPOINTS}}` | (array) | 30/60/90 day checkpoints |
| `{{TACTIC_3_METRIC_NOTE}}` | Track review velocity, not vanity stars. | What to measure vs ignore |
| `{{TACTIC_3_REVIEW_RHYTHM}}` | Review new reviews every Friday. | Review cadence |
| `{{TACTIC_3_TIPS}}` | (array) | Tips with optional media |

### Tactic Pillars (if applicable)
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{TACTIC_1_PILLARS}}` | (array) | Content pillars |

Sample:
```javascript
pillars = [
  { name: 'The Station Experience', detail: 'Room pans, service moments, golden hour' },
  { name: 'The Food', detail: 'Plating process, not just the finished plate' },
  { name: 'The People', detail: 'Chef, GM, bartenders — short talking heads' },
  { name: 'Brewing & Community', detail: 'New taps, the 24-tap wall, local partnerships' }
]
```

### Tactic Parts (Implementation Steps)
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{TACTIC_1_PARTS}}` | (array) | Implementation parts with steps |

Sample structure:
```javascript
parts = [
  {
    tag: 'PART A',
    title: 'Define Your Content Pillars',
    meta: '2 steps · ~40 min',
    steps: [
      {
        title: 'Define four content pillars and document them',
        bullets: [
          'The Station Experience — dining room pans, place settings...',
          'The Food — pair dish visuals with a brief voiceover...',
          // ...
        ]
      },
      // ...
    ]
  },
  // ...
]
```

### Tactic Metrics
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{TACTIC_1_METRICS}}` | (array) | Success metrics |
| `{{TACTIC_1_CHECKPOINTS}}` | (array) | 30/60/90 day checkpoints |
| `{{TACTIC_1_METRIC_NOTE}}` | Follower count is the vanity number... | What to measure vs ignore |
| `{{TACTIC_1_REVIEW_RHYTHM}}` | Fifteen minutes every Friday... | Review cadence |

### Tactic Tips
| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{TACTIC_1_TIPS}}` | (array) | Tips with optional media |

Sample:
```javascript
tips = [
  { title: 'One hour beats one perfect reel', body: 'If the choice is a rough post today or a polished one next week, post today...', mediaKind: 'VIDEO', mediaNote: 'Coach walkthrough · 4 min' },
  // ...
]
```

---

## GBP Quick Wins View (Optional)

| Placeholder | Sample Value | Description |
|-------------|--------------|-------------|
| `{{GBP_STRENGTH_PCT}}` | 60% | Profile completion percentage |
| `{{SEARCH_TERM}}` | taphouse | Local search term |
| `{{GBP_TASKS}}` | (array) | 5 GBP quick win tasks |

Sample:
```javascript
quickWins = [
  { id: 'q1', text: 'Replace the old logo on the Profile.', desc: 'Your Profile still shows the green logo...' },
  { id: 'q2', text: 'Change business hours to Flexible.', desc: 'Walk-up traffic is not your model...' },
  { id: 'q3', text: 'Fill in every remaining field.', desc: 'The gaps are accessibility attributes...' },
  { id: 'q4', text: 'Check the Q&A section twice a month.', desc: 'Questions stay unanswered unless you respond...' },
  { id: 'q5', text: 'Set a goal of 100 reviews by end of summer 2026.', desc: 'You are at 30...' }
]
```

---

## Static Framework Copy (Same for all clients)

These are NOT placeholders — they're part of the product framework:

### Dashboard
- "The rhythm is holding." — encouragement line
- "Keep checking things off — every tick moves the ring and the tactic it belongs to."
- Phase names: Foundation, Rhythm, Scale, Sustain

### Roadmap
- "Check things off as you go. Everything saves itself."
- "WHY THE STREAK MATTERS" sidebar card

### Tactic Tabs
- "Overview", "Implementation Steps", "Success Metrics", "Tips & Resources"

### Assessment
- "Where you're starting from" — hero title
- Category names are standardized (Website & Technical Foundation, Local SEO, Reviews, etc.)

---

## Implementation Notes

1. **Assessment data** should come from `client_assessments.assessment_data` JSONB column
2. **Roadmap/weeks** should be built from the client's `plan.md` and stored progress
3. **Tactic content** should be generated per-client based on their plan
4. **Progress state** (tasks done) should sync with Supabase `client_progress` table
