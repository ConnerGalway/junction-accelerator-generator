# The Station Taphouse — Accelerator Implementation Plan

## Meta
Client Slug: the-station-taphouse
Has GBP Quick Wins: no

## Goal
The Station Taphouse opened in a renovated historic train station in August 2025, a second location alongside Twin City Brewing, which has run for nine years with 24 taps of local Vancouver Island beer. The Taphouse's 85-seat dining room, $55+ average bill, and seafood-forward menu have already found their audience on Friday and Saturday nights — those reservations fill on their own. What hasn't caught up is everything else: weekday lunch traffic is soft, the destination story of the train station gets told through food photos instead of the full atmosphere, and there's no system yet for knowing which marketing efforts actually bring a guest through the door versus which ones just feel like activity. Over the next 90 days, this plan builds that system — clean tracking on your booking data and your website, a weekly video content rhythm that finally shows what makes this place a destination rather than a utility stop, and a small, targeted set of Meta ads paired with the boarding pass cross-promotion between Twin City Brewing and the Taphouse — so that the next new customer you reach is one you can actually trace back to something you did.

## Strategic Positioning
Port Alberni has plenty of places to eat when you're hungry. It has very few places built to be the destination for the night out, the anniversary dinner, or the reason to detour off Highway 4. The Station Taphouse is one of them: seamless, old-fashioned service inside a historic train station, one of only two seafood-focused kitchens in town, and a direct tie to the Industrial Heritage Society's steam train that already sells tickets through your door. Twin City Brewing plays a different, complementary role — a community gathering place built on 24 taps and the story of two towns united after the 1964 tsunami, the kind of local anchor that Kokomo in Vancouver built into a following through story-first content rather than polish alone. Right now both venues' social presence leans almost entirely on food, which undersells what's actually different: the atmosphere, the service, and the story behind two connected but distinct venues. Aaron and Corey already have the raw material — professional cameras and lighting, a photography degree, and 10,000 followers on the brewery account to cross-promote from. What's missing is the system that turns that material into a steady stream of content, and the data to know whether it's working.

## Welcome Message
One year into the Taphouse and nine years into Twin City Brewing, Friday nights already prove the destination works — this plan is about building the tracking, content, and cross-promotion system that gets weekday lunch and new customers to the same place.

---

## Tactic 1: Tracking & Attribution Foundation
Phase: Foundation
Short Label: Tracking & Data
Subtitle: Fix the reporting gaps in ResOS, build a habit of asking guests how they found you, and confirm the website itself is actually measuring traffic before any ad dollars go out.

### What We Heard From You
Corey wants to export booking data from ResOS to analyze reservation timing patterns, but the reports are currently coming through in the wrong time zone, which makes that analysis unreliable until it's fixed. You've also committed to training staff to ask non-local guests how they heard about the restaurant — a good instinct, but there's no system yet to log those answers anywhere useful. Weekday lunch is your stated awareness gap, and Friday night already fills, so the two things you most need to know — when guests are actually booking, and how new guests are finding you — currently aren't being captured anywhere.

### What This Is
Before any ad spend or content push, this tactic gets your existing data working for you. That means fixing the ResOS time zone so your booking reports reflect what's actually happening, running a real analysis of 90 days of booking history to see the lunch-vs-dinner and weekday-vs-weekend pattern clearly, and building a dead-simple habit for front-of-house staff to log where new guests heard about you. It also means confirming — not assuming — that Google Analytics 4 and the Meta Pixel are actually installed on stationtaphouse.pub, since neither was mentioned as already in place.

### Why It Matters
Everything downstream in this plan depends on this. The video content system in Tactic 2 needs to know what's working; the Meta ads and boarding pass program in Tactic 3 need a pixel that's actually firing and a lunch-traffic baseline to measure against. Without this, you'd be making the same decisions on instinct that got you a full Friday night and a quiet Tuesday lunch — the goal here is to replace some of that instinct with actual numbers.

### Implementation Steps

#### Part A: Fix and Analyze Reservation Data
1. **Correct the ResOS Reporting Time Zone**
   - Log into the ResOS admin dashboard and check Settings for the account or restaurant time zone field
   - If there's no self-serve option visible, contact ResOS support directly at hi@resos.com and ask them to set your account's reporting time zone to Pacific Time
   - Confirm the fix by checking a booking you know the exact time of against the corrected report

