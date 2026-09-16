# Experience Dashboard: Coach Guide
### Junction Internal

**What this is:** A guide for coaches helping operators use their Experience Design dashboard.

---

## Overview

The Experience Dashboard is a 90-day implementation plan for tourism operators creating a bookable experience. It guides them from defining their experience through to their first paying guest.

The dashboard has six main sections, accessible from the left sidebar:

| Section | Purpose |
|---------|---------|
| **Home** | Welcome screen with progress summary and start date picker |
| **Strategy** | The goal, positioning, experience sentence, and three objectives |
| **Tracks 1-3** | Detailed implementation steps for each phase |
| **Roadmap** | 12-week checklist with actions and completion items |
| **Guide** | Link to the operator's guide document |
| **Materials** | Session recordings, questionnaire, pricing calculator |

---

## First Session with the Operator

### 1. Set the Start Date

On the Home screen, click **Choose Start Date** to open the date picker. Pick the Monday of Week 1. This date:
- Calculates the week labels across the roadmap
- Shows "You are here" indicator on the current week
- Enables the weekly progress emails

The start date can be changed later if needed.

### 2. Walk Through the Strategy Page

Show them:
- **The Goal**: What they will achieve in 90 days
- **The Experience**: Their one-sentence experience description
- **Strategic Positioning**: Why guests will choose them
- **Three Objectives**: The milestones across the program

This is the "why" behind everything in the roadmap.

### 3. Explain the Three Tracks

Each track covers one phase of the work:

| Track | Phase | Weeks |
|-------|-------|-------|
| Track 1: Define the Experience | Design | 1-4 |
| Track 2: Make It Operable | Operations | 5-7 |
| Track 3: Make It Bookable | Launch | 8-12 |

Inside each track:
- **Overview tab**: Context and rationale
- **Implementation Steps tab**: Numbered steps with sub-bullets
- **Success Metrics tab**: 30/60/90 day targets
- **Tips & Resources tab**: Practical advice and links

### 4. Show How the Roadmap Works

The roadmap is the operator's weekly to-do list.

**Each week has two columns:**
- **This Week's Actions**: What to do (some have "how to" buttons)
- **Completion Checklist**: What to tick off when done

**"How to" buttons**: Click these to jump directly to the relevant implementation step in the tracks. This is the main way operators learn how to complete each task.

**Progress tracking**: Checkboxes save automatically. Progress shows at the top of each week, each month block, and on the Home screen.

**Week notes**: Operators can add notes to any week using the notes section at the bottom of each week card.

---

## Ongoing Coaching Sessions

### Weekly Check-ins

1. Open the Roadmap and expand the current week
2. Review which checkboxes are complete
3. Discuss any blockers
4. Preview next week's tasks

### If They Get Stuck

1. Find the relevant action in the roadmap
2. Click the "how to" button to show them the implementation step
3. Walk through the numbered sub-bullets together
4. Check the Tips & Resources tab for additional help

### Track Their Progress

The Home screen shows:
- Overall completion percentage
- Current week indicator
- Days remaining in the program

Month headers in the roadmap show progress for each 4-week block.

---

## Key Features

### Bookability Checklist

At the bottom of the roadmap (scroll past Week 12), there is a Bookability Checklist. These are the non-negotiables before they can take their first booking:
- Insurance confirmed
- Business licence verified
- Guest waiver ready
- Safety protocol documented
- Cancellation policy published
- Photos uploaded
- Availability set
- First booking confirmed

This section has its own checkboxes separate from the weekly roadmap.

### Guide Page

Links to the operator's Google Doc guide (if available). This is supplementary reading material.

### Materials Page

Contains:
- Pre-program questionnaire
- Session 1 recording
- Session 2 recording
- Pricing calculator

Cards show "Coming Soon" if material is not yet available.

### Print/PDF

Click **Download PDF** in the roadmap header to generate a printable version. This includes:
- Cover page with client name and goal
- All 12 weeks with checkboxes
- Suitable for printing or saving as PDF

---

## Common Questions

**Can they access it on mobile?**
Yes. The dashboard is responsive. On mobile, the sidebar becomes a hamburger menu.

**Does progress sync across devices?**
Yes. Progress saves to the cloud (Supabase). They can check boxes on their phone and see them on their laptop.

**Can they change the start date after setting it?**
Yes. Click the date on the Home screen to change it.

**What if a "how to" button doesn't work?**
The link may point to a step that doesn't exist. Report to the technical team.

**Can they add their own tasks?**
No. The roadmap is fixed. They can use the week notes section for personal reminders.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Progress not saving | Refresh the page. Check internet connection. |
| Can't see the sidebar | On mobile, tap the hamburger menu icon |
| "How to" link goes nowhere | Report to technical team (broken step reference) |
| Start date not showing | Click "Choose Start Date" on Home screen |
| Materials show "Coming Soon" | Materials are added as they become available |

---

## Dashboard URLs

Experience dashboards live at:
```
https://accelerator.elearningu.com/[operator-slug]/
```

Example:
```
https://accelerator.elearningu.com/sample-experience/
```

The coach portal is at:
```
https://accelerator.elearningu.com/my-clients/
```

Note: Dashboard files are stored in `/clients/[slug]/` alongside accelerator dashboards.

---

*Junction Internal*
