# Assessment Methodology Analysis & Recommendations

**Analysis Date:** August 2026
**Prepared for:** Junction Accelerator Generator
**Objective:** Evaluate and improve the digital presence assessment methodology for accuracy, consistency, and objectivity

---

## Executive Summary

The current assessment system combines **verified data sources** with **AI-generated scoring**, resulting in assessments that are informative but **not reproducible or defensible**. The core issue is that scoring is entirely delegated to Claude with no deterministic algorithm, meaning two assessments of the same business could produce different scores.

**Critical Finding:** The system collects excellent data but lacks a scoring engine that translates data into grades algorithmically.

---

## Part 1: Current Methodology Analysis

### 1.1 Data Collection Architecture

The system collects data from 5 sources:

| Source | Data Type | Reliability | Current Usage |
|--------|-----------|-------------|---------------|
| **SEOptimer API** | Technical SEO metrics | High (API-verified) | Passed to Claude for interpretation |
| **Google Places API** | Reviews, ratings, business info | High (API-verified) | Passed to Claude for interpretation |
| **Website Scraping** | Content signals (booking, phone, hours) | Medium (binary detection) | Passed to Claude for interpretation |
| **SociaVault API** | Social metrics (followers, engagement) | High (API-verified) | Passed to Claude for interpretation |
| **Claude AI** | Score generation | Variable (non-deterministic) | Primary scoring engine |

**Key Observation:** All verified data is funneled into Claude, which generates subjective scores. This creates a bottleneck where objective data becomes subjective output.

### 1.2 Current Scoring Structure

**6 Categories with Defined Weights:**
```
Website & Technical Foundation:  15%
Reviews & Reputation:            25%
Online Booking & Conversion:     20%
Social Media & Content:          20%
Digital Guest Experience:        10%
Local Visibility:                10%
                                ────
                                100%
```

**Grade Scale:**
- A+ (95-100), A (90-94), A- (87-89)
- B+ (83-86), B (80-82), B- (77-79)
- C+ (73-76), C (70-72), C- (67-69)
- D+ (63-66), D (60-62), D- (57-59)
- F (below 57)

### 1.3 Current QA Validation

The `validateAssessmentQuality()` function checks:
- Fabricated review data (metrics without Google data source)
- Missing time estimates on recommendations
- Overall score deviation from category average (>20 points flagged)
- Empty categories (no metrics or recommendations)

**Assessment:** QA is minimal and focuses on structural validation, not scoring accuracy.

---

## Part 2: Critical Weaknesses

### 2.1 CRITICAL: Non-Deterministic Scoring

**Problem:** Claude generates all scores based on contextual interpretation. The same input data can produce different scores across runs.

**Evidence:** The prompt instructs Claude to "Calculate overall score using these exact weights" but provides no rubric for what score to assign to each metric. Claude must infer:
- What Google rating deserves an "A" vs "B"?
- How many reviews constitute "good" vs "excellent"?
- What page load time is acceptable?

**Impact:**
- Assessments are not reproducible
- Cannot defend scores to skeptical clients
- No basis for tracking improvement over time
- Impossible to audit or calibrate

### 2.2 HIGH: No Normalized Scoring Rubrics

**Problem:** The prompt mentions benchmarks (e.g., "Tourism average: 50-60") but these are not enforced algorithmically.

**Example from code:**
```javascript
"benchmark": "Tourism businesses: 4.0 acceptable, 4.5+ excellent"
```

But there's no code that actually maps:
- 4.0 rating → Score of 70
- 4.5 rating → Score of 85
- 4.8+ rating → Score of 95

**Impact:** Benchmarks are suggestions to Claude, not rules.

### 2.3 HIGH: Missing Data Scoring Ambiguity

**Problem:** When data sources fail (e.g., no Google Places data), there's no defined scoring policy.

**Current behavior:**
- Claude is told to say "Manual verification recommended"
- But Claude still assigns a category score
- No guidance on what score to assign with missing data

