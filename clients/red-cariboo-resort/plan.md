# Red Cariboo Resort — Accelerator Implementation Plan

## Meta
Client Slug: red-cariboo-resort
Target Milestone: Winter Season 2026/27 · Bookings live by December 1, 2026 · 90 to 135 tourist room nights booked by March 31, 2027
Has GBP Quick Wins: yes

## Goal

Red Cariboo is nearly full, and almost none of it is tourism. Work crews and travelling professionals account for 90 to 95 percent of revenue. They book direct, they know the property, and they need no marketing at all. That is a comfortable position and a fragile one. When the industrial projects around Prince Rupert and Kitimat ended, the accommodation businesses that had filled up on crew bookings emptied inside a season. The job of the next ninety days is to build leisure demand before you need it, using the $40,000 the investor has committed through spring.

The data has already answered the question of who that traveller is. Over the past twelve months the website drew 2,805 active users from Canada against 1,152 from Germany, Switzerland and Austria combined, and that is before a dollar has been spent targeting Canadians. Germans engage more deeply once they arrive, averaging 165 seconds on site against 103. A German-speaking operator is a genuine advantage for a summer market that plans a year ahead, and that market is worth keeping. But the volume is domestic, the winter market is domestic, and January is the busiest month on the website in each of the last two years. The plan follows the demand: Canadian drive-market travellers for winter 2026/27, German-speaking travellers for summer 2027, seeded during the same window.

Three problems currently stop that budget from working. The first is measurement. Four automatic events including page_view and first_visit are marked as key events, so every report in the account shows a conversion rate close to 100 percent, and roughly a quarter of recorded traffic is bot activity from China and Singapore that engages for under three seconds. The second is the booking path. The booking page is a bare date picker with no room types, no rates and no cancellation policy. The homepage carousel still leads with a Christmas offer that expired in January. The root domain serves German by default to an audience that is majority Canadian. The third is that the content which already works is buried. The Winter Packing List page drew 1,453 sessions last year, thirteen percent of all site traffic and more than the other 265 story pages put together. It sits in a nineteen-item dropdown alongside a page whose URL is still `duplikat-von-2023-year-in-review`. The booking page drew 72.

So the order matters. Weeks 1 to 4 fix measurement and the booking path, because paid traffic sent to the current site would waste the money and produce no usable data either way. Weeks 5 to 8 build the assets: a winter photo and video shoot, the first creator visit, and the landing pages the ads will point at. Weeks 9 to 12 turn on paid acquisition against a site that can convert and measure, landing in front of the December and January planning peak. About $17,000 is committed inside the ninety days. The remaining $18,000 runs from December to April, weighted toward January.

What that produces, stated honestly: at the moderate case, 90 to 135 tourist room nights for the winter season and $21,000 to $31,500 in room revenue against $35,000 of discretionary spend. Season one does not pay for itself inside the season. A plan that promised otherwise would be selling you something. What the money buys is a booking path that converts, an analytics account that tells the truth, a photo and video library you own, an email list built from zero, two creator content packages, and a live pipeline into the summer 2027 German market, which books during this winter.

| Scenario | Winter room nights (Dec–Mar) | Room revenue | Email list | New Google reviews |
|---|---|---|---|---|
| Conservative | 35 to 45 | $8,000 to $10,500 | 150 | 10 |
| Moderate | 90 to 135 | $21,000 to $31,500 | 300 | 25 |
| Aggressive | 210 to 280 | $49,000 to $65,500 | 500 | 40 |

## Strategic Positioning

Red Cariboo is a second Canada trip, and it should stop competing for the first one. A German traveller's opening visit is Banff, Jasper and the Icefields Parkway, and no budget this size changes that. The traveller who fits is someone who has already done that trip, found the Alps and the Rockies crowded, and now wants remoteness they can actually reach, met by an operator who answers their questions in German. That guest books in summer and plans twelve months out.

The winter guest is a different person and lives much closer. They are within a day's drive, they may be towing a snowmobile, and they want ice fishing, snowshoes, cross-country trails and a sky with nothing in it. They are not weighing Red Cariboo against another Chilcotin lodge. They are weighing it against Kananaskis, and Kananaskis wins by default because they already know what happens when they arrive. The competitor is ambiguity, not price.

Nimmo Bay and Clayoquot Wilderness Lodge both solve that problem, and neither is a model to copy on price, since both are all-inclusive at several times your nightly rate. What they do that Red Cariboo does not is make a complicated property feel simple. A visitor knows within thirty seconds what a stay looks like. Red Cariboo has more content than either site and less clarity. Eight units, a community kitchen in place of a restaurant, self-guided canoes and motorboats alongside guided horse and vehicle tours, and enough range that nobody has to pick one thing: that is a strong offer sitting behind nineteen unsorted story pages, a German-first homepage and a booking page with nothing on it.

> **Your Strategic Positioning**
> Red Cariboo is the reachable wilderness. Remote enough to feel like the end of the road, close enough to drive to, with enough to do that nobody has to choose. Eight cabins and apartments on the Dean River, a community kitchen instead of a dining room, and an owner who is actually there.

## Welcome Message

You have built a property that guests give five stars to and an operation that runs close to full, and almost none of that is leisure travel yet. This plan is about spending the $40,000 in the right order, so that when the January planning peak arrives, travellers can find you, understand you, and book you without having to send an email first.

---

## Tactic 1: Fix the Measurement and the Booking Path
Phase: Foundation
Short Label: Site & Booking
Subtitle: Make the analytics tell the truth and the website take a booking, before any money goes into advertising.

### What We Heard From You

You said the problem with the website is not that it lacks information, it is that nobody can find what is there. The FAQ page exists, in the footer. The parking details exist, three scrolls down a page about the resort. You have learned MODX well enough to add menu items, change links and load photos yourself, and you asked directly for recommendations on what to change. You also told us that the Cloudbeds booking box on the site was a compromise: you wanted a full search bar under the menu with dates and guest numbers, and the small red box was what you were able to agree on. And you held the CCCTA Spotify spot back specifically because you wanted analytics working before the campaign ran.

### What This Is

Three pieces of work that have to happen before advertising starts. First, repairing the GA4 account so its numbers mean something: removing bot traffic, correcting the key events, and adding tracking for the booking path and the enquiry forms. Second, rebuilding the path a visitor takes from landing on the site to submitting a booking, which includes a persistent search bar, a real booking page, contact details on every page, and English served by default at the root domain. Third, building a reusable landing page template so seasonal offers can be published in an afternoon instead of being rebuilt from scratch each year.

### Why It Matters

You are about to spend $35,000. At present the account cannot tell you whether a booking came from Google, from the Spotify ad, or from a guest who was going to book anyway, because four automatic events are marked as key events and the conversion rate reads as 100 percent for every channel. Separately, the booking page took 72 sessions in a year while the jobs pages took 408. Sending paid traffic to that page would spend the budget and produce almost nothing, and you would not be able to prove it either way. The landing page template matters because the one good conversion page on the site, the Christmas offer, took real effort to build and then went stale and stayed on the homepage for seven months.

### Implementation Steps

#### Part A: Make the Numbers Mean Something

1. **Remove the bot traffic from GA4 reporting.**
   - In GA4, open Admin → Data collection and modification → Data filters, and confirm the "Internal Traffic" filter is set to Active rather than Testing.
   - Add your own IP addresses and the resort office IP under Admin → Data streams → Configure tag settings → Define internal traffic, so your own visits stop counting.
   - Build a saved exploration that excludes Country = China and Country = Singapore. These accounted for 2,323 of 9,161 active users last year at under three seconds of engagement each, and they distort every average in the account.
   - Use this filtered view as the reporting view from now on. Do not delete historical data, since you will want the unfiltered baseline for comparison.

2. **Correct the key events so conversions mean something.**
   - Go to Admin → Data display → Events → Key events. Four events are currently starred: click, file_download, first_visit and page_view.
   - Unstar page_view and first_visit immediately. These fire on every single page load, which is why every channel reports a key event rate of roughly 1.00 and why Direct traffic shows 12,909 key events against 5,132 sessions.
   - Leave click and file_download starred. Outbound clicks and the Winter Packing List PDF download are both meaningful signals, at 170 and 62 respectively over the last ninety days.
   - The change is not retroactive, so make a note of the date. Reports before and after will not be comparable.

