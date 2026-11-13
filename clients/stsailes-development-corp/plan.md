# Sts'ailes Development Corp — Accelerator Implementation Plan

## Meta
Client Slug: stsailes-development-corp
Has GBP Quick Wins: yes

## Goal

This plan covers two of the businesses run from Morris Valley Road: Sasq'ets Journeys, the Indigenous-led boat, land and kayak tours, and Sasq'ets Burger, the café, catering and meeting room business. The lodge is left out on purpose. It is doing well on Airbnb as a whole-house rental and is due for redevelopment in a year or two. The other businesses are left out for a simpler reason: you have one to two hours a week for marketing, you are still getting access to some of the accounts, and you are looking after more than one business at once. A plan that tried to cover everything would not get done. This one is built to fit the hours you actually have.

The tours have a product guests rave about and a website that loses them on the way to booking. A guest from Vancouver called the boat journey the best cultural boat tour he had ever done, and that review sits on a homepage where the Book Boat Tour button leads to an error page. The Tours link in the footer and the kayak Book Now button both open a page called Tour Calendar that still shows the website template's sample bike tours in Croatia, Sardinia and Tuscany. The newsletter signup on every page has no storage connected, so anyone who subscribes is not saved. One tour was booked last month. Some of that is the season and some is the locked Viator account, but some of it is a booking path that breaks before a guest ever reaches Rezgo.

Sasq'ets Burger has the opposite problem. It is open year-round and its regulars are loyal, but almost all of them are local or from nearby First Nations communities, and outside visitors are the clear gap. Even closer to home there is room to grow: about 300 Sts'ailes staff work nearby, and three First Nations communities within roughly 30 minutes are not using the café or catering, even though they have no local alternative. Online, the café is a page inside the Development Corporation's website. That page shows the corporation's office hours instead of the café's, has a typo in the booking email address, and links to online ordering with a bare web address and no button.

The order matters, and so does the calendar. These 90 days fall in the tours' off-season. That makes it the right time to fix things and the wrong time to expect a lot of tour bookings. Weeks 1 to 5 repair both booking paths, move Sasq'ets Burger to its own web address and install the tracking that is currently missing. Weeks 1 to 8 get both Google Business Profiles complete and start a ten-minute weekly review routine. Weeks 7 to 12 build a content habit that fits inside an hour a week, using footage you already have or are about to receive. Weeks 8 to 12 agree the budget, then run a small, measured Meta ad test for the café, which is open now, and build the Google Ads campaign for the tours. That campaign stays paused until spring bookings open.

This plan does not include a revenue projection. There is no ad budget set yet, and there is no tracking on either site to build one from. Here is what day 90 looks like:
- Every booking button works and is tracked.
- Sasq'ets Burger has its own address.
- Both Google profiles are complete, and every review has a reply.
- One post a week goes out for each business.
- One café ad test is finished, with real numbers to judge it by.
- The Google Ads tour campaign is built and ready to switch on.

Most of the tour revenue from this work will come in spring, after these 90 days. The exception is gift cards, which can sell through December if they are switched on in Week 4.

## Strategic Positioning

There are several ways to get out on the water around Harrison. What no one else can offer is the territory told by the people it belongs to. Sasq'ets Journeys takes guests past ancient pictographs and village sites on the Harrison and Chehalis rivers, with *sxwōxwiyám*, songs and teachings shared by Sts'ailes guides. The guest you want is already searching for this, using phrases like "Indigenous-led tour near Harrison." Your main competitor is not another operator. It is the visitor who never finds out the tour exists, or who finds it and cannot book. Fixing the booking path and the Google profile does more for that visitor than any ad.

Lead with people, not scenery. Your guests respond to faces: the guides, the café staff and the cultural ambassador. The river looks beautiful in anyone's photos. A Sts'ailes guide telling the story of a pictograph is something only you can show.

Sasq'ets Burger is an Indigenous-owned café in a forest-and-river setting with a 250-seat dining hall and a 1,848 square foot meeting room. Local trade is its base, and this plan protects that base while reaching three new groups: Sts'ailes staff, the nearby communities who could use the catering, and visitors driving Morris Valley Road. You raised a concern that the café has drifted from its original Indigenous-focused concept because of what the local market asks for. That decision belongs to you and JJ, and Conner will come back to it in the next session, so this plan does not settle the menu. What it does is make sure the marketing leads with what is clearly yours: who owns the café, where it sits, and the people who run it. Whatever you decide about the menu, the story will still fit.

> **Your Strategic Positioning**
>
> Sasq'ets Journeys is Sts'ailes territory told by Sts'ailes people: ancient pictographs, village sites and stories on the Harrison and Chehalis rivers, bookable in a few taps. Sasq'ets Burger is the Indigenous-owned café and gathering place on the same land, open year-round to the community and to anyone driving Morris Valley Road.

## Welcome Message

You are stepping into marketing for two businesses that already have something worth sharing: tours guests call the best they have done, and a café with a room that seats 250. This plan keeps to those two businesses and to one or two hours a week, so each week ends with something finished rather than another list.

---

## Tactic 1: Fix the Booking Paths on Both Websites
Phase: Foundation
Short Label: Websites & Booking
Subtitle: Repair the broken tour buttons, give Sasq'ets Burger its own web address, and install the tracking both sites are missing.

### What We Heard From You

You told us your biggest challenge is capacity and lack of automation, and that success in the Accelerator means being able to make changes quickly yourself with what you learn. On the coaching call, Conner reviewed the tour booking path and found booking buttons that were hard to see and links that went nowhere. He recommended a dedicated web address for each business, so guests can find you and book direct instead of going through third-party sites that take a high commission. The locked Viator account makes direct booking more important, not less. Right now Sasq'ets Burger lives as a page on the Development Corporation's website rather than at an address of its own.

### What This Is

This tactic has three parts. Part A repairs the Sasq'ets Journeys website so every button leads somewhere real. Part B takes the existing Sasq'ets Burger page and moves it to its own domain. It is a move, not a redesign. Part C installs Google Analytics 4 and the Meta Pixel on both sites and in Rezgo, so you can see where visitors come from and which ones book.

### Why It Matters

Every other tactic in this plan sends people to these pages:
- Google profile booking links
- social posts
- the café ad test
- the spring tour ads

If the main tour's booking button leads to an error, every one of those efforts ends there. Without analytics, you cannot tell a booking that came from Google from one that would have happened anyway. The off-season is the time to fix this, because the work is mostly invisible and nothing is lost while you do it.

### Implementation Steps

#### Part A: Repair the Sasq'ets Journeys Booking Path

1. **Fix the broken Book Boat Tour button.** *(about 20 minutes)*
   - The Book Boat Tour button under the boat tour on sasqetsjourneys.com points to `https://www.sasqetsjourneys.com/sasqets.rezgo.com`, which returns an error. The address was entered without `https://`, so Squarespace treated it as a page on your own site.
   - Log in to Squarespace and open the Sasq'ets Journeys site. Click **Pages**, then **Home**, then **Edit** in the top left corner.
   - Click the Book Boat Tour button, then the pencil icon. In the link field, enter the full address, starting with `https://`.
   - Point each button at that tour's own page in Rezgo rather than the general Rezgo homepage, so guests land on the tour they chose. To find each address, open sasqets.rezgo.com, click the tour, and copy the address from your browser's address bar. `[CONFIRM: direct Rezgo URL for each tour]`
   - Repeat for Book Land Tour, Explore our adventures, and the BOOK NOW button in the header.
   - The kayak tour is booked by email, but its button says BOOK NOW and opens the Tour Calendar page. Change the button text to "Email to Book a Kayak Tour". In the link editor, choose **Email** and enter journeys@stsailes.com.
   - Click **Save**, exit the editor, and tap every button on your phone to check it.