**Impact:** A business with no Google data might score 50% in Reviews, or 30%, or 70% - it's undefined.

### 2.4 MEDIUM: Binary Website Analysis

**Problem:** Website signals are detected as yes/no but quality isn't assessed.

**Example:**
```javascript
hasPhone: detectPhone(html)  // Returns true/false
```

This doesn't distinguish between:
- Phone prominently in header (excellent)
- Phone buried in footer (acceptable)
- Phone only on contact page (poor)
- Phone in an image, not clickable (very poor)

**Impact:** Binary signals create false equivalences.

### 2.5 MEDIUM: Unverified Industry Benchmarks

**Problem:** The prompt claims specific benchmarks with no citation:
- "Tourism average: 50-60 for mobile performance"
- "100+ reviews builds trust, 200+ establishes authority"
- "1-3% engagement is average, 3-6% is good, 6%+ is excellent"

**Impact:** Clients may challenge benchmarks, and there's no data to support them.

### 2.6 MEDIUM: No Temporal Consistency

**Problem:** The model version and behavior may change over time (Claude updates), causing scoring drift.

**Impact:** Assessments from January 2026 may not be comparable to assessments from August 2026.

### 2.7 LOW: Weight Calculation Not Verified

**Problem:** Claude is asked to calculate weighted scores, but the QA only flags >20 point deviations.

**Impact:** Weights might be applied incorrectly without detection.

---

## Part 3: Recommendations for Consistent, Defensible Scoring

### 3.1 IMPLEMENT: Deterministic Scoring Engine

**Recommendation:** Create a server-side scoring function that calculates scores algorithmically before passing to Claude.

**Architecture:**
```
Data Sources → Scoring Engine → Scores + Data → Claude → Analysis & Recommendations
```

**Example Implementation:**

```javascript
function calculateCategoryScores(data) {
  const scores = {};

  // REVIEWS & REPUTATION (25% weight)
  if (data.googlePlacesData && !data.googlePlacesData._error) {
    const rating = data.googlePlacesData.rating;
    const reviewCount = data.googlePlacesData.totalReviews;

    // Rating score (0-100 scale)
    // 4.8+ = 95, 4.5-4.7 = 85, 4.2-4.4 = 75, 4.0-4.1 = 65, <4.0 = linear decline
    const ratingScore = calculateRatingScore(rating);

    // Review volume score (0-100 scale)
    // 500+ = 100, 200-499 = 85, 100-199 = 70, 50-99 = 55, <50 = linear
    const volumeScore = calculateVolumeScore(reviewCount);

    // Category score = weighted average of sub-metrics
    scores.reviews_reputation = {
      score: Math.round((ratingScore * 0.6) + (volumeScore * 0.4)),
      confidence: 'high',
      breakdown: { ratingScore, volumeScore }
    };
  } else {
    // Missing data policy: assign 50 with low confidence
    scores.reviews_reputation = {
      score: 50,
      confidence: 'low',
      note: 'Google Places data unavailable - manual verification required'
    };
  }

  // ... similar for other categories
  return scores;
}
```

**Benefits:**
- Reproducible: Same data always produces same score
- Auditable: Can explain exactly why a business scored 72
- Comparable: Can track changes over time
- Defensible: Based on defined thresholds, not AI interpretation

### 3.2 IMPLEMENT: Tiered Scoring Rubrics

**Recommendation:** Define explicit scoring thresholds for every metric.

**Example Rubric for Google Rating:**

| Rating | Score | Rationale |
|--------|-------|-----------|
| 4.9-5.0 | 98-100 | Exceptional - top 1% of tourism businesses |
| 4.7-4.8 | 90-97 | Excellent - highly competitive |
| 4.5-4.6 | 80-89 | Very Good - meets visitor expectations |
| 4.3-4.4 | 70-79 | Good - room for improvement |
| 4.0-4.2 | 60-69 | Acceptable - concerns present |
| 3.5-3.9 | 45-59 | Below average - action required |
| <3.5 | 20-44 | Poor - urgent attention needed |