3. **Track the booking path and the enquiry forms.** *(contractor task, $800 to $1,200)*
   - Google Tag Manager is already installed on the site (container GTM-5VWH9VM), so no new tracking code is needed on the pages.
   - Have the contractor create four GTM triggers: booking widget opened, click through to the Cloudbeds booking engine, enquiry form submitted on any offer landing page, and contact form submitted.
   - Name the resulting GA4 events booking_start, booking_engine_click, offer_enquiry and contact_form. Mark all four as key events once you can see them firing in DebugView.
   - The Cloudbeds Immersive Experience 2.0 embed passes tracking data to GA4 and Google Tag Manager, so ask the contractor to use that rather than a plain link out to the booking engine.
   - Test each one yourself before signing off. Submit a real form, open the widget, and confirm the event appears in the GA4 Realtime report.

4. **Record a clean baseline before any money is spent.**
   - Once filters and key events are corrected, export a single page of numbers dated to the end of Week 2: sessions, sessions by channel, sessions by country, top ten landing pages, and the four new key events at zero.
   - This is what the Spotify campaign, the Google ads and the Meta ads will all be measured against. Without it, a spike in January is indistinguishable from normal January.
   - Send a copy to Junction before the Week 4 coaching session.

#### Part B: Fix the Path to Booking

5. **Brief and hire the web contractor.** *(total contractor scope, $4,100 to $6,500)*
   - You need someone comfortable in MODX. Ask the current German developer for a quote first, since he knows the build, but get a second quote from a Canadian freelancer so you have a comparison and a fallback.
   - Scope the work as a single fixed-price package covering steps 3, 7 and 12, rather than hourly, so the cost is known before you commit.
   - Ask for a staging copy of the site to test on. Cloudbeds warns that self-applied customisations to the booking embed can break when the platform updates, so nothing should be tested live.
   - Set a delivery date of end of Week 6. Everything in Tactic 3 depends on this being finished.

6. **Serve English by default at redcariboo.com.**
   - The root URL currently loads the German homepage and took 3,061 sessions last year, against 1,408 for /en, while Canada and the United States are the two largest audience segments.
   - Have this done in-house: set the root to load English, with German available from the language switcher exactly as it is now, and add browser-language detection so a German browser still lands on the German version.
   - Keep both hreflang tags in place. The German site is working well in German search and nothing should disturb that.
   - Check that the German sitemap at the root and the English sitemap at /en are both submitted in Google Search Console. Only the German one is currently the default, which is why external crawlers miss English pages.

7. **Put a permanent booking search bar under the navigation.** *(contractor task, $1,500 to $2,500)*
   - Replace the small red pop-out widget with a full-width bar sitting directly beneath the main menu: check-in, check-out, number of guests, and a Book Now button. This is the layout you originally asked for.
   - Cloudbeds offers this through the Booking Engine embed options. The Immersive Experience 2.0 popup mode opens the engine as a side panel rather than sending the guest to a different domain, which is where bookings are currently lost.
   - Set the widget language option to "Detect by Browser" so German visitors see German.
   - The bar should appear on every page, not only the homepage. A guest who has just finished reading the Winter Packing List should be able to check dates without navigating anywhere.

8. **Rebuild the booking page so it answers questions instead of asking one.**
   - The page currently contains a date picker and the address. Add: the eight units with photos and nightly rates ($204 apartments, $209 small cabins, $315 big cabins), what is included, the cancellation policy, check-in and check-out times, and the note that there is no restaurant but there is a community kitchen.
   - Add the full-page Cloudbeds embed here so the entire booking happens on redcariboo.com.
   - State the operating season and dates plainly at the top. The assessment flagged missing hours as its one remaining gap in guest experience, and a visitor planning a February trip currently has no way to know you are open.
   - Publish the German version within a week of the English one.

9. **Put phone, email and office hours in the header and footer of every page.**
   - These already appear on the winter offer landing page and nowhere else. Copy that header treatment across the site: +1 250-742-3287, info@redcariboo.com, Mon to Fri 8am to 5pm Pacific.
   - Add a line stating which time zone the hours are in. A German enquiry arriving at 9am Berlin time is arriving at midnight in Anahim Lake, and saying so sets expectations.
   - Consider a WhatsApp link alongside the phone number for European guests, which avoids international call charges and is the default messaging app across the DACH region.

#### Part C: Build the Landing Page System

10. **Retire the expired offer and find the broken pages.**
    - The homepage carousel still links to the Christmas offer valid December 20, 2025 to January 4, 2026, and the winter offer that ended February 28, 2026. Take both down this week.
    - The testimonials on that page are TripAdvisor reviews from September and October 2020. Replace them with recent Google reviews once Tactic 4 starts producing them.
    - Error pages took 1,051 views over the last 24 months. Crawl the site with a free tool such as Screaming Frog (500 URLs free, enough for this site) and fix or redirect every broken link it finds.
    - Delete or redirect /en/stories/duplikat-von-2023-year-in-review, which is a duplicate that still ranks and still takes traffic.

11. **Restructure the navigation around what guests search for.**
    - Do this yourself in MODX. The Stories dropdown currently lists nineteen items in no order, with four separate year-in-review posts weighted the same as the Winter Packing List.
    - Split Stories into two menu items: "Plan Your Trip" for the pages that answer practical questions (packing lists, getting here, shopping and self-catering, activities information, FAQ), and "Stories" for the narrative posts.
    - Move the FAQ out of the footer and into Plan Your Trip. You mentioned it was there and that nobody finds it, which is the whole problem.
    - Rename or hide the Restaurant menu item until summer 2027. A guest deciding whether to bring groceries needs to know there is a community kitchen and no dining room, and a menu item labelled Restaurant tells them the opposite.
    - Archive the year-in-review posts to a single "Resort News" subpage rather than four top-level entries.

12. **Build the offer landing page template.** *(contractor task, $1,800 to $2,800)*
    - The winter offer page is the best converting layout you have: header with contact details, an offer with real rates, photography, testimonials and an enquiry widget. Have the contractor turn it into a reusable template.
    - Change one thing about it. The current call to action is "Make a request", which routes a ready-to-book guest into your inbox. The template needs a primary Book Now button going to the Cloudbeds engine with the dates pre-filled, and the enquiry form as the secondary option.
    - The template needs slots for: an offer name and validity dates, two to four rate lines, four to six images, a package inclusions list, three to five recent reviews, and both buttons.
    - Ask for English and German versions of the template, since every page will be published twice.

13. **Launch the first two winter landing pages.**
    - Page one, aimed at the Canadian drive market: a winter package built around ice fishing, snowshoes and cross-country skiing, with equipment rental included rather than discounted. Axel dislikes discounting and value-adds achieve the same result without lowering the rate.
    - Page two, aimed at the same market for Christmas and New Year: the festive booking window, which already sells and has previously produced full-property buyouts.
    - Both pages need the drive time and route stated in the first two sentences. The Spotify ad never says where the resort is, and a listener in Kelowna has no idea whether Cariboo Chilcotin Coast means two hours away or ten.
    - Publish English first, German within a week, and add both to the Plan Your Trip menu.

### Success Metrics

| Metric | 30 Days | 60 Days | 90 Days |
|---|---|---|---|
| Key events firing correctly | page_view and first_visit unstarred; click and file_download retained | Four new booking and enquiry events live and marked as key events | 30 days of clean conversion data available for ad measurement |
| Bot traffic in reporting | Filtered view built and in use | Reported engagement rate reflects real users only | Baseline confirmed against the pre-filter figures |
| Booking engine starts (booking_start) | Tracking live, baseline recorded | 40 to 80 per month | 100 to 200 per month |
| Booking page sessions | Baseline of 72 per year recorded | 150 or more in the month | 400 or more in the month |
| Average engagement time on the booking page | 39 seconds (baseline) | 60 seconds or more | 90 seconds or more |
| Offer landing pages live | Template scoped and contractor booked | Template built and tested on staging | Two pages live in English and German |
| Broken pages | Site crawled, list produced | All 404s fixed or redirected | Error page views trending toward zero |

### Tips

