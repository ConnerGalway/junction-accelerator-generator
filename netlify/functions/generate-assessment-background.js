// Netlify Function: Generate Assessment
// Analyzes a business's digital marketing presence and generates an assessment dashboard

import { createClient } from '@supabase/supabase-js';


// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function handler(event, context) {
  // Debug: Log immediately
  console.log('[DEBUG] Function invoked, method:', event.httpMethod);

  // Debug: Add test mode to verify function works
  const url = new URL(event.rawUrl || `https://x.com${event.path}`);
  if (url.searchParams.get('test') === '1') {
    return {
      statusCode: 200,
      body: JSON.stringify({ test: true, message: 'Function is working!' })
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  console.log('[STEP 0] POST request received');

  // Initialize Supabase client early for error tracking
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let slug = null; // Track slug for error recording

  try {
    console.log('[STEP 1] Parsing request body');
    // Parse request body
    const body = JSON.parse(event.body);
    const { businessName, websiteUrl, location, social } = body;
    slug = body.slug;
    console.log('[STEP 1] Business:', businessName, 'Slug:', slug);

    // Validate required fields
    if (!businessName || !slug || !websiteUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: businessName, slug, websiteUrl' })
      };
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid slug format' })
      };
    }

    // Validate URL
    try {
      new URL(websiteUrl);
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid website URL' })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. CREATE RECORD IMMEDIATELY (for error tracking)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[STEP 1b] Creating initial record for tracking');

    // Try to create record - this will fail if slug exists (which is fine)
    const { error: insertError } = await supabaseAdmin
      .from('client_assessments')
      .insert({
        client_slug: slug,
        business_name: businessName,
        website_url: websiteUrl,
        location: location || null,
        social_instagram: social?.instagram || null,
        social_facebook: social?.facebook || null,
        social_tiktok: social?.tiktok || null,
        social_youtube: social?.youtube || null,
        social_pinterest: social?.pinterest || null,
        social_twitter: social?.twitter || null,
        social_linkedin: social?.linkedin || null,
        status: 'processing',
        error_message: 'Progress: Validating request',
        created_by: 'pending-auth'
      });

    if (insertError) {
      // Check if it's a duplicate key error
      if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
        return {
          statusCode: 409,
          body: JSON.stringify({ error: 'An assessment with this slug already exists' })
        };
      }
      console.error('Failed to create assessment record:', insertError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create assessment record: ' + insertError.message })
      };
    }

    // Helper to update progress (for debugging)
    const updateProgress = async (step) => {
      try {
        await supabaseAdmin
          .from('client_assessments')
          .update({ error_message: `Progress: ${step}` })
          .eq('client_slug', slug);
      } catch (e) {
        console.error('Failed to update progress:', e);
      }
    };

    // Helper to mark as failed
    const markFailed = async (errorMsg) => {
      try {
        await supabaseAdmin
          .from('client_assessments')
          .update({ status: 'failed', error_message: errorMsg })
          .eq('client_slug', slug);
      } catch (e) {
        console.error('Failed to mark as failed:', e);
      }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 2. VERIFY AUTH
    // ─────────────────────────────────────────────────────────────────────────
    await updateProgress('Verifying authentication');
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      await markFailed('Authentication required');
      return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required' }) };
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      await markFailed('Invalid token');
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
    }

    // Update the created_by field with actual user
    await supabaseAdmin
      .from('client_assessments')
      .update({ created_by: user.email })
      .eq('client_slug', slug);

    // Check user role (admin or psm required)
    await updateProgress('Checking permissions');
    const { data: roleRows } = await supabaseAdmin
      .from('user_plans')
      .select('role')
      .eq('email', user.email)
      .eq('active', true)
      .in('role', ['admin', 'psm']);

    if (!roleRows || roleRows.length === 0) {
      await markFailed('Admin or PSM role required');
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin or PSM role required' }) };
    }

    console.log('[STEP 2] Auth verified');
    await updateProgress('Authentication verified')

    console.log('[STEP 4] Fetching SEOptimer data');
    // ─────────────────────────────────────────────────────────────────────────
    // 4. FETCH SEOPTIMER DATA (REQUIRED)
    // ─────────────────────────────────────────────────────────────────────────
    if (!process.env.SEOPTIMER_API_KEY) {
      await supabaseAdmin
        .from('client_assessments')
        .update({ status: 'failed', error_message: 'SEOPTIMER_API_KEY not configured' })
        .eq('client_slug', slug);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'SEOPTIMER_API_KEY is not configured. Add it to Netlify environment variables.' })
      };
    }

    await updateProgress('Fetching SEOptimer data (this may take 1-2 minutes)');
    let seoptData = null;
    try {
      seoptData = await fetchSEOptimerReport(websiteUrl);
      await updateProgress('SEOptimer complete');
    } catch (err) {
      console.error('SEOptimer error (non-fatal):', err.message);
      await updateProgress('SEOptimer failed (non-fatal), continuing...');
      // SEOptimer failure is non-fatal - continue without SEO data
      // The assessment will still be generated with available information
      seoptData = {
        _error: err.message,
        _note: 'SEOptimer data unavailable - assessment generated with limited technical SEO data'
      };
    }

    console.log('[STEP 4] SEOptimer data received');

    // ─────────────────────────────────────────────────────────────────────────
    // 4b. FETCH GOOGLE PLACES DATA (REVIEWS)
    // ─────────────────────────────────────────────────────────────────────────
    await updateProgress('Fetching Google Places data');
    let googlePlacesData = null;
    if (process.env.GOOGLE_PLACES_API_KEY) {
      console.log('[STEP 4b] Fetching Google Places data');
      try {
        googlePlacesData = await fetchGooglePlacesData(businessName, location);
        console.log('[STEP 4b] Google Places data received:', googlePlacesData ? 'success' : 'not found');
        await updateProgress('Google Places complete');
      } catch (err) {
        console.error('Google Places error (non-fatal):', err.message);
        await updateProgress('Google Places failed (non-fatal)');
        googlePlacesData = {
          _error: err.message,
          _note: 'Google Places data unavailable'
        };
      }
    } else {
      console.log('[STEP 4b] GOOGLE_PLACES_API_KEY not configured, skipping');
      await updateProgress('Google Places skipped (no API key)');
    }
    // ─────────────────────────────────────────────────────────────────────────
    // 4c. ANALYZE WEBSITE CONTENT (Tourism-specific signals)
    // ─────────────────────────────────────────────────────────────────────────
    await updateProgress('Analyzing website content');
    let websiteAnalysis = null;
    console.log('[STEP 4c] Analyzing website content');
    try {
      websiteAnalysis = await analyzeWebsiteContent(websiteUrl);
      console.log('[STEP 4c] Website analysis complete');
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
      console.log('[STEP 4d] Verifying Google Places data');
      googlePlacesData = verifyGooglePlacesMatch(googlePlacesData, websiteUrl);
      googlePlacesData = filterRecentReviews(googlePlacesData, 18);

      if (googlePlacesData._verification && !googlePlacesData._verification.verified) {
        console.log('[STEP 4d] Warning: Google Places verification issues:', googlePlacesData._verification.warnings);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4e. FETCH SOCIAL MEDIA DATA (SociaVault)
    // ─────────────────────────────────────────────────────────────────────────
    let socialMediaData = null;
    if (social && Object.values(social).some(url => url)) {
      console.log('[STEP 4e] Fetching social media data from SociaVault');
      await updateProgress('Analyzing social media profiles');
      try {
        socialMediaData = await fetchSocialMediaData(social);
        console.log('[STEP 4e] Social media analysis complete:', socialMediaData?.summary);
        await updateProgress('Social media analysis complete');
      } catch (err) {
        console.error('[STEP 4e] Social media fetch error (non-fatal):', err.message);
        await updateProgress('Social media analysis failed (non-fatal)');
        socialMediaData = {
          _error: err.message,
          _note: 'Social media analysis unavailable'
        };
      }
    } else {
      console.log('[STEP 4e] No social media URLs provided, skipping');
      await updateProgress('No social media URLs provided');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. GENERATE ASSESSMENT WITH CLAUDE
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[STEP 5] Generating assessment with Claude');
    await updateProgress('Generating assessment with Claude (this may take 30-60 seconds)');
    const assessmentData = await generateAssessmentWithClaude({
      businessName,
      websiteUrl,
      location,
      social,
      seoptData,
      googlePlacesData,
      websiteAnalysis,
      socialMediaData
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
      console.warn('[STEP 5b] QA issues found:', qaResult.issues);
    }
    if (qaResult.warnings.length > 0) {
      console.warn('[STEP 5b] QA warnings:', qaResult.warnings);
    }

    // Attach QA result to assessment
    assessmentData._qa = qaResult;

    console.log('[STEP 5] Claude assessment generated, data:', JSON.stringify(assessmentData).substring(0, 200));

    // Verify we have valid assessment data before saving
    if (!assessmentData || !assessmentData.overall) {
      console.error('[STEP 5] Invalid assessment data from Claude:', assessmentData);
      await markFailed('Claude returned invalid assessment data');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Assessment generation failed - invalid data returned' })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. UPDATE ASSESSMENT RECORD WITH DATA
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[STEP 6] Updating Supabase with assessment data');
    await updateProgress('Saving assessment to database');

    const { data: savedData, error: updateError } = await supabaseAdmin
      .from('client_assessments')
      .update({
        assessment_data: assessmentData,
        seoptimer_raw: seoptData,
        google_places_raw: googlePlacesData,
        website_analysis_raw: websiteAnalysis,
        social_media_raw: socialMediaData,
        overall_score: assessmentData.overall?.score || null,
        overall_grade: assessmentData.overall?.grade || null,
        status: 'completed',
        error_message: null
      })
      .eq('client_slug', slug)
      .select();

    if (updateError) {
      console.error('[STEP 6] Failed to update assessment:', updateError);
      await markFailed('Failed to save assessment: ' + updateError.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to save assessment data' })
      };
    }

    console.log('[STEP 6] Assessment saved successfully, rows affected:', savedData?.length || 0);

    // NOTE: Assessment is now complete in database. GitHub commit is just for publishing
    // and should not block the assessment from being marked complete.

    console.log('[STEP 7] Fetching template from GitHub');
    // ─────────────────────────────────────────────────────────────────────────
    // 7. FETCH TEMPLATE AND GENERATE HTML
    // ─────────────────────────────────────────────────────────────────────────
    await updateProgress('Publishing to web (fetching template)');
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
        assessmentData,
        coachEmail: user.email
      });
    } else {
      // Generate basic HTML if template not found
      html = generateBasicAssessmentHtml({
        businessName,
        slug,
        websiteUrl,
        assessmentData
      });
    }

    console.log('[STEP 8] Committing to GitHub');
    // ─────────────────────────────────────────────────────────────────────────
    // 8. COMMIT TO GITHUB (non-fatal - assessment is already saved)
    // ─────────────────────────────────────────────────────────────────────────
    await updateProgress('Publishing to web (committing)');
    let commitResult = { commitUrl: null };
    try {
      commitResult = await commitToGitHub([
        { path: `clients/${slug}/index.html`, content: html }
      ], `Add assessment: ${businessName}`);

      if (commitResult.error) {
        console.error('[STEP 8] GitHub commit error (non-fatal):', commitResult.error);
      }
    } catch (gitErr) {
      console.error('[STEP 8] GitHub commit exception (non-fatal):', gitErr.message);
      // Don't fail the assessment - it's already saved in database
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. CREATE USER_PLANS ENTRY FOR CLIENT ACCESS
    // ─────────────────────────────────────────────────────────────────────────
    // Note: We don't have a client email yet - they'll be invited later
    // For now, just ensure the slug is accessible

    // ─────────────────────────────────────────────────────────────────────────
    // 10. SUCCESS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[STEP 9] SUCCESS! Assessment complete for:', slug);
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        slug,
        projectUrl: `/${slug}/`,
        commitUrl: commitResult.commitUrl,
        assessmentData: {
          overallGrade: assessmentData.overall?.grade,
          overallScore: assessmentData.overall?.score
        }
      })
    };

  } catch (err) {
    console.error('Unexpected error:', err);

    // Update Supabase status to 'failed' so frontend stops polling
    if (slug) {
      try {
        await supabaseAdmin
          .from('client_assessments')
          .update({
            status: 'failed',
            error_message: `Error: ${err.message || 'Unknown error'}`
          })
          .eq('client_slug', slug);
      } catch (updateErr) {
        console.error('Failed to update error status:', updateErr);
      }
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal server error' })
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SEOPTIMER API INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

async function fetchSEOptimerReport(websiteUrl) {
  // Strip protocol and trailing slashes - SEOptimer expects just the domain
  let cleanUrl = websiteUrl
    .replace(/^https?:\/\//, '')  // Remove http:// or https://
    .replace(/\/+$/, '');          // Remove trailing slashes

  console.log('[SEOptimer] Starting report creation for:', cleanUrl, '(original:', websiteUrl, ')');

  if (!process.env.SEOPTIMER_API_KEY) {
    throw new Error('SEOPTIMER_API_KEY not configured');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-api-key': process.env.SEOPTIMER_API_KEY
  };

  console.log('[SEOptimer] Using API key starting with:', process.env.SEOPTIMER_API_KEY?.substring(0, 8) + '...');

  // Step 1: Create the report
  console.log('[SEOptimer] Calling create endpoint with URL:', cleanUrl);
  const createResponse = await fetch('https://api.seoptimer.com/v1/report/create', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      url: cleanUrl,
      pdf: 0  // Don't need PDF
    })
  });

  if (!createResponse.ok) {
    const text = await createResponse.text();
    throw new Error(`SEOptimer create report failed: ${createResponse.status} - ${text}`);
  }

  const createResult = await createResponse.json();

  if (!createResult.success || !createResult.data?.id) {
    throw new Error(`SEOptimer create report failed: ${JSON.stringify(createResult)}`);
  }

  const reportId = createResult.data.id;
  console.log('[SEOptimer] Report created with ID:', reportId);

  // Step 2: Poll for the report results (may take a while for complex sites)
  const maxAttempts = 40;  // Max 40 attempts
  const pollInterval = 2000;  // 2 seconds between attempts (80 seconds max)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(`[SEOptimer] Polling attempt ${attempt + 1}/${maxAttempts}`);
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    const getResponse = await fetch(`https://api.seoptimer.com/v1/report/get/${reportId}`, {
      method: 'GET',
      headers
    });

    if (!getResponse.ok) {
      const text = await getResponse.text();
      throw new Error(`SEOptimer get report failed: ${getResponse.status} - ${text}`);
    }

    const reportData = await getResponse.json();

    // Check if report is ready
    if (reportData.success && reportData.data) {
      return reportData.data;
    }

    // If not ready yet, continue polling
    if (reportData.success === false && reportData.message?.includes('processing')) {
      continue;
    }
  }

  throw new Error('SEOptimer report timed out - took too long to generate');
}

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE PLACES API INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

