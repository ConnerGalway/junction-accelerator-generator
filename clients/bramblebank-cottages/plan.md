# Bramblebank Cottages: Accelerator Implementation Plan

## Meta
Client Slug: bramblebank-cottages
Has GBP Quick Wins: yes

## Goal

Bramblebank Cottages already does the hardest thing in hospitality. It is the top-rated place to stay in the village, with a 4.8-star average across 247 Google reviews, 170 nights booked last month, revenue and occupancy both up since the move to PriceLabs, and guests who keep coming back for anniversaries and family reunions. The most common line in your reviews is that people wish they had stayed longer, which tells you the product is not the problem. The problem is where the bookings come from. You are paying about $1,700 a month in OTA commissions at roughly 20 percent, and the assessment shows why discovery depends on the OTAs: a homepage that weighs 27.9 MB, five competing H1 headings, no embedded map, no social presence worth mentioning, and very little content answering the specific questions travellers now put to Google and to AI tools. The next ninety days fix those things in a deliberate order. First the website foundation and the direct-booking path, so everything you build afterward has somewhere good to send people. Then a body of local content built around eagle watching, hiking, fishing, and the experiences only your guests have, written as questions and answers so search engines and AI tools can quote it. Then a simple three-posts-a-week social routine across Facebook, Instagram, and TikTok, with a small boost budget to find out what is worth scaling. Everything built here is an asset that belongs to the business, including a faster website, a library of content, a guest list you own, and documented routines, which makes the business stronger to run now and easier to hand over whenever that day comes.

## Strategic Positioning

Bramblebank cannot out-spend Booking.com and Expedia on breadth, and it should not try. What the OTAs cannot offer is specificity: a secluded, peaceful park setting that still sits inside the village, full kitchens that guests describe as everything they needed, a hot tub, a river to kayak, natural gas BBQs and fire bowls, and a five-bedroom house that sleeps 13 for the reunion everyone has been planning. Couples find that in winter and families and groups find it in summer, and both are asking increasingly specific questions of search engines and AI tools. The properties that answer those questions with first-hand detail get named and booked, which is where Bramblebank has a real edge over a listing page.

> **Your Strategic Positioning**
> Bramblebank Cottages is the secluded, well-equipped retreat in the heart of Harrison Hot Springs: full kitchens, a hot tub, a river to kayak, and fire bowls for the evening. Seven cottages and suites for couples and groups of up to 35, and the stay most guests wish had been longer. Book direct for exclusive guest perks.

## Welcome Message

You have the best-reviewed place to stay in the village and guests who wish they had stayed longer, which is the part that cannot be taught. This plan turns that into a faster website, a body of local content, and a simple social routine that bring more of those guests to you directly.

---

## Tactic 1: Website Foundation and Direct Booking Path
Phase: Foundation
Short Label: Website & Direct
Subtitle: Fix the technical issues the assessment found, make the direct-booking perks impossible to miss, and start tracking what each booking channel really costs.

### What We Heard From You

Your primary goal is to capture more of the 15 to 20 percent that goes to OTA commissions, and your secondary goal is longer stays, which cut cleaning costs per night. You already offer direct-booking perks, but they are not advertised well, so a guest comparing options on Booking.com never sees them. The assessment gave the website a C+ for technical foundation, with a 27.9 MB homepage carrying 268 images, five H1 tags, a title tag that does not say what you are, a phone number that cannot be tapped, and no map or directions for out-of-town guests. You also have no email list, because your property management system does not sync OTA guest emails and you are rightly cautious about the OTA terms on contacting those guests.

### What This Is

Three jobs in order. The first is the technical clean-up: compress the images, fix the headings and title, make the phone number tappable, add a map and written directions, and install the Meta Pixel. The second is the direct-booking layer: clear perks next to every Book Now button, a promo code, guest proof, and a direct-only stay-longer offer. The third is measurement and ownership: a simple guest list built from direct guests and in-cottage cards, and a monthly record of what each channel actually costs you.

### Why It Matters

Everything else in this plan sends people to your website, so the website has to be ready for them. A homepage that takes a long time to load on a phone loses visitors before they see a single cottage, and a visitor who cannot see why booking direct is better will book wherever they already have an account. At a 20 percent commission, every 10 percent of OTA bookings you move direct saves about $170 a month, and moving a quarter of them saves about $425. That is a modest number on its own, and it compounds as direct guests return and rebook without paying a commission again.

### Implementation Steps

#### Part A: Fix the Foundation

1. **Compress the images and slim the homepage.**
   - The homepage loads 27.9 MB across 268 images, nine times the recommended weight for a tourism site. The target is under 3 MB. This is the most important technical fix, and the assessment estimates about four hours the first time.
   - Start by cutting the number of images. A homepage does not need 268. Keep the hero image, one strong image for each cottage type, and the few that carry the message, then move the rest to the cottage pages and a dedicated gallery page.
   - Compress what remains before uploading. Resize each original so the longest edge is about 2,500 pixels, then run it through a free tool such as Squoosh (squoosh.app) or TinyPNG at roughly 75 to 80 percent quality. Replace the existing images with the compressed versions.
   - Squarespace lazy-loads images in most templates, so the larger gain is simply having fewer and smaller files on the first page. Test the result in PageSpeed Insights (pagespeed.web.dev), where the current mobile score is 73 and the goal is 85 or higher.

2. **Fix the title tag, meta description, headings, alt text, and phone link in one sitting.**
   - Title tag: in Squarespace, open the Pages panel, hover over the homepage, click the gear icon, and open the SEO tab. Replace the SEO title with "Bramblebank Cottages | Harrison Hot Springs Cabins" (50 characters). The assessment suggests adding "cabin" alongside "cottage" because the cabin searches are among the biggest in your market and you rank only seventh for them. Avoid the phrase "private hot tubs," which appeared in the assessment's suggested title. Your reviews describe a hot tub with a booking system, so say "hot tub" and keep it accurate.
   - Meta description (about 155 characters): "Seven cottages and suites in Harrison Hot Springs with a hot tub, river kayaking, full kitchens, and BBQs. Secluded and peaceful, yet in the village."
   - H1 tags: the homepage has five and should have one. Keep "Bramblebank Cottages | Harrison Hot Springs BC" as the only H1, correcting the spelling to "Hot Springs." Change "Your retreat awaits" and "Book Direct" to H2 using the style dropdown in the text toolbar. Every page should have exactly one H1.
   - Alt text: add a short description to the eight icons that are missing it, such as "WiFi included," "Free parking," and "Natural gas BBQ." Use the Alt Text field when you edit each image.
   - Phone number: the number, (604) 796-9552, currently appears only on the contact page and cannot be tapped. Add it to the header and footer, and make it a tap-to-call link by selecting the number, clicking the link icon, and entering tel:+16047969552.

