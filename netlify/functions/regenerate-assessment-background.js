// Netlify Function: Regenerate Assessment
// Re-runs assessment for an existing client using their stored information

import { createClient } from '@supabase/supabase-js';

// Import deterministic scoring engine
import { calculateAllScores } from '../../shared/scoring-engine.js';
import { SCORING_ENGINE_VERSION } from '../../shared/rubrics.js';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function handler(event, context) {
  console.log('[REGENERATE] Function invoked');

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { businessName, slug, websiteUrl, location, social, googlePlaceId } = body;
    console.log('[REGENERATE] Business:', businessName, 'Slug:', slug);
    if (googlePlaceId) {
      console.log('[REGENERATE] Google Place ID provided:', googlePlaceId);
    }

    // Validate required fields
    if (!businessName || !slug || !websiteUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. VERIFY AUTH
    // ─────────────────────────────────────────────────────────────────────────
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required' }) };
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
    }

    // Check user role
    const { data: roleRows } = await supabaseAdmin
      .from('user_plans')
      .select('role')
      .eq('email', user.email)
      .eq('active', true)
      .in('role', ['admin', 'psm']);

    if (!roleRows || roleRows.length === 0) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin or PSM role required' }) };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. VERIFY ASSESSMENT EXISTS
    // ─────────────────────────────────────────────────────────────────────────
    const { data: existingAssessment } = await supabaseAdmin
      .from('client_assessments')
      .select('id')
      .eq('client_slug', slug)
      .single();

    if (!existingAssessment) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Assessment not found' })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. UPDATE STATUS TO PROCESSING
    // ─────────────────────────────────────────────────────────────────────────
    // Helper to update progress (for debugging)
    const updateProgress = async (step) => {
      await supabaseAdmin
        .from('client_assessments')
        .update({ error_message: `Progress: ${step}` })
        .eq('client_slug', slug);
    };

    await supabaseAdmin
      .from('client_assessments')
      .update({
        status: 'processing',
        error_message: 'Progress: Starting regeneration',
        reassessment_date: new Date().toISOString()
      })
      .eq('client_slug', slug);

    // ─────────────────────────────────────────────────────────────────────────
    // 4. FETCH SEOPTIMER DATA
    // ─────────────────────────────────────────────────────────────────────────
    await updateProgress('Fetching SEOptimer data');
    let seoptData = null;
    try {
      seoptData = await fetchSEOptimerReport(websiteUrl);
      await updateProgress('SEOptimer complete');
    } catch (err) {
      console.error('SEOptimer error (non-fatal):', err.message);
      seoptData = { _error: err.message };
      await updateProgress('SEOptimer failed (non-fatal)');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4b. FETCH GOOGLE PLACES DATA
    // ─────────────────────────────────────────────────────────────────────────
    await updateProgress('Fetching Google Places data');
    let googlePlacesData = null;
    if (process.env.GOOGLE_PLACES_API_KEY) {
      try {
        // If a Place ID was provided, use it directly (most reliable)
        if (googlePlaceId) {
          console.log('[Google Places] Using provided Place ID:', googlePlaceId);
          googlePlacesData = await fetchGooglePlacesByPlaceId(googlePlaceId);
        } else {
          // Otherwise, search by name/location
          googlePlacesData = await fetchGooglePlacesData(businessName, location, websiteUrl);
        }
        await updateProgress('Google Places complete');
      } catch (err) {
        console.error('Google Places error (non-fatal):', err.message);
        googlePlacesData = { _error: err.message };
        await updateProgress('Google Places failed (non-fatal)');
      }
    } else {
      await updateProgress('Google Places skipped (no API key)');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4c. ANALYZE WEBSITE CONTENT (Tourism-specific signals)
    // ─────────────────────────────────────────────────────────────────────────
    await updateProgress('Analyzing website content');
    let websiteAnalysis = null;
    console.log('[REGENERATE] Analyzing website content');
    try {
      websiteAnalysis = await analyzeWebsiteContent(websiteUrl);
      await updateProgress('Website analysis complete');
    } catch (err) {
      console.error('Website analysis error (non-fatal):', err.message);
      await updateProgress('Website analysis failed (non-fatal)');
      websiteAnalysis = {
        _error: err.message,
        _note: 'Website content analysis unavailable'
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4d. VERIFY AND FILTER GOOGLE PLACES DATA
    // ─────────────────────────────────────────────────────────────────────────
    if (googlePlacesData && !googlePlacesData._error) {
      console.log('[REGENERATE] Verifying Google Places data');
      googlePlacesData = verifyGooglePlacesMatch(googlePlacesData, websiteUrl);
      googlePlacesData = filterRecentReviews(googlePlacesData, 18);

      if (googlePlacesData._verification && !googlePlacesData._verification.verified) {
        console.log('[REGENERATE] Warning: Google Places verification issues:', googlePlacesData._verification.warnings);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4e. FETCH SOCIAL MEDIA DATA (SociaVault) with caching
    // ─────────────────────────────────────────────────────────────────────────
    let socialMediaData = null;
    if (social && Object.values(social).some(url => url)) {
      console.log('[REGENERATE] Fetching social media data from SociaVault (with cache)');
      await updateProgress('Analyzing social media profiles');
      try {
        socialMediaData = await getSocialMediaDataWithCache(slug, social, supabaseAdmin);
        const cacheStatus = socialMediaData?._cached ? '(cached)' : '(fresh)';
        console.log('[REGENERATE] Social media analysis complete:', socialMediaData?.summary, cacheStatus);
        await updateProgress('Social media analysis complete');
      } catch (err) {
        console.error('[REGENERATE] Social media fetch error (non-fatal):', err.message);
        await updateProgress('Social media analysis failed (non-fatal)');
        socialMediaData = {
          _error: err.message,
          _note: 'Social media analysis unavailable'
        };
      }
    } else {
      console.log('[REGENERATE] No social media URLs provided, skipping');
      await updateProgress('No social media URLs provided');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. CALCULATE DETERMINISTIC SCORES
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[REGENERATE] Calculating deterministic scores');
    await updateProgress('Calculating assessment scores');

    const scoringResult = calculateAllScores({
      seoptData,
      googlePlacesData,
      websiteAnalysis,
      socialMediaData
    });

    console.log('[REGENERATE] Scores calculated:', {
      overall: scoringResult.overall.score,
      grade: scoringResult.overall.grade,
      confidence: scoringResult.overall.confidence
    });

    // Save scoring audit trail
    try {
      await supabaseAdmin.from('assessment_audit').insert({
        client_slug: slug,
        scoring_engine_version: SCORING_ENGINE_VERSION,
        inputs_seoptimer: seoptData && !seoptData._error ? seoptData : null,
        inputs_google_places: googlePlacesData && !googlePlacesData._error ? googlePlacesData : null,
        inputs_website_analysis: websiteAnalysis && !websiteAnalysis._error ? websiteAnalysis : null,
        inputs_sociavault: socialMediaData && !socialMediaData._error ? socialMediaData : null,
        scores_breakdown: scoringResult,
        overall_score: scoringResult.overall.score,
        overall_grade: scoringResult.overall.grade,
        confidence_level: scoringResult.overall.confidence,
        missing_data_flags: scoringResult.missingDataFlags
      });
      console.log('[REGENERATE] Audit trail saved');
    } catch (auditError) {
      console.warn('[REGENERATE] Failed to save audit trail (non-fatal):', auditError.message);
    }

    await updateProgress('Scores calculated');

    // ─────────────────────────────────────────────────────────────────────────
    // 5b. GENERATE ANALYSIS WITH CLAUDE (using pre-calculated scores)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[REGENERATE] Generating analysis with Claude');
    await updateProgress('Generating assessment with Claude');
    const assessmentData = await generateAssessmentWithClaude({
      businessName,
      websiteUrl,
      location,
      social,
      seoptData,
      googlePlacesData,
      websiteAnalysis,
      socialMediaData,
      preCalculatedScores: scoringResult  // Pass pre-calculated scores
    });
    await updateProgress('Claude assessment complete');

    // ─────────────────────────────────────────────────────────────────────────
    // 5b. QUALITY ASSURANCE VALIDATION
    // ─────────────────────────────────────────────────────────────────────────
    const qaResult = validateAssessmentQuality(assessmentData, {
      googlePlacesData,
      seoptData,
      websiteAnalysis,
      socialMediaData
    });

    if (!qaResult.valid) {
      console.warn('[REGENERATE] QA issues found:', qaResult.issues);
    }
    if (qaResult.warnings.length > 0) {
      console.warn('[REGENERATE] QA warnings:', qaResult.warnings);
    }

    // Attach QA result to assessment
    assessmentData._qa = qaResult;

    // ─────────────────────────────────────────────────────────────────────────
    // 6. UPDATE ASSESSMENT RECORD
    // ─────────────────────────────────────────────────────────────────────────
    await updateProgress('Saving to database');

    // Merge pre-calculated scores into assessment data
    // Keep Claude's summaries/findings/recommendations but use deterministic scores
    const mergedCategories = {};
    for (const [key, scoringData] of Object.entries(scoringResult.categories)) {
      const claudeData = assessmentData.categories?.[key] || {};

      // Generate metrics from scoring engine breakdown (more accurate than Claude)
      const generatedMetrics = generateMetricsFromBreakdown(key, scoringData.breakdown);

      mergedCategories[key] = {
        // Deterministic scores from scoring engine (these are authoritative)
        score: scoringData.score,
        grade: scoringData.grade,
        weight: scoringData.weight,
        confidence: scoringData.confidence,
        breakdown: scoringData.breakdown,
        dataSources: scoringData.dataSources,
        // Claude's analysis (summaries, findings, recommendations)
        title: scoringData.title || claudeData.title,
        summary: claudeData.summary || 'Analysis pending.',
        findings: claudeData.findings || [],
        metrics: generatedMetrics.length > 0 ? generatedMetrics : (claudeData.metrics || []),
        recommendations: claudeData.recommendations || [],
        data_sources: claudeData.data_sources || scoringData.dataSources || []
      };
    }

    const finalAssessmentData = {
      ...assessmentData,
      overall: scoringResult.overall,
      categories: mergedCategories,
      _scoringEngineVersion: SCORING_ENGINE_VERSION,
      _scoredAt: new Date().toISOString()
    };

    const { error: updateError } = await supabaseAdmin
      .from('client_assessments')
      .update({
        assessment_data: finalAssessmentData,
        seoptimer_raw: seoptData,
        google_places_raw: googlePlacesData,
        website_analysis_raw: websiteAnalysis,
        social_media_raw: socialMediaData,
        overall_score: scoringResult.overall.score,
        overall_grade: scoringResult.overall.grade,
        status: 'completed',
        error_message: null
      })
      .eq('client_slug', slug);

    if (updateError) {
      console.error('Failed to update assessment:', updateError);
    }

    console.log('[REGENERATE] Assessment saved successfully');

    // Save to score_history for tracking
    try {
      await supabaseAdmin.from('score_history').insert({
        client_slug: slug,
        overall_score: scoringResult.overall.score,
        overall_grade: scoringResult.overall.grade,
        category_scores: Object.fromEntries(
          Object.entries(scoringResult.categories).map(([key, cat]) => [key, cat.score])
        ),
        trigger: 'reassessment'
      });
      console.log('[REGENERATE] Score history saved');
    } catch (historyError) {
      console.warn('[REGENERATE] Failed to save score history (non-fatal):', historyError.message);
    }

    // NOTE: Assessment is now complete in database. GitHub commit is just for publishing
    // and should not block the assessment from being marked complete.

    // ─────────────────────────────────────────────────────────────────────────
    // 7. UPDATE GITHUB HTML (non-fatal - assessment already saved)
    // ─────────────────────────────────────────────────────────────────────────
    await updateProgress('Publishing to web (fetching template)');
    try {
      const templateUrl = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/template/assessment-only-template.html`;
      const templateRes = await fetch(templateUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      let html;
      if (templateRes.ok) {
        const templateData = await templateRes.json();
        const templateContent = Buffer.from(templateData.content, 'base64').toString('utf-8');
        html = processAssessmentTemplate(templateContent, {
          businessName,
          slug,
          websiteUrl,
          location,
          assessmentData: finalAssessmentData,
          coachEmail: user.email
        });
      } else {
        html = generateBasicAssessmentHtml({ businessName, slug, websiteUrl, assessmentData: finalAssessmentData });
      }

      // Commit to GitHub (update existing file)
      await updateProgress('Publishing to web (committing)');
      await commitToGitHub([
        { path: `clients/${slug}/index.html`, content: html }
      ], `Regenerate assessment: ${businessName}`);
    } catch (gitErr) {
      console.error('GitHub publish error (non-fatal):', gitErr.message);
      // Don't fail - assessment is already saved in database
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, slug })
    };

  } catch (err) {
    console.error('Regenerate error:', err);

    // Update Supabase status to 'failed' so frontend stops polling
    try {
      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const body = JSON.parse(event.body || '{}');
      if (body.slug) {
        await supabaseAdmin
          .from('client_assessments')
          .update({
            status: 'failed',
            error_message: err.message || 'Unknown error'
          })
          .eq('client_slug', body.slug);
      }
    } catch (updateErr) {
      console.error('Failed to update error status:', updateErr);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal server error' })
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SEOPTIMER API
// ═══════════════════════════════════════════════════════════════════════════

async function fetchSEOptimerReport(websiteUrl) {
  // Clean URL - ensure proper format
  let cleanUrl = websiteUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  // Try with www if not present
  const urlVariants = [cleanUrl];
  if (!cleanUrl.startsWith('www.')) {
    urlVariants.push('www.' + cleanUrl);
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-api-key': process.env.SEOPTIMER_API_KEY
  };

  let lastError = null;

  for (const urlToTry of urlVariants) {
    console.log('[SEOptimer] Trying URL:', urlToTry);

    try {
      const createResponse = await fetch('https://api.seoptimer.com/v1/report/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: urlToTry, pdf: 0 })
      });

      if (!createResponse.ok) {
        lastError = new Error(`SEOptimer create failed: ${createResponse.status}`);
        continue;
      }

      const createResult = await createResponse.json();
      if (!createResult.success || !createResult.data?.id) {
        lastError = new Error('SEOptimer create failed: no report ID returned');
        continue;
      }

      const reportId = createResult.data.id;
      console.log('[SEOptimer] Report created, ID:', reportId);

      // Poll for results
      for (let attempt = 0; attempt < 40; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const getResponse = await fetch(`https://api.seoptimer.com/v1/report/get/${reportId}`, {
          method: 'GET',
          headers
        });

        if (!getResponse.ok) continue;

        const reportData = await getResponse.json();
        if (reportData.success && reportData.data) {
          // Check if report indicates site was inaccessible
          if (reportData.data.output?.message?.includes('not accessible')) {
            lastError = new Error(`Website blocking SEOptimer: ${reportData.data.output.message}`);
            break; // Try next URL variant
          }
          console.log('[SEOptimer] Report ready');
          return reportData.data;
        }
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('SEOptimer report failed for all URL variants');
}

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE PLACES API (with Fuzzy Matching)
// ═══════════════════════════════════════════════════════════════════════════

function extractDomain(url) {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.replace(/^(www|m|mobile)\./, '');
  } catch {
    return null;
  }
}

function doDomainsMatch(domain1, domain2) {
  if (!domain1 || !domain2) return false;
  if (domain1 === domain2) return true;
  if (domain1.includes(domain2) || domain2.includes(domain1)) return true;
  return false;
}

// Fetch Google Places data directly using a Place ID (most reliable method)
async function fetchGooglePlacesByPlaceId(placeId) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY not configured');
  }

  console.log('[Google Places] Fetching by Place ID:', placeId);
  const details = await getPlaceDetails(placeId, apiKey);

  if (!details) {
    throw new Error(`Place ID not found: ${placeId}`);
  }

  const formattedData = formatPlaceData(details, { strategy: 'direct_place_id', verified: true });
  formattedData._placeId = placeId;
  formattedData._fetchMethod = 'direct_place_id';

  console.log('[Google Places] Successfully fetched:', {
    name: formattedData.name,
    rating: formattedData.rating,
    reviews: formattedData.totalReviews
  });

  return formattedData;
}

async function searchGooglePlaces(query, apiKey) {
  const findPlaceUrl = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
  findPlaceUrl.searchParams.set('input', query);
  findPlaceUrl.searchParams.set('inputtype', 'textquery');
  findPlaceUrl.searchParams.set('fields', 'place_id,name,formatted_address');
  findPlaceUrl.searchParams.set('key', apiKey);

  const findResponse = await fetch(findPlaceUrl.toString());
  const findResult = await findResponse.json();

  if (findResult.status !== 'OK' || !findResult.candidates?.length) {
    return null;
  }
  return findResult.candidates;
}

async function getPlaceDetails(placeId, apiKey) {
  const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  detailsUrl.searchParams.set('place_id', placeId);
  detailsUrl.searchParams.set('fields', 'name,rating,user_ratings_total,reviews,price_level,website,formatted_phone_number,opening_hours,types');
  detailsUrl.searchParams.set('key', apiKey);

  const detailsResponse = await fetch(detailsUrl.toString());
  const detailsResult = await detailsResponse.json();

  if (detailsResult.status !== 'OK' || !detailsResult.result) {
    return null;
  }
  return detailsResult.result;
}

function formatPlaceData(place, matchInfo = {}) {
  return {
    name: place.name,
    rating: place.rating || null,
    totalReviews: place.user_ratings_total || 0,
    priceLevel: place.price_level || null,
    website: place.website || null,
    phone: place.formatted_phone_number || null,
    businessTypes: place.types || [],
    isOpen: place.opening_hours?.open_now || null,
    recentReviews: (place.reviews || []).slice(0, 5).map(r => ({
      rating: r.rating,
      text: r.text?.substring(0, 300) || '',
      relativeTime: r.relative_time_description,
      authorName: r.author_name
    })),
    _matchInfo: matchInfo
  };
}

async function fetchGooglePlacesData(businessName, location, websiteUrl = null) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY not configured');
  }

  const targetDomain = extractDomain(websiteUrl);
  console.log('[Google Places] Starting fuzzy search for:', businessName);

  const searchStrategies = [
    { name: 'exact_with_location', query: location ? `${businessName} ${location}` : businessName },
    { name: 'business_name_only', query: businessName }
  ];

  if (targetDomain) {
    const domainParts = targetDomain.split('.')[0].replace(/[-_]/g, ' ');
    if (domainParts.length > 3 && domainParts.toLowerCase() !== businessName.toLowerCase()) {
      searchStrategies.push({
        name: 'domain_based',
        query: location ? `${domainParts} ${location}` : domainParts
      });
    }
  }

  const allCandidates = [];
  const seenPlaceIds = new Set();

  for (const strategy of searchStrategies) {
    try {
      const candidates = await searchGooglePlaces(strategy.query, apiKey);
      if (candidates) {
        for (const candidate of candidates) {
          if (!seenPlaceIds.has(candidate.place_id)) {
            seenPlaceIds.add(candidate.place_id);
            allCandidates.push({ ...candidate, strategy: strategy.name });
          }
        }
      }
    } catch (err) {
      console.log(`[Google Places] Strategy "${strategy.name}" failed:`, err.message);
    }
  }

  if (allCandidates.length === 0) {
    return null;
  }

  let bestMatch = null;
  let bestMatchScore = -1;

  for (const candidate of allCandidates) {
    const details = await getPlaceDetails(candidate.place_id, apiKey);
    if (!details) continue;

    let matchScore = 0;
    const matchInfo = { strategy: candidate.strategy, domainMatch: false, nameMatch: false };

    if (targetDomain && details.website) {
      const placeDomain = extractDomain(details.website);
      if (doDomainsMatch(targetDomain, placeDomain)) {
        matchScore += 100;
        matchInfo.domainMatch = true;
      }
    }

    const normalizedBusinessName = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedPlaceName = details.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalizedPlaceName.includes(normalizedBusinessName) ||
        normalizedBusinessName.includes(normalizedPlaceName)) {
      matchScore += 50;
      matchInfo.nameMatch = true;
    }

    const strategyIndex = searchStrategies.findIndex(s => s.name === candidate.strategy);
    matchScore += (searchStrategies.length - strategyIndex) * 10;

    if (details.user_ratings_total > 0) {
      matchScore += Math.min(details.user_ratings_total, 20);
    }

    if (matchScore > bestMatchScore) {
      bestMatchScore = matchScore;
      bestMatch = { details, matchInfo };
      if (matchInfo.domainMatch) break;
    }
  }

  if (!bestMatch) {
    return null;
  }

  return formatPlaceData(bestMatch.details, bestMatch.matchInfo);
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBSITE CONTENT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeWebsiteContent(websiteUrl) {
  console.log('[Website Analysis] Fetching:', websiteUrl);

  try {
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TourismAssessmentBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 15000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const htmlLower = html.toLowerCase();

    // Detect booking platforms first
    const bookingPlatforms = detectBookingPlatforms(htmlLower);
    // hasBookingLink is true if we detect booking keywords OR if we find booking platforms
    const hasBookingKeywords = detectBookingPresence(html, htmlLower);
    const hasBookingLink = hasBookingKeywords || bookingPlatforms.length > 0;

    const analysis = {
      hasBookingLink: hasBookingLink,
      bookingPlatforms: bookingPlatforms,
      hasPhone: detectPhone(html),
      hasEmail: detectEmail(html),
      hasAddress: detectAddress(htmlLower),
      hasHours: detectHours(htmlLower),
      hasPricing: detectPricing(html, htmlLower),
      imageCount: countImages(html),
      hasVideoEmbed: detectVideo(htmlLower),
      hasMobileViewport: html.includes('viewport'),
      hasSSL: websiteUrl.startsWith('https'),
      hasDirections: detectDirections(htmlLower),
      hasParking: htmlLower.includes('parking'),
      hasAccessibility: detectAccessibility(htmlLower),
      hasMultiLanguage: detectMultiLanguage(html),
      socialLinksOnSite: detectSocialLinks(htmlLower),
      pageSizeKB: Math.round(html.length / 1024),
      _source: 'direct_scrape',
      _timestamp: new Date().toISOString()
    };

    console.log('[Website Analysis] Complete:', {
      hasBooking: analysis.hasBookingLink,
      hasPhone: analysis.hasPhone,
      hasHours: analysis.hasHours,
      imageCount: analysis.imageCount
    });

    return analysis;

  } catch (err) {
    console.error('[Website Analysis] Error:', err.message);
    return {
      _error: err.message,
      _note: 'Website content analysis failed - site may be blocking bots or unreachable'
    };
  }
}

function detectBookingPresence(html, htmlLower) {
  // Multi-language booking keywords
  const bookingKeywords = [
    // English
    'book now', 'book online', 'reserve', 'reservation', 'make a booking',
    'check availability', 'book a table', 'book a room', 'book your',
    'schedule', 'appointment', 'buy tickets', 'purchase tickets',
    'add to cart', 'book tour', 'reserve now', 'get tickets',
    // German
    'jetzt buchen', 'buchung', 'reservieren', 'reservierung', 'buchen sie',
    'verfügbarkeit prüfen', 'zimmer buchen', 'termin buchen',
    // French
    'réserver', 'réservation', 'réserver maintenant', 'vérifier disponibilité',
    // Spanish
    'reservar', 'reserva', 'reservar ahora', 'comprobar disponibilidad'
  ];
  return bookingKeywords.some(kw => htmlLower.includes(kw));
}

function detectBookingPlatforms(htmlLower) {
  const platforms = [];
  // Major OTAs and booking platforms
  if (htmlLower.includes('booking.com')) platforms.push('Booking.com');
  if (htmlLower.includes('expedia')) platforms.push('Expedia');
  if (htmlLower.includes('tripadvisor')) platforms.push('TripAdvisor');
  if (htmlLower.includes('viator')) platforms.push('Viator');
  if (htmlLower.includes('getyourguide')) platforms.push('GetYourGuide');
  if (htmlLower.includes('airbnb')) platforms.push('Airbnb');
  if (htmlLower.includes('vrbo')) platforms.push('VRBO');
  if (htmlLower.includes('hotels.com')) platforms.push('Hotels.com');
  // Restaurant reservations
  if (htmlLower.includes('opentable')) platforms.push('OpenTable');
  if (htmlLower.includes('resy')) platforms.push('Resy');
  if (htmlLower.includes('yelp.com/reservations')) platforms.push('Yelp Reservations');
  // Tour & activity booking
  if (htmlLower.includes('fareharbor')) platforms.push('FareHarbor');
  if (htmlLower.includes('checkfront')) platforms.push('Checkfront');
  if (htmlLower.includes('rezdy')) platforms.push('Rezdy');
  if (htmlLower.includes('bookeo')) platforms.push('Bookeo');
  if (htmlLower.includes('peek.com')) platforms.push('Peek');
  if (htmlLower.includes('xola')) platforms.push('Xola');
  if (htmlLower.includes('bokun')) platforms.push('Bokun');
  // Hotel/lodging PMS systems
  if (htmlLower.includes('cloudbeds')) platforms.push('Cloudbeds');
  if (htmlLower.includes('littlehotelier')) platforms.push('Little Hotelier');
  if (htmlLower.includes('mews.com') || htmlLower.includes('mews.li')) platforms.push('Mews');
  if (htmlLower.includes('webrezpro')) platforms.push('WebRezPro');
  if (htmlLower.includes('roomraccoon')) platforms.push('RoomRaccoon');
  if (htmlLower.includes('sirvoy')) platforms.push('Sirvoy');
  if (htmlLower.includes('innroad')) platforms.push('innRoad');
  if (htmlLower.includes('lodgify')) platforms.push('Lodgify');
  if (htmlLower.includes('guesty')) platforms.push('Guesty');
  if (htmlLower.includes('hostaway')) platforms.push('Hostaway');
  // General scheduling
  if (htmlLower.includes('squareup') || htmlLower.includes('square appointments')) platforms.push('Square');
  if (htmlLower.includes('calendly')) platforms.push('Calendly');
  if (htmlLower.includes('acuity')) platforms.push('Acuity Scheduling');
  // Direct booking widgets (check for common patterns)
  if (htmlLower.includes('bookingengine') || htmlLower.includes('booking-engine')) platforms.push('Direct Booking Engine');
  return platforms;
}

function detectPhone(html) {
  const phonePatterns = [
    /tel:[\d\+\-\(\)\s]+/i,
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
    /\b\(\d{3}\)\s?\d{3}[-.\s]?\d{4}\b/,
    /\+1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/
  ];
  return phonePatterns.some(pattern => pattern.test(html));
}

function detectEmail(html) {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  return emailPattern.test(html);
}

function detectAddress(htmlLower) {
  const addressKeywords = ['street', 'avenue', 'road', 'drive', 'boulevard',
    'suite', 'floor', 'address', 'located at', 'find us', 'visit us'];
  return addressKeywords.some(kw => htmlLower.includes(kw));
}

function detectHours(htmlLower) {
  const hoursKeywords = ['hours', 'open daily', 'monday', 'tuesday', 'wednesday',
    'thursday', 'friday', 'saturday', 'sunday', 'am -', 'pm -', 'a.m.', 'p.m.',
    'opening hours', 'business hours', 'we are open', 'open from'];
  return hoursKeywords.some(kw => htmlLower.includes(kw));
}

function detectPricing(html, htmlLower) {
  const pricePatterns = [
    /\$\d+/,
    /\d+\s?(CAD|USD|EUR|GBP)/i,
    /price/i,
    /rate/i,
    /from \$/i,
    /starting at/i,
    /per person/i,
    /per night/i
  ];
  const hasPricePattern = pricePatterns.some(p => p.test(html));
  const hasPriceKeywords = ['pricing', 'rates', 'menu prices', 'admission', 'ticket price'].some(kw => htmlLower.includes(kw));
  return hasPricePattern || hasPriceKeywords;
}

function countImages(html) {
  const imgTags = (html.match(/<img/gi) || []).length;
  const bgImages = (html.match(/background-image/gi) || []).length;
  return imgTags + bgImages;
}

function detectVideo(htmlLower) {
  return htmlLower.includes('youtube') ||
         htmlLower.includes('vimeo') ||
         htmlLower.includes('<video') ||
         htmlLower.includes('wistia');
}

function detectDirections(htmlLower) {
  return htmlLower.includes('direction') ||
         htmlLower.includes('how to get') ||
         htmlLower.includes('google.com/maps') ||
         htmlLower.includes('maps.google') ||
         htmlLower.includes('get directions');
}

function detectAccessibility(htmlLower) {
  return htmlLower.includes('accessibility') ||
         htmlLower.includes('wheelchair') ||
         htmlLower.includes('accessible') ||
         htmlLower.includes('ada compliant');
}

function detectMultiLanguage(html) {
  const hasHreflang = html.includes('hreflang');
  const hasLangSwitcher = /lang(uage)?[-_]?(switch|select|choose)/i.test(html);
  const hasTranslateWidget = html.includes('translate.google') || html.includes('gtranslate');
  return hasHreflang || hasLangSwitcher || hasTranslateWidget;
}

function detectSocialLinks(htmlLower) {
  const socials = [];
  if (htmlLower.includes('instagram.com') || htmlLower.includes('instagram')) socials.push('Instagram');
  if (htmlLower.includes('facebook.com') || htmlLower.includes('fb.com')) socials.push('Facebook');
  if (htmlLower.includes('twitter.com') || htmlLower.includes('x.com')) socials.push('Twitter/X');
  if (htmlLower.includes('tiktok.com')) socials.push('TikTok');
  if (htmlLower.includes('youtube.com')) socials.push('YouTube');
  if (htmlLower.includes('linkedin.com')) socials.push('LinkedIn');
  if (htmlLower.includes('pinterest.com')) socials.push('Pinterest');
  return socials;
}

// ═══════════════════════════════════════════════════════════════════════════
// SOCIAVAULT API INTEGRATION (Social Media Analytics)
// ═══════════════════════════════════════════════════════════════════════════

async function getSocialMediaDataWithCache(clientSlug, socialUrls, supabaseClient) {
  if (!socialUrls || !Object.values(socialUrls).some(url => url)) {
    return null;
  }

  try {
    const now = new Date().toISOString();
    const { data: cached, error: cacheError } = await supabaseClient
      .from('social_media_cache')
      .select('payload, fetched_at, expires_at')
      .eq('client_slug', clientSlug)
      .single();

    if (!cacheError && cached && cached.expires_at > now) {
      console.log('[SociaVault] Cache hit for:', clientSlug);
      return { ...cached.payload, _cached: true, _cachedAt: cached.fetched_at };
    }
  } catch (err) {
    console.log('[SociaVault] Cache check failed:', err.message);
  }

  const freshData = await fetchSocialMediaData(socialUrls);

  if (freshData && !freshData._error) {
    const fetchedAt = new Date();
    const expiresAt = new Date(fetchedAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    supabaseClient
      .from('social_media_cache')
      .upsert({
        client_slug: clientSlug,
        payload: freshData,
        fetched_at: fetchedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        source_api: 'sociavault',
        source_version: '1.0'
      }, { onConflict: 'client_slug' })
      .then(({ error }) => {
        if (!error) console.log('[SociaVault] Cached data for:', clientSlug);
      })
      .catch(() => {});
  }

  return freshData;
}

async function fetchSocialMediaData(socialUrls) {
  if (!process.env.SOCIAVAULT_API_KEY) {
    console.log('[SociaVault] API key not configured, skipping social media analysis');
    return {
      _error: 'SOCIAVAULT_API_KEY not configured',
      _note: 'Social media analysis unavailable'
    };
  }

  const results = {
    platforms: {},
    summary: {
      totalFollowers: 0,
      platformsFound: 0,
      platformsAnalyzed: []
    },
    topContent: [],
    _source: 'sociavault',
    _timestamp: new Date().toISOString()
  };

  const headers = {
    'X-API-Key': process.env.SOCIAVAULT_API_KEY,
    'Content-Type': 'application/json'
  };

  const platformPromises = [];

  if (socialUrls?.instagram) {
    platformPromises.push(
      fetchInstagramData(socialUrls.instagram, headers)
        .then(data => { results.platforms.instagram = data; })
        .catch(err => { results.platforms.instagram = { _error: err.message }; })
    );
  }

  if (socialUrls?.tiktok) {
    platformPromises.push(
      fetchTikTokData(socialUrls.tiktok, headers)
        .then(data => { results.platforms.tiktok = data; })
        .catch(err => { results.platforms.tiktok = { _error: err.message }; })
    );
  }

  if (socialUrls?.youtube) {
    platformPromises.push(
      fetchYouTubeData(socialUrls.youtube, headers)
        .then(data => { results.platforms.youtube = data; })
        .catch(err => { results.platforms.youtube = { _error: err.message }; })
    );
  }

  if (socialUrls?.facebook) {
    platformPromises.push(
      fetchFacebookData(socialUrls.facebook, headers)
        .then(data => { results.platforms.facebook = data; })
        .catch(err => { results.platforms.facebook = { _error: err.message }; })
    );
  }

  await Promise.all(platformPromises);

  Object.entries(results.platforms).forEach(([platform, data]) => {
    if (data && !data._error) {
      results.summary.platformsAnalyzed.push(platform);
      results.summary.platformsFound++;
      results.summary.totalFollowers += data.followers || 0;
    }
  });

  results.topContent = aggregateTopContent(results.platforms);

  console.log('[SociaVault] Analysis complete:', {
    platformsFound: results.summary.platformsFound,
    totalFollowers: results.summary.totalFollowers
  });

  return results;
}

async function fetchInstagramData(url, headers) {
  const handle = extractInstagramHandle(url);
  if (!handle) throw new Error('Could not extract Instagram handle from URL');

  console.log('[SociaVault] Fetching Instagram profile:', handle);

  const profileRes = await fetch(
    `https://api.sociavault.com/v1/scrape/instagram/profile?handle=${encodeURIComponent(handle)}&trim=true`,
    { headers }
  );

  if (!profileRes.ok) {
    const errorText = await profileRes.text();
    throw new Error(`Instagram profile fetch failed: ${profileRes.status} - ${errorText}`);
  }

  const profileData = await profileRes.json();
  if (!profileData.success) {
    throw new Error('Instagram profile fetch unsuccessful');
  }

  const user = profileData.data?.data?.user || profileData.data?.user || {};
  const followers = user.edge_followed_by?.count || user.follower_count || 0;

  // Fetch posts with enhanced analysis
  let posts = [];
  let avgLikes = 0;
  let avgComments = 0;
  let engagementRate = 0;
  let postingFrequency = 0;
  let contentMix = { images: 0, carousels: 0, reels: 0 };
  let bestContent = [];

  try {
    console.log('[SociaVault] Fetching Instagram posts for:', handle);
    const postsRes = await fetch(
      `https://api.sociavault.com/v1/scrape/instagram/posts?handle=${encodeURIComponent(handle)}&trim=true`,
      { headers }
    );

    if (postsRes.ok) {
      const postsData = await postsRes.json();
      // Analyze up to 12 posts instead of 5
      posts = (postsData.data?.items || []).slice(0, 12);
      console.log(`[SociaVault] Found ${posts.length} Instagram posts to analyze`);

      if (posts.length > 0) {
        const totalLikes = posts.reduce((sum, p) => sum + (p.like_count || 0), 0);
        const totalComments = posts.reduce((sum, p) => sum + (p.comment_count || 0), 0);

        avgLikes = Math.round(totalLikes / posts.length);
        avgComments = Math.round(totalComments / posts.length);

        if (followers > 0) {
          engagementRate = ((avgLikes + avgComments) / followers * 100).toFixed(2);
        }

        // Calculate content mix
        posts.forEach(p => {
          const mediaType = p.media_type;
          if (mediaType === 2 || p.product_type === 'clips') {
            contentMix.reels++;
          } else if (mediaType === 8) {
            contentMix.carousels++;
          } else {
            contentMix.images++;
          }
        });

        // Calculate posting frequency (posts per week)
        const timestamps = posts.map(p => p.taken_at).filter(t => t).sort((a, b) => b - a);
        if (timestamps.length >= 2) {
          const newest = timestamps[0];
          const oldest = timestamps[timestamps.length - 1];
          const daySpan = (newest - oldest) / (60 * 60 * 24);
          if (daySpan > 0) {
            postingFrequency = Math.round((posts.length / daySpan) * 7 * 10) / 10;
          }
        }

        // Calculate engagement rate per post and find best performers
        const postsWithEngagement = posts.map(p => {
          const likes = p.like_count || 0;
          const comments = p.comment_count || 0;
          const views = p.play_count || 0;
          const engagement = likes + comments;
          const postEngagementRate = followers > 0 ? (engagement / followers * 100) : 0;

          return {
            id: p.id || p.code,
            type: p.media_type === 2 ? 'video' : (p.media_type === 8 ? 'carousel' : 'image'),
            likes,
            comments,
            views,
            engagement,
            engagementRate: Math.round(postEngagementRate * 100) / 100,
            caption: p.caption?.text?.substring(0, 150) || '',
            timestamp: p.taken_at,
            performanceVsAverage: avgLikes > 0 ? Math.round((likes / avgLikes) * 10) / 10 : 1
          };
        });

        // Identify best performing content (top 3 by engagement rate)
        bestContent = postsWithEngagement
          .sort((a, b) => b.engagementRate - a.engagementRate)
          .slice(0, 3)
          .map(p => ({ ...p, isTopPerformer: true }));
      }
    }
  } catch (e) {
    console.log('[SociaVault] Instagram posts fetch error:', e.message);
  }

  return {
    platform: 'instagram',
    handle: user.username || handle,
    displayName: user.full_name || '',
    bio: user.biography || '',
    followers,
    following: user.edge_follow?.count || user.following_count || 0,
    postCount: user.edge_owner_to_timeline_media?.count || user.media_count || 0,
    verified: user.is_verified || false,
    profilePicUrl: user.profile_pic_url_hd || user.profile_pic_url || '',
    externalUrl: user.external_url || '',
    metrics: {
      avgLikes,
      avgComments,
      engagementRate: parseFloat(engagementRate) || 0,
      postingFrequency,
    },
    contentMix,
    bestContent,
    recentPosts: posts.slice(0, 5).map(p => ({
      id: p.id || p.code,
      type: p.media_type === 2 ? 'video' : (p.media_type === 8 ? 'carousel' : 'image'),
      likes: p.like_count || 0,
      comments: p.comment_count || 0,
      views: p.play_count || null,
      caption: p.caption?.text?.substring(0, 150) || ''
    })),
    _creditsUsed: 2
  };
}

async function fetchTikTokData(url, headers) {
  const handle = extractTikTokHandle(url);
  if (!handle) throw new Error('Could not extract TikTok handle from URL');

  console.log('[SociaVault] Fetching TikTok profile:', handle);

  const profileRes = await fetch(
    `https://api.sociavault.com/v1/scrape/tiktok/profile?handle=${encodeURIComponent(handle)}`,
    { headers }
  );

  if (!profileRes.ok) {
    const errorText = await profileRes.text();
    throw new Error(`TikTok profile fetch failed: ${profileRes.status} - ${errorText}`);
  }

  const profileData = await profileRes.json();
  if (!profileData.success) {
    throw new Error('TikTok profile fetch unsuccessful');
  }

  const user = profileData.data?.user || {};
  const stats = profileData.data?.stats || {};
  const allVideos = profileData.data?.itemList || [];
  const videos = allVideos.slice(0, 12); // Analyze up to 12 videos
  const followers = stats.followerCount || 0;

  // Calculate engagement from recent videos
  let avgViews = 0;
  let avgLikes = 0;
  let avgComments = 0;
  let engagementRate = 0;
  let postingFrequency = 0;
  let viralContent = [];
  let bestContent = [];

  if (videos.length > 0) {
    const totalViews = videos.reduce((sum, v) => sum + (v.stats?.playCount || 0), 0);
    const totalLikes = videos.reduce((sum, v) => sum + (v.stats?.diggCount || 0), 0);
    const totalComments = videos.reduce((sum, v) => sum + (v.stats?.commentCount || 0), 0);

    avgViews = Math.round(totalViews / videos.length);
    avgLikes = Math.round(totalLikes / videos.length);
    avgComments = Math.round(totalComments / videos.length);

    if (avgViews > 0) {
      engagementRate = ((avgLikes + avgComments) / avgViews * 100).toFixed(2);
    }

    // Calculate posting frequency (videos per week)
    const timestamps = videos.map(v => v.createTime).filter(t => t).sort((a, b) => b - a);
    if (timestamps.length >= 2) {
      const newest = timestamps[0];
      const oldest = timestamps[timestamps.length - 1];
      const daySpan = (newest - oldest) / (60 * 60 * 24);
      if (daySpan > 0) {
        postingFrequency = Math.round((videos.length / daySpan) * 7 * 10) / 10;
      }
    }

    // Identify viral content (10x+ average views) and best content
    const videosWithMetrics = videos.map(v => {
      const views = v.stats?.playCount || 0;
      const likes = v.stats?.diggCount || 0;
      const comments = v.stats?.commentCount || 0;
      const shares = v.stats?.shareCount || 0;
      const engagement = likes + comments + shares;
      const videoEngagementRate = views > 0 ? (engagement / views * 100) : 0;
      const performanceVsAverage = avgViews > 0 ? views / avgViews : 1;

      return {
        id: v.id,
        views,
        likes,
        comments,
        shares,
        engagement,
        engagementRate: Math.round(videoEngagementRate * 100) / 100,
        caption: v.desc?.substring(0, 150) || '',
        timestamp: v.createTime,
        performanceVsAverage: Math.round(performanceVsAverage * 100) / 100,
        isViral: performanceVsAverage >= 10
      };
    });

    // Viral videos (10x+ average views)
    viralContent = videosWithMetrics
      .filter(v => v.isViral)
      .map(v => ({ ...v, isTopPerformer: true }));

    // Best performing (top 3 by engagement rate)
    bestContent = videosWithMetrics
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 3)
      .map(v => ({ ...v, isTopPerformer: true }));
  }

  // Search TikTok Ad Library for potential ads from this business
  let advertising = {
    isAdvertising: false,
    adsFound: 0,
    topAds: []
  };
  let creditsUsed = 1;

  try {
    const businessName = user.nickname || handle;
    if (businessName) {
      console.log('[SociaVault] Searching TikTok Ad Library for:', businessName);

      const adSearchRes = await fetch(
        `https://api.sociavault.com/v1/scrape/tiktok-ad-library/search?keyword=${encodeURIComponent(businessName)}`,
        { headers }
      );

      if (adSearchRes.ok) {
        const adSearchData = await adSearchRes.json();
        creditsUsed++;

        if (adSearchData.success && adSearchData.data?.ads?.length > 0) {
          const ads = adSearchData.data.ads;
          advertising.adsFound = ads.length;

          // Check if any ads closely match the business name
          const matchingAds = ads.filter(ad => {
            const adText = `${ad.brandName || ''} ${ad.displayName || ''} ${ad.title || ''}`.toLowerCase();
            return adText.includes(businessName.toLowerCase()) ||
                   businessName.toLowerCase().includes(ad.brandName?.toLowerCase() || '');
          });

          advertising.isAdvertising = matchingAds.length > 0;

          // Get top performing ads (up to 3)
          advertising.topAds = (matchingAds.length > 0 ? matchingAds : ads).slice(0, 3).map(ad => ({
            id: ad.adId || ad.id || '',
            brandName: ad.brandName || '',
            title: ad.title?.substring(0, 100) || '',
            objective: ad.objective || '',
            likes: ad.likes || 0,
            comments: ad.comments || 0,
            shares: ad.shares || 0,
            reach: ad.reach || 0,
            ctr: ad.ctr || 0
          }));

          console.log(`[SociaVault] TikTok ad search found ${ads.length} ads, ${matchingAds.length} matching`);
        }
      }
    }
  } catch (adError) {
    console.log('[SociaVault] TikTok Ad Library error:', adError.message);
  }

  return {
    platform: 'tiktok',
    handle: user.uniqueId || handle,
    displayName: user.nickname || '',
    bio: user.signature || '',
    followers,
    following: stats.followingCount || 0,
    totalLikes: stats.heartCount || stats.heart || 0,
    videoCount: stats.videoCount || 0,
    verified: user.verified || false,
    profilePicUrl: user.avatarLarger || '',
    bioLink: user.bioLink?.link || '',
    metrics: {
      avgViews,
      avgLikes,
      avgComments,
      engagementRate: parseFloat(engagementRate) || 0,
      postingFrequency,
    },
    viralContent,
    bestContent,
    advertising,
    recentVideos: videos.slice(0, 5).map(v => ({
      id: v.id,
      views: v.stats?.playCount || 0,
      likes: v.stats?.diggCount || 0,
      comments: v.stats?.commentCount || 0,
      shares: v.stats?.shareCount || 0,
      caption: v.desc?.substring(0, 150) || ''
    })),
    _creditsUsed: creditsUsed
  };
}

async function fetchYouTubeData(url, headers) {
  const channelInfo = extractYouTubeChannel(url);
  if (!channelInfo) throw new Error('Could not extract YouTube channel from URL');

  console.log('[SociaVault] Fetching YouTube channel:', channelInfo);

  const queryParam = channelInfo.type === 'handle'
    ? `handle=${encodeURIComponent(channelInfo.value)}`
    : `channelId=${encodeURIComponent(channelInfo.value)}`;

  const channelRes = await fetch(
    `https://api.sociavault.com/v1/scrape/youtube/channel?${queryParam}`,
    { headers }
  );

  if (!channelRes.ok) {
    const errorText = await channelRes.text();
    throw new Error(`YouTube channel fetch failed: ${channelRes.status} - ${errorText}`);
  }

  const channelData = await channelRes.json();
  if (!channelData.success) {
    throw new Error('YouTube channel fetch unsuccessful');
  }

  const data = channelData.data || {};
  const subscribers = data.subscriberCount || 0;
  let creditsUsed = 1;

  // Fetch video-level data for detailed analysis
  let videos = [];
  let bestContent = [];
  let postingFrequency = 0;
  let viewToSubRatio = 0;

  try {
    console.log('[SociaVault] Fetching YouTube channel videos...');
    const videosRes = await fetch(
      `https://api.sociavault.com/v1/scrape/youtube/channel/videos?${queryParam}`,
      { headers }
    );

    if (videosRes.ok) {
      const videosData = await videosRes.json();
      creditsUsed++;

      if (videosData.success && videosData.data?.items) {
        videos = (videosData.data.items || []).slice(0, 12);
        console.log(`[SociaVault] Found ${videos.length} YouTube videos to analyze`);

        const videosWithMetrics = videos.map(v => {
          const views = v.viewCount || v.views || 0;
          const likes = v.likeCount || v.likes || 0;
          const comments = v.commentCount || v.comments || 0;
          const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0;
          const viewSubRatio = subscribers > 0 ? views / subscribers : 0;

          return {
            id: v.videoId || v.id || '',
            title: v.title?.substring(0, 100) || '',
            views,
            likes,
            comments,
            engagementRate: Math.round(engagementRate * 100) / 100,
            viewSubRatio: Math.round(viewSubRatio * 100) / 100,
            duration: v.lengthText || v.duration || '',
            publishedAt: v.publishedTimeText || v.publishedAt || '',
            isShort: v.isShort || false
          };
        });

        if (videosWithMetrics.length > 0 && subscribers > 0) {
          const totalViews = videosWithMetrics.reduce((sum, v) => sum + v.views, 0);
          viewToSubRatio = Math.round((totalViews / videosWithMetrics.length / subscribers) * 100) / 100;
        }

        if (videos.length >= 2) {
          postingFrequency = Math.round((videos.length / 3) * 10) / 10;
        }

        bestContent = [...videosWithMetrics]
          .sort((a, b) => b.viewSubRatio - a.viewSubRatio)
          .slice(0, 3)
          .map(v => ({
            ...v,
            isTopPerformer: true,
            performanceVsAverage: viewToSubRatio > 0 ? Math.round((v.viewSubRatio / viewToSubRatio) * 10) / 10 : 0
          }));
      }
    }
  } catch (videosError) {
    console.log('[SociaVault] YouTube videos fetch error:', videosError.message);
  }

  const contentMix = {
    videos: videos.filter(v => !v.isShort).length,
    shorts: videos.filter(v => v.isShort).length
  };

  return {
    platform: 'youtube',
    handle: data.handle || '',
    displayName: data.name || '',
    description: data.description?.substring(0, 300) || '',
    subscribers: subscribers,
    subscriberText: data.subscriberCountText || '',
    totalViews: data.viewCount || 0,
    videoCount: data.videoCount || 0,
    joinedDate: data.joinedDateText || '',
    country: data.country || '',
    profilePicUrl: data.avatar?.image?.sources?.[0]?.url || '',
    metrics: {
      avgViewsPerVideo: data.videoCount > 0 ? Math.round(data.viewCount / data.videoCount) : 0,
      viewToSubRatio,
      postingFrequency,
    },
    contentMix,
    bestContent,
    recentVideos: videos.slice(0, 5).map(v => ({
      id: v.videoId || v.id || '',
      title: v.title?.substring(0, 100) || '',
      views: v.viewCount || v.views || 0,
      likes: v.likeCount || v.likes || 0,
      comments: v.commentCount || v.comments || 0,
      duration: v.lengthText || v.duration || '',
      isShort: v.isShort || false
    })),
    _creditsUsed: creditsUsed
  };
}

async function fetchFacebookData(url, headers) {
  console.log('[SociaVault] Fetching Facebook page:', url);

  const fbRes = await fetch(
    `https://api.sociavault.com/v1/scrape/facebook/profile?url=${encodeURIComponent(url)}`,
    { headers }
  );

  if (!fbRes.ok) {
    const errorText = await fbRes.text();
    throw new Error(`Facebook profile fetch failed: ${fbRes.status} - ${errorText}`);
  }

  const fbData = await fbRes.json();
  if (!fbData.success) {
    throw new Error('Facebook profile fetch unsuccessful');
  }

  const data = fbData.data || {};
  let creditsUsed = 1;

  // Fetch ads from Facebook Ad Library
  let advertising = {
    isAdvertising: false,
    activeAds: 0,
    adTypes: [],
    recentAds: []
  };

  try {
    const pageName = data.name;
    if (pageName) {
      console.log('[SociaVault] Searching Facebook Ad Library for:', pageName);

      const searchRes = await fetch(
        `https://api.sociavault.com/v1/scrape/facebook/ads/search-companies?query=${encodeURIComponent(pageName)}`,
        { headers }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        creditsUsed++;

        if (searchData.success && searchData.data?.companies?.length > 0) {
          const company = searchData.data.companies.find(c =>
            c.name?.toLowerCase() === pageName.toLowerCase()
          ) || searchData.data.companies[0];

          if (company?.pageId) {
            console.log('[SociaVault] Found ad library page ID:', company.pageId);

            const adsRes = await fetch(
              `https://api.sociavault.com/v1/scrape/facebook/ads/company?pageId=${encodeURIComponent(company.pageId)}`,
              { headers }
            );

            if (adsRes.ok) {
              const adsData = await adsRes.json();
              creditsUsed++;

              if (adsData.success && adsData.data?.ads) {
                const ads = adsData.data.ads || [];
                advertising.isAdvertising = ads.length > 0;
                advertising.activeAds = ads.length;

                const adTypeSet = new Set();
                ads.forEach(ad => {
                  if (ad.adType) adTypeSet.add(ad.adType);
                  else if (ad.mediaType) adTypeSet.add(ad.mediaType);
                });
                advertising.adTypes = Array.from(adTypeSet);

                advertising.recentAds = ads.slice(0, 5).map(ad => ({
                  id: ad.adId || ad.id || '',
                  headline: ad.title || ad.headline || '',
                  body: ad.body?.substring(0, 200) || '',
                  type: ad.adType || ad.mediaType || 'unknown',
                  startDate: ad.startDate || '',
                  platforms: ad.platforms || [],
                  isActive: ad.isActive !== false
                }));

                console.log(`[SociaVault] Found ${advertising.activeAds} Facebook ads`);
              }
            }
          }
        }
      }
    }
  } catch (adsError) {
    console.log('[SociaVault] Facebook Ad Library error:', adsError.message);
  }

  return {
    platform: 'facebook',
    name: data.name || '',
    category: data.category || '',
    followers: data.followerCount || 0,
    likes: data.likeCount || 0,
    url: data.url || url,
    profilePicUrl: data.profilePicLarge || '',
    website: data.website || '',
    phone: data.phone || '',
    address: data.address || '',
    adStatus: data.adLibrary?.adStatus || null,
    advertising,
    _creditsUsed: creditsUsed
  };
}

function extractInstagramHandle(url) {
  if (!url) return null;
  const match = url.match(/instagram\.com\/([^\/\?]+)/i) || url.match(/^@?([a-zA-Z0-9._]+)$/);
  return match ? match[1].replace('@', '') : null;
}

function extractTikTokHandle(url) {
  if (!url) return null;
  const match = url.match(/tiktok\.com\/@([^\/\?]+)/i) || url.match(/^@([a-zA-Z0-9._]+)$/);
  return match ? match[1] : null;
}

function extractYouTubeChannel(url) {
  if (!url) return null;
  let match = url.match(/youtube\.com\/@([^\/\?]+)/i);
  if (match) return { type: 'handle', value: match[1] };
  match = url.match(/youtube\.com\/channel\/([^\/\?]+)/i);
  if (match) return { type: 'channelId', value: match[1] };
  match = url.match(/youtube\.com\/c\/([^\/\?]+)/i);
  if (match) return { type: 'handle', value: match[1] };
  match = url.match(/youtube\.com\/user\/([^\/\?]+)/i);
  if (match) return { type: 'handle', value: match[1] };
  return null;
}

function aggregateTopContent(platforms) {
  const allContent = [];
  if (platforms.instagram?.recentPosts) {
    platforms.instagram.recentPosts.forEach(post => {
      allContent.push({
        platform: 'instagram',
        engagement: (post.likes || 0) + (post.comments || 0),
        likes: post.likes,
        comments: post.comments,
        views: post.views,
        type: post.type,
        caption: post.caption
      });
    });
  }
  if (platforms.tiktok?.recentVideos) {
    platforms.tiktok.recentVideos.forEach(video => {
      allContent.push({
        platform: 'tiktok',
        engagement: (video.likes || 0) + (video.comments || 0) + (video.shares || 0),
        likes: video.likes,
        comments: video.comments,
        views: video.views,
        shares: video.shares,
        type: 'video',
        caption: video.caption
      });
    });
  }
  return allContent.sort((a, b) => b.engagement - a.engagement).slice(0, 5);
}

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE PLACES VERIFICATION & FILTERING
// ═══════════════════════════════════════════════════════════════════════════

function verifyGooglePlacesMatch(placesData, websiteUrl) {
  if (!placesData || placesData._error) return placesData;

  const warnings = [];

  if (placesData.website && websiteUrl) {
    try {
      const providedDomain = new URL(websiteUrl).hostname.replace('www.', '');
      const placesDomain = new URL(placesData.website).hostname.replace('www.', '');

      if (!providedDomain.includes(placesDomain) && !placesDomain.includes(providedDomain)) {
        warnings.push(`Website mismatch: provided "${providedDomain}" but Google shows "${placesDomain}"`);
      }
    } catch (e) {
      // URL parsing failed, skip verification
    }
  }

  placesData._verification = {
    websiteMatch: warnings.length === 0,
    warnings: warnings,
    verified: warnings.length === 0
  };

  return placesData;
}

function filterRecentReviews(placesData, monthsThreshold = 18) {
  if (!placesData || !placesData.recentReviews) return placesData;

  const reviewAnalysis = {
    totalProvided: placesData.recentReviews.length,
    recentCount: 0,
    oldestRelativeTime: null,
    recencyWarning: false
  };

  const staleIndicators = ['year ago', 'years ago', '2 years', '3 years'];

  placesData.recentReviews.forEach(review => {
    const relTime = review.relativeTime?.toLowerCase() || '';

    if (!staleIndicators.some(ind => relTime.includes(ind))) {
      reviewAnalysis.recentCount++;
    }

    if (!reviewAnalysis.oldestRelativeTime || relTime.includes('year')) {
      reviewAnalysis.oldestRelativeTime = review.relativeTime;
    }
  });

  if (reviewAnalysis.recentCount < reviewAnalysis.totalProvided / 2) {
    reviewAnalysis.recencyWarning = true;
  }

  placesData._reviewAnalysis = reviewAnalysis;

  return placesData;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUALITY ASSURANCE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

function validateAssessmentQuality(assessmentData, sourceData) {
  const issues = [];
  const warnings = [];

  // Check for fabricated review data
  if (assessmentData.categories?.reviews_reputation) {
    const reviewCat = assessmentData.categories.reviews_reputation;
    const hasGoogleData = sourceData.googlePlacesData && !sourceData.googlePlacesData._error;

    reviewCat.metrics?.forEach(metric => {
      if (metric.label.toLowerCase().includes('google') &&
          !metric.value.includes('Manual') &&
          !metric.value.includes('check') &&
          !hasGoogleData) {
        issues.push(`Review metric "${metric.label}" has value but no Google data source`);
      }
    });
  }

  // Check all recommendations have time estimates
  assessmentData.priority_recommendations?.forEach((rec, i) => {
    if (!rec.time_estimate) {
      warnings.push(`Priority recommendation ${i + 1} missing time estimate`);
    }
  });

  // Check overall score consistency with category scores
  if (assessmentData.categories && assessmentData.overall?.score) {
    const categoryScores = Object.values(assessmentData.categories)
      .map(c => c.score)
      .filter(s => typeof s === 'number');

    if (categoryScores.length > 0) {
      const avgScore = categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length;
      const scoreDiff = Math.abs(avgScore - assessmentData.overall.score);

      if (scoreDiff > 20) {
        warnings.push(`Overall score (${assessmentData.overall.score}) differs significantly from category average (${Math.round(avgScore)})`);
      }
    }
  }

  // Check for empty categories
  Object.entries(assessmentData.categories || {}).forEach(([key, cat]) => {
    if (!cat.metrics || cat.metrics.length === 0) {
      warnings.push(`Category "${cat.title}" has no metrics`);
    }
    if (!cat.recommendations || cat.recommendations.length === 0) {
      warnings.push(`Category "${cat.title}" has no recommendations`);
    }
  });

  return {
    valid: issues.length === 0,
    issues,
    warnings,
    timestamp: new Date().toISOString()
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CLAUDE ASSESSMENT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateAssessmentWithClaude(data) {
  const context = buildAssessmentContext(data);

  // Create abort controller with 8-minute timeout for Claude API
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 480000); // 8 minutes

  try {
    // Use streaming to prevent network timeouts on long responses
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        stream: true,
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: `You are a senior tourism and hospitality digital marketing consultant with 15+ years of experience. Analyze this tourism/hospitality business and generate a comprehensive digital marketing assessment.

${context}

═══════════════════════════════════════════════════════════════════════════════
CRITICAL DATA ACCURACY RULES - FOLLOW EXACTLY
═══════════════════════════════════════════════════════════════════════════════

1. ONLY USE DATA FROM SECTIONS MARKED "VERIFIED"
   - Google Business Profile Data (VERIFIED): Use exact numbers
   - Website Content Analysis (VERIFIED): Use exact findings
   - SEOptimer Technical Data (VERIFIED): Use exact scores

2. FOR ANY DATA NOT PROVIDED, USE THIS EXACT TEXT:
   - "Manual verification recommended"
   - DO NOT fabricate numbers for TripAdvisor, Yelp, social followers, etc.

3. EVERY METRIC MUST INCLUDE:
   - "confidence": "high" (from verified API data), "medium" (inferred from website), or "low" (requires manual check)
   - "source": The specific data source (e.g., "Google Places API", "Website scrape", "SEOptimer")

═══════════════════════════════════════════════════════════════════════════════
ASSESSMENT STRUCTURE - 6 CATEGORIES
═══════════════════════════════════════════════════════════════════════════════

We assess these 6 categories (we have verified data for these):

1. WEBSITE & TECHNICAL FOUNDATION (Weight: 15%)
   - Source: SEOptimer data + Website Content Analysis
   - Focus: Speed, mobile experience, SSL, basic SEO

2. REVIEWS & REPUTATION (Weight: 25%)
   - Source: Google Places API data
   - Focus: Google rating, review count, review recency, response patterns
   - If no Google data: All metrics show "Manual verification recommended"

3. ONLINE BOOKING & CONVERSION (Weight: 20%)
   - Source: Website Content Analysis
   - Focus: Booking capability, platform presence, contact visibility, pricing clarity

4. SOCIAL MEDIA & CONTENT (Weight: 20%)
   - Source: SociaVault API (Instagram, TikTok, YouTube, Facebook)
   - Focus: Follower counts, engagement rates, posting frequency, content performance
   - Key metrics: Total followers, engagement rate per platform, top performing content
   - If no social data: Note which platforms are missing and recommend setup

5. DIGITAL GUEST EXPERIENCE (Weight: 10%)
   - Source: Website Content Analysis
   - Focus: Hours, directions, parking, accessibility info, visitor essentials

6. LOCAL VISIBILITY (Weight: 10%)
   - Source: SEOptimer + Google Places + Website Analysis
   - Focus: Local SEO signals, map presence, NAP consistency

TOTAL: 100%

═══════════════════════════════════════════════════════════════════════════════
SCORING CALCULATION
═══════════════════════════════════════════════════════════════════════════════

Calculate overall score using these exact weights:
overall_score = (website_score × 0.15) + (reviews_score × 0.25) + (booking_score × 0.20) + (social_score × 0.20) + (guest_exp_score × 0.10) + (local_score × 0.10)

Grade scale:
- A+ (95-100), A (90-94), A- (87-89)
- B+ (83-86), B (80-82), B- (77-79)
- C+ (73-76), C (70-72), C- (67-69)
- D+ (63-66), D (60-62), D- (57-59)
- F (below 57)

═══════════════════════════════════════════════════════════════════════════════
OUTPUT JSON STRUCTURE
═══════════════════════════════════════════════════════════════════════════════

Return ONLY valid JSON:

{
  "executive_summary": {
    "headline": "One sentence verdict specific to this business",
    "key_strengths": ["Strength 1 with specific detail", "Strength 2", "Strength 3"],
    "critical_gaps": ["Gap 1 with specific impact", "Gap 2", "Gap 3"],
    "bottom_line": "What this means for ${data.businessName} in terms of visitor discovery and bookings"
  },
  "quick_wins": [
    {
      "task": "Very specific task (e.g., 'Add your phone number to the website header - currently not visible')",
      "time_estimate": "15 minutes",
      "impact": "Specific expected result",
      "confidence": "high"
    }
  ],
  "tourism_context": {
    "visitor_profile": "Who visits ${data.businessName} - tourists, locals, demographics",
    "discovery_journey": "How people find businesses like this in ${data.location || 'this area'}",
    "seasonal_considerations": "Seasonality impact on digital strategy",
    "trip_integration": "How ${data.businessName} fits into visitor itineraries"
  },
  "overall": {
    "grade": "B+",
    "score": 76,
    "score_breakdown": {
      "website_technical": {"score": 72, "weight": 0.15, "contribution": 10.8},
      "reviews_reputation": {"score": 85, "weight": 0.25, "contribution": 21.25},
      "booking_conversion": {"score": 70, "weight": 0.20, "contribution": 14.0},
      "social_media": {"score": 75, "weight": 0.20, "contribution": 15.0},
      "guest_experience": {"score": 65, "weight": 0.10, "contribution": 6.5},
      "local_visibility": {"score": 80, "weight": 0.10, "contribution": 8.0}
    },
    "summary": "2-3 sentence assessment from tourism consultant perspective"
  },
  "categories": {
    "website_technical": {
      "grade": "B",
      "score": 72,
      "weight": 0.15,
      "title": "Website & Technical Foundation",
      "summary": "Assessment based on SEOptimer scan and website analysis",
      "data_sources": ["SEOptimer API", "Website Content Analysis"],
      "metrics": [
        {
          "label": "Mobile Performance",
          "value": "65/100",
          "benchmark": "Tourism average: 50-60",
          "status": "good",
          "confidence": "high",
          "source": "SEOptimer",
          "tooltip": "Mobile speed matters - 53% of visitors abandon sites that take >3 seconds"
        }
      ],
      "findings": [
        {"type": "positive", "text": "Specific finding from the data", "confidence": "high", "source": "SEOptimer"},
        {"type": "negative", "text": "Specific issue found", "confidence": "high", "source": "Website scrape"}
      ],
      "recommendations": [
        {
          "text": "Specific action to take",
          "time_estimate": "2 hours (first time) / 15 min ongoing",
          "impact": "Expected measurable result",
          "priority": "high"
        }
      ]
    },
    "reviews_reputation": {
      "grade": "B+",
      "score": 78,
      "weight": 0.25,
      "title": "Reviews & Reputation",
      "summary": "Based on Google Business Profile data",
      "data_sources": ["Google Places API"],
      "metrics": [
        {
          "label": "Google Rating",
          "value": "USE EXACT NUMBER FROM GOOGLE DATA or 'Manual verification recommended'",
          "benchmark": "Tourism businesses: 4.0 acceptable, 4.5+ excellent",
          "status": "good/warning/critical",
          "confidence": "high if Google data present, otherwise low",
          "source": "Google Places API",
          "tooltip": "Based on verified Google Business Profile"
        }
      ],
      "findings": [],
      "recommendations": []
    },
    "booking_conversion": {
      "grade": "B",
      "score": 70,
      "weight": 0.20,
      "title": "Online Booking & Conversion",
      "summary": "Can visitors easily book/reserve/purchase?",
      "data_sources": ["Website Content Analysis"],
      "metrics": [],
      "findings": [],
      "recommendations": []
    },
    "social_media": {
      "grade": "B",
      "score": 75,
      "weight": 0.20,
      "title": "Social Media & Content",
      "summary": "Social presence, content strategy, engagement, and advertising across platforms",
      "data_sources": ["SociaVault API", "Facebook Ad Library", "TikTok Ad Library"],
      "metrics": [
        {
          "label": "Total Followers",
          "value": "USE totalFollowers FROM SOCIAL MEDIA DATA",
          "benchmark": "Local tourism: 1,000+ combined is good, 5,000+ is strong",
          "status": "based on count",
          "confidence": "high if SociaVault data present",
          "source": "SociaVault API",
          "tooltip": "Combined follower count across all platforms"
        },
        {
          "label": "Posting Consistency",
          "value": "USE postingFrequency data",
          "benchmark": "Tourism: 3-5 posts/week on Instagram recommended",
          "status": "good if consistent, warning if sporadic",
          "confidence": "high",
          "source": "SociaVault API",
          "tooltip": "Posting frequency based on recent content"
        },
        {
          "label": "Best Performing Content",
          "value": "Describe the top-performing posts/videos",
          "benchmark": "Top content should have 2-5x average engagement",
          "status": "info",
          "confidence": "high",
          "source": "SociaVault API",
          "tooltip": "Top 3 posts by engagement rate per platform"
        },
        {
          "label": "Paid Advertising Status",
          "value": "USE advertising data from Ad Libraries",
          "benchmark": "Tourism businesses with ad budgets see faster growth",
          "status": "info if no ads, good if running campaigns",
          "confidence": "high",
          "source": "Facebook/TikTok Ad Libraries",
          "tooltip": "Based on public ad library data"
        }
      ],
      "content_strategy_analysis": {
        "strengths": ["List content strategy strengths"],
        "gaps": ["List content gaps"],
        "recommendations": ["Specific content improvements"]
      },
      "advertising_analysis": {
        "is_advertising": "true/false based on ad library data",
        "platforms_with_ads": [],
        "recommendations": "Advertising recommendations"
      },
      "findings": [],
      "recommendations": []
    },
    "guest_experience": {
      "grade": "C+",
      "score": 68,
      "weight": 0.10,
      "title": "Digital Guest Experience",
      "summary": "Can visitors find essential info before arriving?",
      "data_sources": ["Website Content Analysis"],
      "metrics": [],
      "findings": [],
      "recommendations": []
    },
    "local_visibility": {
      "grade": "B",
      "score": 75,
      "weight": 0.10,
      "title": "Local Visibility",
      "summary": "How findable when searching locally",
      "data_sources": ["SEOptimer", "Google Places API"],
      "metrics": [],
      "findings": [],
      "recommendations": []
    }
  },
  "priority_recommendations": [
    {
      "priority": 1,
      "category": "Category Name",
      "text": "Most impactful action - be very specific",
      "time_estimate": "X hours (first time) / Y minutes ongoing",
      "impact": "high",
      "expected_result": "Specific measurable outcome",
      "confidence": "high"
    }
  ],
  "data_quality_summary": {
    "high_confidence_data": ["List data sources that provided verified data"],
    "low_confidence_areas": ["List areas where manual verification needed"],
    "recommendations_for_fuller_picture": ["What additional data would help"]
  }
}

═══════════════════════════════════════════════════════════════════════════════
REQUIREMENTS CHECKLIST
═══════════════════════════════════════════════════════════════════════════════

- [ ] Every metric has confidence level (high/medium/low)
- [ ] Every metric has source attribution
- [ ] No fabricated statistics - use "Manual verification recommended"
- [ ] Overall score matches weighted category calculation
- [ ] 5 quick wins with specific, actionable tasks
- [ ] 5 priority recommendations with time estimates
- [ ] All recommendations reference THIS specific business
- [ ] Tourism/visitor perspective throughout

Output ONLY the JSON object. No markdown code blocks, no explanation.`
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  // Process streaming response
  console.log('[Claude] Processing streaming response...');
  let content = '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const event = JSON.parse(data);
          if (event.type === 'content_block_delta' && event.delta?.text) {
            content += event.delta.text;
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }
  }

  console.log('[Claude] Streaming complete, content length:', content.length);

  try {
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Claude] No JSON found in response');
      return getDefaultAssessment();
    }

    let jsonStr = jsonMatch[1] || jsonMatch[0];
    console.log('[Claude] Extracted JSON length:', jsonStr.length);

    // Try to parse, with repair attempts if needed
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (firstError) {
      console.log('[Claude] First parse failed, attempting repair:', firstError.message);
      console.log('[Claude] Error position info:', firstError.message.match(/position (\d+)/)?.[1] || 'unknown');

      // Attempt to repair common JSON issues
      let repairedJson = jsonStr;

      // Step 1: Fix control characters that break JSON
      repairedJson = repairedJson.replace(/[\x00-\x1F\x7F]/g, (char) => {
        if (char === '\n') return '\\n';
        if (char === '\r') return '\\r';
        if (char === '\t') return '\\t';
        return ''; // Remove other control chars
      });

      // Step 2: Remove trailing commas before ] or }
      repairedJson = repairedJson.replace(/,(\s*[}\]])/g, '$1');

      // Step 3: Fix unescaped quotes inside strings (common LLM issue)
      repairedJson = repairedJson.replace(/"([^"]*?)(?<!\\)"([^"]*?)"/g, (match, p1, p2) => {
        if (p2 && !p2.startsWith(':') && !p2.startsWith(',') && !p2.startsWith('}') && !p2.startsWith(']')) {
          return `"${p1}\\"${p2}"`;
        }
        return match;
      });

      // Try first repair
      try {
        parsed = JSON.parse(repairedJson);
        console.log('[Claude] Repair successful (step 1-3)');
      } catch (secondError) {
        console.log('[Claude] Basic repair failed, trying truncation:', secondError.message);

        // Step 4: Aggressive truncation for truncated responses
        // Find the last complete JSON value (string ending with ", or number/bool/null)

        // Strategy: Find last occurrence of complete patterns and truncate there
        const truncationPoints = [];

        // Pattern 1: End of string value followed by comma or closing bracket
        let match;
        const stringEndPattern = /",?\s*(?=[}\]])/g;
        while ((match = stringEndPattern.exec(repairedJson)) !== null) {
          if (match.index > repairedJson.length * 0.5) {
            truncationPoints.push(match.index + match[0].length);
          }
        }

        // Pattern 2: End of array with ]
        const arrayEndPattern = /\],?\s*(?=[}\]])/g;
        while ((match = arrayEndPattern.exec(repairedJson)) !== null) {
          if (match.index > repairedJson.length * 0.5) {
            truncationPoints.push(match.index + match[0].length);
          }
        }

        // Pattern 3: End of object with }
        const objEndPattern = /},?\s*(?=[}\]])/g;
        while ((match = objEndPattern.exec(repairedJson)) !== null) {
          if (match.index > repairedJson.length * 0.5) {
            truncationPoints.push(match.index + match[0].length);
          }
        }

        // Also check for simple patterns
        const simplePatterns = ['"}', '"]', 'true}', 'false}', 'null}', 'true]', 'false]', 'null]'];
        for (const pattern of simplePatterns) {
          let idx = repairedJson.lastIndexOf(pattern);
          if (idx > repairedJson.length * 0.5) {
            truncationPoints.push(idx + pattern.length);
          }
        }

        if (truncationPoints.length > 0) {
          // Use the latest good truncation point
          const bestPoint = Math.max(...truncationPoints);
          console.log('[Claude] Truncating at position:', bestPoint, 'of', repairedJson.length);
          repairedJson = repairedJson.substring(0, bestPoint);

          // Remove any trailing commas
          repairedJson = repairedJson.replace(/,\s*$/, '');
        }

        // Close any remaining open structures
        const newOpenBraces = (repairedJson.match(/{/g) || []).length;
        const newCloseBraces = (repairedJson.match(/}/g) || []).length;
        const newOpenBrackets = (repairedJson.match(/\[/g) || []).length;
        const newCloseBrackets = (repairedJson.match(/]/g) || []).length;

        console.log('[Claude] Bracket balance - braces:', newOpenBraces, '/', newCloseBraces, 'brackets:', newOpenBrackets, '/', newCloseBrackets);

        for (let i = 0; i < newOpenBrackets - newCloseBrackets; i++) repairedJson += ']';
        for (let i = 0; i < newOpenBraces - newCloseBraces; i++) repairedJson += '}';

        try {
          parsed = JSON.parse(repairedJson);
          console.log('[Claude] Repair successful (with truncation)');
        } catch (repairError) {
          console.error('[Claude] Truncation repair failed:', repairError.message);

          // Last resort: try to find ANY valid JSON object in the response
          console.log('[Claude] Attempting last-resort extraction...');
          const lastResortMatch = repairedJson.match(/\{[\s\S]*?"executive_summary"[\s\S]*?"categories"[\s\S]*?\}/);
          if (lastResortMatch) {
            try {
              // Try increasingly aggressive truncation
              let candidate = lastResortMatch[0];
              for (let cutback = 0; cutback < 5000; cutback += 500) {
                const truncated = candidate.substring(0, candidate.length - cutback);
                const lastGood = truncated.lastIndexOf('"}');
                if (lastGood > truncated.length * 0.8) {
                  let attempt = truncated.substring(0, lastGood + 2);
                  // Balance and close
                  const ob = (attempt.match(/{/g) || []).length;
                  const cb = (attempt.match(/}/g) || []).length;
                  const oq = (attempt.match(/\[/g) || []).length;
                  const cq = (attempt.match(/]/g) || []).length;
                  for (let i = 0; i < oq - cq; i++) attempt += ']';
                  for (let i = 0; i < ob - cb; i++) attempt += '}';
                  try {
                    parsed = JSON.parse(attempt);
                    console.log('[Claude] Last-resort extraction successful at cutback:', cutback);
                    break;
                  } catch (e) {
                    // Continue trying
                  }
                }
              }
            } catch (e) {
              // Fall through to error
            }
          }

          if (!parsed) {
            console.error('[Claude] All repair attempts failed:', repairError.message);
            const errorPos = parseInt(firstError.message.match(/position (\d+)/)?.[1] || '0');
            if (errorPos > 0) {
              console.error('[Claude] Content around error:', jsonStr.substring(Math.max(0, errorPos - 100), Math.min(jsonStr.length, errorPos + 100)));
            }
            throw firstError;
          }
        }
      }
    }

    console.log('[Claude] Successfully parsed assessment');
    return parsed;
  } catch (e) {
    console.error('Failed to parse Claude response:', e.message);
    const defaultAssessment = getDefaultAssessment();
    defaultAssessment._debug_error = e.message;
    defaultAssessment._debug_raw_response = content?.substring(0, 2000) || 'No content available';
    return defaultAssessment;
  }
  } catch (fetchError) {
    // Handle abort/timeout errors
    if (fetchError.name === 'AbortError') {
      throw new Error('Claude API request timed out after 4 minutes');
    }
    throw fetchError;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildAssessmentContext(data) {
  let context = '';

  // Add pre-calculated scores section if available
  if (data.preCalculatedScores) {
    const scores = data.preCalculatedScores;
    context += `═══════════════════════════════════════════════════════════════
PRE-CALCULATED SCORES (DO NOT MODIFY - THESE ARE DETERMINISTIC)
═══════════════════════════════════════════════════════════════
IMPORTANT: These scores have been calculated algorithmically and are FINAL.
Your task is to ANALYZE and EXPLAIN these scores, NOT to recalculate them.

Overall Score: ${scores.overall.score}/100 (Grade: ${scores.overall.grade})
Confidence Level: ${scores.overall.confidence}
Scoring Engine Version: ${scores._version || 'unknown'}

### Category Breakdown:
`;
    Object.entries(scores.categories).forEach(([key, cat]) => {
      context += `- ${cat.title}: ${cat.score}/100 (${cat.grade}) [Weight: ${Math.round(cat.weight * 100)}%]\n`;
    });

    context += `
═══════════════════════════════════════════════════════════════
CRITICAL INSTRUCTIONS FOR CLAUDE:
1. USE these exact scores in your output - do not recalculate
2. Your job is to EXPLAIN why these scores are what they are
3. Reference specific data points that justify each score
4. Provide actionable recommendations to improve scores
═══════════════════════════════════════════════════════════════

`;
  }

  context += `## Business Information
- Name: ${data.businessName}
- Website: ${data.websiteUrl}
- Location: ${data.location || 'Not specified'}

## Social Media Accounts (URLs provided - follower counts require manual verification)`;

  if (data.social) {
    const providedSocials = Object.entries(data.social).filter(([_, url]) => url);
    if (providedSocials.length > 0) {
      providedSocials.forEach(([platform, url]) => {
        context += `\n- ${platform}: ${url}`;
      });
    } else {
      context += '\n- None provided';
    }
  } else {
    context += '\n- None provided';
  }

  // Add Google Places data (reviews, rating) with verification status
  if (data.googlePlacesData && !data.googlePlacesData._error) {
    const gp = data.googlePlacesData;
    const verificationNote = gp._verification?.verified
      ? 'VERIFIED - USE THESE EXACT NUMBERS'
      : `CAUTION - ${gp._verification?.warnings?.join('; ') || 'Verification pending'}`;

    context += `\n\n## Google Business Profile Data (${verificationNote})
- Google Rating: ${gp.rating || 'N/A'} out of 5 stars
- Total Google Reviews: ${gp.totalReviews}
- Business Types: ${gp.businessTypes?.join(', ') || 'N/A'}
- Price Level: ${gp.priceLevel ? '$'.repeat(gp.priceLevel) : 'N/A'}
- Phone: ${gp.phone || 'N/A'}`;

    // Add review recency analysis
    if (gp._reviewAnalysis) {
      context += `\n- Review Recency: ${gp._reviewAnalysis.recentCount} of ${gp._reviewAnalysis.totalProvided} reviews are from past 18 months`;
      if (gp._reviewAnalysis.recencyWarning) {
        context += ` (WARNING: Most reviews are old - may indicate declining activity)`;
      }
    }

    if (gp.recentReviews && gp.recentReviews.length > 0) {
      context += `\n\n### Recent Google Reviews (${gp.recentReviews.length} samples):`;
      gp.recentReviews.forEach((review, i) => {
        context += `\n\n**Review ${i + 1}** (${review.rating}/5 stars, ${review.relativeTime}):
"${review.text}"`;
      });
    }
  } else {
    context += `\n\n## Google Business Profile Data
- NOT AVAILABLE (Google Places API not configured or business not found)
- For Reviews & Reputation category: state "Manual verification recommended" for all review metrics
- DO NOT fabricate any review numbers`;
  }

  // Add Website Content Analysis
  if (data.websiteAnalysis && !data.websiteAnalysis._error) {
    const wa = data.websiteAnalysis;
    context += `\n\n## Website Content Analysis (VERIFIED - FROM DIRECT SCRAPE)
### Booking & Reservations
- Has booking/reservation capability: ${wa.hasBookingLink ? 'YES' : 'NO'}
- Booking platforms detected: ${wa.bookingPlatforms?.length > 0 ? wa.bookingPlatforms.join(', ') : 'None detected'}

### Contact Information Visibility
- Phone number visible: ${wa.hasPhone ? 'YES' : 'NO'}
- Email visible: ${wa.hasEmail ? 'YES' : 'NO'}
- Address visible: ${wa.hasAddress ? 'YES' : 'NO'}

### Visitor Information
- Hours displayed: ${wa.hasHours ? 'YES' : 'NO'}
- Pricing information visible: ${wa.hasPricing ? 'YES' : 'NO'}
- Directions/maps available: ${wa.hasDirections ? 'YES' : 'NO'}
- Parking information: ${wa.hasParking ? 'YES' : 'NO'}
- Accessibility information: ${wa.hasAccessibility ? 'YES' : 'NO'}

### Technical & Visual
- Mobile-optimized (viewport): ${wa.hasMobileViewport ? 'YES' : 'NO'}
- SSL/HTTPS: ${wa.hasSSL ? 'YES' : 'NO'}
- Image count on homepage: ${wa.imageCount}
- Video content: ${wa.hasVideoEmbed ? 'YES' : 'NO'}
- Multi-language support: ${wa.hasMultiLanguage ? 'YES' : 'NO'}

### Social Links on Website
- Platforms linked: ${wa.socialLinksOnSite?.length > 0 ? wa.socialLinksOnSite.join(', ') : 'None detected'}

### Page Size
- Homepage size: ${wa.pageSizeKB} KB`;
  } else {
    context += `\n\n## Website Content Analysis
- NOT AVAILABLE (website could not be scraped)
- For Digital Guest Experience category: note that website analysis was unavailable`;
  }

  // Add SEOptimer technical data
  if (data.seoptData && !data.seoptData._error) {
    const seo = data.seoptData;
    context += `\n\n## SEOptimer Technical Data (VERIFIED - FROM API)`;

    if (seo.performance) {
      context += `\n### Performance
- Desktop Score: ${seo.performance.desktop_score || 'N/A'}
- Mobile Score: ${seo.performance.mobile_score || 'N/A'}
- Load Time: ${seo.performance.load_time || 'N/A'}`;
    }

    if (seo.seo) {
      context += `\n### SEO
- SEO Score: ${seo.seo.score || 'N/A'}
- Meta Title: ${seo.seo.title ? 'Present' : 'Missing'}
- Meta Description: ${seo.seo.description ? 'Present' : 'Missing'}`;
    }

    if (seo.mobile) {
      context += `\n### Mobile
- Mobile Friendly: ${seo.mobile.is_mobile_friendly ? 'YES' : 'NO'}
- Viewport Configured: ${seo.mobile.has_viewport ? 'YES' : 'NO'}`;
    }

    if (seo.security) {
      context += `\n### Security
- HTTPS: ${seo.security.https ? 'YES' : 'NO'}`;
    }

    context += `\n\n### Full SEOptimer Response (for detailed analysis):
${JSON.stringify(seo, null, 2)}`;
  } else {
    context += `\n\n## SEOptimer Technical Data
- NOT AVAILABLE (SEOptimer scan failed or timed out)
- For Website Technical Foundation category: note technical data was limited`;
  }

  // Add Social Media Data (from SociaVault)
  if (data.socialMediaData && !data.socialMediaData._error) {
    const sm = data.socialMediaData;
    context += `\n\n## Social Media Analytics (VERIFIED - FROM SOCIAVAULT API)
### Summary
- Total Followers (all platforms): ${sm.summary?.totalFollowers?.toLocaleString() || 0}
- Platforms Analyzed: ${sm.summary?.platformsAnalyzed?.join(', ') || 'None'}`;

    // Instagram
    if (sm.platforms?.instagram && !sm.platforms.instagram._error) {
      const ig = sm.platforms.instagram;
      context += `\n\n### Instagram (@${ig.handle})
- Followers: ${ig.followers?.toLocaleString() || 0}
- Following: ${ig.following?.toLocaleString() || 0}
- Posts: ${ig.postCount || 0}
- Verified: ${ig.verified ? 'YES' : 'NO'}
- Engagement Rate: ${ig.metrics?.engagementRate || 0}%
- Avg Likes per Post: ${ig.metrics?.avgLikes?.toLocaleString() || 0}
- Avg Comments per Post: ${ig.metrics?.avgComments || 0}
- Posting Frequency: ${ig.metrics?.postingFrequency || 0} posts/week
- Bio: "${ig.bio?.substring(0, 150) || 'N/A'}"
- External Link: ${ig.externalUrl || 'None'}`;

      if (ig.contentMix) {
        context += `\n\n#### Content Mix:
- Images: ${ig.contentMix.images || 0}
- Carousels: ${ig.contentMix.carousels || 0}
- Reels: ${ig.contentMix.reels || 0}`;
      }

      if (ig.bestContent?.length > 0) {
        context += `\n\n#### Best Performing Content (Top 3 by engagement rate):`;
        ig.bestContent.forEach((post, i) => {
          context += `\n${i + 1}. ${post.engagementRate?.toFixed(2) || 0}% engagement - ${post.likes?.toLocaleString() || 0} likes, ${post.comments || 0} comments`;
          if (post.performanceVsAverage) {
            context += ` (${post.performanceVsAverage}x average)`;
          }
        });
      }
    }

    // TikTok
    if (sm.platforms?.tiktok && !sm.platforms.tiktok._error) {
      const tt = sm.platforms.tiktok;
      context += `\n\n### TikTok (@${tt.handle})
- Followers: ${tt.followers?.toLocaleString() || 0}
- Total Likes: ${tt.totalLikes?.toLocaleString() || 0}
- Videos: ${tt.videoCount || 0}
- Verified: ${tt.verified ? 'YES' : 'NO'}
- Engagement Rate: ${tt.metrics?.engagementRate || 0}%
- Avg Views per Video: ${tt.metrics?.avgViews?.toLocaleString() || 0}
- Avg Likes per Video: ${tt.metrics?.avgLikes?.toLocaleString() || 0}
- Posting Frequency: ${tt.metrics?.postingFrequency || 0} videos/week
- Bio: "${tt.bio?.substring(0, 150) || 'N/A'}"`;

      if (tt.viralContent?.length > 0) {
        context += `\n\n#### Viral Content (10x+ average views):`;
        tt.viralContent.forEach((video, i) => {
          context += `\n${i + 1}. ${video.views?.toLocaleString() || 0} views (${video.performanceVsAverage}x average)`;
        });
      }

      if (tt.bestContent?.length > 0) {
        context += `\n\n#### Best Performing Content (Top 3 by engagement rate):`;
        tt.bestContent.forEach((video, i) => {
          context += `\n${i + 1}. ${video.engagementRate?.toFixed(2) || 0}% engagement - ${video.views?.toLocaleString() || 0} views`;
        });
      }

      if (tt.advertising) {
        context += `\n\n#### TikTok Advertising Status:
- Running TikTok Ads: ${tt.advertising.isAdvertising ? 'YES' : 'NO'}
- Ads Found in Search: ${tt.advertising.adsFound || 0}`;
      }
    }

    // YouTube
    if (sm.platforms?.youtube && !sm.platforms.youtube._error) {
      const yt = sm.platforms.youtube;
      context += `\n\n### YouTube (${yt.handle ? '@' + yt.handle : yt.displayName})
- Subscribers: ${yt.subscribers?.toLocaleString() || 0}
- Total Views: ${yt.totalViews?.toLocaleString() || 0}
- Videos: ${yt.videoCount || 0}
- Avg Views per Video: ${yt.metrics?.avgViewsPerVideo?.toLocaleString() || 0}
- View-to-Subscriber Ratio: ${yt.metrics?.viewToSubRatio || 0}
- Posting Frequency: ~${yt.metrics?.postingFrequency || 0} videos/month`;

      if (yt.contentMix) {
        context += `\n\n#### Content Mix:
- Regular Videos: ${yt.contentMix.videos || 0}
- Shorts: ${yt.contentMix.shorts || 0}`;
      }

      if (yt.bestContent?.length > 0) {
        context += `\n\n#### Best Performing Videos:`;
        yt.bestContent.forEach((video, i) => {
          context += `\n${i + 1}. "${video.title?.substring(0, 50) || 'Untitled'}..." - ${video.views?.toLocaleString() || 0} views`;
        });
      }
    }

    // Facebook
    if (sm.platforms?.facebook && !sm.platforms.facebook._error) {
      const fb = sm.platforms.facebook;
      context += `\n\n### Facebook (${fb.name})
- Followers: ${fb.followers?.toLocaleString() || 0}
- Page Likes: ${fb.likes?.toLocaleString() || 0}
- Category: ${fb.category || 'Unknown'}
- Basic Ad Status: ${fb.adStatus ? 'YES - Running Ads' : 'NO or Unknown'}`;

      if (fb.advertising) {
        context += `\n\n#### Facebook Advertising Analysis:
- Running Facebook/Instagram Ads: ${fb.advertising.isAdvertising ? 'YES' : 'NO'}
- Active Ads Found: ${fb.advertising.activeAds || 0}
- Ad Types: ${fb.advertising.adTypes?.join(', ') || 'None detected'}`;
        if (fb.advertising.recentAds?.length > 0) {
          context += `\n\n#### Recent Ad Creatives:`;
          fb.advertising.recentAds.forEach((ad, i) => {
            context += `\n${i + 1}. "${ad.headline?.substring(0, 50) || 'No headline'}" (${ad.type})`;
          });
        }
      }
    }

    // Top performing content
    if (sm.topContent?.length > 0) {
      context += `\n\n### Top Performing Content (by engagement):`;
      sm.topContent.slice(0, 3).forEach((content, i) => {
        context += `\n${i + 1}. [${content.platform}] ${content.engagement?.toLocaleString() || 0} engagements`;
      });
    }

    // Advertising Summary
    context += `\n\n### Advertising Summary`;
    const fbAds = sm.platforms?.facebook?.advertising;
    const ttAds = sm.platforms?.tiktok?.advertising;
    const hasAnyAds = fbAds?.isAdvertising || ttAds?.isAdvertising;

    if (hasAnyAds) {
      context += `\n- PAID ADVERTISING DETECTED`;
      if (fbAds?.isAdvertising) {
        context += `\n- Facebook/Instagram: ${fbAds.activeAds || 0} active ads`;
      }
      if (ttAds?.isAdvertising) {
        context += `\n- TikTok: Ads found matching business name`;
      }
    } else {
      context += `\n- NO PAID ADVERTISING DETECTED on Facebook or TikTok`;
      context += `\n- Consider: Paid social advertising could accelerate growth`;
    }

  } else if (data.socialMediaData?._error) {
    context += `\n\n## Social Media Analytics
- NOT AVAILABLE: ${data.socialMediaData._error}
- For Social Media category: note data was unavailable, recommend manual verification`;
  } else {
    context += `\n\n## Social Media Analytics
- NOT PROVIDED (no social media URLs submitted)
- For Social Media category: assess based on website social links only`;
  }

  return context;
}

/**
 * Generate display-friendly metrics from scoring engine breakdown
 * This ensures actual data values are shown, not Claude's potentially incorrect values
 */
function generateMetricsFromBreakdown(categoryKey, breakdown) {
  if (!breakdown) return [];

  const metrics = [];

  switch (categoryKey) {
    case 'social_media':
      if (breakdown.total_followers) {
        metrics.push({
          label: 'Total Followers',
          value: breakdown.total_followers.value !== null
            ? breakdown.total_followers.value.toLocaleString()
            : 'Not available',
          status: getMetricStatus(breakdown.total_followers.score),
          source: breakdown.total_followers.source
        });
      }
      if (breakdown.engagement_rate) {
        metrics.push({
          label: 'Engagement Rate',
          value: breakdown.engagement_rate.value !== null
            ? `${breakdown.engagement_rate.value.toFixed(2)}%`
            : 'Not available',
          status: getMetricStatus(breakdown.engagement_rate.score),
          source: breakdown.engagement_rate.source
        });
      }
      if (breakdown.platform_presence) {
        metrics.push({
          label: 'Platforms Active',
          value: breakdown.platform_presence.value !== null
            ? `${breakdown.platform_presence.value} platforms`
            : 'Not available',
          status: getMetricStatus(breakdown.platform_presence.score),
          source: breakdown.platform_presence.source
        });
      }
      if (breakdown.posting_frequency) {
        metrics.push({
          label: 'Posting Frequency',
          value: breakdown.posting_frequency.value !== null
            ? `${breakdown.posting_frequency.value} posts/month`
            : 'Not available',
          status: getMetricStatus(breakdown.posting_frequency.score),
          source: breakdown.posting_frequency.source
        });
      }
      break;

    case 'reviews_reputation':
      if (breakdown.google_rating) {
        metrics.push({
          label: 'Google Rating',
          value: breakdown.google_rating.value !== null
            ? `${breakdown.google_rating.value.toFixed(1)} / 5.0`
            : 'Not available',
          status: getMetricStatus(breakdown.google_rating.score),
          source: breakdown.google_rating.source
        });
      }
      if (breakdown.review_volume) {
        metrics.push({
          label: 'Total Reviews',
          value: breakdown.review_volume.value !== null
            ? breakdown.review_volume.value.toLocaleString()
            : 'Not available',
          status: getMetricStatus(breakdown.review_volume.score),
          source: breakdown.review_volume.source
        });
      }
      break;

    case 'website_technical':
      if (breakdown.desktop_speed) {
        metrics.push({
          label: 'Desktop Speed',
          value: breakdown.desktop_speed.value !== null
            ? `${breakdown.desktop_speed.value}/100`
            : 'Not available',
          status: getMetricStatus(breakdown.desktop_speed.score),
          source: breakdown.desktop_speed.source
        });
      }
      if (breakdown.mobile_speed) {
        metrics.push({
          label: 'Mobile Speed',
          value: breakdown.mobile_speed.value !== null
            ? `${breakdown.mobile_speed.value}/100`
            : 'Not available',
          status: getMetricStatus(breakdown.mobile_speed.score),
          source: breakdown.mobile_speed.source
        });
      }
      if (breakdown.ssl_security) {
        metrics.push({
          label: 'SSL Security',
          value: breakdown.ssl_security.value ? 'Secure' : 'Not Secure',
          status: breakdown.ssl_security.value ? 'good' : 'critical',
          source: breakdown.ssl_security.source
        });
      }
      break;

    case 'booking_conversion':
      if (breakdown.booking_capability) {
        metrics.push({
          label: 'Online Booking',
          value: breakdown.booking_capability.value ? 'Available' : 'Not Found',
          status: breakdown.booking_capability.value ? 'good' : 'critical',
          source: breakdown.booking_capability.source
        });
      }
      if (breakdown.phone_visibility) {
        metrics.push({
          label: 'Phone Visible',
          value: breakdown.phone_visibility.value ? 'Yes' : 'No',
          status: breakdown.phone_visibility.value ? 'good' : 'warning',
          source: breakdown.phone_visibility.source
        });
      }
      break;

    default:
      // For other categories, return empty and let Claude's metrics be used
      break;
  }

  return metrics;
}

function getMetricStatus(score) {
  if (score >= 80) return 'good';
  if (score >= 60) return 'warning';
  return 'critical';
}

function getDefaultAssessment() {
  // 6 categories with explicit weights (total = 100%)
  const categories = [
    { key: 'website_technical', title: 'Website & Technical Foundation', weight: 0.15 },
    { key: 'reviews_reputation', title: 'Reviews & Reputation', weight: 0.25 },
    { key: 'booking_conversion', title: 'Online Booking & Conversion', weight: 0.20 },
    { key: 'social_media', title: 'Social Media & Content', weight: 0.20 },
    { key: 'guest_experience', title: 'Digital Guest Experience', weight: 0.10 },
    { key: 'local_visibility', title: 'Local Visibility', weight: 0.10 }
  ];

  const result = {
    overall: {
      grade: 'C',
      score: 50,
      summary: 'Assessment pending detailed analysis.',
      score_breakdown: {}
    },
    categories: {},
    priority_recommendations: [],
    data_quality_summary: {
      high_confidence_data: [],
      low_confidence_areas: ['Assessment data pending'],
      recommendations_for_fuller_picture: []
    }
  };

  categories.forEach(cat => {
    result.categories[cat.key] = {
      grade: 'C',
      score: 50,
      weight: cat.weight,
      title: cat.title,
      summary: 'Detailed analysis pending.',
      data_sources: [],
      metrics: [],
      findings: [],
      recommendations: []
    };

    result.overall.score_breakdown[cat.key] = {
      score: 50,
      weight: cat.weight,
      contribution: 50 * cat.weight
    };
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

function processAssessmentTemplate(template, data) {
  let html = template;

  const placeholders = {
    '{{CLIENT_NAME}}': data.businessName,
    '{{CLIENT_SLUG}}': data.slug,
    '{{WEBSITE_URL}}': data.websiteUrl,
    '{{LOCATION}}': data.location || '',
    '{{ASSESSMENT_DATE}}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    '{{OVERALL_GRADE}}': data.assessmentData.overall?.grade || 'N/A',
    '{{OVERALL_SCORE}}': data.assessmentData.overall?.score || 0,
    '{{OVERALL_SUMMARY}}': data.assessmentData.overall?.summary || '',
    '{{COACH_EMAIL}}': data.coachEmail || 'Your Coach'
  };

  for (const [placeholder, value] of Object.entries(placeholders)) {
    html = html.split(placeholder).join(value || '');
  }

  html = html.replace(
    '<!-- ASSESSMENT_DATA_PLACEHOLDER -->',
    `<script>window.ASSESSMENT_DATA = ${JSON.stringify(data.assessmentData)};</script>`
  );

  return html;
}

function generateBasicAssessmentHtml(data) {
  return `<!DOCTYPE html>
<html><head><title>${data.businessName} - Assessment</title></head>
<body><h1>${data.businessName}</h1><p>Grade: ${data.assessmentData.overall?.grade || 'N/A'}</p></body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// GITHUB COMMIT
// ═══════════════════════════════════════════════════════════════════════════

async function commitToGitHub(files, message) {
  const headers = {
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  try {
    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, { headers });
    const refData = await refRes.json();
    const latestCommitSha = refData.object.sha;

    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, { headers });
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: files.map(f => ({ path: f.path, mode: '100644', type: 'blob', content: f.content }))
      })
    });
    const treeData = await treeRes.json();

    const newCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, tree: treeData.sha, parents: [latestCommitSha] })
    });
    const newCommitData = await newCommitRes.json();

    await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: newCommitData.sha })
    });

    return { commitUrl: newCommitData.html_url };
  } catch (err) {
    return { error: err.message };
  }
}