async function fetchGooglePlacesData(businessName, location) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY not configured');
  }

  // Build search query
  const searchQuery = location
    ? `${businessName} ${location}`
    : businessName;

  console.log('[Google Places] Searching for:', searchQuery);

  // Step 1: Find Place from Text
  const findPlaceUrl = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
  findPlaceUrl.searchParams.set('input', searchQuery);
  findPlaceUrl.searchParams.set('inputtype', 'textquery');
  findPlaceUrl.searchParams.set('fields', 'place_id,name,formatted_address');
  findPlaceUrl.searchParams.set('key', apiKey);

  const findResponse = await fetch(findPlaceUrl.toString());
  if (!findResponse.ok) {
    throw new Error(`Google Places Find failed: ${findResponse.status}`);
  }

  const findResult = await findResponse.json();

  if (findResult.status !== 'OK' || !findResult.candidates || findResult.candidates.length === 0) {
    console.log('[Google Places] No results found for:', searchQuery);
    return null;
  }

  const placeId = findResult.candidates[0].place_id;
  console.log('[Google Places] Found place_id:', placeId);

  // Step 2: Get Place Details (including reviews)
  const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  detailsUrl.searchParams.set('place_id', placeId);
  detailsUrl.searchParams.set('fields', 'name,rating,user_ratings_total,reviews,price_level,website,formatted_phone_number,opening_hours,types');
  detailsUrl.searchParams.set('key', apiKey);

  const detailsResponse = await fetch(detailsUrl.toString());
  if (!detailsResponse.ok) {
    throw new Error(`Google Places Details failed: ${detailsResponse.status}`);
  }

  const detailsResult = await detailsResponse.json();

  if (detailsResult.status !== 'OK' || !detailsResult.result) {
    console.log('[Google Places] Could not get details for place_id:', placeId);
    return null;
  }

  const place = detailsResult.result;

  // Extract and format the data we need
  const placesData = {
    name: place.name,
    rating: place.rating || null,
    totalReviews: place.user_ratings_total || 0,
    priceLevel: place.price_level || null,
    website: place.website || null,
    phone: place.formatted_phone_number || null,
    businessTypes: place.types || [],
    isOpen: place.opening_hours?.open_now || null,
    // Get up to 5 recent reviews (Google API provides up to 5)
    recentReviews: (place.reviews || []).slice(0, 5).map(r => ({
      rating: r.rating,
      text: r.text?.substring(0, 300) || '', // Truncate long reviews
      relativeTime: r.relative_time_description,
      authorName: r.author_name
    }))
  };

  console.log('[Google Places] Data extracted:', {
    name: placesData.name,
    rating: placesData.rating,
    totalReviews: placesData.totalReviews,
    reviewCount: placesData.recentReviews.length
  });

  return placesData;
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBSITE CONTENT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeWebsiteContent(websiteUrl) {
  console.log('[Website Analysis] Fetching:', websiteUrl);

  try {
    // Fetch the website HTML
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

    // Extract key tourism-relevant content signals
    const analysis = {
      // Booking/Reservation presence
      hasBookingLink: detectBookingPresence(html, htmlLower),
      bookingPlatforms: detectBookingPlatforms(htmlLower),

      // Contact information
      hasPhone: detectPhone(html),
      hasEmail: detectEmail(html),
      hasAddress: detectAddress(htmlLower),

      // Hours/Availability
      hasHours: detectHours(htmlLower),

      // Pricing signals
      hasPricing: detectPricing(html, htmlLower),

      // Visual content
      imageCount: countImages(html),
      hasVideoEmbed: detectVideo(htmlLower),

      // Navigation/UX signals
      hasMobileViewport: html.includes('viewport'),
      hasSSL: websiteUrl.startsWith('https'),

      // Tourism-specific content
      hasDirections: detectDirections(htmlLower),
      hasParking: htmlLower.includes('parking'),
      hasAccessibility: detectAccessibility(htmlLower),
      hasMultiLanguage: detectMultiLanguage(html),

      // Social links on site
      socialLinksOnSite: detectSocialLinks(htmlLower),

      // Page size (affects mobile experience)
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
  const bookingKeywords = [
    'book now', 'book online', 'reserve', 'reservation', 'make a booking',
    'check availability', 'book a table', 'book a room', 'book your',
    'schedule', 'appointment', 'buy tickets', 'purchase tickets',
    'add to cart', 'book tour', 'reserve now'
  ];

  return bookingKeywords.some(kw => htmlLower.includes(kw));
}

function detectBookingPlatforms(htmlLower) {
  const platforms = [];

  if (htmlLower.includes('booking.com')) platforms.push('Booking.com');
  if (htmlLower.includes('expedia')) platforms.push('Expedia');
  if (htmlLower.includes('tripadvisor')) platforms.push('TripAdvisor');
  if (htmlLower.includes('viator')) platforms.push('Viator');
  if (htmlLower.includes('getyourguide')) platforms.push('GetYourGuide');
  if (htmlLower.includes('airbnb')) platforms.push('Airbnb');
  if (htmlLower.includes('opentable')) platforms.push('OpenTable');
  if (htmlLower.includes('resy')) platforms.push('Resy');
  if (htmlLower.includes('yelp.com/reservations')) platforms.push('Yelp Reservations');
  if (htmlLower.includes('fareharbor')) platforms.push('FareHarbor');
  if (htmlLower.includes('checkfront')) platforms.push('Checkfront');
  if (htmlLower.includes('rezdy')) platforms.push('Rezdy');
  if (htmlLower.includes('bookeo')) platforms.push('Bookeo');
  if (htmlLower.includes('squareup') || htmlLower.includes('square appointments')) platforms.push('Square');
  if (htmlLower.includes('calendly')) platforms.push('Calendly');

  return platforms;
}

function detectPhone(html) {
  // Look for phone patterns (various formats)
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
  // Look for address indicators
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
  // Look for pricing signals
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
  // Check for language switchers or hreflang tags
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

  // Process each platform in parallel
  const platformPromises = [];

  // Instagram
  if (socialUrls?.instagram) {
    platformPromises.push(
      fetchInstagramData(socialUrls.instagram, headers)
        .then(data => { results.platforms.instagram = data; })
        .catch(err => { results.platforms.instagram = { _error: err.message }; })
    );
  }

  // TikTok
  if (socialUrls?.tiktok) {
    platformPromises.push(
      fetchTikTokData(socialUrls.tiktok, headers)
        .then(data => { results.platforms.tiktok = data; })
        .catch(err => { results.platforms.tiktok = { _error: err.message }; })
    );
  }

  // YouTube
  if (socialUrls?.youtube) {
    platformPromises.push(
      fetchYouTubeData(socialUrls.youtube, headers)
        .then(data => { results.platforms.youtube = data; })
        .catch(err => { results.platforms.youtube = { _error: err.message }; })
    );
  }

  // Facebook
  if (socialUrls?.facebook) {
    platformPromises.push(
      fetchFacebookData(socialUrls.facebook, headers)
        .then(data => { results.platforms.facebook = data; })
        .catch(err => { results.platforms.facebook = { _error: err.message }; })
    );
  }

  // Wait for all platforms to complete
  await Promise.all(platformPromises);

  // Calculate summary
  Object.entries(results.platforms).forEach(([platform, data]) => {
    if (data && !data._error) {
      results.summary.platformsAnalyzed.push(platform);
      results.summary.platformsFound++;
      results.summary.totalFollowers += data.followers || 0;
    }
  });

  // Aggregate top content across platforms
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

  // Fetch profile
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

  // Fetch recent posts for engagement calculation
  let posts = [];
  let avgLikes = 0;
  let avgComments = 0;
  let engagementRate = 0;

  try {
    const postsRes = await fetch(
      `https://api.sociavault.com/v1/scrape/instagram/posts?handle=${encodeURIComponent(handle)}&trim=true`,
      { headers }
    );

    if (postsRes.ok) {
      const postsData = await postsRes.json();
      posts = postsData.data?.items || [];

      if (posts.length > 0) {
        const totalLikes = posts.reduce((sum, p) => sum + (p.like_count || 0), 0);
        const totalComments = posts.reduce((sum, p) => sum + (p.comment_count || 0), 0);
        avgLikes = Math.round(totalLikes / posts.length);
        avgComments = Math.round(totalComments / posts.length);

        const followers = user.edge_followed_by?.count || user.follower_count || 0;
        if (followers > 0) {
          engagementRate = ((avgLikes + avgComments) / followers * 100).toFixed(2);
        }
      }
    }
  } catch (postsErr) {
    console.error('[SociaVault] Instagram posts fetch error (non-fatal):', postsErr.message);
  }

  return {
    platform: 'instagram',
    handle: user.username || handle,
    displayName: user.full_name || '',
    bio: user.biography || '',
    followers: user.edge_followed_by?.count || user.follower_count || 0,
    following: user.edge_follow?.count || user.following_count || 0,
    postCount: user.edge_owner_to_timeline_media?.count || user.media_count || 0,
    verified: user.is_verified || false,
    profilePicUrl: user.profile_pic_url_hd || user.profile_pic_url || '',
    externalUrl: user.external_url || '',
    metrics: {
      avgLikes,
      avgComments,
      engagementRate: parseFloat(engagementRate) || 0
    },
    recentPosts: posts.slice(0, 5).map(p => ({
      id: p.id || p.code,
      type: p.media_type === 2 ? 'video' : (p.media_type === 8 ? 'carousel' : 'image'),
      likes: p.like_count || 0,
      comments: p.comment_count || 0,
      views: p.play_count || null,
      timestamp: p.taken_at,
      caption: p.caption?.text?.substring(0, 150) || ''
    })),
    _creditsUsed: 2 // profile + posts
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
  const videos = profileData.data?.itemList || [];

  // Calculate engagement from recent videos
  let avgViews = 0;
  let avgLikes = 0;
  let avgComments = 0;
  let engagementRate = 0;

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
  }

  return {
    platform: 'tiktok',
    handle: user.uniqueId || handle,
    displayName: user.nickname || '',
    bio: user.signature || '',
    followers: stats.followerCount || 0,
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
      engagementRate: parseFloat(engagementRate) || 0
    },
    recentVideos: videos.slice(0, 5).map(v => ({
      id: v.id,
      views: v.stats?.playCount || 0,
      likes: v.stats?.diggCount || 0,
      comments: v.stats?.commentCount || 0,
      shares: v.stats?.shareCount || 0,
      caption: v.desc?.substring(0, 150) || ''
    })),
    _creditsUsed: 1
  };
}

async function fetchYouTubeData(url, headers) {
  // Extract channel handle or ID from URL
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

  return {
    platform: 'youtube',
    handle: data.handle || '',
    displayName: data.name || '',
    description: data.description?.substring(0, 300) || '',
    subscribers: data.subscriberCount || 0,
    subscriberText: data.subscriberCountText || '',
    totalViews: data.viewCount || 0,
    videoCount: data.videoCount || 0,
    joinedDate: data.joinedDateText || '',
    country: data.country || '',
    profilePicUrl: data.avatar?.image?.sources?.[0]?.url || '',
    links: data.links || {},
    tags: data.tags || '',
    metrics: {
      avgViewsPerVideo: data.videoCount > 0 ? Math.round(data.viewCount / data.videoCount) : 0
    },
    _creditsUsed: 1
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
    _creditsUsed: 1
  };
}

// Helper functions to extract handles from URLs
function extractInstagramHandle(url) {
  if (!url) return null;
  // Handle formats: instagram.com/username, instagram.com/username/, @username
  const match = url.match(/instagram\.com\/([^\/\?]+)/i) || url.match(/^@?([a-zA-Z0-9._]+)$/);
  return match ? match[1].replace('@', '') : null;
}

function extractTikTokHandle(url) {
  if (!url) return null;
  // Handle formats: tiktok.com/@username, @username
  const match = url.match(/tiktok\.com\/@([^\/\?]+)/i) || url.match(/^@([a-zA-Z0-9._]+)$/);
  return match ? match[1] : null;
}

function extractYouTubeChannel(url) {
  if (!url) return null;

  // Handle format: youtube.com/@handle
  let match = url.match(/youtube\.com\/@([^\/\?]+)/i);
  if (match) return { type: 'handle', value: match[1] };

  // Handle format: youtube.com/channel/UC...
  match = url.match(/youtube\.com\/channel\/([^\/\?]+)/i);
  if (match) return { type: 'channelId', value: match[1] };

  // Handle format: youtube.com/c/channelname
  match = url.match(/youtube\.com\/c\/([^\/\?]+)/i);
  if (match) return { type: 'handle', value: match[1] };

  // Handle format: youtube.com/user/username
  match = url.match(/youtube\.com\/user\/([^\/\?]+)/i);
  if (match) return { type: 'handle', value: match[1] };

  return null;
}

function aggregateTopContent(platforms) {
  const allContent = [];

  // Collect Instagram posts
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

  // Collect TikTok videos
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

  // Sort by engagement and return top 5
  return allContent
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5);
}

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE PLACES VERIFICATION & FILTERING
// ═══════════════════════════════════════════════════════════════════════════