- Do steps 1 and 2 yourself, this week, before anything else. They take about forty minutes and cost nothing, and every number produced between now and Christmas depends on them.
- Get the contractor quote from the German developer first. He knows the build, and if he quotes high or slow you will have the Canadian quote as leverage rather than starting the search from zero.
- When the booking bar goes live, book a test reservation yourself from a phone on mobile data, all the way to the confirmation email. Mobile is 3,030 of your 8,746 users and the current widget is hardest to use there.
- Resist rebuilding the whole site. Every hour spent on the homepage design is an hour not spent on the pages that already earn traffic. The Winter Packing List page did 1,453 sessions with no design work at all.
- When you publish the German version of a page, publish it within a week of the English one. Half-translated sites are worse than single-language ones, and your German audience is the most engaged segment you have.

### Resources

- Cloudbeds Booking Engine overview and features: [https://myfrontdesk.cloudbeds.com/hc/en-us/articles/218512197-Cloudbeds-Booking-Engine-overview-and-features](https://myfrontdesk.cloudbeds.com/hc/en-us/articles/218512197-Cloudbeds-Booking-Engine-overview-and-features)
- Cloudbeds website widget options: [https://myfrontdesk.cloudbeds.com/hc/en-us/sections/204056127-Website-Widgets](https://myfrontdesk.cloudbeds.com/hc/en-us/sections/204056127-Website-Widgets)
- Cloudbeds Immersive Experience 2.0 embed guide, for the contractor: [https://myfrontdesk.cloudbeds.com/hc/en-us/articles/32048321731739-Cloudbeds-Booking-Engine-Immersive-Experience-2-0-Everything-you-need-to-know](https://myfrontdesk.cloudbeds.com/hc/en-us/articles/32048321731739-Cloudbeds-Booking-Engine-Immersive-Experience-2-0-Everything-you-need-to-know)
- Setting up key events in GA4: [https://www.analyticsmania.com/post/track-key-events-with-google-analytics-4/](https://www.analyticsmania.com/post/track-key-events-with-google-analytics-4/)
- Google Analytics Help Centre: [https://support.google.com/analytics/](https://support.google.com/analytics/)
- Clayoquot Wilderness Lodge, as a reference for how a complex property is made simple: [https://clayoquotwildernesslodge.com/](https://clayoquotwildernesslodge.com/)

---

## Tactic 2: Build the Content That Answers What Travellers Actually Search
Phase: Content and Story
Short Label: Content & Social
Subtitle: Turn the property into a photo library and a set of pages that earn search traffic, then restart social media on a schedule that survives a busy week.

### What We Heard From You

You told us you have already written a one-week itinerary and want to extend it into three-day and five-day versions, and that you plan to hand those to your team so they can post from them. You also raised the stargazing angle yourself, said the sky at Red Cariboo has no light pollution, and mentioned that Axel talked you out of it a few years ago on the grounds that it is too cold to stand outside. Separately, you explained the approvals problem: Charlotte Lake is cleared through the recreation sites officer, Tweedsmuir is not, and the workaround you invented was to write a story about a team member skiing there and film her doing it. And you were honest that the property is not camera-ready yet, that there is material lying around the site, and that staffing has to be solved before a photographer arrives.

### What This Is

Two bodies of work that feed each other. The first is a photo and video library that Red Cariboo owns, shot on the property in autumn and again once snow arrives, covering the cabins, the interiors, the frozen river, the activities and the night sky. The second is a small set of pages built around the questions travellers already type into Google, extended from the one page on the site that has proven this works. Both then supply the social calendar, which restarts at three posts a week with Reels as the default format.

### Why It Matters

The Winter Packing List page drew 1,453 sessions last year across English and German, which is thirteen percent of all traffic to the site and more than the other 265 story pages combined. That page was written for guests who had already booked, and it now brings in strangers. Nobody has repeated the format since. Meanwhile Instagram produced zero link clicks in twelve months and reach fell from 935 in April to 145 in August, because the account posts roughly once every ten weeks and the algorithm has stopped showing it to anyone. The ads in Tactic 3 need somewhere to send people and something to look like, and both of those come from here.

### Implementation Steps

#### Part A: Build the Asset Library

1. **Clear the property before anyone photographs it.**
   - Walk the site with Axel and write a specific list of what has to move: building material, offcuts, equipment stored outside cabins, anything visible from the river side.
   - Give the list a deadline that sits two weeks before the shoot date, not the day before.
   - Photograph the problem areas on your phone now and again after the clear-up, so there is an agreed record of what was done.
   - Ask Axel to identify the two cabins and one apartment that are in the best condition. The shoot only needs to cover units that look their best, not all eight.

2. **Capture an interim set yourself in October.**
   - Advertising starts in Week 9 and the paid winter shoot cannot happen until snow is reliable, so you need usable images before then.
   - Shoot on a phone in good light: cabin interiors with lamps on, the community kitchen mid-use, the games room, the Dean River in autumn colour, the driveway and arrival, and the night sky on a clear evening.
   - Video matters more than stills here. Fifteen seconds of a fire beside the river is worth more on Instagram than a perfect photograph.
   - Aim for around forty usable images and ten short clips. This is a holding library, so quantity beats polish.

3. **Book the professional shoot against the first reliable snow.** *(contractor task, $3,500 to $5,000 including travel)*
   - Target mid to late November, and write a weather clause into the agreement so the date can move by a week without penalty.
   - Brief for two days on the property with a photographer who also shoots video. One person doing both costs less than two and produces a matched set.
   - Shot list: exterior cabins in snow, interiors at dusk with lights on, the frozen Dean River, ice fishing with a fire, snowshoe and cross-country trails, horses in snow, the community kitchen with people cooking, arrival and driveway, and a night sky sequence.
   - Ask specifically for vertical video, since Reels and ad placements need 9:16 and horizontal footage cannot be cropped into it well.
   - Confirm in writing that Red Cariboo owns full commercial rights to everything, including paid advertising use.
   - Chase Axel's former staff member for the photographs she took during your visit. Those may cover the summer gap at no cost.

4. **Organise the library so it can actually be used.**
   - Create a shared folder structure by season and subject, for example Winter/Cabins, Winter/IceFishing, Autumn/Interiors.
   - Rename files descriptively rather than leaving camera numbering, because you will be searching this folder every week for the next two years.
   - Keep a separate folder of the twenty strongest images cleared for advertising, so whoever is buying media does not have to ask.

#### Part B: Publish the Pages That Earn Search Traffic

5. **Settle what you are allowed to promote, and let CCCTA do the work.**
   - Send one email to your CCCTA contact listing everything you want to reference: Tweedsmuir trails, Nimpo Lake trails, Charlotte Lake, the Rainbow Range, and any fees or approvals attached to each.
   - Ask them to confirm in writing what can appear on a commercial website and what cannot. This is what the regional organisation exists for, and it is faster than you calling each community.
   - Where promotion is not permitted, use the approach you already invented: a first-person story about a team member doing the activity, with her own photographs or video. Charlotte Lake is already cleared, so lead with that.
   - Keep the written answers in one document. This question will come up every time you publish something.

6. **Publish the itinerary series.**
   - Start with the one-week itinerary you have already written, then cut it down into a three-day and a five-day version. Three days is the drive-market weekend and five days is the realistic winter stay.
   - Each itinerary needs a day-by-day structure, an estimate of driving time from Williams Lake and Vancouver, what the guest needs to bring, and what Red Cariboo supplies.
   - End every itinerary with the booking bar and a link to the relevant offer landing page from Tactic 1.
   - Write in your own voice rather than a brochure voice. The German pages with the longest engagement times on the site are the personal ones, including the adventure story at 119 seconds and the community kitchen piece at 128 seconds.
   - Publish the English version first and the German version within a week.

7. **Extend the preparation pages.**
   - The Winter Packing List proves that people search for how to prepare before they search for where to stay. Add a summer version, a "Know Before You Go" page covering cell service, fuel, groceries and road conditions, and a page on driving Highway 20 in winter.
   - Keep the downloadable PDF format. The existing checklist was downloaded 503 times over 24 months, and a download is a stronger signal of intent than a page view.
   - Link every one of these pages to the booking bar and to at least one itinerary.
   - Update the existing Winter Packing List page while you are in there, since it is the single highest-traffic page on the site and currently ends without a call to action.

8. **Publish the dark skies page properly.**
   - You have a page on this already and it is buried. Rebuild it as a proper landing page: what can be seen, when, from where on the property, and what to wear so that standing outside is bearable.
   - Address Axel's objection directly on the page. The honest answer is that guests need a warm cabin twenty metres away and somewhere to put a hot drink, which Red Cariboo has and a roadside pullout does not.
   - Be accurate about the aurora. You said it appears from time to time but not with the reliability of somewhere further north, so do not promise it. Overpromising the northern lights produces bad reviews.
   - Add the page to Plan Your Trip and reference it from the winter offer landing page.

#### Part C: Restart Social Media

9. **Decide who owns social media, this month.**
   - You have three hours a week from the team in Canada and a possible fourth option in Julia, who posted three times a week last year and is now in Germany two hours from you.
   - If Julia takes it on, budget roughly $500 a month and draw it from the December to April allocation. Raise the LMIA question separately, since it affects her return regardless of this plan.
   - Whoever owns it needs the content library, the itineraries and a fixed weekly pattern, not a general instruction to post more.
   - Confirm the owner before the Week 4 coaching session so the calendar can be built around a real person.

10. **Fix the Instagram profile so a visit can become a click.**
    - The account produced zero link clicks across twelve months. Check the bio link works, points to the site rather than a dead page, and goes somewhere specific such as the winter offer.
    - Rewrite the bio to say where the resort is in terms an outsider understands, including distance from Williams Lake and Vancouver.
    - Add Instagram highlights for Cabins, Winter, Getting Here and Activities, using material from the interim October shoot.
    - Do the same on Facebook, where 2,730 profile visits produced 64 link clicks.

11. **Post three times a week to a fixed pattern.**
    - Set the pattern by day rather than by inspiration. For example: Tuesday a place or activity, Thursday a practical tip drawn from the packing and preparation pages, Sunday a photograph with a short story.
    - Schedule a month at a time in Meta Business Suite so a busy week does not break the run.
    - Say where the resort is in the caption at least once a week. The same gap that weakens the Spotify spot weakens the social posts.
    - Include one clear instruction to act each week, such as a link to the winter offer, rather than adding one to every post.

12. **Make Reels the default format.**
    - One of the last twelve Instagram posts was a Reel. Reels reach substantially further than static posts, and reach is the specific thing that has collapsed on this account.
    - Target two Reels a week from the shoot footage. Simple formats work: a walk through a cabin, the drive in, the fire on the ice, a packing list to camera.
    - Post the same Reel to Facebook, where the audience is larger and the account produced 82,854 views last year.
    - Do not chase trending audio in a way that fights the material. Quiet footage of a frozen river with ambient sound performs well for this category.

13. **Turn each itinerary into a run of content.**
    - One itinerary yields eight to twelve posts: one per day of the trip, one per activity, one on packing, one on getting there.
    - Write the post captions at the same time as the page, while the material is in your head, and hand the whole set to whoever runs the account.
    - Every post in the run links back to the itinerary page, which is where search traffic and social traffic can finally meet.
    - Organic social sent 295 sessions to the website last year, under one a day. The target for this system is ten times that, and it is achievable simply through posting consistently and including a link.

### Success Metrics

| Metric | 30 Days | 60 Days | 90 Days |
|---|---|---|---|
| Owned image and video library | Interim set captured, around 40 images and 10 clips | Professional shoot booked with weather clause | Shoot completed, library organised and rights confirmed |
| New pages published | Approvals confirmed with CCCTA; three-day itinerary live | Five-day and seven-day itineraries live; summer packing list live | Six new pages live in English, four in German |
| Instagram posting frequency | 3 posts per week, from 0.1 | Sustained at 3 per week | Sustained, with 2 Reels per week |
| Instagram link clicks | Bio link fixed and tracked | 15 or more in the month | 40 or more in the month |
| Instagram reach | Arrest the decline, 300 or more | 800 or more | 1,500 or more |
| Sessions from organic social | Baseline of 295 per year recorded | 80 or more in the month | 200 or more in the month |
| Sessions to preparation and itinerary pages | Baseline recorded | 300 or more in the month | 700 or more in the month |
| PDF checklist downloads | Baseline of 62 per quarter recorded | 100 or more per quarter | 150 or more per quarter |

### Tips

- Write the itineraries the way you would tell a friend what to do with four days, rather than the way a brochure would describe it. Your best-performing German pages are the ones that sound like a person.
- Book the photographer now for a movable November date. Good winter shooters in the interior fill up early, and the weather clause costs nothing to include.
- Do not post to Instagram and Facebook separately. Meta Business Suite publishes to both, and the extra half hour a week is the difference between the schedule holding in December and quietly stopping.
- When you write a page, add it to a menu the same day. The FAQ has been in the footer for years, and that is the entire reason nobody has read it.
- Keep a running list of guest questions from your inbox. Every question asked twice is a page worth writing, and that is exactly how the Winter Packing List came to exist.

### Resources

- Meta Business Suite, for scheduling both accounts: [https://business.facebook.com/](https://business.facebook.com/)
- Instagram for business, including Reels guidance: [https://business.instagram.com/](https://business.instagram.com/)
- Cariboo Chilcotin Coast Tourism Association, for approvals and regional content: [https://landwithoutlimits.com/](https://landwithoutlimits.com/)
- Destination BC listings and content guidance: [https://www.hellobc.com/](https://www.hellobc.com/)
- DarkSky International, for dark sky positioning and language: [https://darksky.org/](https://darksky.org/)
- DriveBC, to link from the Highway 20 winter driving page: [https://www.drivebc.ca/](https://www.drivebc.ca/)

---

## Tactic 3: Spend the Budget Where It Can Be Measured
Phase: Paid Acquisition
Short Label: Ads & Creators
Subtitle: Put paid media behind the winter season across Google, Meta and the CCCTA audio spot, and bring in two creators to produce content the resort could not produce alone.

### What We Heard From You

You said you had thought about Google ads and Facebook ads but had not started, and that the CCCTA package is good value because the MRDT funding covers half the cost. You held the Spotify spot back deliberately until analytics were working, which was the right call. You were clear that the intention of that spot was awareness rather than direct bookings, and that packages, not discounts, are what will actually convert. On creators, you said you have no objection and that you cannot write all the content yourself, which is exactly the gap a creator visit fills. You also told us your realistic capacity for this programme is about ten hours a week, alongside bookkeeping and staffing.

### What This Is

A staged media plan running from Week 9 through April, split across three channels with different jobs. Google Search catches people already looking for somewhere to stay in the Chilcotin. Meta puts the property in front of a drive-market audience that does not yet know Anahim Lake exists, and then follows the ones who visited the site. The Spotify spot runs alongside both as regional awareness with a measurement window around it. Two creator visits, one in November and one in January, produce video and written coverage that neither you nor a photographer can produce.

### Why It Matters

There is $35,000 to spend and ten hours a week to spend it in. That combination fails without a schedule and a named owner, because ad accounts left unattended spend evenly and learn nothing. The sequencing also matters more here than in most plans: January is the busiest month on the website in each of the last two years, and European travellers researching summer 2027 are doing it during the same window. Spending heavily in September against a broken booking path would burn the budget before either audience arrives. Spending lightly in November and heavily in December and January puts the money where the demand already is.

### Implementation Steps

#### Part A: Decide How the Money Is Managed

1. **Decide whether you run the ads or a media buyer does.**
   - The honest assessment: building and managing Google Search plus Meta properly takes four to six hours in the first fortnight and two to three hours a week after that, and you have ten hours a week total across everything.
   - The recommendation is a freelance media buyer at roughly $600 a month, with a higher setup fee of $600 to $1,200 in the first month. That is around $3,100 of the $35,000, and it buys back the hours you need for content and email.
   - If you engage one, keep account ownership yourself. Create the Google Ads and Meta accounts under your own login and add them as a user, so nothing walks away at the end of the engagement.
   - Whoever runs it reports against the four key events from Tactic 1, not against clicks or impressions.

2. **Lock the spend schedule before the first campaign goes live.**
   - Total budget $40,000. Committed to CCCTA already: $5,000. Discretionary: $35,000.
   - Inside the ninety days, about $17,000: web contractor $4,100 to $6,500; professional shoot $3,500 to $5,000; November creator visit $2,500 to $3,500; Google Search Weeks 9 to 12 at $50 a day, $1,400; Meta Weeks 10 to 12 at $40 a day, $850; media buyer setup and November management $1,200 to $1,800; tools and subscriptions $200 to $300.
   - December through April, about $18,000: Google Ads $5,000; Meta $5,000; media buyer retainer at $600 a month, $2,500; January creator visit $2,500; social media management at roughly $500 a month, $2,500; reserve $500.
   - Weight December and January at roughly double the November daily rate. That is where the demand is, and holding money back for it is more valuable than starting bigger in November.
   - Write the schedule into a single sheet and check actual spend against it monthly. Ad platforms overspend quietly.

#### Part B: Google Search

3. **Create the Google Ads account in Expert Mode and link it to GA4.**
   - At ads.google.com, choose "Switch to Expert Mode" on the first screen. Do not accept a Smart Campaign, which hands targeting decisions to Google in ways that suit large budgets and rarely small ones.
   - Use the same Google account that owns the GA4 property and the Google Business Profile, which makes linking straightforward.
   - Link GA4 under Tools → Data manager, and import booking_start, booking_engine_click and offer_enquiry as conversions.
   - Set the account currency to CAD and the time zone to Pacific. Neither can be changed later without opening a new account.

4. **Build the winter search campaign.**
   - One campaign, Search network only. Switch off Display Network expansion and search partners, both of which are on by default and spend the budget on low-intent placements.
   - Target British Columbia and Alberta, set to "Presence: people in or regularly in your targeted locations" rather than the default, which includes people merely showing interest.
   - Build two ad groups. One for accommodation intent: cabins Anahim Lake, Chilcotin accommodation, Highway 20 cabins, Dean River lodging, cabin rental Chilcotin. One for activity intent: ice fishing BC lodge, snowmobile accommodation BC, cross country skiing Chilcotin, winter cabin rental BC.
   - Use phrase match rather than broad. Broad match on a small budget finds every loosely related search in the province.
   - Write ten headlines and four descriptions per ad group. Say where the resort is in at least three headlines, since that is the single thing every listener and reader is missing.
   - Send accommodation traffic to the rebuilt booking page and activity traffic to the winter offer landing page. Do not send either to the homepage.

5. **Launch at $50 a day and review the search terms weekly.**
   - Start Week 9 and run through Week 12, which spends approximately $1,400.
   - Check the Search Terms report on day three, then weekly. Add negative keywords for anything about jobs, employment, real estate, house rentals or long-term stays, because the site's job pages already attract that traffic.
   - Pause any keyword that reaches forty clicks with no booking_start event.
   - Expect a cost per click between $0.80 and $2.00 in this category and this region. If it runs above $2.50, the keyword set is too broad.

6. **Decide at the end of November whether Google scales.**
   - Compare cost per booking_start and cost per booking_engine_click across the four weeks against the Meta figures from Weeks 10 to 12.
   - If Google is producing engine clicks below $25, raise it to $100 a day for December and January. If it is above $60, cut it back and move the money to Meta or retargeting.
   - Document the decision and the numbers behind it, so the same call in April is made against evidence rather than memory.

#### Part C: Meta and the Spotify Spot

7. **Repair the Meta setup before spending anything.**
   - The pixel is installed and has never been used for advertising, so confirm it is firing on the booking page and the offer landing pages using the Meta Pixel Helper extension.
   - Configure the four Tactic 1 events as custom conversions in Events Manager so Meta can optimise toward them.
   - Confirm the ad account has a working payment method and no billing holds. Check this before launch week, not during it.
   - Verify the domain redcariboo.com in Business Manager, which is required for conversion tracking to work properly under current privacy rules.

8. **Launch the cold Meta campaign against the drive market.**
   - Objective: Sales, optimising for the booking_start event. If the event has fewer than fifty weekly occurrences, optimise for landing page views for the first fortnight and switch once volume allows.
   - Audience: adults 40 to 70 in British Columbia and Alberta, with interests covering ice fishing, snowmobiling, cross-country skiing, RV and road travel, and wilderness photography. Exclude Anahim Lake and the immediate area, which is where your staff and neighbours are.
   - Four to six creatives, at least half of them vertical video from the October interim shoot, replaced with the professional footage when it lands in December.
   - Every ad states the location in the first line of copy and the first three seconds of video. This audience does not know where the Chilcotin is.
   - Run at $40 a day from Week 10 through Week 12, then raise it for the December and January peak.

9. **Build and run the retargeting audience.**
   - Create a Custom Audience of all website visitors in the past 180 days, plus a separate one for anyone who triggered booking_start without completing.
   - Retargeting is where a remote destination earns its money, because the decision takes weeks and involves a long drive. A visitor who read an itinerary in November is a realistic January booking.
   - Wait until the audience passes 500 people before switching it on, which should be reached in December once the cold campaign has been running.
   - Use different creative from the cold campaign: rates, package inclusions, cancellation policy, and recent reviews rather than scenery.

10. **Release the Spotify spot with measurement around it.**
    - Rewrite the location line before it runs. The current spot names Cariboo Chilcotin Coast and nothing else, which means nothing to a listener in Kelowna or Calgary. Add a plain reference point such as the drive time from Williams Lake.
    - Give CCCTA a launch date in Week 10 and record the exact start and end dates.
    - Measure it as a lift in Direct and Organic Search traffic against the Week 2 baseline, since audio produces no clicks. Watch branded searches for "Red Cariboo" specifically.
    - Set expectations internally. This is awareness inventory and the benefit may show up months later, which makes it worth running and hard to attribute.

#### Part D: Creator Visits

11. **Define what a creator visit has to produce before approaching anyone.**
    - Write the deliverables into the agreement: a minimum number of vertical video clips, a set of stills with full commercial rights, one long-form piece on their own channel, and permission for Red Cariboo to use everything in paid advertising.
    - Paid usage rights are the part most often left out and the part you most need, since this footage is what the Meta ads will run on.
    - Decide what the resort supplies: accommodation, activities, and travel. At roughly $380 each way on Pacific Coastal, budget the flights explicitly rather than assuming a drive.
    - Total budget $2,500 to $3,500 per visit, including travel.

12. **Source and book the November creator.**
    - Look for someone with an audience in the BC and Alberta drive market who covers fishing, backcountry travel or road trips, rather than a general travel influencer with a larger following.
    - Ask CCCTA first, since regional organisations maintain lists of creators who have already worked in the area and understand the access and safety issues.
    - Check engagement rather than follower count. A 5,000-follower account with real comments is worth more here than a 100,000-follower account with none.
    - Book the visit for the same week as the professional shoot where possible, so the property is cleared and camera-ready once rather than twice.

13. **Host the visit and capture your own footage alongside.**
    - Have someone from the team shoot behind-the-scenes material during the visit. It costs nothing and doubles the output.
    - Give the creator the itineraries so their content follows the same structure the website uses, which makes the two reinforce each other.
    - Ask for raw files as well as edited pieces. Raw vertical clips are what the ad account will need in January.
    - Agree the publishing date in advance so the content lands while the ads are running.

14. **Book the January creator visit against the aurora and ice fishing window.**
    - January is the highest-traffic month on the website and the deepest part of the winter season, which makes it the strongest content window of the year.
    - Target a different audience from the November visit. If November covered fishing and snowmobiling, January should cover the quiet end: dark skies, snowshoeing, and the cabin itself.
    - Book it in Week 12 rather than in December, since good creators are committed six to eight weeks out.
    - Budget $2,500 from the December to April allocation.

### Success Metrics

| Metric | 30 Days | 60 Days | 90 Days |
|---|---|---|---|
| Ad management ownership | Decision made and person named | Accounts built under Red Cariboo ownership | Weekly reporting rhythm running |
| Google Ads | Account live in Expert Mode, GA4 linked | Campaign built, ad copy approved | Live and spending, cost per click under $2.00 |
| Google search terms | Not yet applicable | Not yet applicable | Negative list of 10 or more, weak keywords paused |
| Meta Ads | Pixel verified and events configured | Domain verified, creative selected | Live and spending at $40 per day |
| Booking engine clicks from paid | Not yet applicable | Not yet applicable | 40 to 90 across both channels |
| Retargeting audience | Not yet applicable | Audience created | 500 or more users, ready to activate in December |
| Spotify spot | Location line rewritten | Launch date agreed with CCCTA | Live, with before and after traffic recorded |
| Creator visits | Deliverables and rights defined | November creator booked | November visit complete, January visit booked |
| Cost per booking engine click | Not yet applicable | Not yet applicable | Under $40 blended, with a documented scale decision |

### Tips

- Never accept the default settings in a new Google Ads campaign. Display expansion, search partners and the broader location setting are all switched on when you create a campaign, and all three spend money outside your audience.
- Put the location in every ad, every video and every audio spot. It is the single most consistent gap across everything Red Cariboo currently publishes, and it is the first question a stranger has.
- Do not judge the Spotify spot by bookings. Judge it by whether branded searches for Red Cariboo rise while it is running.
- Keep the creator agreement short but specific about paid usage rights. Content you cannot advertise with is worth a fraction of what you paid for it.
- If a week gets away from you, pause the ads rather than letting them run unattended. Paused budget is recoverable and wasted budget is not.

### Resources

- Google Ads Expert Mode setup: [https://support.google.com/google-ads/answer/6146252](https://support.google.com/google-ads/answer/6146252)
- Google Ads Search Terms report: [https://support.google.com/google-ads/answer/2472708](https://support.google.com/google-ads/answer/2472708)
- Meta Business Help Centre, getting started with ads: [https://www.facebook.com/business/help/205614130852988](https://www.facebook.com/business/help/205614130852988)
- Meta Pixel and Custom Audiences: [https://www.facebook.com/business/help/1474662202748341](https://www.facebook.com/business/help/1474662202748341)
- Meta Pixel Helper extension for Chrome: [https://chromewebstore.google.com/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc](https://chromewebstore.google.com/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)
- Cariboo Chilcotin Coast Tourism Association, for creator introductions and co-op media: [https://landwithoutlimits.com/](https://landwithoutlimits.com/)

---

## Tactic 4: Build the Email List You Do Not Have
Phase: Retention
Short Label: Email & Reviews
Subtitle: Start collecting guest addresses now, automate the pre-arrival and post-stay emails, and use the list to fill next winter and summer 2027.

### What We Heard From You

You told us Mailchimp is already set up with templates built during a COVID grant, and that Axel does not want a newsletter because he sees email marketing as spam. You also said the investor agreed that if this strategic process recommends a newsletter, they will do one, and you asked to have that conversation supported by the recommendation rather than making the argument alone. You raised the consent question yourself, asking whether Canada requires double opt-in the way Germany does. And you noted that you do not currently hold the email addresses, which is the real starting point.

### What This Is

Four pieces. Getting agreement to proceed, then reactivating the Mailchimp account that already exists. Adding sign-up points to the website and the booking flow so the list starts growing from zero. Building three automated emails that run without anyone touching them: pre-arrival, post-stay review request, and enquiry follow-up. Then two real campaigns, one to Canadian guests in December and one to the German list in February, timed to the two booking windows that matter.

### Why It Matters

Axel's objection is reasonable about the wrong thing. Nobody suggests sending a monthly newsletter to strangers. For a remote property with a five-star rating, the highest-value email is the one that goes to a past guest before the season opens, and fishing lodges routinely fill much of a season from a single spring send. The obstacle is that the list is empty, which means the value cannot arrive until a list exists, which means starting now even though the return is next year. Two other things sit here as well: reviews have stalled at twenty with only two in the past eighteen months, and a post-stay email is the standard fix.

### Implementation Steps

#### Part A: Get Agreement and Get Started

1. **Settle the newsletter question with Axel and the investor.**
   - Take the recommendation to them in writing rather than as a conversation, and be specific about what it is not: no monthly newsletter, no purchased lists, no sending to anyone who has not asked.
   - What it is: an automated email before arrival, an automated email after checkout, and two campaigns a year to people who have stayed and opted in.
   - Point at the numbers. Twenty reviews with two in eighteen months is a review problem, and the post-stay email is how it gets solved.
   - Get the decision recorded, since this has stalled before and the plan downstream depends on it.

2. **Reactivate Mailchimp and check what still works.**
   - Log in and confirm the account status, the templates built during the COVID grant, and whether the free tier still covers the list size you expect.
   - Update the sender name, reply address and the physical mailing address in the footer, which anti-spam law requires in both Canada and Germany.
   - Send a test of each existing template to yourself and check it on a phone. Templates built in 2020 often break in current email clients.
   - Set the language default and prepare a German version of every template, since roughly a third of guests will be German speakers.

3. **Add sign-up points across the site and the booking flow.**
   - Put a sign-up form in the site footer on every page, with a specific reason to subscribe rather than "subscribe to our newsletter". Something like early access to winter dates before they open publicly.
   - Add a checkbox to the enquiry form on the offer landing pages and to the contact form.
   - Add the Winter Packing List PDF as a download in exchange for an email address, keeping the existing free version live as well. That page draws 1,453 sessions a year and the checklist has been downloaded 503 times, which is the largest single source of addresses available to you.
   - Ask at checkout in person too. A card in each cabin with a QR code costs almost nothing.

4. **Set the consent standard to double opt-in.**
   - Canada's rules are looser than Germany's. Canadian anti-spam law recognises implied consent for roughly six months after someone contacts you, while GDPR requires explicit consent.
   - Use GDPR double opt-in for everyone regardless of country. One standard is simpler to run than two, and it keeps you compliant in both markets.
   - Turn on double opt-in in the Mailchimp audience settings and confirm the confirmation email sends in the right language.
   - Record the source and date of consent for every contact, which Mailchimp does automatically when sign-ups come through its own forms.

#### Part B: The Automated Emails

5. **Build the pre-arrival email.**
   - Trigger it five days before arrival. Guests are driving a long way and the anxiety is about the road, the cell service and the groceries.
   - Contents: directions with the 13 km off Highway 20 and the 3 km driveway stated plainly, the 4x4 recommendation, the packing list link, the shopping and self-catering page, cell service warning, and check-in details.
   - This replaces the manual email you currently send, which frees your time and makes the information consistent.
   - Add one line inviting the guest to reply with questions, which creates the implied consent that makes the post-stay email straightforward.

6. **Build the post-stay review request.**
   - Trigger it three days after checkout, which is late enough that they are home and early enough that the trip is fresh.
   - One purpose per email. Ask for a Google review, link directly to the review form, and say it takes a minute.
   - Include the QR review card in the cabins as well, since in-person requests convert several times better than email alone.
   - Add a second email fourteen days later inviting them to join the list for next season, sent only to people who have not already subscribed.

7. **Build the enquiry follow-up.**
   - Anyone who submits an enquiry form and does not book should receive one follow-up three days later.
   - Answer the question they are most likely still weighing: whether the road is manageable, what the cabin actually includes, and what there is to do if the weather turns.
   - Include the booking link with a specific offer rather than a general invitation to get in touch.
   - Keep it to one follow-up. A second unanswered email is where the spam perception Axel worries about actually comes from.

8. **Connect Cloudbeds to Mailchimp.**
   - Check the Cloudbeds marketplace for a direct Mailchimp integration first, since a native connection is more reliable than a workaround.
   - If none exists, export guest contacts from Cloudbeds monthly and import them into Mailchimp with the consent status recorded, or connect the two through Zapier.
   - Tag every contact by guest type: leisure, work crew, or enquiry only. Work crews should never receive winter package emails.
   - Tag by language as well, since the German list and the Canadian list will receive different campaigns at different times of year.

#### Part C: The First Real Campaigns

9. **Import and clean the past guest contacts you already hold.**
   - Pull whatever exists in Cloudbeds, in your inbox and in booking confirmations going back to 2019.
   - Import only those with a legitimate basis for contact and send a single re-permission email asking them to confirm they want to hear from you. Everyone who does not confirm comes off the list.
   - A small confirmed list is worth more than a large unconfirmed one, both legally and in deliverability terms.
   - Expect this to produce a modest number. The point is that the list exists and starts growing.

10. **Send the winter availability email in December.**
    - Timed for the first week of December, ahead of the Christmas and January booking rush.
    - Contents: which winter dates remain, what is included in the winter package, the new photography, and a single Book Now link.
    - Send it to the Canadian list only. Germans do not travel to Red Cariboo in winter, and sending them a snow email trains them to ignore you.
    - Measure open rate, click rate and bookings attributed. This is the first evidence Axel will see, so record it carefully.

11. **Send the summer 2027 email to the German list in February.**
    - European travellers book summer six to twelve months ahead, so February is when the summer 2027 decision is being made.
    - Contents in German: summer activities, the e-mountain bike programme if insurance is settled by then, the fishing, and the second-Canada-trip framing.
    - Include the fly-in option and the drive route, since access is the question that stops German bookings more than price.
    - This email is the beginning of the summer 2027 pipeline and the reason the list matters this year rather than next.

### Success Metrics

| Metric | 30 Days | 60 Days | 90 Days |
|---|---|---|---|
| Newsletter decision | Recommendation delivered in writing | Decision recorded | Programme running |
| Mailchimp account | Reactivated, templates tested | Sender details and German templates ready | Three automations live |
| Email list size | 0 (baseline) | 60 or more confirmed subscribers | 150 to 300 confirmed subscribers |
| Sign-up points live | Footer form live | Enquiry and contact form checkboxes live | Packing list download gated, QR cards in cabins |
| Pre-arrival email | Drafted | Live and sending automatically | Sent to every arrival in the period |
| Post-stay review request | Drafted | Live and sending automatically | 10 or more new Google reviews |
| Google reviews total | 20 (baseline) | 25 or more | 30 or more, on a path to 50 by spring |
| December campaign | Not yet applicable | Content planned | Drafted and scheduled for the first week of December |

### Tips

- Do not describe this to Axel as a newsletter. Describe it as the email that goes out before a guest drives eight hours, and the email that asks for a review afterwards. Both are guest service, and both happen to build the list.
- The Winter Packing List download is the best list-building asset you own. Gate the enhanced version and leave the current one free, so nobody loses access to something they already had.
- Ask for the review in person at checkout as well as by email. A QR card in the cabin converts several times better than an email on its own.
- Never send a winter package email to the work crew list. They book direct, they book anyway, and marketing to them risks the relationship that currently funds the business.
- Keep the German and Canadian lists genuinely separate. Different seasons, different languages, different offers, and mixing them wastes both.

### Resources

- Mailchimp signup form and double opt-in settings: [https://mailchimp.com/help/about-double-opt-in/](https://mailchimp.com/help/about-double-opt-in/)
- Mailchimp automation basics: [https://mailchimp.com/help/about-customer-journeys/](https://mailchimp.com/help/about-customer-journeys/)
- Canada's Anti-Spam Legislation, consent requirements: [https://fightspam.gc.ca/](https://fightspam.gc.ca/)
- Cloudbeds integrations marketplace: [https://www.cloudbeds.com/marketplace/](https://www.cloudbeds.com/marketplace/)
- Google review link generator, for the post-stay email: [https://support.google.com/business/answer/7035772](https://support.google.com/business/answer/7035772)

---

## Objectives

### Objective 1
Title: Make the Site Take a Booking
Description: Repair the analytics so every number in the account is trustworthy, then rebuild the path from landing page to confirmed reservation, including a permanent booking bar, a real booking page and English served by default.
Tactic Pill: Tactic 1 · Weeks 1–6

### Objective 2
Title: Build the Content and Restart Social
Description: Create a photo and video library Red Cariboo owns, publish the itinerary and preparation pages that earn search traffic, and return Instagram and Facebook to three posts a week with Reels as the default.
Tactic Pill: Tactic 2 · Weeks 3–12

### Objective 3
Title: Put the Budget Behind the Winter Season
Description: Launch Google Search and Meta against the Canadian drive market, release the CCCTA audio spot with measurement around it, and host two creator visits that produce content the resort could not produce alone.
Tactic Pill: Tactic 3 · Weeks 7–12

### Objective 4
Title: Start the Email List From Zero
Description: Reactivate Mailchimp, add sign-up points across the site and the booking flow, automate the pre-arrival and post-stay emails, and prepare the December and February campaigns.
Tactic Pill: Tactic 4 · Weeks 5–12

---

## 90-Day Roadmap

Month 1 Name: Foundation
Month 2 Name: Assets and Audience
Month 3 Name: Paid Launch

### Week 1: Fix the Analytics
**Actions:**
- Unstar page_view and first_visit in GA4 Admin → Data display → Events → Key events → links to: Tactic 1 / Step 2
- Confirm the internal traffic filter is Active and add the office IP addresses → links to: Tactic 1 / Step 1
- Build a saved GA4 exploration that excludes China and Singapore traffic → links to: Tactic 1 / Step 1
- Take the expired Christmas and winter offers off the homepage carousel → links to: Tactic 1 / Step 10
- Email the CCCTA contact with the list of places you want to promote and ask for written confirmation → links to: Tactic 2 / Step 5

**Checklist:**
- [ ] page_view and first_visit are no longer counted as key events
- [ ] A filtered reporting view excluding bot traffic is saved and in use
- [ ] The homepage no longer links to an offer that expired in January
- [ ] The approvals question is with CCCTA in writing

### Week 2: Scope the Contractor and Set the Baseline
**Actions:**
- Write the fixed-price contractor brief covering tracking, the booking bar, the booking page and the landing page template → links to: Tactic 1 / Step 5
- Request quotes from the German developer and one Canadian freelancer → links to: Tactic 1 / Step 5
- Export the clean baseline report and send a copy to Junction → links to: Tactic 1 / Step 4
- Crawl the site with Screaming Frog and list every broken page → links to: Tactic 1 / Step 10
- Walk the property with Axel and write the clear-up list with a deadline → links to: Tactic 2 / Step 1

**Checklist:**
- [ ] Two contractor quotes are in hand with fixed prices
- [ ] A one-page baseline dated to this week is saved and sent to Junction
- [ ] Every 404 has a fix or a redirect assigned to it
- [ ] The property clear-up list has a deadline two weeks ahead of the shoot

### Week 3: Navigation and the German Default
**Actions:**
- Set the root domain to serve English by default with browser-language detection → links to: Tactic 1 / Step 6
- Submit both the German and English sitemaps in Google Search Console → links to: Tactic 1 / Step 6
- Split the Stories dropdown into Plan Your Trip and Stories → links to: Tactic 1 / Step 11
- Move the FAQ out of the footer and into Plan Your Trip → links to: Tactic 1 / Step 11
- Rename or hide the Restaurant menu item until summer 2027 → links to: Tactic 1 / Step 11
- Publish the three-day itinerary in English → links to: Tactic 2 / Step 6

**Checklist:**
- [ ] redcariboo.com loads in English, and a German browser still lands on German
- [ ] Plan Your Trip appears in the main menu with the FAQ inside it
- [ ] No menu item promises a restaurant that does not exist
- [ ] The three-day itinerary is live and linked from the menu

### Week 4: Coaching Session and Social Restart
**Actions:**
- Hold the Junction coaching session with the baseline report to hand
- Confirm who owns social media and brief them with the library and the weekly pattern → links to: Tactic 2 / Step 9
- Fix the Instagram and Facebook bio links and add profile highlights → links to: Tactic 2 / Step 10
- Begin posting three times a week to a fixed day pattern → links to: Tactic 2 / Step 11
- Capture the interim October photo and video set yourself → links to: Tactic 2 / Step 2
- Put the newsletter recommendation to Axel and the investor in writing → links to: Tactic 4 / Step 1

**Checklist:**
- [ ] A named person owns social media and has the content to work from
- [ ] Both bio links point to a live winter page and clicks are tracked
- [ ] Three posts went out this week
- [ ] Around 40 images and 10 clips are in the interim library
- [ ] The newsletter decision is recorded in writing

### Week 5: Booking Path Build Begins
**Actions:**
- Contractor builds the four GTM triggers for the booking and enquiry events → links to: Tactic 1 / Step 3
- Contractor builds the booking bar on a staging copy of the site → links to: Tactic 1 / Step 7
- Write the booking page content: eight units, rates, policy, season dates, community kitchen → links to: Tactic 1 / Step 8
- Reactivate Mailchimp and test every existing template on a phone → links to: Tactic 4 / Step 2
- Publish the five-day itinerary → links to: Tactic 2 / Step 6

**Checklist:**
- [ ] booking_start, booking_engine_click, offer_enquiry and contact_form fire on staging
- [ ] The booking bar works on staging in both languages
- [ ] Booking page copy is written and with the contractor
- [ ] Mailchimp is active and the templates render correctly on mobile

### Week 6: Booking Path Goes Live
**Actions:**
- Push the booking bar and the rebuilt booking page live → links to: Tactic 1 / Step 7
- Publish the rebuilt booking page with all eight units and the season dates → links to: Tactic 1 / Step 8
- Add phone, email and office hours to the header and footer sitewide → links to: Tactic 1 / Step 9
- Mark the four new events as key events in GA4 → links to: Tactic 1 / Step 3
- Complete a test booking from a phone on mobile data, through to the confirmation email → links to: Tactic 1 / Step 7
- Add the footer sign-up form and the enquiry form checkbox → links to: Tactic 4 / Step 3
- Switch on double opt-in in Mailchimp and confirm the confirmation email sends in both languages → links to: Tactic 4 / Step 4

**Checklist:**
- [ ] The booking bar appears beneath the menu on every page
- [ ] The booking page shows all eight units with rates, policy and season dates
- [ ] Contact details and office hours appear sitewide with the time zone stated
- [ ] A test booking completes on a phone without leaving redcariboo.com
- [ ] Sign-up forms are live with double opt-in switched on

### Week 7: Template, Spend Schedule and Preparation Pages
**Actions:**
- Contractor delivers the offer landing page template in English and German → links to: Tactic 1 / Step 12
- Decide whether you run the ads or engage a freelance media buyer → links to: Tactic 3 / Step 1
- Lock the week-by-week spend schedule through April into a single sheet → links to: Tactic 3 / Step 2
- Publish the summer packing list and the Know Before You Go page → links to: Tactic 2 / Step 7
- Build the pre-arrival email in Mailchimp → links to: Tactic 4 / Step 5

**Checklist:**
- [ ] The landing page template is delivered and tested on staging in both languages
- [ ] A named person is responsible for ad management
- [ ] The spend schedule through April exists in writing
- [ ] Two preparation pages are live and linked from Plan Your Trip
- [ ] The pre-arrival email sends automatically five days before arrival

### Week 8: Offers Live, Ad Accounts Built
**Actions:**
- Publish the winter package and Christmas landing pages in English → links to: Tactic 1 / Step 13
- Create the Google Ads account in Expert Mode and link it to GA4 → links to: Tactic 3 / Step 3
- Verify the Meta pixel, configure the four custom conversions and verify the domain → links to: Tactic 3 / Step 7
- Publish the dark skies page → links to: Tactic 2 / Step 8
- Build the post-stay review request email and order the QR review cards → links to: Tactic 4 / Step 6

**Checklist:**
- [ ] Two winter offer pages are live with Book Now as the primary button
- [ ] Google Ads is live in Expert Mode with conversions imported from GA4
- [ ] The Meta pixel fires on the booking and offer pages, and the domain is verified
- [ ] The dark skies page is live in Plan Your Trip
- [ ] The post-stay review email sends automatically three days after checkout

### Week 9: Google Search Launch
**Actions:**
- Build the winter search campaign with two ad groups and phrase match keywords → links to: Tactic 3 / Step 4
- Launch Google Search at $50 a day and check the search terms report on day three → links to: Tactic 3 / Step 5
- Write the creator deliverables and rights requirements into an agreement → links to: Tactic 3 / Step 11
- Source and book the November creator, asking CCCTA for introductions first → links to: Tactic 3 / Step 12
- Book the photographer for a movable late-November date with a weather clause → links to: Tactic 2 / Step 3

**Checklist:**
- [ ] The search campaign is live and spending, with Display expansion and search partners switched off
- [ ] The ad appears in a test search for cabins in Anahim Lake
- [ ] A creator is booked with paid usage rights written into the agreement
- [ ] The photographer is booked with a date that can move by a week

### Week 10: Meta Launch, Spotify and Guest Contacts
**Actions:**
- Launch the cold Meta campaign at $40 a day against the BC and Alberta drive market → links to: Tactic 3 / Step 8
- Review the Google search terms report and build the negative keyword list → links to: Tactic 3 / Step 5
- Release the Spotify spot with the location line rewritten, and record the start date → links to: Tactic 3 / Step 10
- Import past guest contacts and send the single re-permission email → links to: Tactic 4 / Step 9
- Connect Cloudbeds to Mailchimp and tag contacts by guest type and language → links to: Tactic 4 / Step 8

**Checklist:**
- [ ] Meta is spending against the drive market with location stated in every ad
- [ ] The negative keyword list has at least ten entries
- [ ] The Spotify spot is live and the pre-launch traffic baseline is recorded
- [ ] Past guests are in Mailchimp with consent status and tags recorded

### Week 11: Creator Visit and the Winter Shoot
**Actions:**
- Host the creator visit and have the team capture behind-the-scenes footage alongside → links to: Tactic 3 / Step 13
- Run the two-day professional photo and video shoot, including vertical video → links to: Tactic 2 / Step 3
- Build the Meta retargeting audiences from 180-day visitors and booking_start drop-offs → links to: Tactic 3 / Step 9
- Publish the Highway 20 winter driving page → links to: Tactic 2 / Step 7
- Cut the first vertical Reels from the new footage and move to two Reels a week → links to: Tactic 2 / Step 12
- Build the enquiry follow-up email → links to: Tactic 4 / Step 7

**Checklist:**
- [ ] The creator visit is complete and a publishing date is agreed
- [ ] Two days of professional photography and vertical video are shot
- [ ] Commercial and paid advertising rights are confirmed in writing for all material
- [ ] The retargeting audiences are created and populating

### Week 12: Review, Reload and Hand Off to Winter
**Actions:**
- Pull the 90-day report and compare every metric against the Week 2 baseline → links to: Tactic 1 / Step 4
- Decide whether Google scales to $100 a day in December, and document the numbers behind it → links to: Tactic 3 / Step 6
- Book the January creator visit against the dark skies and ice fishing window → links to: Tactic 3 / Step 14
- Organise the new library by season and subject, and select the twenty advertising images → links to: Tactic 2 / Step 4
- Draft and schedule the December winter availability email to the Canadian list → links to: Tactic 4 / Step 10
- Outline the February summer 2027 email to the German list so it is ready to write in January → links to: Tactic 4 / Step 11
- Turn the itineraries into December's social calendar and schedule it in Meta Business Suite → links to: Tactic 2 / Step 13

**Checklist:**
- [ ] A 90-day report comparing every metric to the Week 2 baseline exists
- [ ] The December to April spend decision is written down with the evidence behind it
- [ ] The January creator visit is booked
- [ ] The new library is organised and twenty advertising images are cleared
- [ ] The December email is drafted and scheduled
- [ ] December's social posts are scheduled and will publish without further work

---

## GBP Quick Wins

These are small jobs that pay back quickly and do not need the contractor or the budget. Most take under an hour. They are listed separately from the tactics because none of them should wait for anything else in the plan, and none of them duplicate work already covered in the assessment's own quick wins.

### On the Google Business Profile

- **Reply to all twenty Google reviews.** None of them appear to have a response. Reply to each one personally, mention something specific the reviewer said, and invite them back. Google treats responses as an activity signal, and future guests read them.
- **Add the seasonal operating dates and check-in hours.** The profile does not currently state when the resort is open. A traveller planning February has no way to know, and this is the same gap the assessment flagged on the website.
- **Start posting to Google Posts.** There is no posting activity on the profile. One post a fortnight tied to whatever is live on the site, such as the winter package, keeps the listing active in the local pack.
- **Set a review target of 50 by spring.** You are at twenty with only two in the past eighteen months. The post-stay email from Tactic 4 and a QR card in each cabin are what will move it.

### On the Website

- **Shorten the homepage title tag.** It is currently 181 characters and cuts off mid-sentence in search results. Something under sixty characters along the lines of "Red Cariboo Resort | Wilderness Cabins on the Dean River, Anahim Lake BC" will improve click-through.
- **Add H2 and H3 headings to the homepage.** There is a single H1 and no subheadings at all, which gives search engines and AI assistants no structure to read. Break the page into Accommodation, Activities, Location and Getting Here.
- **Add Local Business schema.** The profile is verified and the address is consistent, but the structured data is missing, which is the piece that connects the two for search engines.
- **Delete the duplicate story page.** `/en/stories/duplikat-von-2023-year-in-review` is a duplicate of a year-in-review post and still takes traffic. Redirect it to the original.
- **Refresh the testimonials on the offer landing page.** The three reviews shown are from September and October 2020. Swap them for recent Google reviews as they come in.

### One Thing Worth Watching

AI Assistant appeared as a traffic source in GA4 for the first time this year, sending 55 sessions at 58 seconds of engagement. It is small, and it is growing everywhere. The work in Tactic 2, which is to publish clear pages that answer specific practical questions, is the same work that makes a property visible to AI assistants. No separate effort is needed, but it is worth checking that channel again at the 90-day review.