2. **Replace the template Tour Calendar page.** *(about 60 minutes)*
   - The page at sasqetsjourneys.com/tours is titled Tour Calendar. It still lists nine sample bike tours from the website template, including Croatia Bike Tour and Alpine Escapes, all dated Sep 07-10. The banner image is also the template's own stock photo. The footer's Tours link goes to this page.
   - In **Pages**, click **Tour Calendar**, then **Edit**. Hover over the bike tour section and click the trash can icon to delete it.
   - Open the page settings: hover over the page in the Pages panel and click the gear icon. Change the page title to "Tours" and keep the URL slug as `/tours`.
   - Add one section for each tour you offer. Each section needs:
     - the tour name and duration
     - what guests will see
     - where to meet
     - a starting price `[CONFIRM: current price for each tour]`
     - a single button that goes to that tour in Rezgo
   - You can copy most of the text from the Featured Tours section on the homepage.
   - The FAQ lists four types of tour: jet boat, kayak, walking and eagle viewing. Only three appear as Featured Tours, and eagle viewing appears nowhere else on the site. Decide which tours are actually offered and when, then add the missing ones or remove them from the FAQ. `[CONFIRM: whether eagle viewing and walking tours are currently offered, and in which months]`
   - Put the season at the top of the page in plain words, for example: "Tours run [season]. Book ahead for spring, or give a Sasq'ets Journeys gift card." `[CONFIRM: tour season dates]`
   - Replace the template banner with one of your own river photos.

3. **Fix the newsletter signup and the dead-end links.** *(about 30 minutes)*
   - The newsletter block at the bottom of every page displays a message saying it needs a storage option, so signups are not being saved anywhere.
   - Click into the block, choose **Edit**, and open the **Storage** tab. Connect **Google Drive**. Signups will then collect in a Google Sheet in your Drive, at no cost. Submit a test signup with your own email and check that it appears in the sheet.
   - Keep the block. Addresses collected over the winter are the people most likely to book when spring dates open.
   - The "Request Information" heading links to `/home`, which is the page visitors are already on. Change it to `/contact`.
   - The Facebook icon in the header links to the Development Corporation's Facebook Group, not to a page for the tours. Change it to the Sasq'ets Journeys Facebook Page and add the Instagram account. `[CONFIRM: Sasq'ets Journeys Facebook Page and Instagram URLs]`
   - If you cannot find a setting, press the "/" key in the Squarespace dashboard to open the search bar and type what you are looking for, for example "Social links".

4. **Rewrite the titles and descriptions Google shows.** *(about 20 minutes)*
   - The homepage's search title is just "Sasq'ets Journeys", and no page on the site has a meta description. Google is guessing what to show under your name in search results.
   - In **Pages**, hover over **Home**, click the gear icon, and open the **SEO** tab.
   - Homepage SEO title: `Indigenous-Led Harrison River Tours | Sasq'ets Journeys` (55 characters).
   - Homepage SEO description: `Boat, land and kayak tours led by Sts'ailes guides on the Harrison and Chehalis rivers. See ancient pictographs and village sites near Harrison Hot Springs.`
   - Tours page SEO title: `Boat, Land & Kayak Tours | Sasq'ets Journeys, Agassiz BC`.
   - Tours page SEO description: `Two-hour and four-hour boat journeys, land storytelling tours and kayak tours on Sts'ailes territory. Book online or email journeys@stsailes.com.`
   - Changes can take a few weeks to show in Google. Nothing else needs to be done.

5. **Sell Rezgo gift cards through the off-season.** *(about 45 minutes)*
   - Rezgo can sell gift cards online once a payment gateway is turned on, which yours already uses for bookings. A gift card is the one tour product you can sell in December. `[CONFIRM: whether gift card sales are enabled on the Rezgo account]`
   - In Rezgo, open **Gift Cards** in the main menu, then **Manage**, then **View Card Template**. Choose a design and add your logo.
   - Open sasqets.rezgo.com on your phone and check that a gift card option appears for customers. If it does not, contact Rezgo support and ask how to turn it on.
   - Add a "Give a Tour" button to the homepage and the Tours page that links to the Rezgo gift card page. `[CONFIRM: Rezgo gift card page URL]`
   - Tactic 3 covers how to post about it.

#### Part B: Give Sasq'ets Burger Its Own Address