**Example Rubric for Review Volume (Tourism Business):**

| Count | Score | Rationale |
|-------|-------|-----------|
| 500+ | 100 | Authority status - strong social proof |
| 300-499 | 90 | Established presence |
| 150-299 | 80 | Growing credibility |
| 75-149 | 65 | Developing |
| 30-74 | 50 | Early stage |
| 10-29 | 35 | Limited social proof |
| <10 | 20 | Critical gap |

### 3.3 IMPLEMENT: Confidence-Weighted Scoring

**Recommendation:** Factor data confidence into overall scoring.

```javascript
function calculateWeightedScore(categoryScores) {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [category, data] of Object.entries(categoryScores)) {
    const baseWeight = CATEGORY_WEIGHTS[category];

    // Apply confidence penalty
    const confidenceMultiplier = {
      'high': 1.0,
      'medium': 0.85,
      'low': 0.5
    }[data.confidence];

    const effectiveWeight = baseWeight * confidenceMultiplier;
    weightedSum += data.score * effectiveWeight;
    totalWeight += effectiveWeight;
  }

  // Normalize to account for confidence penalties
  return Math.round(weightedSum / totalWeight);
}
```

### 3.4 IMPLEMENT: Missing Data Policy

**Recommendation:** Define explicit policies for missing data scenarios.

| Scenario | Policy | Score | Display |
|----------|--------|-------|---------|
| No Google Places data | Assign baseline, flag for manual | 50 | "Unverified - manual check required" |
| SEOptimer timeout | Use website scrape signals only | Partial calculation | "Limited technical data" |
| No social media URLs provided | Exclude from calculation | N/A | "Not assessed - no profiles provided" |
| Website unreachable | Critical flag, assign 30 | 30 | "Website inaccessible" |

### 3.5 IMPLEMENT: Sub-Metric Granularity

**Recommendation:** Replace binary signals with quality tiers.

**Current:** `hasPhone: true/false`

**Proposed:**
```javascript
phoneVisibility: {
  score: 85,
  tier: 'good',
  details: {
    inHeader: true,
    clickable: true,
    inFooter: true,
    onContactPage: true,
    formatCorrect: true  // Includes country code, properly formatted
  }
}
```

**Implementation for phone detection:**
```javascript
function assessPhoneQuality(html, htmlLower) {
  const results = {
    found: false,
    locations: [],
    clickable: false,
    score: 0
  };

  // Check for tel: links (clickable)
  const telLinks = html.match(/href=["']tel:[^"']+["']/gi) || [];
  if (telLinks.length > 0) {
    results.found = true;
    results.clickable = true;
    results.score += 30;
  }

  // Check location in DOM
  const headerMatch = html.match(/<header[^>]*>[\s\S]*?<\/header>/i);
  if (headerMatch && detectPhone(headerMatch[0])) {
    results.locations.push('header');
    results.score += 40;
  }

  const footerMatch = html.match(/<footer[^>]*>[\s\S]*?<\/footer>/i);
  if (footerMatch && detectPhone(footerMatch[0])) {
    results.locations.push('footer');
    results.score += 20;
  }

  // Cap at 100
  results.score = Math.min(100, results.score);

  return results;
}
```

### 3.6 REFINE: Claude's Role

**Recommendation:** Shift Claude from scoring to analysis and recommendations.

**Current Claude Prompt Focus:**
- Generate scores for all categories
- Calculate weighted average
- Produce findings and recommendations

**Proposed Claude Prompt Focus:**
- Accept pre-calculated scores as input
- Analyze patterns and anomalies
- Generate human-readable insights
- Produce prioritized, actionable recommendations
- Provide tourism-specific context