function verifyGooglePlacesMatch(placesData, websiteUrl) {
  if (!placesData || placesData._error) return placesData;

  const warnings = [];

  // Check if website matches
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

  const thresholdDate = new Date();
  thresholdDate.setMonth(thresholdDate.getMonth() - monthsThreshold);

  // Google reviews have relative_time_description but not exact timestamps
  // We'll keep all reviews but flag the recency concern
  const reviewAnalysis = {
    totalProvided: placesData.recentReviews.length,
    recentCount: 0,
    oldestRelativeTime: null,
    recencyWarning: false
  };

  // Check relative times for staleness indicators
  const staleIndicators = ['year ago', 'years ago', '2 years', '3 years'];

  placesData.recentReviews.forEach(review => {
    const relTime = review.relativeTime?.toLowerCase() || '';

    if (!staleIndicators.some(ind => relTime.includes(ind))) {
      reviewAnalysis.recentCount++;
    }

    // Track oldest
    if (!reviewAnalysis.oldestRelativeTime ||
        relTime.includes('year')) {
      reviewAnalysis.oldestRelativeTime = review.relativeTime;
    }
  });

  // Flag if most reviews are old
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
  if (assessmentData.categories?.review_ecosystem) {
    const reviewCat = assessmentData.categories.review_ecosystem;
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
  // Build context from available data
  const context = buildAssessmentContext(data);

  // Use REST API directly for better compatibility
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 12000,
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
        },
        {
          "label": "Review Volume",
          "value": "USE EXACT NUMBER or 'Manual verification recommended'",
          "benchmark": "100+ reviews builds trust, 200+ establishes authority",
          "status": "based on count",
          "confidence": "high if Google data present, otherwise low",
          "source": "Google Places API",
          "tooltip": "Review count from Google Business Profile"
        },
        {
          "label": "TripAdvisor Presence",
          "value": "Manual verification recommended",
          "benchmark": "Should be claimed with 50+ reviews for tourism businesses",
          "status": "info",
          "confidence": "low",
          "source": "Not scanned - requires manual check",
          "tooltip": "TripAdvisor data not included in automated scan"
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
      "metrics": [
        {
          "label": "Booking Capability",
          "value": "USE hasBookingLink FROM WEBSITE ANALYSIS",
          "benchmark": "Every tourism business needs clear booking path",
          "status": "good if present, critical if not",
          "confidence": "high",
          "source": "Website scrape",
          "tooltip": "Detected from homepage scan"
        },
        {
          "label": "Phone Visibility",
          "value": "USE hasPhone FROM WEBSITE ANALYSIS",
          "benchmark": "Phone should be visible in header/footer",
          "status": "good if present, warning if not",
          "confidence": "high",
          "source": "Website scrape",
          "tooltip": "Phone number detection"
        }
      ],
      "findings": [],
      "recommendations": []
    },
    "social_media": {
      "grade": "B",
      "score": 75,
      "weight": 0.20,
      "title": "Social Media & Content",
      "summary": "Social presence and content engagement across platforms",
      "data_sources": ["SociaVault API"],
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
          "label": "Instagram Engagement Rate",
          "value": "USE engagementRate FROM INSTAGRAM DATA or 'N/A'",
          "benchmark": "Tourism industry: 1-3% is average, 3-6% is good, 6%+ is excellent",
          "status": "good if >3%, warning if <1%",
          "confidence": "high if Instagram data present",
          "source": "SociaVault API",
          "tooltip": "(Avg likes + comments) / followers × 100"
        },
        {
          "label": "Active Platforms",
          "value": "List platforms with verified presence",
          "benchmark": "Tourism businesses should be on 2-3 platforms minimum",
          "status": "based on count",
          "confidence": "high",
          "source": "SociaVault API",
          "tooltip": "Platforms with active accounts"
        },
        {
          "label": "Top Content Performance",
          "value": "Describe highest-engagement recent content",
          "benchmark": "Recent content should show consistent engagement",
          "status": "info",
          "confidence": "high",
          "source": "SociaVault API",
          "tooltip": "Based on recent posts/videos"
        }
      ],
      "findings": [
        {"type": "positive/negative", "text": "Specific finding about social performance", "confidence": "high", "source": "SociaVault"}
      ],
      "recommendations": [
        {
          "text": "Specific social media improvement",
          "time_estimate": "Time required",
          "impact": "Expected result",
          "priority": "high/medium/low"
        }
      ]
    },
    "guest_experience": {
      "grade": "C+",
      "score": 68,
      "weight": 0.10,
      "title": "Digital Guest Experience",
      "summary": "Can visitors find essential info before arriving?",
      "data_sources": ["Website Content Analysis"],
      "metrics": [
        {
          "label": "Hours Displayed",
          "value": "USE hasHours FROM WEBSITE ANALYSIS",
          "benchmark": "Hours must be easily findable",
          "status": "good if YES, critical if NO",
          "confidence": "high",
          "source": "Website scrape",
          "tooltip": "Hours information detection"
        },
        {
          "label": "Directions Available",
          "value": "USE hasDirections FROM WEBSITE ANALYSIS",
          "benchmark": "Map embed or directions link expected",
          "status": "good if YES, warning if NO",
          "confidence": "high",
          "source": "Website scrape",
          "tooltip": "Directions/map detection"
        },
        {
          "label": "Parking Info",
          "value": "USE hasParking FROM WEBSITE ANALYSIS",
          "benchmark": "Parking info reduces visitor friction",
          "status": "good if YES, info if NO",
          "confidence": "high",
          "source": "Website scrape",
          "tooltip": "Parking information detection"
        }
      ],
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

  // Check for errors
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API error:', response.status, errorText);
    throw new Error(`Claude API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log('[Claude] Response received, content length:', result.content?.[0]?.text?.length || 0);

  // Parse the response
  try {
    const content = result.content[0].text;
    console.log('[Claude] First 500 chars:', content.substring(0, 500));

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Claude] No JSON found in response');
      // Return response with raw content for debugging
      const defaultAssessment = getDefaultAssessment();
      defaultAssessment._debug_raw_response = content.substring(0, 2000);
      return defaultAssessment;
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    console.log('[Claude] Extracted JSON length:', jsonStr.length);

    const parsed = JSON.parse(jsonStr);
    console.log('[Claude] Successfully parsed assessment');
    return parsed;
  } catch (parseError) {
    console.error('[Claude] Failed to parse response:', parseError.message);
    const defaultAssessment = getDefaultAssessment();
    defaultAssessment._debug_error = parseError.message;
    defaultAssessment._debug_raw_response = result.content?.[0]?.text?.substring(0, 2000) || 'No content';
    return defaultAssessment;
  }
}

function buildAssessmentContext(data) {
  let context = `## Business Information
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
    // Extract key metrics only (not full JSON dump)
    const seo = data.seoptData;
    context += `\n\n## SEOptimer Technical Data (VERIFIED - FROM API)`;

    // Performance metrics if available
    if (seo.performance) {
      context += `\n### Performance
- Desktop Score: ${seo.performance.desktop_score || 'N/A'}
- Mobile Score: ${seo.performance.mobile_score || 'N/A'}
- Load Time: ${seo.performance.load_time || 'N/A'}`;
    }

    // SEO metrics if available
    if (seo.seo) {
      context += `\n### SEO
- SEO Score: ${seo.seo.score || 'N/A'}
- Meta Title: ${seo.seo.title ? 'Present' : 'Missing'}
- Meta Description: ${seo.seo.description ? 'Present' : 'Missing'}`;
    }

    // Mobile metrics if available
    if (seo.mobile) {
      context += `\n### Mobile
- Mobile Friendly: ${seo.mobile.is_mobile_friendly ? 'YES' : 'NO'}
- Viewport Configured: ${seo.mobile.has_viewport ? 'YES' : 'NO'}`;
    }

    // Security
    if (seo.security) {
      context += `\n### Security
- HTTPS: ${seo.security.https ? 'YES' : 'NO'}`;
    }

    // Include full data for reference
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
- Bio: "${ig.bio?.substring(0, 150) || 'N/A'}"
- External Link: ${ig.externalUrl || 'None'}`;

      if (ig.recentPosts?.length > 0) {
        context += `\n\n#### Recent Posts Performance:`;
        ig.recentPosts.slice(0, 3).forEach((post, i) => {
          context += `\n- Post ${i + 1}: ${post.likes?.toLocaleString() || 0} likes, ${post.comments || 0} comments${post.views ? `, ${post.views.toLocaleString()} views` : ''} (${post.type})`;
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
- Bio: "${tt.bio?.substring(0, 150) || 'N/A'}"
- Bio Link: ${tt.bioLink || 'None'}`;

      if (tt.recentVideos?.length > 0) {
        context += `\n\n#### Recent Videos Performance:`;
        tt.recentVideos.slice(0, 3).forEach((video, i) => {
          context += `\n- Video ${i + 1}: ${video.views?.toLocaleString() || 0} views, ${video.likes?.toLocaleString() || 0} likes, ${video.comments || 0} comments, ${video.shares || 0} shares`;
        });
      }
    }

    // YouTube
    if (sm.platforms?.youtube && !sm.platforms.youtube._error) {
      const yt = sm.platforms.youtube;
      context += `\n\n### YouTube (${yt.handle ? '@' + yt.handle : yt.displayName})
- Subscribers: ${yt.subscribers?.toLocaleString() || 0} (${yt.subscriberText || ''})
- Total Views: ${yt.totalViews?.toLocaleString() || 0}
- Videos: ${yt.videoCount || 0}
- Avg Views per Video: ${yt.metrics?.avgViewsPerVideo?.toLocaleString() || 0}
- Joined: ${yt.joinedDate || 'Unknown'}
- Country: ${yt.country || 'Unknown'}`;
    }

    // Facebook
    if (sm.platforms?.facebook && !sm.platforms.facebook._error) {
      const fb = sm.platforms.facebook;
      context += `\n\n### Facebook (${fb.name})
- Followers: ${fb.followers?.toLocaleString() || 0}
- Page Likes: ${fb.likes?.toLocaleString() || 0}
- Category: ${fb.category || 'Unknown'}
- Running Ads: ${fb.adStatus ? 'YES' : 'NO'}`;
    }

    // Top performing content
    if (sm.topContent?.length > 0) {
      context += `\n\n### Top Performing Content (by engagement):`;
      sm.topContent.slice(0, 3).forEach((content, i) => {
        context += `\n${i + 1}. [${content.platform}] ${content.engagement?.toLocaleString() || 0} engagements - "${content.caption?.substring(0, 50) || 'No caption'}..."`;
      });
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

  // Replace basic placeholders
  const placeholders = {
    '{{CLIENT_NAME}}': data.businessName,
    '{{CLIENT_SLUG}}': data.slug,
    '{{WEBSITE_URL}}': data.websiteUrl,
    '{{LOCATION}}': data.location || '',
    '{{ASSESSMENT_DATE}}': formatDateLong(new Date().toISOString()),
    '{{OVERALL_GRADE}}': data.assessmentData.overall?.grade || 'N/A',
    '{{OVERALL_SCORE}}': data.assessmentData.overall?.score || 0,
    '{{OVERALL_SUMMARY}}': data.assessmentData.overall?.summary || '',
    '{{COACH_EMAIL}}': data.coachEmail || 'Your Coach'
  };

  for (const [placeholder, value] of Object.entries(placeholders)) {
    html = html.split(placeholder).join(value || '');
  }

  // Inject assessment data as JSON for client-side rendering
  html = html.replace(
    '<!-- ASSESSMENT_DATA_PLACEHOLDER -->',
    `<script>window.ASSESSMENT_DATA = ${JSON.stringify(data.assessmentData)};</script>`
  );

  return html;
}

function generateBasicAssessmentHtml(data) {
  const { businessName, slug, assessmentData } = data;
  const assessmentDate = formatDateLong(new Date().toISOString());

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName} — Digital Marketing Assessment</title>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <style>
    :root {
      --navy: #11154b;
      --mint: #aadab6;
      --cream: #fcf5ec;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: var(--cream); }
    .header { background: var(--navy); color: var(--mint); padding: 24px 40px; }
    .header h1 { font-size: 24px; }
    .main { max-width: 1200px; margin: 0 auto; padding: 40px; }
    .grade-card { background: #fff; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 32px; }
    .grade { font-size: 72px; font-weight: 700; color: var(--navy); }
    .score { font-size: 18px; color: #666; }
    .coming-soon { background: #fff; border-radius: 16px; padding: 48px; text-align: center; }
    .coming-soon h2 { color: var(--navy); margin-bottom: 12px; }
    .coming-soon p { color: #666; }
  </style>
</head>
<body data-client-slug="${slug}">
  <header class="header">
    <h1>${businessName}</h1>
    <p>Digital Marketing Assessment — ${assessmentDate}</p>
  </header>
  <main class="main">
    <div class="grade-card">
      <div class="grade">${assessmentData.overall?.grade || 'N/A'}</div>
      <div class="score">Overall Score: ${assessmentData.overall?.score || 0}/100</div>
      <p style="margin-top:16px;color:#666;">${assessmentData.overall?.summary || ''}</p>
    </div>
    <div class="coming-soon">
      <h2>Full Assessment Dashboard Coming Soon</h2>
      <p>Your detailed assessment across all 8 categories is being prepared. Check back soon for the complete analysis.</p>
    </div>
  </main>
  <script src="/shared/supabase-client.js"></script>
  <script src="/shared/auth.js"></script>
  <script>window.ASSESSMENT_DATA = ${JSON.stringify(assessmentData)};</script>
</body>
</html>`;
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

  console.log('[GitHub] Starting commit to', owner, '/', repo, 'branch:', branch);

  // Helper to handle GitHub API responses
  async function handleResponse(res, step) {
    if (!res.ok) {
      const text = await res.text();
      console.error(`[GitHub] ${step} failed:`, res.status, text.substring(0, 200));
      throw new Error(`${step}: ${res.status}`);
    }
    return res.json();
  }

  try {
    // 1. Get latest commit SHA
    console.log('[GitHub] Step 1: Getting branch ref');
    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, { headers });
    const refData = await handleResponse(refRes, 'Get branch ref');
    const latestCommitSha = refData.object.sha;
    console.log('[GitHub] Latest commit:', latestCommitSha.substring(0, 7));

    // 2. Get tree of latest commit
    console.log('[GitHub] Step 2: Getting commit tree');
    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, { headers });
    const commitData = await handleResponse(commitRes, 'Get commit');
    const baseTreeSha = commitData.tree.sha;

    // 3. Create new tree
    console.log('[GitHub] Step 3: Creating new tree');
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: files.map(f => ({
          path: f.path,
          mode: '100644',
          type: 'blob',
          content: f.content
        }))
      })
    });
    const treeData = await handleResponse(treeRes, 'Create tree');
    console.log('[GitHub] New tree created:', treeData.sha.substring(0, 7));

    // 4. Create commit
    console.log('[GitHub] Step 4: Creating commit');
    const newCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        tree: treeData.sha,
        parents: [latestCommitSha]
      })
    });
    const newCommitData = await handleResponse(newCommitRes, 'Create commit');
    console.log('[GitHub] Commit created:', newCommitData.sha.substring(0, 7));

    // 5. Update branch reference
    console.log('[GitHub] Step 5: Updating branch ref');
    const updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: newCommitData.sha })
    });
    await handleResponse(updateRefRes, 'Update branch');

    console.log('[GitHub] Commit complete:', newCommitData.html_url);
    return { commitUrl: newCommitData.html_url };

  } catch (err) {
    console.error('[GitHub] Error:', err.message);
    return { error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function formatDateLong(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