6. **Get the domain approved and registered.** *(about 30 minutes, plus JJ's approval)*
   - Sasq'ets Journeys already has its own domain. Sasq'ets Burger needs one.
   - In Squarespace, go to **Domains** and search for a name that matches the tours, such as sasqetsburger.com or sasqetsburger.ca. `[CONFIRM: preferred domain name and availability]`
   - There are two costs: the yearly domain fee, and a Squarespace plan for the new site. There is no free route. Square Online, where your takeout ordering lives, also needs a paid plan to use a custom domain. `[CONFIRM: JJ's approval of the domain and Squarespace plan cost]`
   - Buy the domain through Squarespace so it connects to the new site without any technical settings.
   - Register it under the corporation's account and email, not a personal one. Store the login somewhere JJ can also reach it. The locked Viator account is the reason this matters.

7. **Copy the Burger page into its own Squarespace site.** *(about 90 minutes)*
   - In your Squarespace dashboard, find the Development Corporation site, click the three dots beside it, and choose **Duplicate**. Squarespace makes a trial copy of the whole site and emails you when it is ready.
   - In the copy, open **Pages** and delete every page except Sasq'ets Burger. Then hover over Sasq'ets Burger, click the gear icon, and choose **Set as Homepage**.
   - Remove the "Our Businesses" folder from the navigation. Change the site title to Sasq'ets Burger.
   - Fix these things while you are there:
     - **Hours:** replace the Development Corporation's office hours (Monday to Friday, 8am to 4pm) with the café's real hours. `[CONFIRM: café hours]`
     - **Email typo:** fix the first booking email link, which points to `@stailes.com` instead of `@stsailes.com`.
     - **Order button:** replace the bare `sasqets.square.site` address with a button labelled "Order Takeout Online".
     - **Phone:** make the phone number a tap-to-call link.
     - **Catering and meeting room:** give each its own clear request line, using sasqetsbasket@stsailes.com.
     - **Tours:** add one line linking to sasqetsjourneys.com, so café visitors learn about the tours.
   - Set the SEO title (gear icon, then **SEO**) to `Sasq'ets Burger | Indigenous-Owned Café, Agassiz BC` and write a description that names the café, catering and the meeting room.
   - Leave the design alone. The job is a new address, not a new website.

8. **Publish the Burger site and point the old page to it.** *(about 45 minutes)*
   - In the new site, open **Settings**, then **Billing**, and subscribe to the approved plan. Then go to **Settings**, then **Domains**, and connect the new domain.
   - On the Development Corporation site, open the Sasq'ets Burger page settings, change its URL slug to `/sasqetsburger-old`, and disable the page. A redirect only works once no live page is using the old address.
   - Open **Settings**, then **Developer tools**, then **URL mappings** (or search "URL mappings" in the dashboard). Add this line, using your new domain, and save:
     `/sasqetsburger -> https://[new-domain] 301`
   - Change the "Sasq'ets Burger" link in the Our Businesses menu so it points to the new domain.
   - Update the website link in the café's Facebook and Instagram profiles.
   - Type stsailesdevcorp.com/sasqetsburger into your phone's browser and check that it lands on the new site.

#### Part C: Measure the Path

9. **Install Google Analytics 4 on both sites and in Rezgo.** *(about 45 minutes)*
   - Check first whether anyone has already set it up. In each Squarespace site, open **Settings**, then **Developer tools**, then **External API keys**. If the Google Analytics field already holds an ID starting with G-, find out who owns that account before creating a new one.
   - At analytics.google.com, signed in with the corporation's Google account, create one account called "Sts'ailes Development Corp". Inside it, create two properties, "Sasq'ets Journeys" and "Sasq'ets Burger", each with a web data stream for its domain.
   - Copy each Measurement ID. In GA4, find it under **Admin**, then **Data collection and modification**, then **Data streams**, then click the stream.
   - Paste each ID into its site's **External API keys** field in Squarespace and click **Save**. If the duplicated Burger site carried over the Development Corporation's settings, replace them with the Burger ID.
   - In Rezgo, go to **Settings**, then **Analytics**, and paste the Sasq'ets Journeys ID into the **Use Google Analytics 4** field. Rezgo will then send booking events to GA4, including a purchase event when someone books.
   - Bookings happen on sasqets.rezgo.com, a different domain from your website, so tell GA4 to treat them as one visit. In the Journeys property, open **Admin**, then **Data streams**, click the stream, then **Configure tag settings**, then **Configure your domains**. Add `sasqetsjourneys.com` and `sasqets.rezgo.com`.
   - After the first booking (or a test booking) comes through, go to **Admin**, then **Data display**, then **Events**, and mark **purchase** as a key event.
   - Rezgo also offers a more precise setup through Google Tag Manager, which it calls Analytics Recipes. It is worth doing later, or handing to a co-op student. The simple field is enough for now.

10. **Add the Meta Pixel to both sites and to Rezgo.** *(about 30 minutes)*
    - Go to business.facebook.com. If the corporation does not have a Business portfolio yet, create one using the corporation's email.
    - Open **Events Manager**, choose **Connect data sources**, then **Web**. Create one dataset (pixel) for Sasq'ets Burger and one for Sasq'ets Journeys.
    - In each Squarespace site, open **Settings**, then **Marketing**, then **Meta Pixel & Ads**. Paste the matching Pixel ID and click **Save**. A green status indicator confirms it is connected. Squarespace's built-in connection also sends some events directly from its server, which recovers visits that ad blockers would otherwise hide.
    - Add the Journeys pixel to Rezgo by following Rezgo's help article "How to set up Meta Pixel tracking with Rezgo".
    - Check that it works using **Test events** in Events Manager. Open the site in another tab and watch for the PageView event to appear.

11. **Test every path from a phone and record a baseline.** *(about 30 minutes)*
    - On your phone, using mobile data rather than Wi-Fi, start on each homepage. Tap every Book button, the gift card button, Order Takeout Online, the phone number and each email link. Each one should open the right thing.
    - Write down the starting numbers on one page:
      - tours booked last month (one, as you mentioned on the call)
      - Rezgo bookings by source for the past season
      - the review count and rating on each Google profile
      - followers on each social account
    - Save it in a shared folder and send a copy to Junction. Everything in this plan will be measured against it.

### Success Metrics

| Metric | 30 Days | 60 Days | 90 Days |
|---|---|---|---|
| Broken or misdirected booking buttons on sasqetsjourneys.com | 0 (from 1 broken button and 2 buttons going to the template page) | 0 | 0, rechecked after any site edit |
| Template content on the live site | Tour Calendar replaced with real tours and season dates | Nothing from the template remains | Nothing from the template remains |
| Sasq'ets Burger web address | Domain approved and registered | New site live; old URL redirects | 30 days of GA4 data on the new site |
| Analytics coverage | GA4 live on both sites and in Rezgo | Purchase marked as a key event | Source of every online tour booking visible in GA4 |
| Newsletter signups saved | Storage connected, test signup received | 5 or more real signups | 15 or more real signups |
| Gift cards | On sale and linked from the homepage and Tours page | First gift card sold | Gift card sales total recorded for the season |

### Tips

- Steps 1 and 3 together take under an hour and fix the most expensive problem on either site. If you only get one hour this week, spend it there.
- After every edit, tap through on your phone. The Book Boat Tour link broke because a web address was missing `https://`. The page looked fine and nobody noticed for months.
- Keep every login (Squarespace, Rezgo, Google, Meta, the new domain) under the corporation's email, and keep a list JJ can reach. The Viator lockout cost you a booking channel, and the same thing can happen to any account in this plan.
- Resist redesigning. The tours site already loads quickly and looks good. The work here is making the buttons honest.

### Resources

- [Rezgo: How to set up Google Analytics in Rezgo](https://support.rezgo.com/kb/set-google-analytics-rezgo): where to paste your GA4 ID in Rezgo.
- [Rezgo: Supported GA4 events](https://support.rezgo.com/kb/supported-google-analytics-ga4-events/): what Rezgo sends to GA4, including purchase.
- [Rezgo: Integrations articles](https://support.rezgo.com/kb/category/website-and-account/integrations): includes the Meta Pixel and Google Things to Do guides.
- [Rezgo: How to create a gift card](https://support.rezgo.com/kb/create-gift-card/): gift card setup and templates.
- [Squarespace Help: URL mappings](https://support.squarespace.com/hc/en-us/articles/205815308-URL-mappings): official guide to redirects.

---

## Tactic 2: Google Business Profiles for Journeys and the Burger
Phase: Visibility
Short Label: Google Profiles
Subtitle: Get control of both profiles, complete every field, and keep them active with a ten-minute weekly routine.

### What We Heard From You

On the coaching call, Conner recommended a separate Google Business Profile for each business, and you found you already had access to the Sasq'ets Burger profile. He asked you to:
- upload photos of the building, the interior and the food
- check the hours, the address, and attributes such as Indigenous-owned
- add the booking link
- block out about ten minutes a week to reply to reviews, positive and negative

You were not sure whether a profile exists for the tours. You also said you liked the idea of guests booking directly from Google search.

### What This Is

The work comes in three parts. First, find out which profiles exist and who controls them. Second, fill in every field on both profiles, including the links that let people book a tour or order food straight from Google. Third, set up a short weekly routine: reply to reviews, ask for new ones, and post twice a month.

### Why It Matters

A visitor in Harrison Hot Springs who searches "Indigenous tour near Harrison" or "café Agassiz" sees Google Maps results before any website. The digital assessment found zero Google reviews on the Development Corporation's profile and called it the biggest barrier to bookings in the whole report. Whatever is true of the Journeys and Burger profiles, an incomplete profile or one with unanswered reviews costs bookings quietly, and you never see who looked and left. This tactic costs nothing but time, and most of it is done once.

### Implementation Steps

#### Part A: Get Control of Both Profiles

1. **Find out which profiles exist and who owns them.** *(about 30 minutes)*
   - Go to business.google.com, signed in with your work Google account, and write down every profile you can manage.
   - Then search Google Maps for "Sasq'ets Journeys", "Sasq'ets Burger", "Sts'ailes tours" and "Sasq'ets Lodge". Note any listing you cannot manage, and any old or duplicate listing, such as the former B&B.
   - If a profile exists but you do not manage it, open it on Google Maps, click **Own this business?** or **Claim this business**, and follow the steps to request access. Google notifies the current owner. Ask JJ whether a former coordinator set it up, since they may simply be able to add you.
   - For each profile, note who owns it, who manages it, the number of reviews and the star rating. These go into the baseline from Tactic 1, Step 11.

2. **Create and verify the Sasq'ets Journeys profile if none exists.** *(about 30 minutes, then waiting for verification)*
   - Go to business.google.com/create. Use the exact business name, "Sasq'ets Journeys", with no extra keywords. Google can suspend profiles that stuff keywords into the name.
   - Primary category: **Tour operator**. Add **Boat tour agency** as a secondary category, plus any other close match Google suggests.
   - Use the tourism hub address listed on your website: 16300 Morris Valley Rd, Agassiz, BC V0M 1A1. Add the website, sasqetsjourneys.com, and the tours phone number. `[CONFIRM: phone number for tour bookings]`
   - Two businesses can share an address on Google when they are genuinely separate. Verification is often done with a short video showing the business's signage and where guests meet, so make sure some Sasq'ets Journeys sign is visible at the hub. `[CONFIRM: Sasq'ets Journeys signage at the hub]`
   - Start this in Week 2. Verification can take several days, and nothing else on this profile can go live until it is done.

#### Part B: Complete Both Profiles

3. **Complete the Sasq'ets Burger profile.** *(about 45 minutes)*
   - Search "Sasq'ets Burger" on Google while signed in and click **Edit profile**.
   - **Categories:** choose a primary category that matches how you want to be found, such as **Hamburger restaurant** or **Café**. Add **Caterer** as a secondary category, and a venue category if Google offers one that fits the meeting room and dining hall. `[CONFIRM: preferred primary category]`
   - **Hours:** enter the café's real hours, and add holiday hours under **Special hours** before each holiday.
   - **Description:** about 600 characters. Cover that it is Indigenous-owned, the setting by the forest and the river, catering for events of any size, the 250-seat dining hall and the meeting room.
   - **Attributes:** under the attributes section, select **Identifies as Indigenous-owned** if Google offers it for your category. Also select dine-in, takeout and free Wi-Fi, since the café page already mentions free wireless internet.
   - **Photos:** add 10 to 15, including:
     - the building from the road, so first-time visitors recognize it on arrival
     - the interior, the dining hall and the meeting room
     - your five best dishes, for example the Sasq'ets Burger, the Sasq'ets Bowl, the wings, the Crispy Thai Wrap and the bannock dessert

4. **Complete the Sasq'ets Journeys profile.** *(about 45 minutes, once verified)*
   - **Description:** about 600 characters. Say that the tours are Indigenous-led, name the Harrison and Chehalis rivers, the pictographs and village sites, the tour types and durations, and state the season plainly.
   - **Hours:** if someone answers the phone or email year-round, enter those hours. In the off-season, do not mark the business "Temporarily closed". That label tells searchers not to bother, and gift cards and spring bookings are still for sale. Put the season in the description instead.
   - **Services:** add each tour with its duration and starting price, so searchers can compare before they click. `[CONFIRM: current price for each tour]`
   - **Photos:** add 10 to 15, including the boat on the river, guides with guests, the land tour and the kayaks. Only show pictographs or cultural sites the cultural ambassador has approved for sharing (see Tactic 3, Step 4).

5. **Add the booking, order and menu links.** *(about 20 minutes)*
   - **Sasq'ets Journeys:** on Google Search, find your profile and select **Booking**, then **Add link**. On Google Maps, the route is **Edit profile**, then **Booking**. Paste your Rezgo address with a tracking tag so the visits show up in GA4, then mark it as the preferred link. For example:
     `https://sasqets.rezgo.com/?utm_source=google&utm_medium=organic&utm_campaign=gbp`
   - **Sasq'ets Burger:** in **Edit profile**, find the menu and food ordering link fields. Google shows them in slightly different places depending on the category. Link the order field to your Square Online ordering page, and the menu field to the menu on the new Burger site once it is live.
   - Email Rezgo's customer success team and ask whether your plan includes their Google Things to Do connection. That connection can show your tours with a booking button in Google's Things to Do results, alongside your profile. `[CONFIRM: whether Google Things to Do is included in the Rezgo plan]`
   - The coaching call also mentioned a booking link for the lodge. It is outside this plan, but the same step applies if JJ wants it done.

#### Part C: The Ten-Minute Weekly Routine

6. **Reply to every review.** *(about 10 minutes a week)*
   - Start by replying to every existing review on the Burger profile. After that, pick one day a week, block ten minutes in your calendar, and reply to anything new.
   - In business.google.com, open **Reviews** to see everything waiting for a reply. Turn on review notifications so new ones reach your email.
   - Reply to positive reviews by thanking the person by name, mentioning one specific thing they said, and inviting them back or suggesting the tours.
   - Reply to negative reviews by thanking them, acknowledging the problem without arguing, and offering to continue the conversation by email at sasqetsbasket@stsailes.com or journeys@stsailes.com. Keep it short and calm. Future guests read your reply more closely than the complaint.
   - Never offer a discount or reward in exchange for a review. Google's policies prohibit it.

7. **Start asking for reviews.** *(about 45 minutes once, then a few minutes a week)*
   - On Google Search, find each profile and select **Ask for reviews** (or **Get more reviews**) to copy its review link.
   - **Café:** print a small QR code card for the till and the tables, with one line: "Enjoyed your meal? A Google review helps us more than you know."
   - **Tours:**
     - Add the Journeys review link to Rezgo's post-tour email, using Rezgo's notifications settings. `[CONFIRM: whether Rezgo currently sends a post-tour email]`
     - Ask the guides to mention reviews at the end of each tour. A personal ask works far better than an email alone.
     - Send one email now to guests from the past season, from Rezgo's contacts, thanking them and asking for a review. It is the fastest way to give the new profile its first reviews in the off-season.

8. **Post to each profile twice a month.** *(about 15 minutes each)*
   - On Google Search, find your profile and select **Add update**. Add one photo and two or three sentences, with a button linking to the booking or ordering page.
   - Reuse what you are already posting on social media from Tactic 3. Good topics:
     - the gift card in December
     - catering for holiday events
     - a dish of the week
     - "spring tour dates now open"
   - Regular updates keep the profile looking active to searchers and to Google.

### Success Metrics

| Metric | 30 Days | 60 Days | 90 Days |
|---|---|---|---|
| Profiles under your control | All existing profiles found; access requested where needed | Journeys and Burger both verified and managed by you | Both managed by you and a second person JJ names |
| Profile completeness | Burger hours, categories and attributes correct | Both profiles have descriptions, 10 or more photos and booking or order links | Both fully complete, including services and menu |
| Reviews with a reply | All existing Burger reviews replied to | 100% replied within 7 days | 100% replied within 7 days |
| New Google reviews, Sasq'ets Burger | Baseline recorded `[CONFIRM: current review count]` | 5 new | 10 new |
| New Google reviews, Sasq'ets Journeys | Past-guest email sent | 3 or more | 5 or more |
| Booking and website clicks from the profiles | Baseline from each profile's Performance tab | Rising month on month | Rezgo visits tagged `utm_source=google` appearing in GA4 |

### Tips

- If you only have ten minutes this week, spend them on review replies. It is the one task here that both Google and future guests notice.
- Keep the two profiles separate in everything: separate photos, separate descriptions, separate review links. A guest who reviews the café on the tours profile confuses both.
- When verification asks for a video, film in daylight. Show the sign, the door and something that only the business would have, such as the boat or the kitchen.
- Save one reply for a positive review and one for a negative review in a note on your phone, then personalize the first line each time.

### Resources

- [Google Business Profile Help: Add links to your Business Profile](https://support.google.com/business/answer/6218037): official steps for booking, menu and order links.
- [Rezgo: How to connect Rezgo to Google Things to Do](https://support.rezgo.com/kb/how-to-connect-rezgo-to-google-things-to-do/): how to request the Things to Do connection.
- [Rezgo: Booking notifications and reviews articles](https://support.rezgo.com/kb/category/bookings-and-inventory/create-and-manage-bookings): where to edit the post-tour email.

---

## Tactic 3: A One-Hour-a-Week Content System
Phase: Content
Short Label: Content & Social
Subtitle: Capture short clips during normal shifts, edit them once a week in Edits, and put the videographer and creator footage to work.

### What We Heard From You

There is no content plan, no one has owned marketing consistently, and you told us capacity and lack of automation are your biggest challenges.

You are already using AI for café posts, posters and specials, but the output feels static. Guests respond to faces: the tour guides, the café staff and the cultural ambassador.

Several sources of footage are lined up or already exist:
- Videographers are due to film a full tour with the cultural ambassador, plus landscape and aerial footage, intended to carry through the new year.
- GoPro footage from the boat tour already exists.
- A food creator reviewed the café on Instagram.

On the call, Conner showed you the free Edits app and suggested short, unscripted clips captured during normal operations rather than staged shoots. JJ wants to know how to get the coming footage out across the right channels without it becoming a second job.

### What This Is

This tactic is a small weekly system. Clips get captured in seconds during normal shifts and tours. Once a week, in one sitting, you edit them into short videos in Edits and schedule them to Facebook and Instagram together. AI helps with ideas, not with writing the posts. The footage you already have or are about to receive carries the tours through the off-season, and creators extend your reach in a way you cannot alone.

### Why It Matters

The assessment found 2,100 Facebook followers with almost no engagement and no regular posting. An account that goes quiet gets shown to fewer people when it starts again, and only consistency rebuilds that. Consistency only happens if the system fits inside an hour a week. The videographer footage is the most valuable marketing asset arriving this year, and without a plan for it, it tends to sit on a hard drive.

### Implementation Steps

#### Part A: Get the Accounts and the Footage in One Place

1. **Audit the social accounts and fix the links.** *(about 45 minutes)*
   - Write down every Facebook Page, Facebook Group and Instagram account connected to the two businesses, and who has admin access to each. The websites currently link to two different Development Corporation Facebook Groups, while the café page links to a separate Sasq'ets Burger Facebook account. `[CONFIRM: list of social accounts for each business]`
   - Each business needs a Facebook Page (not a Group) and an Instagram professional account. Groups cannot run ads or show up properly in search.
   - At business.facebook.com, open **Settings**, then **Accounts**, then **Instagram accounts**, and connect each Instagram account to its Facebook Page. You can then post to both from one place.
   - Add yourself and JJ as admins with your own logins on every account, so no account depends on one person's password.
   - Update the social links on both websites to point to the correct Pages and Instagram accounts.

2. **Gather the footage you already have.** *(about 30 minutes, plus follow-ups)*
   - Create one shared Google Drive folder called "Sasq'ets Content", with two folders inside it, Journeys and Burger. Inside each, make a "Raw" folder and a "Ready" folder.
   - Collect into it:
     - the GoPro boat tour footage
     - any photos from past photographers
     - the café menu photos already on the website
   - Follow up with JJ, as agreed on the call, about:
     - when the videographer footage arrives, and confirming in writing that you can use it on social media and in paid ads
     - whether a photographer is booked, or whether earlier photos can be used
     - the content creator contact JJ passed along `[CONFIRM: videographer footage delivery date and usage rights]`

3. **Set up Edits and build one format for each business.** *(about 45 minutes)*
   - Download Edits, Instagram's free video editing app, from the App Store or Google Play, and sign in with the Instagram account.
   - Build one simple, repeatable format for each business and save it as a draft:
     - **Journeys:** a "river moment" of three or four short clips, one line of on-screen text, and a music track from the app.
     - **Burger:** a "plate in three shots": the order, the cook, the finished plate.
   - Use the same format every week. Repetition is what makes this quick, and audiences come to recognize it.

#### Part B: The One-Hour Weekly Rhythm

4. **Capture clips during normal shifts, with consent and cultural protocol.** *(5 minutes a day across the team)*
   - Ask one café staff member per shift to film one 10-second clip: food coming off the line, a regular saying hello, the room filling at lunch. In season, ask the guides for one clip per tour. Upload everything to the Raw folders.
   - Get verbal consent from anyone recognizable in a clip. As Conner explained, a formal waiver is not needed for most adults. The exception is children: do not film them without a parent's clear permission.
   - Before posting anything showing the pictographs, village sites, songs or stories, ask the cultural ambassador what can be shared publicly and what should stay on the tour. Write the answer down so every staff member follows the same guidance. If a few Halq'eméylem words with pronunciation can be shared, they are some of the most distinctive content you could post. `[CONFIRM: cultural protocol guidance from the cultural ambassador]`

5. **Edit and schedule once a week.** *(45 to 60 minutes a week)*
   - Pick one fixed time a week. Choose two or three clips from the Raw folders and edit them in Edits using your saved formats.
   - Schedule them in Meta Business Suite: open **Planner**, choose a date and time, and select both the Facebook Page and the Instagram account so one post goes to both. This is the automation JJ asked about. One sitting produces a week of posts.
   - Aim for one Burger post and one Journeys post every week. Add a second Burger post when you have time, since the café is open now.
   - Ideas for Journeys in the off-season:
     - videographer clips once they arrive
     - "meet the guides"
     - the gift card in December
     - "spring dates are open" in late winter
   - Copy the week's best post onto the matching Google profile (Tactic 2, Step 8).

6. **Use AI for ideas, not for the posts.** *(15 minutes a month)*
   - Once a month, ask an AI tool for twenty post ideas across these themes: the people, the food, the land and river, the season, and what is coming up. Give it this plan's positioning statement as background.
   - Pick the ideas that fit footage you already have. Write the captions yourself in your own words, or edit AI drafts heavily. Captions that sound like you are what stop posts feeling static.
   - Never use AI-generated images of people, food or cultural content. Real faces are what your guests respond to.

#### Part C: Work With Creators

7. **Turn the burger creator's video into a collaborator post.** *(about 30 minutes)*
   - Message the creator who reviewed the café, thank them, and ask for one of two things: the original video file, or to share a collaborator post with you.
   - In a collaborator post, the post appears on both accounts and counts views and likes for both. To set it up on Instagram, create the post, tap **Tag people**, then **Invite collaborator**, and choose their account (or they choose yours). The other account has to accept.
   - Ask in writing whether you may also use the clip in a paid ad. A direct message is fine. Ads use someone else's content in a way an ordinary post does not.

8. **Write a one-page creator brief for spring.** *(about 45 minutes)*
   - The onboarding session raised micro-influencers with 10,000 to 30,000 followers. They cost less and fit a smaller market better. Write one page that covers:
     - what to feature: the guides' stories, the river, the café
     - what is off-limits under the cultural protocol from Step 4
     - what you need back: one collaborator Reel, plus the raw clips for your own use
     - what you offer: a complimentary tour for two and a meal `[CONFIRM: creator budget beyond a complimentary tour and meal]`
   - Shortlist five Fraser Valley or Vancouver food and travel creators whose audiences are mostly local. Plan their visits for the first weeks of the tour season.
   - JJ asked about paid UGC and AI content platforms. Leave those until this free system has run for a season and you know what your audience responds to.

### Success Metrics

| Metric | 30 Days | 60 Days | 90 Days |
|---|---|---|---|
| Posts per week (both businesses combined) | Accounts audited, links fixed, first batch scheduled | 2 every week | 2 to 3 every week, scheduled a week ahead |
| Short videos made in Edits | 4 | 10 | 16 |
| Content library | Shared folder set up with GoPro and existing photos | Videographer footage stored with written usage rights | 30 or more usable clips across both businesses |
| Facebook engagement | Baseline recorded (assessment: about 0%) | Likes, comments or shares on every post | Engagement visible every week in Business Suite |
| Collaborator and creator content | Creator contacted | First collaborator post live | Spring creator brief written and 5 creators shortlisted |

### Tips

- The best clip is usually the unplanned one. A cook laughing, a guide pointing at an eagle. Do not wait for perfect light.
- Keep phones horizontal for landscapes only. Everything else should be vertical, because that is how people watch Reels.
- If a week gets away from you, post one clip with one line of text rather than nothing. A short post keeps the account active.
- Name files with the date and a word or two, for example "2026-12-03 burger lunch rush". In six months you will be glad you did.

### Resources

- [Edits: Video Editor on the App Store](https://apps.apple.com/us/app/id6738967378): Instagram's free video editing app (search "Edits" from Instagram on Google Play for Android).
- [Meta Business Suite](https://business.facebook.com/): where you schedule posts to Facebook and Instagram together.

---

## Tactic 4: First Paid Tests: Meta for the Burger, Google Ads for the Tours
Phase: Paid Testing
Short Label: Google & Meta Ads
Subtitle: Run a small, measured Meta test for the café now, and build the Google Ads tour campaign so it is ready to switch on in spring.

### What We Heard From You

Neither business is running paid ads, and you told us you want ads that work, more qualified bookings and better tracking. On the call, Conner recommended:
- **Tours:** start with Google Ads, using phrases like "Indigenous-led tour near Harrison", because visitors already in the area search for things to do.
- **Café:** use Meta ads on Facebook and Instagram, where food sells visually and you can target a local area.

In onboarding, learning to A/B test Meta ads came up as a priority.

### What This Is

There are two small ad efforts here. The café gets a three-week Meta test, aimed at the area around the café and the nearby communities, with two versions of the ad running side by side so you learn which one works. The tours get a Google Ads search campaign that you build and test now, and keep paused until spring bookings open.

### Why It Matters

Ad money spent before the booking path works is wasted, which is why this comes last. The café is open now, so a small test teaches you how Meta ads work, and what your audience responds to, while the stakes are low. Tour ads in the off-season would spend money on people who cannot book for months. A campaign built now means that in spring, launching is a single switch rather than another project.

### Implementation Steps

#### Part A: Before Any Money Is Spent

1. **Agree the test budget with JJ.** *(one conversation)*
   - As a starting point, propose:
     - **Café Meta test:** $10 a day for 21 days, about $210.
     - **Tour Google Ads:** $10 to $20 a day once the season opens.
   - Decide who pays and on which card. Make sure both ad accounts belong to the corporation, not to a person. `[CONFIRM: approved ad budget for the café test and the spring tour campaign]`
   - Agree on what counts as success before you start, so the result is a decision rather than a debate. Step 5 suggests how.

2. **Set up the Meta ad account.** *(about 30 minutes)*
   - In business.facebook.com, open **Settings**. Under **Accounts**, choose **Ad accounts**, then **Add**, then **Create a new ad account**. Set the currency to CAD and the time zone to Pacific.
   - Add the payment method JJ approved.
   - Connect the Sasq'ets Burger Facebook Page, its Instagram account, and the Burger pixel from Tactic 1, Step 10 to this ad account.

#### Part B: A Three-Week Meta Test for Sasq'ets Burger

3. **Build the café campaign.** *(about 45 minutes)*
   - Go to adsmanager.facebook.com and click **Create**. Choose the **Traffic** objective, with the new Sasq'ets Burger website as the destination. The pixel there lets you see what people do after they click.
   - **Location:** drop a pin on 16300 Morris Valley Rd and set a radius of about 30 km. That covers Agassiz, Harrison Hot Springs, Harrison Mills, and the three nearby communities identified in onboarding. Check on the map that each community is inside the circle. `[CONFIRM: names of the three nearby communities, to check they fall inside the radius]`
   - Target by location only, never by ethnicity or background.
   - **Audience:** age 18 and over. Leave placements on **Advantage+ placements**.
   - **Budget and schedule:** set the agreed daily budget, with a 21-day schedule and an end date so nothing runs on by accident.

4. **Run two ads against each other.** *(about 30 minutes)*
   - Put two ads in the same ad set, with the same text and the same link. Change only the video:
     - **Ad A:** a food video, the "plate in three shots" format.
     - **Ad B:** a staff face video, a cook or server saying hello.
   - Onboarding suggested guests respond to faces. This test finds out whether that holds for the café.
   - After 7 days, compare **cost per link click** and **click-through rate**. Pause the weaker ad and add a new challenger against the winner, for example a catering ad aimed at holiday events and staff lunches.
   - This simple side-by-side test is enough at this budget. Meta's formal A/B test tool needs more spend before its results mean much.

5. **Read the results every week.** *(about 15 minutes a week)*
   - In Ads Manager, look at reach, link clicks, cost per link click and click-through rate.
   - In GA4, open the Burger property and check visits from Facebook and Instagram.
   - In Square, check online orders.
   - At the till, keep a simple tally sheet: "How did you hear about us?" It is the only way to see ad-driven visits from people who come in without ordering online.
   - At day 21, decide with JJ:
     - If orders, visits or "saw it on Facebook" answers rose, keep running at the same budget.
     - If not, change the offer or the video before spending more.

#### Part C: Google Ads for the Tours, Built Now and Launched in Spring

6. **Create the Google Ads account and connect conversions.** *(about 45 minutes)*
   - Go to ads.google.com and sign in with the corporation's Google account. When asked for your main advertising goal, click **Switch to Expert Mode** at the bottom of the screen. Expert Mode gives you full control over keywords and spend, which the automatic Smart campaigns do not. Create the account without a campaign.
   - Link GA4 to Google Ads: in GA4, open **Admin**, then **Product links**, then **Google Ads links**, and click **Link**.
   - Import the Rezgo booking as your conversion: in Google Ads, open **Goals**, then **Conversions**, then **Summary**, then **+ New conversion action**, then **Import**, then **Google Analytics 4 properties**, then **Web**, and choose **purchase**.

7. **Build one search campaign.** *(about 60 minutes)*
   - Choose **Search**, aim it at sales or website traffic, and target the Lower Mainland and the Fraser Valley. Under location options, choose **people in or regularly in** your targeted locations.
   - Build two ad groups, using phrase match (quotation marks):
     - **Indigenous tours:** "indigenous tour harrison", "indigenous tours bc", "first nations tour fraser valley", "indigenous cultural tour near vancouver"
     - **Boat tours:** "harrison river boat tour", "jet boat tour harrison", "boat tour harrison hot springs", "pictographs tour"
   - Add negative keywords: jobs, careers, free, rental, hotel. Do not bid on other operators' business names.
   - Write one responsive search ad per ad group, linking to the matching section of your new Tours page. Headline ideas (each under 30 characters):
     - Indigenous-Led River Tours
     - See Ancient Pictographs
     - Harrison & Chehalis Rivers
     - Stories From Sts'ailes Guides
     - 2 and 4 Hour Boat Journeys
   - Set the agreed daily budget.

8. **Keep the campaign paused and set the launch checklist.** *(about 30 minutes)*
   - Leave the campaign **Paused**. Write a launch date in your calendar for when spring dates open in Rezgo. `[CONFIRM: date spring tour bookings open in Rezgo]`
   - Launch only when everything on this checklist is true:
     - spring dates are loaded in Rezgo
     - prices show on the Tours page
     - every Book button has been tested that week
     - the purchase conversion shows as recording in Google Ads
   - If eagle viewing tours run in winter, the boat tours ad group could launch earlier, pointed at that tour only. `[CONFIRM: whether winter eagle viewing tours operate]`
   - Once live, spend ten minutes a week in **Insights and reports**, then **Search terms**. Add any irrelevant searches as negative keywords.
   - Write a one-page "how our ads run" note covering logins, budgets, the weekly check and the decision rule, so the work can pass to a co-op student, as JJ wants.

### Success Metrics

| Metric | 30 Days | 60 Days | 90 Days |
|---|---|---|---|
| Café Meta test | Budget agreed with JJ | Ad account set up and connected to the pixel | 21-day test complete, two ads compared, decision made |
| Café ad performance | n/a | Baseline cost per link click recorded in week 1 of the test | Winning ad's cost per link click lower than week 1 |
| Café results you can see | Tally sheet at the till | n/a | 10 or more customers answering Facebook or Instagram |
| Google Ads tour campaign | n/a | Account created in Expert Mode; GA4 linked | Campaign built, purchase conversion imported, launch checklist written |
| Tour bookings from Google Ads | n/a | n/a | Launch date set for spring; first results measured after launch |

### Tips

- Set an end date on every Meta campaign. An ad left running past its test is the most common way small budgets go missing.
- Judge an ad after a week, not after a day. Small budgets bounce around for the first few days.
- Point Google Ads at your own Tours page, not straight at Rezgo. The page gives searchers context first, and the Book button takes them to Rezgo from there.
- If the Viator account is restored, it will take bookings too. Commission on a booking is better than no booking. Your Google Ads should still send people to your own site, where there is no commission.

### Resources

- [Meta Ads Manager](https://adsmanager.facebook.com/): where the café campaign is built and read.
- [Google Ads](https://ads.google.com/): where the tour campaign is built.
- [Rezgo: GA4, Google Ads and Meta tracking recipe](https://support.rezgo.com/kb/rezgo-enhanced-ecommerce-complete-tracking-setup/): the more precise tracking setup, for later or for a co-op student.

---

## Objectives

### Objective 1
Title: Make Both Websites Take a Booking
Description: Repair every broken tour button, replace the template Tour Calendar page, move Sasq'ets Burger to its own domain, and install GA4 and the Meta Pixel on both sites and in Rezgo.
Tactic Pill: Tactic 1 · Weeks 1-5

### Objective 2
Title: Own and Complete Both Google Profiles
Description: Take control of the Sasq'ets Journeys and Sasq'ets Burger profiles, fill in every field and link, and keep them active with a ten-minute weekly review and posting routine.
Tactic Pill: Tactic 2 · Weeks 1-8

### Objective 3
Title: Post Every Week in an Hour or Less
Description: Capture short clips during normal shifts, edit them once a week in Edits, schedule to Facebook and Instagram together, and put the videographer and creator footage to work.
Tactic Pill: Tactic 3 · Weeks 7-12

### Objective 4
Title: Test Ads for the Café, Ready Ads for the Tours
Description: Run a measured three-week Meta test for Sasq'ets Burger, and build the Google Ads tour campaign so it is ready to switch on when spring bookings open.
Tactic Pill: Tactic 4 · Weeks 8-12

---

## 90-Day Roadmap

Month 1 Name: Fix the Paths
Month 2 Name: Get Found
Month 3 Name: Test and Get Ready for Spring

### Week 1: Fix the Tour Buttons
**Actions:**
- Replace the broken Book Boat Tour link and point every tour button at its own Rezgo page → links to: Tactic 1 / Step 1
- Change the kayak button to an email link to journeys@stsailes.com → links to: Tactic 1 / Step 1
- Connect Google Drive storage to the newsletter block and fix the Request Information link → links to: Tactic 1 / Step 3
- Email JJ about the Burger domain and the Squarespace plan cost → links to: Tactic 1 / Step 6
- List every Google profile you manage and search Maps for any you do not → links to: Tactic 2 / Step 1

**Checklist:**
- [ ] Every Book button on sasqetsjourneys.com opens a working Rezgo page or an email
- [ ] A test newsletter signup appears in the Google Sheet
- [ ] JJ has the domain and plan cost question in writing
- [ ] A written list shows which Google profiles exist and who owns each one

### Week 2: Replace the Template Page
**Actions:**
- Delete the template bike tours and rebuild the Tours page with your real tours, prices and season → links to: Tactic 1 / Step 2
- Decide which tours are offered and update the FAQ to match → links to: Tactic 1 / Step 2
- Write the SEO titles and descriptions for the homepage and Tours page → links to: Tactic 1 / Step 4
- Create the Sasq'ets Journeys Google profile and start verification if none exists → links to: Tactic 2 / Step 2

**Checklist:**
- [ ] No sample bike tours remain anywhere on sasqetsjourneys.com
- [ ] The FAQ and the Tours page list the same tours
- [ ] Both pages have an SEO title and description saved
- [ ] The Journeys profile is created or claimed and verification has been requested

### Week 3: Turn On Measurement
**Actions:**
- Create the GA4 properties and add the IDs to the Journeys site and to Rezgo → links to: Tactic 1 / Step 9
- Add sasqetsjourneys.com and sasqets.rezgo.com under Configure your domains in GA4 → links to: Tactic 1 / Step 9
- Create the Business portfolio and both Meta pixels, and add the Journeys pixel to Squarespace and Rezgo → links to: Tactic 1 / Step 10
- Tap through every path on your phone and write the one-page baseline → links to: Tactic 1 / Step 11

**Checklist:**
- [ ] GA4 Realtime shows your own visit on sasqetsjourneys.com
- [ ] The Rezgo Analytics settings hold the Journeys GA4 ID
- [ ] The Meta Pixel & Ads panel shows a green status on the Journeys site
- [ ] The baseline page is saved in the shared folder and sent to Junction

### Week 4: Gift Cards and the Burger Copy
**Actions:**
- Confirm Rezgo gift cards are on sale and add a Give a Tour button to the homepage and Tours page → links to: Tactic 1 / Step 5
- Register the Burger domain under the corporation's account once JJ approves → links to: Tactic 1 / Step 6
- Duplicate the Development Corporation site and trim the copy to the Burger page → links to: Tactic 1 / Step 7

**Checklist:**
- [ ] A gift card can be bought from sasqets.rezgo.com on a phone
- [ ] The Burger domain is registered and its login is stored where JJ can reach it
- [ ] The trial copy contains only the Burger page, set as the homepage

### Week 5: The Burger Site Goes Live
**Actions:**
- Fix the hours, the email typo, the order button and the SEO title on the new Burger site → links to: Tactic 1 / Step 7
- Subscribe, connect the domain, and redirect the old Burger page → links to: Tactic 1 / Step 8
- Add the Burger GA4 ID and Burger pixel to the new site → links to: Tactic 1 / Step 9
- Complete the Sasq'ets Burger Google profile with hours, categories, attributes and photos → links to: Tactic 2 / Step 3

**Checklist:**
- [ ] The new domain loads the Sasq'ets Burger site on a phone
- [ ] stsailesdevcorp.com/sasqetsburger redirects to the new domain
- [ ] GA4 Realtime shows a visit on the Burger site
- [ ] The Burger profile shows the café's real hours and 10 or more photos

### Week 6: Both Profiles Complete
**Actions:**
- Complete the Journeys profile with a description, photos, services and season → links to: Tactic 2 / Step 4
- Add the Rezgo booking link with its tracking tag to Journeys, and the order and menu links to the Burger profile → links to: Tactic 2 / Step 5
- Ask Rezgo whether your plan includes the Google Things to Do connection → links to: Tactic 2 / Step 5

**Checklist:**
- [ ] The Journeys profile shows a Booking link that opens Rezgo
- [ ] The Burger profile shows working order and menu links
- [ ] Rezgo's answer about Google Things to Do is recorded

### Week 7: Reviews and Accounts
**Actions:**
- Reply to every existing Google review on both profiles → links to: Tactic 2 / Step 6
- Print the café QR review card, add the review link to Rezgo's post-tour email, and email last season's guests → links to: Tactic 2 / Step 7
- Audit every social account, connect Instagram to Facebook, and fix the social links on both sites → links to: Tactic 3 / Step 1

**Checklist:**
- [ ] No review on either profile is without a reply
- [ ] The QR review card is at the café till
- [ ] The past-guest review email has been sent
- [ ] Each business has one Facebook Page and one Instagram account, both with two admins

### Week 8: Build the Content Library
**Actions:**
- Set up the shared Sasq'ets Content folder and gather the GoPro footage and existing photos → links to: Tactic 3 / Step 2
- Follow up with JJ on videographer footage and usage rights → links to: Tactic 3 / Step 2
- Install Edits and build one format for each business → links to: Tactic 3 / Step 3
- Publish the first update on each Google profile → links to: Tactic 2 / Step 8
- Agree the café test budget and the spring tour budget with JJ → links to: Tactic 4 / Step 1

**Checklist:**
- [ ] The shared folder holds the GoPro footage in Journeys/Raw
- [ ] One draft Edits format exists for each business
- [ ] Each Google profile shows at least one update
- [ ] The ad budget is approved in writing

### Week 9: The First Weekly Batch
**Actions:**
- Brief café staff on one clip per shift and on verbal consent, and ask the cultural ambassador for sharing guidance → links to: Tactic 3 / Step 4
- Hold the first weekly editing session and schedule a week of posts in Business Suite → links to: Tactic 3 / Step 5
- Run the first monthly AI ideas session → links to: Tactic 3 / Step 6
- Create the Meta ad account and connect the Burger Page, Instagram account and pixel → links to: Tactic 4 / Step 2

**Checklist:**
- [ ] Clips from at least three café shifts are in Burger/Raw
- [ ] Cultural sharing guidance is written down
- [ ] Two posts are scheduled to both Facebook and Instagram
- [ ] The Meta ad account exists with a payment method and the pixel attached

### Week 10: The Café Ad Test Goes Live
**Actions:**
- Build the café Traffic campaign with a 30 km radius and a 21-day end date → links to: Tactic 4 / Step 3
- Launch Ad A (food) and Ad B (staff face) side by side → links to: Tactic 4 / Step 4
- Ask the burger creator for the original file or a collaborator post → links to: Tactic 3 / Step 7
- Hold this week's editing session → links to: Tactic 3 / Step 5

**Checklist:**
- [ ] Both café ads are approved and delivering
- [ ] The campaign has an end date set
- [ ] The tally sheet is at the till
- [ ] The creator has been contacted

### Week 11: Build the Google Ads Campaign, Paused
**Actions:**
- Create the Google Ads account in Expert Mode, link GA4, and import the purchase conversion → links to: Tactic 4 / Step 6
- Build the search campaign with two ad groups and leave it paused → links to: Tactic 4 / Step 7
- Read week one of the café test, pause the weaker ad, and add a challenger → links to: Tactic 4 / Step 4
- Hold this week's editing session → links to: Tactic 3 / Step 5

**Checklist:**
- [ ] The Google Ads account shows purchase as an imported conversion
- [ ] The campaign is built and set to Paused
- [ ] The weaker café ad is paused and a new challenger is running

### Week 12: Review and Hand Off to Spring
**Actions:**
- Write the Google Ads launch checklist and put the launch date in your calendar → links to: Tactic 4 / Step 8
- Review the café test results with JJ and decide what happens next → links to: Tactic 4 / Step 5
- Write the spring creator brief and shortlist five creators → links to: Tactic 3 / Step 8
- Compare this week's numbers against the Week 3 baseline and send the comparison to Junction

**Checklist:**
- [ ] The launch checklist and launch date are written down
- [ ] A decision on the café ads is recorded
- [ ] The creator brief and shortlist are saved in the shared folder
- [ ] The 90-day comparison has been sent to Junction

---

## GBP Quick Wins

These are small jobs that take under an hour, and none of them needs to wait for anything else in the plan.

### On the Google Business Profiles

- **Add tracking tags to the website links.** In each profile's website field, add `?utm_source=google&utm_medium=organic&utm_campaign=gbp` to the end of the address, so GA4 can separate profile visits from ordinary Google searches.
- **Upload a logo and a cover photo to each profile.** Use the Sasq'ets Journeys logo on the tours profile and the Sasq'ets Burger logo on the café, so the two are never confused in search results.
- **Clean up outdated listings.** If your search in Tactic 2 turns up an old listing that no longer operates under that name, such as the former B&B, use **Suggest an edit** on Google Maps to mark it closed or merge it. That way travellers do not land on a dead listing.
- **Add the café's top dishes with photos.** Add a few of your most popular items, with a photo and price, so people searching on their phones can see what they would order.

### On the Websites

- **Put a tap-to-call phone number on Sasq'ets Journeys.** The tours site lists email addresses but no phone number. Add one to the header and footer as a tap-to-call link. `[CONFIRM: phone number for tour bookings]`
- **Fix the email typo on the current Burger page now.** The first booking email link points to `sasqetsbasket@stailes.com`. Fix it today rather than waiting for the move in Tactic 1.
- **Label the online ordering link.** On the current Burger page, replace the bare `https://sasqets.square.site` address with a button that says "Order Takeout Online".
- **Correct the kayak tour description.** The kayak tour is headed "Chehalis River" but the text says "Paddle the calm waters of the Harrison River". Make them match.
- **Give the homepage banner image a real description.** The banner on sasqetsjourneys.com shows its file name, DJI_0767.JPG, where a description should be. Click the image, open its settings, and replace the file name with a short description, such as "Jet boat on the Chehalis River in Sts'ailes territory".
- **Hide the empty shopping cart icon.** The Journeys header shows a cart with "0" items, though the site sells nothing directly. In the editor, open **Edit Site Header**, then **Elements**, and turn off **Cart**.

### One Thing Worth Watching

You raised a concern that Sasq'ets Burger is drifting from its original Indigenous-focused concept because of what the local market asks for, and Conner will come back to it in the next session. The café ad test in Tactic 4 can help answer it: if the staff face ad wins and visitors respond to the café's identity, that is evidence for leaning back in. Keep the tally sheet answers and the ad results together for that conversation.