**Example revised prompt structure:**
```
## Pre-Calculated Scores (DO NOT MODIFY)
Overall Score: 72/100 (Grade: C+)
- Website Technical: 68/100 (calculated from SEOptimer data)
- Reviews & Reputation: 85/100 (calculated from Google Places)
- Booking & Conversion: 55/100 (calculated from website analysis)
- Social Media: 78/100 (calculated from SociaVault)
- Guest Experience: 70/100 (calculated from website analysis)
- Local Visibility: 62/100 (calculated from combined signals)

## Your Task
Using the scores and raw data above, provide:
1. Executive Summary (interpret what these scores mean for this business)
2. Key Strengths (what's working well)
3. Critical Gaps (what needs immediate attention)
4. Priority Recommendations (specific, actionable tasks)
5. Tourism Context (how this affects visitor discovery and booking)
```

### 3.7 IMPLEMENT: Scoring Audit Trail

**Recommendation:** Store calculation details for every assessment.

```javascript
const auditRecord = {
  assessment_id: uuid(),
  client_slug: slug,
  timestamp: new Date().toISOString(),
  model_version: 'v2.0.0',
  scoring_engine_version: '1.0.0',

  raw_inputs: {
    seoptimer: { /* full response */ },
    google_places: { /* full response */ },
    website_analysis: { /* full response */ },
    sociavault: { /* full response */ }
  },

  calculated_scores: {
    reviews_reputation: {
      final_score: 85,
      sub_metrics: {
        rating: { value: 4.6, score: 87 },
        volume: { value: 234, score: 82 }
      },
      weights_applied: { rating: 0.6, volume: 0.4 },
      confidence: 'high'
    },
    // ... other categories
  },

  overall_calculation: {
    method: 'confidence_weighted_average',
    weights: { reviews: 0.25, website: 0.15, /* ... */ },
    result: 72
  }
};
```

---

## Part 4: Plan to Address Current Limitations

### 4.1 Google Places Data Limitations

**Current Issue:** Google Places matching can fail for new businesses or alternate names.

**Solutions:**

| Priority | Solution | Effort | Impact |
|----------|----------|--------|--------|
| 1 | Fuzzy matching with Levenshtein distance | Medium | High |
| 2 | Location-based search (lat/lng + radius) | Medium | High |
| 3 | Manual override field in admin form | Low | Medium |
| 4 | Multiple search attempts with variations | Low | Medium |

**Implementation - Fuzzy Matching:**
```javascript
async function findGooglePlace(businessName, location, websiteUrl) {
  // Attempt 1: Exact match
  let result = await searchGooglePlaces(`${businessName} ${location}`);
  if (result) return result;

  // Attempt 2: Without location (some businesses don't include city)
  result = await searchGooglePlaces(businessName);
  if (result && verifyDomain(result.website, websiteUrl)) return result;

  // Attempt 3: Domain-based search
  const domain = new URL(websiteUrl).hostname.replace('www.', '');
  result = await searchGooglePlaces(domain);
  if (result) return result;

  // Attempt 4: Nearby search with coordinates (if location provided)
  if (location) {
    const coords = await geocodeLocation(location);
    result = await nearbySearch(coords, businessName);
    if (result) return result;
  }

  return null; // All attempts failed
}
```

### 4.2 Social Media Analytics Limitations

**Current Issue:** No real-time follower counts, limited engagement data.

**Solutions:**

| Priority | Solution | Effort | Impact |
|----------|----------|--------|--------|
| 1 | Integrate SociaVault fully (already started) | Low | High |
| 2 | Add Instagram Graph API for verified pages | Medium | Medium |
| 3 | TikTok Research API integration | Medium | Medium |
| 4 | Cache social data with 24hr refresh | Low | Medium |