2. **Export and Analyze 90 Days of Booking Data**
   - In ResOS, go to Menu → Reports → Bookings and export the last 90 days as a CSV
   - Sort by day of week and time of day; look specifically at weekday lunch (11am–2pm, Monday–Friday) versus weekend dinner volume
   - Note the busiest and slowest windows by name (e.g. "Tuesday lunch," "Friday 6–8pm") so you have a plain-language baseline, not just numbers
   - If helpful, paste the summarized data into an AI tool like Claude and ask it to identify the clearest patterns

#### Part B: Build a "How Did You Hear About Us" Habit
3. **Brief Front-of-House Staff on Asking and Logging the Question**
   - At a pre-shift meeting, explain the goal: knowing which marketing efforts are actually bringing in new, non-local guests
   - Give staff a simple, casual script — e.g. "First time in Port Alberni?" followed by "How'd you hear about us?" — rather than a scripted interrogation
   - Focus the ask on guests who seem like out-of-towners or first-timers, not every table

4. **Create a Simple Weekly Source Tally**
   - Set up a shared spreadsheet or a printed tally sheet at the host stand with categories: Instagram/Facebook, Google, Word of mouth, Train event, Walk-by, Other
   - Have whoever's on host duty add a tally mark each time a guest answers the question
   - Review and reset the tally sheet weekly so it's easy to spot trends over time rather than losing the data in a pile of paper

#### Part C: Confirm Website Tracking Is In Place
5. **Verify or Install Google Analytics 4 on stationtaphouse.pub**
   - Install the free "Google Tag Assistant" Chrome extension and load stationtaphouse.pub to check whether a GA4 tag is already firing
   - If nothing is detected, create a new GA4 property at analytics.google.com, add a Web data stream for stationtaphouse.pub, and set the reporting time zone to Pacific
   - Add the resulting Google tag to the site — check whether your website platform has a built-in Analytics field before asking a developer to hand-code it in
   - Confirm data is flowing using the GA4 Realtime report while browsing the site yourself

6. **Verify or Install the Meta Pixel**
   - Install the free "Meta Pixel Helper" Chrome extension and load stationtaphouse.pub to check whether a Pixel is already firing
   - If nothing is detected, create a Pixel in Meta Events Manager (business.facebook.com/events_manager) and add the base code to the site
   - Confirm the Pixel is firing using Meta Pixel Helper before moving on to Tactic 3

### Success Metrics
| Metric | 30 Days | 60 Days | 90 Days |
|--------|---------|---------|---------|
| ResOS reports showing correct time zone | Corrected and verified | Still accurate | Still accurate |
| "How did you hear about us" responses logged | 50+ logged | 150+ cumulative | 300+ cumulative |
| Weekday lunch covers (11am–2pm baseline vs. tracked) | Baseline established from 90-day export | +10% vs. baseline | +20% vs. baseline |
| GA4 and Meta Pixel status | Both confirmed live or newly installed | Both verified firing consistently | Pixel-based custom audience of 500+ built for Tactic 3 |

### Tips
- Fix the ResOS time zone before you do anything else in this tactic — every other piece of analysis depends on that being right.
- Keep the "how did you hear" tally as simple as a tally sheet on the host stand. If it requires opening an app or logging into anything, staff won't keep it up during a rush.
- Don't wait for a perfect data set before moving on to Tactic 2 and 3 — directional patterns (e.g. "lunch is clearly slower Tuesday–Thursday") are enough to act on.