3. **Embed a map and build a Getting Here page.**
   - Add a Google Map to the contact page using the Map block, or an Embed block with the Google Maps embed code, showing 312 Lillooet Road, Harrison Hot Springs, BC V0M 1K0.
   - Write directions from the two main routes out of Vancouver, Highway 7 and Highway 9, and add the last stretch to Lillooet Road and where to park on arrival. [INSERT TURN-BY-TURN DIRECTIONS FOR EACH ROUTE AND THE ARRIVAL INSTRUCTIONS]
   - Put a short Getting Here section in the footer or the main navigation, so it is findable from every page. Guests can copy and send it to the rest of their party, and it should reduce the "how do I find you" calls the assessment expects to drop by about half.

4. **Install the Meta Pixel and confirm analytics.**
   - In Squarespace, connect the Meta Pixel under Settings and then Marketing. If the option has moved in your version, paste the pixel code into Code Injection, in the header. You need a Meta Business Suite account first, which is covered in Tactic 3, Step 3.
   - Confirm it works by installing the free Meta Pixel Helper extension in Chrome, visiting your own homepage, and checking that a PageView event fires.
   - Also confirm that Google Analytics is recording visits. The assessment says it is installed, and a quick check in the Realtime report while you open the site on your phone settles it.
   - The Pixel builds the audience of website visitors that you will use for retargeting later in the boost program. It collects nothing useful until it is installed, so the sooner it goes in, the sooner it starts working for you.

#### Part B: Make Direct Booking the Obvious Choice

5. **Advertise the direct perks next to every Book Now button and create a promo code.**
   - You already have direct-booking perks. They are real, and almost nobody sees them. Add a short block beside the Book Now button on the homepage and on each cottage page: "Book direct and enjoy exclusive guest perks you will not get through a booking site."
   - Create a promo code in your booking engine for your direct-booking offer. The assessment detected Cloudbeds, and most booking engines support promo codes. Build a booking link with the code applied, so a guest who clicks from Instagram or a Google Business Profile post lands on the discount without typing anything.
   - Lean on perks that add value more than public price cuts. Perks that cost you little are hard to compare against an OTA listing and keep PriceLabs in control of your nightly rate. Before you publish a lower public rate, read your Booking.com and Expedia agreements, since some contain rate parity terms.
   - Put the same line in your Google Business Profile description, your social bios, and the confirmation email every direct guest receives.

6. **Add guest proof to the pages that convert.**
   - Your reviews are specific, and specific is what persuades. Guests praise the cleanliness, the full kitchens, the comfortable beds, and a hot tub with a booking system that works. Add a short testimonials section to the homepage and each cottage page, using three or four of these quotes.
   - Use first names and dates as they appear in the public Google review, and check with anyone you would like to quote at length. The assessment suggests a dedicated testimonials page, and a section on the pages guests actually read does more work than a page they have to find.
   - Add the star rating and review count near the Book Now button: 4.8 stars from 247 reviews.

7. **Create a direct-only Stay Longer offer.**
   - "Wish we had stayed longer" is the most common line in your reviews, and longer stays are good business, because the cost of cleaning is the same for a one-night stay and a four-night stay. Build an offer that rewards the extra night without cutting your nightly rate.
   - Example: book three or more nights direct and receive an exclusive stay-longer perk. Perks protect PriceLabs pricing, and you can adjust minimum-stay rules in PriceLabs for the quieter midweek nights.
   - Create a promo code and booking link for the offer, and add it to the website beside the direct-booking block, in a Stories highlight, and in your Google Business Profile posts.
   - Use the phrase your guests already use in your content. A post called "Two nights is never enough" will land because it says what they said.

#### Part C: Own the Relationship and Measure

8. **Start a guest list you own with an in-cottage card and a simple sign-up.**
   - Print a small card for each cottage: "Loved your stay? Book your next one direct and enjoy exclusive guest perks. Scan to join our list for first notice of availability and seasonal offers." Add a QR code linking to a sign-up form on your website. [INSERT WEBSITE ADDRESS]
   - Set up a free account with MailerLite or Mailchimp, build one sign-up form, and send a short email to the list about once a quarter: winter romance in January, reunion and wedding season in spring, and eagle season in fall.
   - Be careful with OTA guests. OTA terms vary, and some restrict how you promote direct booking to guests who booked through them. Read the terms for Booking.com, Expedia, and Airbnb, and if you are unsure whether the in-cottage card is allowed for those stays, ask your account manager first. Build the list from guests who book direct, from your website, and from social sign-ups, and do not use contact details taken from an OTA reservation.
   - An owned list is also a transferable asset. It is one of the clearest signs of a healthy business that a future owner can see.

9. **Track where bookings come from and what each channel costs.**
   - Record a baseline this week: total bookings, direct bookings, OTA bookings by channel, the average length of stay, and the roughly $1,700 monthly commission figure. Do the same on the first of every month.
   - Add UTM tags to every link you control so your analytics show where visitors came from, for example ?utm_source=instagram&utm_medium=social&utm_campaign=eagles. Google's Campaign URL Builder makes this a copy-and-paste job.
   - Ask every direct guest how they found you. A single question on the booking form or at check-in gives you information the analytics will not.
   - Use the same record to answer a question you raised yourself: what return are your Google Ads for the house and your earlier Meta ads actually producing? Compare the cost per booking enquiry from each channel with the cost of an OTA booking.