**Data Caching Strategy:**
```javascript
async function getSocialMediaData(handles, clientSlug) {
  // Check cache first (24hr TTL)
  const cached = await supabase
    .from('social_media_cache')
    .select('*')
    .eq('client_slug', clientSlug)
    .gt('fetched_at', new Date(Date.now() - 24*60*60*1000).toISOString())
    .single();

  if (cached.data) {
    return { ...cached.data.payload, _cached: true };
  }

  // Fetch fresh data
  const freshData = await fetchSocialMediaData(handles);

  // Store in cache
  await supabase
    .from('social_media_cache')
    .upsert({
      client_slug: clientSlug,
      payload: freshData,
      fetched_at: new Date().toISOString()
    });

  return freshData;
}
```

### 4.3 Email Automation Not Wired

**Current Issue:** Weekly emails designed but not connected.

**Solution:** Implement Supabase Edge Function triggered by cron.

```javascript
// supabase/functions/weekly-progress-email/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async () => {
  const supabase = createClient(/* ... */);

  // Get all active clients with plans
  const { data: clients } = await supabase
    .from('user_plans')
    .select('client_slug, email, cohort_start_date')
    .eq('role', 'client')
    .eq('active', true);

  for (const client of clients) {
    const weekNumber = calculateCurrentWeek(client.cohort_start_date);
    if (weekNumber > 12) continue; // Program complete

    // Get plan.json for this client
    const plan = await fetchPlanJson(client.client_slug);
    const weekData = plan.weeks[weekNumber - 1];

    // Get progress
    const { data: progress } = await supabase
      .from('progress')
      .select('item_key, checked')
      .eq('client_slug', client.client_slug);

    // Calculate completion
    const weekChecks = progress.filter(p =>
      p.item_key.startsWith(`week-${weekNumber}-`)
    );
    const completedCount = weekChecks.filter(p => p.checked).length;
    const totalCount = weekData.checklist.length;

    // Send email via Resend
    await sendWeeklyEmail({
      to: client.email,
      weekNumber,
      weekTitle: weekData.title,
      actions: weekData.actions,
      checklist: weekData.checklist,
      completedCount,
      totalCount,
      deepLink: weekData.deep_link
    });
  }

  return new Response('OK');
});
```

### 4.4 PDF Export Quality

**Current Issue:** Browser print function produces inconsistent results.

**Solutions:**

| Priority | Solution | Effort | Impact |
|----------|----------|--------|--------|
| 1 | Server-side PDF with Puppeteer | Medium | High |
| 2 | Use @react-pdf/renderer for deterministic output | Medium | High |
| 3 | Pre-generate PDF on assessment complete | Medium | High |

**Recommended: Puppeteer-based PDF Generation**