### Resources
- [ResOS Bookings Reports support article](https://resos.com/support/bookings-reports/)
- [ResOS Support Center](https://resos.com/support/)
- [Set up Google Analytics 4 for a website](https://support.google.com/analytics/answer/9744165)
- [Meta Pixel and Custom Audiences](https://www.facebook.com/business/help/1474662202748341)

---

## Tactic 2: Weekly Video Content System
Phase: Content
Short Label: Video Content System
Subtitle: A repeatable weekly rhythm of staff interviews and B-roll that finally shows the full destination experience — not just the food — using the camera equipment and photography background you already have.

### What We Heard From You
You already have professional cameras and lighting on hand, and Corey has a photography degree — the gap isn't equipment or skill, it's time and a system. When a week gets busy, content is the first thing to fall off the list. You've talked through wanting to keep producing high-quality work rather than chasing the current "raw and unpolished" trend, while also recognizing that consistency matters more than perfection right now. Getting staff comfortable being on camera has been a real sticking point, and Conner's feedback was clear: your current content is high quality, but it shows food almost exclusively — it doesn't yet tell the story of the train station atmosphere, the seamless service, or the community mission behind Twin City Brewing the way a business like Kokomo in Vancouver has built its following around story.

### What This Is
A structured weekly system built around a single 30–45 minute session, so content creation has a fixed home in the calendar instead of competing with everything else. It starts simple — voiceover narration over B-roll footage, no staff on camera required — and builds gradually toward short staff interviews with the chef, GM, or front-of-house manager, using a repeatable format so nobody has to reinvent the approach each week. A running B-roll list (drone footage, the train, food plating, the dining room) gets captured in batches, separate from editing, so content doesn't depend on catching the perfect moment spontaneously.

### Why It Matters
This tactic produces the raw material that Tactic 3's ads will use as creative, and it's the most direct fix for the gap Conner identified: social media currently sells the food, when the food was never really the thing in question. Building staff comfort gradually — starting with voiceovers, not interviews — respects the real hesitation you described, rather than pushing straight to on-camera content that stalls out in week one.

### Implementation Steps

#### Part A: Set Up the Weekly Rhythm
1. **Block a Recurring 30–45 Minute Content Session**
   - Pick one fixed day and time each week, ideally during a naturally slower period (e.g. Tuesday mid-afternoon)
   - Put a recurring calendar hold on it for both Aaron and Corey, and treat it like any other standing commitment
   - Decide in advance who's "on" for content each week if it'll rotate between the two of you

2. **Build a Simple Content Calendar**
   - Set up a shared spreadsheet with columns for week, content format (voiceover / staff interview / B-roll compilation), topic, and status
   - Plan four weeks at a time so the weekly session is about execution, not deciding what to make that day

#### Part B: Build Staff Comfort Gradually
3. **Start With Voiceover-Over-B-Roll Clips**
   - For the first two weeks, record a short voiceover from Aaron or Corey narrating a dish, the atmosphere, or the history of the space, played over existing or newly captured B-roll
   - No staff need to appear on camera for this format — it's the lowest-friction way to get a consistent posting rhythm going
   - Aim for one to two of these per week during the first two weeks

4. **Introduce One Staff Interview Per Week**
   - Choose one team member per week — chef, GM, or front-of-house manager — for a short, casual interview
   - Keep it to three to five simple questions (favorite dish on the menu, best part of a shift, what makes this place different), asked off-camera so answers feel natural rather than scripted
   - Film in a 10-minute block during a slow period rather than trying to catch someone mid-shift

5. **Build a Running B-Roll Capture List**
   - Keep a running list of shots to capture: drone footage of the train station exterior (where permitted), food plating close-ups, dining room ambience during service, the steam train arriving if one is scheduled during the 90 days
   - Capture in batches roughly every two weeks rather than trying to get everything in one sitting

#### Part C: Package and Publish
6. **Write a Title/Thumbnail Checklist for Every Post**
   - Every clip needs a hook in the first three seconds — a shot of the train, a face, or a striking plate, not a slow establishing shot
   - Thumbnails should include a face or a recognizable element of the space (the train platform, the taps) rather than a generic frame grab

7. **Publish on a Fixed Weekly Cadence**
   - Use Instagram as the primary platform, leaning on the brewery's existing 10,000-follower base for cross-promotion
   - Cross-post between the Twin City Brewing and Station Taphouse accounts and tag both venues on every post
   - Keep the publishing day consistent week to week so followers start to expect it

### Success Metrics
| Metric | 30 Days | 60 Days | 90 Days |
|--------|---------|---------|---------|
| Weekly content sessions held | 4 of 4 weeks | 8 of 8 weeks | 12 of 12 weeks |
| Staff interview clips published | 1–2 | 4+ | 8+ |
| Instagram engagement rate (Taphouse account) | Baseline recorded | +15% vs. baseline | +25% vs. baseline |
| Cross-account tags between Brewery and Taphouse | System established | 8+ cross-tagged posts | 16+ cross-tagged posts |

### Tips
- A simple voiceover clip that actually gets posted beats a polished interview that gets pushed to "next week" indefinitely — consistency is the trend you said you didn't want to chase, but it's also the thing that compounds fastest.
- Batch B-roll capture separately from editing so a busy week doesn't kill the whole pipeline — footage in the bank means you can always assemble something even when there's no time to film fresh.
- Let the atmosphere and the story be the hook. The food is good enough that it doesn't need to carry every single post.

### Resources
- [Instagram Reels creative best practices](https://www.facebook.com/business/help/908450316556670)
- [Meta Business Suite getting started](https://www.facebook.com/business/help/205614130852988)

---

## Tactic 3: Meta Ads & Cross-Promotion
Phase: Ads & Promotion
Short Label: Ads & Cross-Promo
Subtitle: Targeted Meta ads aimed at your weekday lunch gap, paired with the boarding pass program that turns one venue visit into two.

### What We Heard From You
Friday night reservations already fill on their own — the challenge you named directly is weekday lunch traffic and reaching customers outside your current audience, which currently skews about 70% female, late-20s to mid-50s on social. You've already designed the boarding pass concept: a minimum spend at either Twin City Brewing or the Taphouse earns a stamped pass redeemable at the sister location within a 7–10 day window, built specifically to drive two-way cross-promotion between the venues. You've also run a train ticket promotion — 85 redemptions over an Easter weekend despite the conductor promoting it on every train — which came in lower than you expected given the foot traffic, suggesting the offer or the channel needs adjusting rather than the idea itself.

### What This Is
Two connected pieces. First, the boarding pass program gets finalized and launched — the mechanics, the staff training, and a specific date to test whether it actually shifts weekday traffic between the two venues. Second, small Meta ad campaigns built on the tracking from Tactic 1 and the content from Tactic 2 target the two things you actually need: a weekday lunch awareness campaign aimed at the demographic likeliest to book a business lunch, and a smaller retargeting campaign that keeps Friday night full without extending your marketing effort into audiences that don't matter yet.

### Why It Matters
This tactic only works because of what comes before it — the Pixel from Tactic 1 needs to be firing before a retargeting audience means anything, and the content from Tactic 2 is what the ads will actually be made of. It's also the piece that most directly answers what you told us you're trying to solve: a marketing strategy that increases guest count and reaches new customers, not just one that makes Friday night marginally busier.

### Implementation Steps

#### Part A: Launch the Boarding Pass Cross-Promotion
1. **Finalize Boarding Pass Mechanics**
   - Set a minimum spend threshold at either venue that earns the pass
   - Decide on format — a physical stamped card or a QR-code-based digital version — based on what's easiest for staff to issue and track
   - Confirm the 7–10 day redemption window at the sister location and print or set up the signage needed to explain it at both venues

2. **Train Staff and Set a Launch Date**
   - Brief front-of-house staff at both Twin City Brewing and The Station Taphouse on how to issue and redeem the pass
   - Place signage at the host stand and bar at both locations
   - Pick a launch date that lands on a slower weekday period specifically, so you can see whether it moves the weekday-lunch needle rather than just adding to an already-full Friday

#### Part B: Set Up Meta Ads Targeting the Awareness Gap
3. **Build a Custom Audience From Site Visitors**
   - In Meta Ads Manager, create a Custom Audience of the last 30 days of site visitors, using the Pixel confirmed live in Tactic 1
   - Layer in an interest- and location-based audience aimed at the older, business-lunch demographic in and around Port Alberni, to intentionally broaden past the current 70/30 skew

4. **Launch a Weekday Lunch Awareness Campaign**
   - Set a modest daily budget (roughly $15–20/day) to start
   - Build 2–3 ad variations using content from the Tactic 2 library — atmosphere and staff-interview clips tend to work better here than food-only shots
   - Schedule ads to run Sunday evening through Thursday, so they land in front of people before a lunch decision gets made, not after

5. **Launch a Friday Night Retention Campaign**
   - Build a separate, smaller campaign retargeting past site visitors and a lookalike audience with "book ahead" messaging
   - The goal here isn't to grow Friday further — it's to keep it reliably full while the lunch campaign does the harder work of reaching new people

#### Part C: Review and Broaden Reach
6. **Review Ad Performance and Audience Mix**
   - After two full weeks, check whether ad reach and engagement have shifted the audience mix beyond the pre-campaign gender/age skew
   - Review cost per click and, where trackable, cost per reservation-page click for both campaigns

7. **Decide on Extended Hours Using Combined Data**
   - Bring together the weekday lunch ad results, the boarding pass redemption data, and the ResOS booking export to make an informed call on whether extended hours (for a second dinner turn or a late-night cocktail crowd) are worth testing
   - Document the decision and the data behind it, whether the answer is yes or not yet

### Success Metrics
| Metric | 30 Days | 60 Days | 90 Days |
|--------|---------|---------|---------|
| Boarding pass redemptions | 10+ | 30+ | 60+ |
| Weekday lunch covers (11am–2pm, per ResOS) | Baseline vs. Tactic 1 export | +15% vs. baseline | +25% vs. baseline |
| New audience reach (profile visits outside existing followers) | Campaigns live | 500+ new profile visits | 1,000+ new profile visits |
| Audience gender/age mix vs. pre-campaign baseline | Baseline recorded | Shift tracked | Broader mix documented |

### Tips
- Don't launch either ad campaign before the Pixel from Tactic 1 is confirmed firing — without it, you're spending money with no way to build a retargeting audience later.
- The boarding pass only works if staff actually offer it at the point of payment — make handing it over part of the close, not an optional afterthought.
- Write the lunch-campaign ad copy for the business/older lunch crowd specifically. The messaging that works for a Friday date night is not the messaging that gets a weekday business lunch booked.

### Resources
- [Meta Business Suite getting started](https://www.facebook.com/business/help/205614130852988)
- [Meta Ads creative best practices](https://www.facebook.com/business/ads/creative-considerations)
- [ResOS Bookings Reports support article](https://resos.com/support/bookings-reports/)

---

## Objectives

### Objective 1
Title: Build Clean Tracking & Attribution
Description: Fix the ResOS reporting time zone, build a weekly habit of logging how guests found you, and confirm GA4 and the Meta Pixel are actually live on the website before any ad spend goes out.
Tactic Pill: Tactic 1 · Weeks 1–2

### Objective 2
Title: Launch a Weekly Video Content System
Description: Build a repeatable weekly rhythm of voiceover clips and staff interviews that finally shows the full destination experience — the train station atmosphere and the people behind it, not just the food.
Tactic Pill: Tactic 2 · Weeks 3–9

### Objective 3
Title: Grow Reach with Ads & Cross-Promotion
Description: Launch the boarding pass program between Twin City Brewing and the Taphouse alongside a targeted Meta ads push aimed squarely at the weekday lunch gap.
Tactic Pill: Tactic 3 · Weeks 6–12

---

## 90-Day Roadmap

Month 1 Name: Foundation & Tracking
Month 2 Name: Content & Cross-Promo Launch
Month 3 Name: Ads & Optimization

### Week 1: Tracking Setup
**Actions:**
- Log into the ResOS admin dashboard and correct the reporting time zone to Pacific Time, contacting ResOS support if there's no self-serve option → links to: Tactic 1 / Step 1
- Export 90 days of booking data from ResOS and review it for day-of-week and time-of-day patterns → links to: Tactic 1 / Step 2
- Check whether GA4 is already installed on stationtaphouse.pub using the Google Tag Assistant extension → links to: Tactic 1 / Step 5
- Check whether the Meta Pixel is already installed using the Meta Pixel Helper extension → links to: Tactic 1 / Step 6

**Checklist:**
- [ ] ResOS reports display in Pacific Time
- [ ] 90 days of booking data has been exported and reviewed
- [ ] GA4 status is confirmed (live, or needs installing)
- [ ] Meta Pixel status is confirmed (live, or needs installing)

### Week 2: Close the Tracking Gaps and Build the Habit
**Actions:**
- Install GA4 on stationtaphouse.pub if it isn't already live → links to: Tactic 1 / Step 5
- Install the Meta Pixel if it isn't already live → links to: Tactic 1 / Step 6
- Brief front-of-house staff at a pre-shift meeting on asking non-local guests how they heard about the restaurant → links to: Tactic 1 / Step 3
- Set up a simple weekly source tally sheet at the host stand → links to: Tactic 1 / Step 4

**Checklist:**
- [ ] GA4 is active and showing live visits
- [ ] Meta Pixel is firing on the site
- [ ] Staff are asking and logging the "how did you hear" question
- [ ] Weekly source tally sheet is in use

### Week 3: Content System Kickoff
**Actions:**
- Block a recurring 30–45 minute weekly content session on the calendar → links to: Tactic 2 / Step 1
- Build a simple content calendar with the first four weeks planned → links to: Tactic 2 / Step 2
- Record and publish the first voiceover-over-B-roll clip → links to: Tactic 2 / Step 3

**Checklist:**
- [ ] Weekly content session is on the calendar
- [ ] Content calendar has four weeks planned
- [ ] First voiceover clip is published

### Week 4: Second Content Week and First Staff Interview
**Actions:**
- Publish a second voiceover-over-B-roll clip → links to: Tactic 2 / Step 3
- Film the first staff interview with the chef, GM, or front-of-house manager → links to: Tactic 2 / Step 4
- Start a running B-roll capture list → links to: Tactic 2 / Step 5

**Checklist:**
- [ ] Second voiceover clip published
- [ ] First staff interview filmed
- [ ] B-roll capture list started

### Week 5: Packaging and a Real Publishing Rhythm
**Actions:**
- Write a title/thumbnail checklist and apply it to the next two posts → links to: Tactic 2 / Step 6
- Publish on a fixed weekly cadence on Instagram, cross-posting between Brewery and Taphouse accounts → links to: Tactic 2 / Step 7
- Review the first two weeks of "how did you hear" tally data for early patterns

**Checklist:**
- [ ] Title/thumbnail checklist is in use
- [ ] Weekly publishing cadence is established
- [ ] First tally review completed

### Week 6: Boarding Pass Launch Prep
**Actions:**
- Finalize boarding pass mechanics — spend threshold, format, and redemption window → links to: Tactic 3 / Step 1
- Brief staff at both venues and set a launch date → links to: Tactic 3 / Step 2
- Batch-capture the next round of B-roll (drone footage, plating, dining room) → links to: Tactic 2 / Step 5

**Checklist:**
- [ ] Boarding pass mechanics are finalized
- [ ] Staff at both venues are briefed
- [ ] Launch date is set
- [ ] Second B-roll batch is captured

### Week 7: Boarding Pass Live and Audience Building
**Actions:**
- Launch the boarding pass cross-promotion at both venues
- Build a Meta Custom Audience from 30-day site visitors using the Pixel → links to: Tactic 3 / Step 3
- Publish the second staff interview → links to: Tactic 2 / Step 4

**Checklist:**
- [ ] Boarding pass program is live at both venues
- [ ] Custom Audience is created in Meta and populating
- [ ] Second staff interview is published

### Week 8: Launch the Weekday Lunch Campaign
**Actions:**
- Launch the weekday lunch awareness campaign in Meta Ads using content from the library → links to: Tactic 3 / Step 4
- Track weekly boarding pass redemptions at both venues
- Continue the weekly content session and publishing cadence

**Checklist:**
- [ ] Lunch campaign is live and spending
- [ ] Boarding pass redemptions are being tracked weekly
- [ ] Weekly content rhythm is holding steady

### Week 9: Add the Friday Retention Campaign
**Actions:**
- Launch the Friday night retention campaign targeting past visitors and a lookalike audience → links to: Tactic 3 / Step 5
- Review the weekday lunch campaign's first full week of performance
- Publish a third staff interview or B-roll reel → links to: Tactic 2 / Step 4

**Checklist:**
- [ ] Friday retention campaign is live
- [ ] Lunch campaign has been reviewed once
- [ ] Third content piece is published

### Week 10: Mid-Campaign Review
**Actions:**
- Review ad performance and audience mix against the pre-campaign follower skew → links to: Tactic 3 / Step 6
- Pull a fresh ResOS export and compare weekday lunch covers to the Week 1 baseline → links to: Tactic 1 / Step 2
- Continue the boarding pass program and weekly content rhythm

**Checklist:**
- [ ] Ad audience mix has been reviewed
- [ ] Weekday lunch covers are compared against the Week 1 baseline
- [ ] Boarding pass and content rhythm are continuing on schedule

### Week 11: Extended Hours Decision
**Actions:**
- Decide whether to test extended hours using the combined ad, boarding pass, and lunch-covers data → links to: Tactic 3 / Step 7
- Publish another staff interview or B-roll reel → links to: Tactic 2 / Step 4

**Checklist:**
- [ ] Extended hours decision is documented, either way
- [ ] Content rhythm is still active

### Week 12: Review and Plan Forward
**Actions:**
- Review the full 90-day data set — ResOS bookings, ad performance, boarding pass redemptions, and "how did you hear" tally responses
- Document what worked, what didn't, and what to repeat next quarter
- Plan the next content batch and any ad budget renewal for Month 4

**Checklist:**
- [ ] 90-day data is reviewed and summarized
- [ ] Next-quarter plan is documented