### Success Metrics
| Metric | 30 Days | 60 Days | 90 Days |
|--------|---------|---------|---------|
| Homepage weight and speed | Homepage under 10 MB; image clean-up started | Under 3 MB; mobile speed 80+ | Mobile speed 85+ and holding |
| On-page fixes | New title, meta description, single H1, alt text, and tap-to-call phone live | All fixes confirmed in a fresh PageSpeed and SEO scan | Click-through rate from search up from the baseline in Search Console |
| Map and directions | Map embedded and Getting Here page live | Directions linked from the footer and confirmation email | "How do I find you" calls and messages down from the baseline |
| Direct perks | Perks and promo code shown next to every Book Now button | First direct bookings using the promo code | Direct share of bookings up from the Week 1 baseline |
| Stay Longer offer | Offer designed with its own booking link | Offer live on the website and in social posts | Average length of stay tracked and trending up |
| Owned guest list | Cards printed and sign-up form live | 20 sign-ups | 50 sign-ups and first email sent |
| OTA commissions | Baseline of about $1,700 a month recorded | Direct versus OTA share reported monthly | Commissions down 15 to 25 percent from the baseline, compared with the same weeks last year where possible |

### Tips
- Do the quick on-page fixes first, in one sitting. The title, meta description, headings, alt text, and phone link take about 90 minutes together and improve every search listing and every mobile visit immediately.
- Compress the images before they go into Squarespace, not after. A compressed original keeps the page light permanently, and you only have to do it once for each photo.
- Keep PriceLabs in charge of the nightly rate and put the incentive in the perks. A direct-only price cut can undermine the dynamic pricing that has been lifting your revenue, while perks that cost you little do not.
- Winter softens midweek, so judge the direct share against the same weeks last year, and treat the 80 to 85 percent direct level as a direction, not a number for the first month.
- When a guest books by phone or email after reading a page, ask which page they were on. It tells you which content is earning bookings, and it shapes what to write next in Tactic 2.