```javascript
// netlify/functions/generate-pdf.js
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function handler(event) {
  const { clientSlug } = JSON.parse(event.body);

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  const page = await browser.newPage();

  // Load the assessment page with print-optimized query param
  await page.goto(
    `https://accelerator.elearningu.com/${clientSlug}/?print=true`,
    { waitUntil: 'networkidle0' }
  );

  // Generate PDF
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
  });

  await browser.close();

  // Store in Supabase Storage or return directly
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${clientSlug}-assessment.pdf"`
    },
    body: pdf.toString('base64'),
    isBase64Encoded: true
  };
}
```

### 4.5 TripAdvisor / Yelp Integration

**Current Issue:** Only Google reviews are automated.

**Solution:** Add TripAdvisor Content API and Yelp Fusion API.

**TripAdvisor Integration:**
```javascript
async function fetchTripAdvisorData(businessName, location) {
  const apiKey = process.env.TRIPADVISOR_API_KEY;

  // Location search
  const searchUrl = `https://api.content.tripadvisor.com/api/v1/location/search?searchQuery=${encodeURIComponent(businessName + ' ' + location)}&key=${apiKey}`;

  const searchResponse = await fetch(searchUrl);
  const searchData = await searchResponse.json();

  if (!searchData.data || searchData.data.length === 0) {
    return null;
  }

  const locationId = searchData.data[0].location_id;

  // Get details
  const detailsUrl = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/details?key=${apiKey}`;
  const detailsResponse = await fetch(detailsUrl);
  const details = await detailsResponse.json();

  // Get reviews
  const reviewsUrl = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/reviews?key=${apiKey}`;
  const reviewsResponse = await fetch(reviewsUrl);
  const reviews = await reviewsResponse.json();

  return {
    rating: parseFloat(details.rating),
    reviewCount: parseInt(details.num_reviews),
    rankingString: details.ranking_data?.ranking_string,
    recentReviews: reviews.data?.slice(0, 5).map(r => ({
      rating: r.rating,
      text: r.text,
      publishedDate: r.published_date
    }))
  };
}
```

---

## Part 5: Implementation Roadmap

### Phase 1: Foundation (Immediate)

| Task | Description | Priority |
|------|-------------|----------|
| Create Scoring Engine | Build deterministic scoring functions | CRITICAL |
| Define All Rubrics | Document thresholds for every metric | CRITICAL |
| Add Audit Trail | Store calculation details | HIGH |
| Refactor Claude Prompt | Shift from scoring to analysis | HIGH |

### Phase 2: Data Quality (Short-term)

| Task | Description | Priority |
|------|-------------|----------|
| Improve Google Matching | Fuzzy search, location-based fallback | HIGH |
| Cache Social Data | 24hr TTL with refresh | MEDIUM |
| Enhanced Website Analysis | Quality tiers instead of binary | MEDIUM |
| Add TripAdvisor API | Secondary review source | MEDIUM |

### Phase 3: User Experience (Medium-term)

| Task | Description | Priority |
|------|-------------|----------|
| Server-side PDF | Puppeteer-based generation | MEDIUM |
| Email Automation | Weekly progress emails | MEDIUM |
| Historical Comparison | Track score changes over time | MEDIUM |
| Benchmark Validation | Research and cite industry benchmarks | LOW |

### Phase 4: Advanced Features (Long-term)

| Task | Description | Priority |
|------|-------------|----------|
| Competitor Analysis | Compare to similar businesses | LOW |
| Predictive Scoring | ML-based improvement predictions | LOW |
| Real-time Monitoring | Webhook-based score updates | LOW |
| White-label Support | Multi-tenant customization | LOW |

---

## Part 6: Success Metrics

### Scoring Consistency
- **Target:** Same input produces identical scores 100% of the time
- **Measure:** Run same business through assessment 10 times, calculate variance
- **Acceptable:** Zero variance (deterministic)

### Score Defensibility
- **Target:** Every score can be explained with specific data points
- **Measure:** % of scores with complete audit trail
- **Acceptable:** 100%

### Data Coverage
- **Target:** Maximize verified data availability
- **Measure:** % of assessments with high-confidence scores in all categories
- **Acceptable:** >80%

### User Trust
- **Target:** Users understand and accept their scores
- **Measure:** Survey NPS on assessment fairness
- **Acceptable:** NPS > 40

---

## Appendix A: Proposed Scoring Rubrics (Full)

### A.1 Website Technical (15% weight)

| Metric | Weight | Scoring Logic |
|--------|--------|---------------|
| Page Speed (Desktop) | 25% | SEOptimer score direct (0-100) |
| Page Speed (Mobile) | 30% | SEOptimer score direct (0-100) |
| SSL/HTTPS | 15% | Yes=100, No=0 |
| Mobile Viewport | 10% | Yes=100, No=0 |
| Meta Tags | 10% | Title+Desc=100, One=50, None=0 |
| Load Time | 10% | <2s=100, 2-4s=75, 4-6s=50, >6s=25 |

### A.2 Reviews & Reputation (25% weight)

| Metric | Weight | Scoring Logic |
|--------|--------|---------------|
| Google Rating | 40% | See rating rubric above |
| Google Review Count | 30% | See volume rubric above |
| Review Recency | 20% | >50% in 6mo=100, >50% in 12mo=75, else=50 |
| Response Rate | 10% | >80%=100, 50-80%=75, <50%=50, None=25 |

### A.3 Booking & Conversion (20% weight)

| Metric | Weight | Scoring Logic |
|--------|--------|---------------|
| Booking Capability | 35% | Online booking=100, Phone only=50, None=20 |
| Platform Integration | 15% | 2+ platforms=100, 1=70, 0=40 |
| Phone Visibility | 20% | Header=100, Footer=70, Contact only=40, None=0 |
| Pricing Visibility | 15% | Clear=100, Partial=60, None=30 |
| CTA Clarity | 15% | Strong CTA=100, Weak=60, None=30 |

### A.4 Social Media (20% weight)

| Metric | Weight | Scoring Logic |
|--------|--------|---------------|
| Total Followers | 25% | 10k+=100, 5k-10k=85, 1k-5k=70, <1k=50 |
| Engagement Rate | 30% | 6%+=100, 3-6%=85, 1-3%=65, <1%=40 |
| Posting Frequency | 20% | 4+/week=100, 2-3/week=75, 1/week=50, <1/week=30 |
| Platform Presence | 15% | 3+=100, 2=80, 1=50 |
| Content Quality | 10% | Video-heavy=100, Mixed=75, Image-only=60 |

### A.5 Guest Experience (10% weight)

| Metric | Weight | Scoring Logic |
|--------|--------|---------------|
| Hours Displayed | 25% | Yes=100, No=0 |
| Directions/Map | 25% | Interactive map=100, Address=60, None=0 |
| Parking Info | 15% | Yes=100, No=30 |
| Accessibility Info | 15% | Yes=100, No=50 |
| Multi-language | 20% | 2+ languages=100, English-only=60 |

### A.6 Local Visibility (10% weight)

| Metric | Weight | Scoring Logic |
|--------|--------|---------------|
| Google Business Claimed | 40% | Yes=100, No=0 |
| NAP Consistency | 30% | Consistent=100, Minor issues=70, Major=40 |
| Local Keywords | 30% | Strong presence=100, Some=70, None=40 |

---

## Appendix B: Database Schema Additions

```sql
-- Scoring audit trail
CREATE TABLE assessment_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_slug TEXT NOT NULL REFERENCES client_assessments(client_slug),
  scoring_engine_version TEXT NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Raw inputs (JSONB)
  inputs_seoptimer JSONB,
  inputs_google_places JSONB,
  inputs_website_analysis JSONB,
  inputs_sociavault JSONB,

  -- Calculated scores (JSONB)
  scores_breakdown JSONB NOT NULL,
  overall_score INTEGER NOT NULL,
  overall_grade TEXT NOT NULL,

  -- Confidence
  confidence_level TEXT NOT NULL, -- 'high', 'medium', 'low'
  missing_data_flags TEXT[]
);

-- Social media cache
CREATE TABLE social_media_cache (
  client_slug TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ GENERATED ALWAYS AS (fetched_at + INTERVAL '24 hours') STORED
);

-- Historical scores for tracking
CREATE TABLE score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_slug TEXT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  overall_score INTEGER NOT NULL,
  category_scores JSONB NOT NULL,
  trigger TEXT -- 'initial', 'reassessment', 'scheduled'
);
```

---

## Conclusion

The current assessment system has a solid foundation with excellent data collection capabilities. The critical gap is the lack of deterministic scoring - delegating all scoring to Claude creates inconsistency and indefensibility.

**Immediate Priority:** Implement a server-side scoring engine that calculates scores algorithmically, then passes those scores to Claude for analysis and recommendation generation.

This separation of concerns will result in assessments that are:
- **Reproducible** - Same data, same score, every time
- **Auditable** - Clear trail of how every score was calculated
- **Defensible** - Based on documented thresholds and benchmarks
- **Improvable** - Can refine rubrics based on client feedback

The subjective value of Claude's analysis remains - it provides tourism-specific context, identifies patterns, and generates actionable recommendations. But the objective scoring must be deterministic.