### Resources
- [PageSpeed Insights](https://pagespeed.web.dev)
- [Squoosh image compressor](https://squoosh.app)
- [TinyPNG](https://tinypng.com)
- [Meta Pixel overview](https://www.facebook.com/business/tools/meta-pixel)
- [Google Campaign URL Builder](https://ga-dev-tools.google.com/campaign-url-builder/)
- [MailerLite](https://www.mailerlite.com)
- [PriceLabs](https://pricelabs.co)
- [Google Business Profile Manager](https://business.google.com)

---

## Tactic 2: Topic Clusters and Local Guide Content
Phase: Search and AI Visibility
Short Label: Local Guide & FAQ
Subtitle: Build five question-led topic clusters, a property FAQ, and a local guide so Bramblebank becomes the specific answer search engines and AI tools quote, not just another listing.

### What We Heard From You

The call covered a real shift in how people search. They no longer type "harrison hot springs cottages" and scroll. They ask an AI tool a full question, such as where to see eagles near Harrison, what to do in winter for a couples getaway, or where to stay for a family reunion, and the answer comes from the pages that answer that exact question best. You agreed to build content around specific activities such as eagle watching, hiking, and fishing instead of general terms. You also have an advantage on the ground: you know the trails, the river, and the seasons, and no OTA does. The assessment confirms the foundation is solid, with a number-one ranking for your own name, number two for "cabins in harrison hot springs bc," and number three for "harrison hot springs cottages." The gap is that the site has no content connecting your stay to the area's attractions.

### What This Is

A content hub with three layers. The first is a property FAQ that answers the practical questions guests ask before booking. The second is a local guide page that lists what to do in the area in granular detail. The third is five topic clusters, each with one pillar page and two question posts, written as direct questions with the answer in the first sentence. Alongside this, you reach out to your local tourism organisation for information and backlinks to your activity pages, which builds the authority that large platforms already have.

### Why It Matters

Tourism is a competitive field for search, and a small property will not out-rank Booking.com on a broad term. It can out-answer it on a specific one. A page called "When is the best time to see eagles near Harrison Hot Springs?" that gives a direct answer, a few real tips, and a link to book is exactly what an AI tool wants to quote. It is also the content that tells the next guest why Harrison is worth two or three nights, which feeds your stay-longer goal directly. Every page in this tactic points back to the direct-booking path you build in Tactic 1, and every page becomes a post in Tactic 3, so the writing is done once and used three times.

### Implementation Steps

#### Part A: Choose Your Clusters and Build Authority

1. **Run the cluster exercise and choose your top five.**
   - Set aside an hour. Write down 20 things guests ask about, love, or do during a stay: the hot tub, the river, eagles, the trails, fishing, the fire bowls, the kitchens, the reunions, the quiet. Pull from your reviews, the questions guests ask at check-in, and what you tell people when they ask for recommendations.
   - Score each item from 1 to 3 on three questions: do guests ask about it, is it distinctive to Bramblebank or the area, and can you capture good photos and video of it. Keep the five highest scores.
   - A starting set that fits what you have told us:

   | Cluster | Who It Serves | Example Questions |
   |---------|---------------|-------------------|
   | Eagle Watching and Winter Wildlife | Couples and visitors in fall and winter | "When is the best time to see eagles in Harrison Hot Springs?" "Where can I watch eagles near Bramblebank Cottages?" |
   | Romantic Getaways and the Hot Tub | Winter couples, anniversaries | "What is the best romantic winter getaway near Vancouver?" "Do Bramblebank Cottages have a hot tub?" |
   | Hiking and Trails | Active couples, families | "What are the best hikes near Harrison Hot Springs?" "How far is Sasquatch Provincial Park from Bramblebank Cottages?" |
   | Fishing and Kayaking on the River | Summer visitors, groups of friends | "Where can you fish near Harrison Hot Springs?" "Where can I kayak near Harrison Hot Springs?" |
   | Family Reunions and Group Stays | Families, weddings, corporate groups | "Where can I host a family reunion near Vancouver?" "How many people does the five-bedroom house sleep?" |

   - Save your final five and the questions behind each in a simple Google Sheet. The remaining items become the next cluster list.

2. **Ask your local tourism organisation for information and backlinks.**
   - Email your local tourism organisation, such as Tourism Harrison or the regional DMO, and ask for two things: their insider information on eagle viewing, trails, and fishing access, and a link from their activity or where-to-stay pages to the matching pages on your site. Links from a trusted local source tell search engines and AI tools that your pages are credible.
   - A short version that works: "We run Bramblebank Cottages, and we are publishing a local guide to eagle watching, hiking, and fishing for our guests. Would you be willing to share your latest information, and consider linking to our guide pages from your activities listing? Happy to link back and to send our photos." Attach two good images.
   - Do the same with the local operators you already recommend, such as a kayak rental, a guide, or a trail group, and offer a reciprocal link. Aim for three to five links to your activity pages over the 90 days.

#### Part B: Build the Foundation Pages

3. **Build the property FAQ page.**
   - Add a page called "Frequently Asked Questions." Write each question as a heading and answer it directly in the first sentence below. Use visible headings, not an accordion, so the text is easy for search engines and AI tools to read.
   - Start with these and fill in the facts only you know:
     - "What time is check-in and check-out at Bramblebank Cottages?" Check-in is [INSERT TIME] and check-out is [INSERT TIME].
     - "What is the cancellation policy?" [CONFIRM FOR DIRECT BOOKINGS].
     - "Do the cottages have full kitchens?" Yes, every cottage has a well-equipped kitchen, [CONFIRM DETAILS].
     - "Are the BBQs and fire bowls available to guests?" [CONFIRM RULES AND SEASONS].
     - "How many people can stay at Bramblebank Cottages?" Up to 35 across seven cottages and suites, and the five-bedroom house sleeps up to 13.
     - "Where is Bramblebank Cottages?" We are at 312 Lillooet Road in Harrison Hot Springs, [ADD DRIVE TIME FROM VANCOUVER].
     - "Is parking included?" [CONFIRM FROM THE EXISTING PARKING PAGE].
     - "Is the property accessible?" [CONFIRM FROM THE EXISTING ACCESSIBILITY INFORMATION].
   - Four more questions belong on this page, but only once you have confirmed the facts: the pet policy (which cottages, and any fee or limit), how the hot tub works and how guests reserve time, whether kayaks are provided and where guests launch, and which group bookings you accept (reunions, weddings, corporate events) with any rules. Write those answers down in Week 2, add the questions as soon as they are confirmed, and do not publish a guess. Until then, leave those topics off the website and answer them directly when guests ask.
   - Link the FAQ from the footer and the main navigation. This also answers the questions that currently arrive by phone and email, which saves you time.

4. **Create the Local Guide hub page.**
   - Add a page called something like "Things to Do Near Bramblebank Cottages" and add it to the main navigation. It is the front door to your five clusters.
   - For each activity, give the specifics a traveller needs: how far it is from the cottages, the best season, how long it takes, the difficulty or cost, and who it suits. Include the real detail, such as the trail you walk on a quiet morning or the spot guests ask about most.
   - End each activity with a link to its pillar page and a Book Direct link with a UTM tag. The hub grows as the clusters publish, and it is the page you point the tourism organisation to when you ask for a backlink.

#### Part C: Publish the Clusters

5. **Write the five pillar pages.**
   - A pillar page is the main page for a cluster: 500 to 800 words, one H1, a direct overview in the first paragraph, and a section for each of the cluster's main questions, linking to the full question posts.
   - Add a Book Direct call to action near the top and the bottom, with the perks line from Tactic 1, Step 5. Link each pillar to the other four, so the hub reads as one connected body of work.
   - Publish each pillar after its two question posts, so the pillar links to pages that already exist.

6. **Write and publish the question posts.**
   - Each cluster gets two question posts of 250 to 450 words. The H1 is the question, the first sentence is a complete answer, and the details follow. Add one real photo, a link to the pillar page, and a Book Direct link.
   - Use Claude to draft, but give it the facts. A reliable prompt: "Write a 300-word answer for the Bramblebank Cottages website to the question below. The first sentence must answer the question directly. Use only the facts I provide, and do not invent distances, prices, or policies. The tone is warm, specific, and local, like a host who knows the area. Facts: [PASTE]." Then check every claim yourself before publishing.
   - Add one detail only you would know to every post, such as the best morning to see eagles from the riverbank, or the trail you recommend to guests who have never been. That detail is what separates your answer from an OTA summary.
   - Publish at about two pieces a week, starting with the eagle cluster because it is seasonal. Then move through romantic getaways, hiking, fishing and kayaking, and group stays, which suits the booking pattern as reunions and weddings get planned in the new year.

7. **Add the search phrases guests actually use.**
   - The assessment found that you rank seventh for "harrison hot springs cabin," a term with the same search volume as the cottage terms you already rank third and second for. Use the word "cabin" naturally in your H2 headings, the FAQ, and the guide, alongside "cottage."
   - Add short sections for nearby searches, such as "Harrison Lake cottages," where you already rank first, and "Agassiz cottages," to capture regional searches. These can be a section on the guide hub and do not need separate pages.
   - Add Search Console to the site if it is not connected, so you can see which of these phrases are bringing visitors.

8. **Test your AI visibility every month and feed the content into social.**
   - Write ten prompts that match your clusters and use the same wording every month: "where to see eagles near Harrison Hot Springs," "romantic winter getaway near Vancouver with a hot tub," "best cottages in Harrison Hot Springs," "where to host a family reunion near Vancouver," and so on.
   - Run them in ChatGPT, Perplexity, Gemini, and Google AI Overviews. Record in a sheet whether Bramblebank is named, which page is cited, and which OTAs appear.
   - Run the baseline in Week 3, before the new pages go live, then again in Weeks 10 and 12. The change between the three is the evidence the work is paying off.
   - Every page you publish becomes a post in Tactic 3. Note the post link next to the page in your content sheet so you can see which written answers earn the most attention.

### Success Metrics
| Metric | 30 Days | 60 Days | 90 Days |
|--------|---------|---------|---------|
| Cluster plan | Top five chosen and tourism organisation outreach sent | First backlink requested and followed up | 3 or more links to your activity pages |
| Foundation pages | FAQ page drafted | FAQ, Getting Here, and Local Guide hub live | Hub links to all five clusters |
| Content published | 2 eagle question posts live | 10 pieces live across the first three clusters | 16 pieces live: the guide hub, 5 pillar pages, and 10 question posts |
| Search rankings | Baseline for "harrison hot springs cabin" (currently #7) recorded | Cabin term moving up | Top 5 for the cabin term, with #2 and #3 holding on the others |
| AI visibility | Baseline of 10 prompts recorded across four tools | Second test shows Bramblebank named in more prompts | Named in more prompts than at baseline, with the cited pages being your own |
| Search Console | Connected and baseline recorded | Question-led queries appearing | Impressions and clicks on cluster pages growing month over month |

### Tips
- Specific beats broad. "Where can I watch eagles near Harrison Hot Springs?" will earn more citations than a general piece on winter in Harrison, because it matches how a person asks an AI tool.
- Do not publish a guess. A distance, a fee, or a rule that turns out to be wrong travels quickly in an AI answer. Check every fact against what you know, and use the placeholders until you have confirmed them.
- Eagle season runs through the winter, so the eagle cluster has a deadline and the others do not. Start there, and capture photos and video as you write.
- The reunion and group content is a slower play, since those bookings are made months ahead. Publish it in January and February, when families start planning, and make sure the five-bedroom house is clearly described.
- Review older pages every quarter. A page that gives a trail condition or a seasonal fact needs a refresh each year, and updating a page costs far less than writing a new one.

### Resources
- [Google Search Console](https://search.google.com/search-console)
- [AnswerThePublic](https://answerthepublic.com)
- [Perplexity AI](https://perplexity.ai)
- [Claude](https://claude.ai)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Google Campaign URL Builder](https://ga-dev-tools.google.com/campaign-url-builder/)

---

## Tactic 3: Social Media Strategy for Facebook, Instagram, and TikTok
Phase: Content and Audience
Short Label: Social Strategy
Subtitle: Build a one-page strategy, an organised asset library, and a three-posts-a-week routine across three platforms, then test what resonates with a small boost budget.

### What We Heard From You

You are not active on social media, and the reason is practical: there is no strategy, little time, and no one on staff to run it. A previous hire produced poor-quality content, and you decided that no presence was better than a bad one. You do have photos and videos, but no direction on what to do with them. You told us you want a strategy and direction, not just execution. The assessment confirms the gap, with 1,694 followers across Facebook and Instagram, 594 of them on Instagram, 2.7 posts a week, and no video at all in the last 12 Instagram posts, even though Reels are the main way a small account reaches new people. It also found a 2.36 percent engagement rate, which means the people who do see your content respond well. The problem is how few people see it.

### What This Is

A system designed for an owner with limited time: a one-page strategy and a quality bar so content stays good, an organised library of the photos and video you already have, a rotation of five topic categories that matches your content clusters, a weekly batching routine, and a small boost program to find out what is worth spending money on. The plan targets three posts a week, two of them video, posted across Facebook, Instagram, and TikTok from a single scheduler, with each post built from a page you publish in Tactic 2.

### Why It Matters

The average person in North America uses seven platforms, and most of what they see comes from accounts they do not follow. For a small property that means reach comes from posting consistently in the formats the platforms reward, and not from a few perfect posts. Video is the lever: Reels and TikToks are shown to people who have never heard of you, which is exactly the audience you want, and your property is naturally visual, with hot tub steam on a cold morning, fire bowls at dusk, and willows along the river. The boost program matters because you have already spent money on ads without knowing the return, and starting small tells you what works before you spend more.

### Implementation Steps

#### Part A: Strategy and Assets

1. **Write a one-page strategy and a quality bar.**
   - Put four things on one page. Who you are speaking to: couples in winter and families and groups in summer. What you post about: the five categories in Step 4. Where: Facebook, Instagram, and TikTok. How often: three posts a week, two of them video.
   - Add a quality bar to prevent a repeat of the earlier experience. Video is vertical (9:16), steady, shot in natural light, and 7 to 20 seconds long. The best moment is in the first two seconds. Captions are on. No stock photos, no heavy filters, and no generic captions. Every post contains one real detail from the property.
   - A starter shot list for Bramblebank: hot tub steam on a cold morning, the kettle and kitchen at breakfast, a fire bowl at dusk, a kayak launching on the river, willows along the bank, eagles on a winter morning, a cottage interior walk-through, a BBQ dinner, and a guest arriving at the door. Get permission from any guest who appears.
   - Write a three-line voice note for captions: warm, specific, and local, like a host who knows the area. Give it to anyone who helps you, and load it into Claude when drafting captions.

2. **Sort the photos and video you already have, and capture what is missing.**
   - Gather every photo and video from your phone, cloud storage, and past shoots into one folder. Set aside two hours to sort them into five sub-folders matching the categories in Step 4. Keep the 30 best and archive the rest.
   - Review the content from the earlier hire against the quality bar. Reuse anything that meets it, and set aside the rest.
   - Capture eagle-season material this week, since it is seasonal and time-limited. Aim for 10 to 15 short clips and a handful of photos from public viewing spots, keeping a respectful distance from the wildlife.
   - After that, capture for 20 to 30 minutes a week, ideally when you are already on the property. Upload each clip the same day and name it with the category and date, for example eagles-riverbank-20261112.mp4.

#### Part B: Build and Run the System

3. **Set up Meta Business Suite, Buffer, and TikTok.**
   - Set up Meta Business Suite at business.facebook.com and link your Facebook Page and Instagram account. Use it instead of posting directly on Facebook, so one post goes to both platforms at once.
   - Create a TikTok Business account at business.tiktok.com with the same name and profile photo.
   - Connect Buffer or a similar scheduler so a single video can be scheduled to Facebook, Instagram, and TikTok together. Check the current limits on Buffer's free plan, which covers a small number of channels. This is the aggregator tool discussed on the call.
   - Update all three bios with the positioning line and a link to the Book Direct page, with a UTM tag for each platform.

4. **Build the rotation and the weekly batching routine.**
   - Five categories, one for each cluster, plus a standing theme across all of them, "stay longer."
     - Eagles and Local Wildlife
     - Romance and the Hot Tub
     - Trails and Water, covering hiking, fishing, and kayaking
     - Groups and Gatherings
     - Cottage Life, covering the kitchens, BBQs, fire bowls, and mornings
   - Weekly rhythm: Monday, a Cottage Life or Romance post; Wednesday, an Explore Reel from the eagle, trail, or water categories; Friday, a weekend or group post with a Book Direct link. Two of the three are video.
   - A six-month map of monthly themes keeps the rotation fresh:

   | Month | Theme | Focus |
   |-------|-------|-------|
   | November | Eagle season | Eagles, winter wildlife, cozy arrivals |
   | December | Cozy holidays | Hot tub nights, fire bowls, holiday stays |
   | January | New year, new trail | Hikes, "stay longer," reunion planning |
   | February | Romance | Valentine's and anniversary stays |
   | March | Early spring | Spring break, first trails, river access |
   | April | Summer planning | Reunions, weddings, group stays, kayaking |

   - Batch it once a week in about 90 minutes: pick three assets, draft captions with Claude using your voice note, add captions to the video in CapCut or Canva, and schedule everything. A few minutes of daily Stories are optional extras, not a requirement.

5. **Turn every website page into social content and a Google Business Profile post.**
   - Each question post you publish in Tactic 2 becomes a Reel, a photo post or carousel, and a Google Business Profile post. The video can be as simple as you answering the question in 15 seconds with the view behind you.
   - Post to Google Business Profile weekly from the same pool, with a current photo, a line about the season, and a link to the matching page. The assessment recommends weekly posts to stay active in local results.
   - Log the post link next to each page in your content sheet. You will see quickly which pages attract the most attention on social, which tells you what to write next.

6. **Spend ten minutes a day on replies.**
   - Respond to every comment and message, ideally within a few hours. Replies tell the platforms the post is worth showing, and a message from a potential guest is a warm lead.
   - Reply to every Google review within 48 hours, with extra care for any four-star or lower, as the assessment recommends. Write two or three templates you can edit, so it takes 15 minutes a week.
   - Ask a question at the end of most captions, such as "Where is your favourite winter walk?" Questions are the simplest way to earn comments.

#### Part C: Test with a Mini Boost Program

7. **Run a small boost program to see what resonates.**
   - Wait until you have about four weeks of organic posts and the Meta Pixel has been installed, then start. You are not trying to buy bookings yet. You are finding out which content earns attention cheaply.
   - Pick a post that is already performing well organically, with above-average saves, shares, or comments. Use the Boost option in Meta Business Suite with the objective set to website traffic, link it to the matching page on your site with a UTM tag, and set $5 a day for four days. Cap the total at about $100 a month.
   - Target adults roughly 28 to 60 within a two-hour drive: the Lower Mainland and Fraser Valley. Keep the audience broad and let the content do the targeting.
   - Record each boost in a sheet: the post, the spend, link clicks, cost per click, saves, and any enquiries or bookings. After four boosts, take the median cost per click and treat anything 30 percent below it as a winner.
   - After about 60 days of Pixel data, test retargeting visitors who viewed a cottage or the Stay Longer page with a Book Direct message.

8. **Review monthly and decide what to scale.**
   - On the first of each month, spend 30 minutes with three questions: which three posts earned the most saves and reach, which category performed best, and which boost cost the least per click. Do more of what won.
   - Compare the cost per enquiry from boosts with the cost per enquiry from your Google Ads for the house, and with the roughly 20 percent commission on an OTA booking. This is the number that tells you where the next dollar should go.
   - Keep the Google Ads for the house running while you test, and review them after about 60 days of boost results. Turn them down only if the numbers show the boosts doing the same job for less.

### Success Metrics
| Metric | 30 Days | 60 Days | 90 Days |
|--------|---------|---------|---------|
| Posting frequency | Strategy page written; posting launched in Week 4 at 3 per week | 3 per week with no missed weeks | 3 per week sustained, scheduled a week ahead |
| Video share | 2 of every 3 posts are video | 2 of every 3 | 2 to 3 of every 3 |
| Instagram followers | 594 baseline recorded | 650 | 800 or more |
| Engagement rate | Baseline of 2.36 percent recorded | Holding at 2 percent or above while reach grows | Holding at 2 percent or above |
| TikTok | Account created with first 5 videos | 15 videos | 30 videos, with at least one above 2,000 views |
| Content library | 30 best assets sorted and eagle clips captured | 6 weeks of content ahead | Weekly 20-minute capture is a habit |
| Boost program | Pixel installed and boost plan set | 4 boosts run and logged | Cost per click benchmark set and one winning format identified |
| Social traffic | Baseline of visits from social recorded in analytics | Social visits trending up | 40 to 60 additional website visits a month from social |

### Tips
- Do not try to produce more than you can sustain. Three posts a week, done every week, will outperform ten posts in a burst followed by six weeks of silence, and the routine is built to take about two hours a week.
- Treat the quality bar as the fix for your earlier experience. The problem with that content was not that you posted, it was that nobody set a standard, and a one-page standard is cheap.
- The hot tub in winter is the most shareable thing you have. Steam rising on a cold morning is exactly the kind of clip that earns saves from couples planning a getaway.
- The same video goes everywhere. Download the original from your phone and post it to Facebook, Instagram, and TikTok, instead of re-recording or posting a screen capture.
- Boost only posts that already have traction and a page to send people to. A boosted post with nowhere to go spends your money on likes, and a boosted post that links to the eagle guide builds your website too.

### Resources
- [Meta Business Suite](https://business.facebook.com)
- [Buffer](https://buffer.com)
- [CapCut](https://www.capcut.com)
- [Canva](https://www.canva.com)
- [TikTok Business](https://business.tiktok.com)
- [Claude](https://claude.ai)
- [Google Campaign URL Builder](https://ga-dev-tools.google.com/campaign-url-builder/)

---

## Objectives

### Objective 1
Title: A Website Built to Win Direct Bookings
Description: Fix the technical issues, show the direct-booking perks next to every Book Now button, and start tracking what each channel costs, so more guests book direct and OTA commissions come down from $1,700 a month.
Tactic Pill: Tactic 1 · Weeks 1-10

### Objective 2
Title: The Specific Answer Guests and AI Tools Quote
Description: Publish a property FAQ, a local guide, and five topic clusters on eagle watching, romance, hiking, fishing and kayaking, and group stays, so Bramblebank is named when people ask where to stay in Harrison.
Tactic Pill: Tactic 2 · Weeks 2-12

### Objective 3
Title: A Social Routine That Fits Your Week
Description: Build a one-page strategy, an organised content library, and a three-posts-a-week routine across Facebook, Instagram, and TikTok, then use a small boost budget to find what is worth scaling.
Tactic Pill: Tactic 3 · Weeks 1-12

---

## 90-Day Roadmap

Month 1 Name: Foundation
Month 2 Name: Content and Launch
Month 3 Name: Convert and Test

### Week 1: Quick Fixes, Baselines, and Eagle Capture
**Actions:**
- Fix the title tag, meta description, the five H1 tags, alt text on the eight icons, and make the phone number tap-to-call in the header and footer → links to: Tactic 1 / Step 2
- Record your baselines: direct and OTA bookings, the $1,700 commission figure, average length of stay, and your current PageSpeed score → links to: Tactic 1 / Step 9
- Gather your photos and video into one folder and capture 10 to 15 eagle clips and photos this week → links to: Tactic 3 / Step 2
- Set up Meta Business Suite and link your Facebook Page and Instagram account → links to: Tactic 3 / Step 3

**Checklist:**
- [ ] The homepage has one H1, a new title tag, and a new meta description
- [ ] The phone number is tappable and visible in the header and footer
- [ ] A baseline sheet records direct versus OTA bookings, commissions, and length of stay
- [ ] 10 or more eagle clips and photos are saved in one folder
- [ ] Meta Business Suite shows Facebook and Instagram connected

### Week 2: Images, Clusters, and Outreach
**Actions:**
- Cut the homepage image count, compress what remains, and re-upload → links to: Tactic 1 / Step 1
- Run the one-hour cluster exercise and choose your top five → links to: Tactic 2 / Step 1
- Email your local tourism organisation to ask for insider information and backlinks → links to: Tactic 2 / Step 2
- Write the one-page social strategy and quality bar → links to: Tactic 3 / Step 1
- Write down the facts the FAQ and cluster posts depend on: the pet policy, how the hot tub works, kayak access, and group booking rules → links to: Tactic 2 / Step 3

**Checklist:**
- [ ] The homepage is under 10 MB and the new PageSpeed score is recorded
- [ ] Five clusters and their questions are saved in a sheet
- [ ] The outreach email has been sent with two photos attached
- [ ] The one-page strategy and quality bar are written and printed
- [ ] The pet policy, hot tub details, kayak access, and group booking rules are written down in one note

### Week 3: Map, Pixel, and AI Baseline
**Actions:**
- Embed the Google Map and publish the Getting Here page with written directions from Highway 7 and Highway 9 → links to: Tactic 1 / Step 3
- Install the Meta Pixel and confirm Google Analytics is recording → links to: Tactic 1 / Step 4
- Run the baseline AI visibility test across ChatGPT, Perplexity, Gemini, and Google AI Overviews → links to: Tactic 2 / Step 8
- Sort your photos and video into the five category folders and pick the 30 best → links to: Tactic 3 / Step 2
- Create the TikTok Business account, connect Buffer, and update all three bios → links to: Tactic 3 / Step 3

**Checklist:**
- [ ] The map and directions are live and linked from the footer
- [ ] The Pixel fires a PageView event when you visit your homepage
- [ ] Baseline AI test results for 10 prompts are saved
- [ ] 30 best assets are sorted into five folders
- [ ] TikTok, Facebook, and Instagram bios match and link to the Book Direct page

### Week 4: Launch Social and Publish the First Eagle Posts
**Actions:**
- Build your first weekly batch and start posting three times a week, two of them video → links to: Tactic 3 / Step 4
- Write and publish the first two eagle question posts → links to: Tactic 2 / Step 6
- Turn each eagle post into a Reel and a Google Business Profile post → links to: Tactic 3 / Step 5
- Spend ten minutes a day on comments, messages, and review replies → links to: Tactic 3 / Step 6

**Checklist:**
- [ ] Three posts went out across Facebook, Instagram, and TikTok
- [ ] Two eagle question posts are live on the website with real facts
- [ ] A Google Business Profile post is published with a link to an eagle page
- [ ] Every comment and review has a reply

### Week 5: FAQ, Local Guide, and the Eagle Pillar
**Actions:**
- Build the property FAQ page with direct first-sentence answers → links to: Tactic 2 / Step 3
- Create the Local Guide hub page and add it to the navigation → links to: Tactic 2 / Step 4
- Write and publish the eagle pillar page → links to: Tactic 2 / Step 5
- Post three times this week and schedule next week's posts in advance → links to: Tactic 3 / Step 4

**Checklist:**
- [ ] The FAQ page is live with confirmed facts and no placeholders
- [ ] The Local Guide hub is live and in the main navigation
- [ ] The eagle cluster is complete: two question posts and a pillar page
- [ ] Next week's posts are scheduled

### Week 6: Direct Perks and Romance Content
**Actions:**
- Add the direct-perks block and the promo code next to every Book Now button → links to: Tactic 1 / Step 5
- Add the guest testimonials section and star rating to the homepage and cottage pages → links to: Tactic 1 / Step 6
- Publish the first two romantic getaway question posts → links to: Tactic 2 / Step 6
- Turn the new posts into Reels and Google Business Profile posts → links to: Tactic 3 / Step 5

**Checklist:**
- [ ] The perks line and promo code show beside every Book Now button
- [ ] The promo code works from a booking link tested on your phone
- [ ] Testimonials and the 4.8-star rating are on the homepage and cottage pages
- [ ] Two romantic getaway posts are live

### Week 7: Holiday Week, Light and Scheduled
**Actions:**
- Publish the romantic getaways pillar page and the first hiking question post → links to: Tactic 2 / Step 6
- Schedule social content through the first week of January, using the eagle and hot tub clips → links to: Tactic 3 / Step 4
- Add holiday hours and a seasonal post to the Google Business Profile
- Keep replying to comments, messages, and reviews, even briefly → links to: Tactic 3 / Step 6

**Checklist:**
- [ ] The romantic getaways cluster is complete
- [ ] Social content is scheduled through early January
- [ ] Holiday hours are set on the Google Business Profile
- [ ] No comment or review has gone unanswered for more than two days

### Week 8: Stay Longer Offer and First Boosts
**Actions:**
- Publish the second hiking question post and the hiking pillar page → links to: Tactic 2 / Step 6
- Create the direct-only Stay Longer offer with its own promo code and link → links to: Tactic 1 / Step 7
- Print the in-cottage cards and set up the sign-up form → links to: Tactic 1 / Step 8
- Run the first boost on your best organic post, at $5 a day for four days → links to: Tactic 3 / Step 7

**Checklist:**
- [ ] The hiking cluster is complete
- [ ] The Stay Longer offer is live with a working booking link
- [ ] Cards are in the cottages and the sign-up form works
- [ ] The first boost is logged with spend, clicks, and cost per click

### Week 9: Water Content and the Cabin Keyword
**Actions:**
- Publish the two fishing and kayaking question posts → links to: Tactic 2 / Step 6
- Add "cabin" naturally to H2 headings, the FAQ, and the guide, and add sections for Harrison Lake and Agassiz searches → links to: Tactic 2 / Step 7
- Run the second and third boosts and log the results → links to: Tactic 3 / Step 7
- Check Search Console for the first queries bringing visitors to the new pages → links to: Tactic 2 / Step 7

**Checklist:**
- [ ] Two fishing and kayaking posts are live
- [ ] The cabin term and the nearby-area sections are on the site
- [ ] Three boosts are logged
- [ ] The first Search Console queries are recorded

### Week 10: Mid-Point Review and Group Content
**Actions:**
- Publish the water pillar page and the first group stays question post → links to: Tactic 2 / Step 6
- Run the second AI visibility test and compare it with the baseline → links to: Tactic 2 / Step 8
- Run the monthly review: top posts, best category, and cost per click by boost → links to: Tactic 3 / Step 8
- Report direct versus OTA share and commissions for the past month → links to: Tactic 1 / Step 9

**Checklist:**
- [ ] The water cluster is complete
- [ ] AI test results are compared with the Week 3 baseline
- [ ] The monthly review is written with the top three posts and best category
- [ ] The direct versus OTA report has numbers beside the baseline

### Week 11: Group Stays and Valentine's Push
**Actions:**
- Publish the second group stays question post and the group stays pillar page → links to: Tactic 2 / Step 6
- Schedule Valentine's and anniversary content around the hot tub and cottage stays → links to: Tactic 3 / Step 4
- Send the first email to your sign-up list with the Stay Longer offer → links to: Tactic 1 / Step 8
- Run the fourth boost on a Valentine's or romance post → links to: Tactic 3 / Step 7

**Checklist:**
- [ ] The group stays cluster is complete and the five-bedroom house is clearly described
- [ ] Valentine's content is scheduled through mid-February
- [ ] The first email has gone to the list
- [ ] Four boosts are logged with a cost per click benchmark

### Week 12: 90-Day Review and Plan Forward
**Actions:**
- Run the final AI visibility test and compare it with the baseline and Week 10 → links to: Tactic 2 / Step 8
- Compare direct versus OTA share, commissions, and length of stay against the Week 1 baseline → links to: Tactic 1 / Step 9
- Pull the 90-day social summary: followers, engagement rate, best category, and visits from social → links to: Tactic 3 / Step 8
- Compare boost cost per enquiry with your Google Ads and the cost of an OTA booking → links to: Tactic 3 / Step 8
- Write three things that worked and one thing to change, and decide the next 90-day priorities

**Checklist:**
- [ ] The final AI test is logged and the progress across three tests is written down
- [ ] The direct versus OTA comparison is written with numbers
- [ ] The 90-day social summary exists with specific numbers
- [ ] Boost, Google Ads, and OTA costs are compared in one table
- [ ] The next 90-day priorities are decided with a written reason

---

## GBP Quick Wins

These are small jobs that pay back quickly. Most take under an hour, and none needs to wait for the larger work in the plan.

### On the Google Business Profile

- **Reply to every review.** You have 247 reviews at 4.8 stars, and the assessment recommends responding to 100 percent within 48 hours, starting with any four-star or lower. Mention what the guest mentioned, such as the hot tub, the kitchen, or the quiet, and thank them for coming. Replies take about 15 minutes a week and show future guests that someone is paying attention.
- **Post weekly on the profile.** Use a current photo, a seasonal line, and a link to the matching page on your website. The assessment recommends weekly posts, and eagle season gives you plenty to say this month.
- **Add the attributes and services that are true.** Hot tub, full kitchen, BBQ, fire bowls, and parking, plus kayaking, pets, and accessibility once you have confirmed the details. Accurate attributes put you in filtered searches such as "cabin with hot tub near me."
- **Update the description.** Mention both cottages and cabins naturally, name the hot tub, the full kitchens, and the river, and add the direct-booking perks line.
- **Link to the Book Direct page with a UTM tag.** This lets you see in analytics how many visits the listing sends.

### On the Website

- **Make the phone number tap-to-call.** The assessment flagged that (604) 796-9552 appears only on the contact page and cannot be tapped. One-tap calling matters most on mobile, where many guests make last-minute decisions.
- **Fix the five H1 tags.** Keep "Bramblebank Cottages | Harrison Hot Springs BC" as the only H1 and change "Your retreat awaits" and "Book Direct" to H2.
- **Add alt text to the eight icons.** WiFi, parking, BBQ, and the other amenity icons are missing it.
- **Embed the map.** A Google Map and written directions from Highway 7 and Highway 9 remove a common source of arrival stress and phone calls.
- **Install the Meta Pixel.** Even though you are not retargeting yet, the audience starts building the day it is installed.

### One Thing Worth Watching

Average length of stay is the quiet number behind your two goals. Every extra night you add to a booking costs almost nothing to turn over, and "wish we had stayed longer" is already the most common thing your guests say. Track it monthly alongside the direct share, and watch how the Stay Longer offer and the Local Guide content move it. If the guide gives guests more reasons to stay a third night, it will show up in that number before it shows up anywhere else.
