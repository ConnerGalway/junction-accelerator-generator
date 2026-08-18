// Netlify Function: Generate Milestone Assessment
// Generates 30-day, 60-day, or 90-day milestone assessments with comparison to initial

import { createClient } from '@supabase/supabase-js';
import { calculateAllScores } from '../../shared/scoring-engine.js';
import { SCORING_ENGINE_VERSION } from '../../shared/rubrics.js';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function handler(event, context) {
  const DEBUG = process.env.DEBUG === 'true';

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Initialize Supabase client
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let clientSlug = null;
  let milestoneType = null;

  try {
    // Parse request body
    const body = JSON.parse(event.body);
    clientSlug = body.clientSlug;
    milestoneType = body.milestoneType;

    if (DEBUG) console.log('[MILESTONE] Starting:', clientSlug, milestoneType);

    // Validate required fields
    if (!clientSlug || !milestoneType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: clientSlug, milestoneType' })
      };
    }

    // Validate milestone type
    if (!['30-day', '60-day', '90-day'].includes(milestoneType)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid milestoneType. Must be 30-day, 60-day, or 90-day' })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. UPDATE MILESTONE STATUS TO GENERATING
    // ─────────────────────────────────────────────────────────────────────────
    const { error: updateError } = await supabaseAdmin
      .from('milestone_assessments')
      .update({ status: 'generating' })
      .eq('client_slug', clientSlug)
      .eq('milestone_type', milestoneType);

    if (updateError) {
      console.error('Failed to update milestone status:', updateError);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. FETCH CLIENT DATA AND INITIAL ASSESSMENT
    // ─────────────────────────────────────────────────────────────────────────
    if (DEBUG) console.log('[MILESTONE] Fetching client data');

    // Get client assessment data
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('client_assessments')
      .select('*')
      .eq('client_slug', clientSlug)
      .single();

    if (clientError || !clientData) {
      throw new Error('Client assessment not found: ' + (clientError?.message || 'No data'));
    }

    // Get initial milestone assessment for comparison
    const { data: initialMilestone, error: initialError } = await supabaseAdmin
      .from('milestone_assessments')
      .select('overall_score, overall_grade, category_scores, assessment_data')
      .eq('client_slug', clientSlug)
      .eq('milestone_type', 'initial')
      .eq('status', 'completed')
      .single();

    if (initialError || !initialMilestone) {
      throw new Error('Initial assessment not found for comparison');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. FETCH FRESH DATA FROM ALL SOURCES
    // ─────────────────────────────────────────────────────────────────────────
    if (DEBUG) console.log('[MILESTONE] Fetching fresh data from APIs');

    // Fetch SEOptimer data
    let seoptData = null;
    if (process.env.SEOPTIMER_API_KEY && clientData.website_url) {
      try {
        seoptData = await fetchSEOptimerReport(clientData.website_url);
      } catch (err) {
        console.error('SEOptimer error (non-fatal):', err.message);
        seoptData = { _error: err.message };
      }
    }

    // Fetch Google Places data
    let googlePlacesData = null;
    if (process.env.GOOGLE_PLACES_KEY) {
      try {
        if (clientData.google_place_id) {
          googlePlacesData = await fetchGooglePlacesByPlaceId(clientData.google_place_id);
        } else {
          googlePlacesData = await fetchGooglePlacesData(
            clientData.business_name,
            clientData.location,
            clientData.website_url
          );
        }
      } catch (err) {
        console.error('Google Places error (non-fatal):', err.message);
        googlePlacesData = { _error: err.message };
      }
    }

    // Fetch website analysis
    let websiteAnalysis = null;
    if (clientData.website_url) {
      try {
        websiteAnalysis = await analyzeWebsiteContent(clientData.website_url);
      } catch (err) {
        console.error('Website analysis error (non-fatal):', err.message);
        websiteAnalysis = { _error: err.message };
      }
    }

    // Fetch social media data
    let socialMediaData = null;
    const social = {
      instagram: clientData.social_instagram,
      facebook: clientData.social_facebook,
      tiktok: clientData.social_tiktok,
      youtube: clientData.social_youtube,
      pinterest: clientData.social_pinterest,
      twitter: clientData.social_twitter,
      linkedin: clientData.social_linkedin
    };
    if (Object.values(social).some(url => url)) {
      try {
        socialMediaData = await getSocialMediaData(social);
      } catch (err) {
        console.error('Social media error (non-fatal):', err.message);
        socialMediaData = { _error: err.message };
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. CALCULATE SCORES
    // ─────────────────────────────────────────────────────────────────────────
    if (DEBUG) console.log('[MILESTONE] Calculating scores');

    const scoringResult = calculateAllScores({
      seoptData,
      googlePlacesData,
      websiteAnalysis,
      socialMediaData
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 5. CALCULATE DELTAS VS INITIAL
    // ─────────────────────────────────────────────────────────────────────────
    if (DEBUG) console.log('[MILESTONE] Calculating deltas');

    const scoreDelta = scoringResult.overall.score - initialMilestone.overall_score;
    const categoryDeltas = calculateCategoryDeltas(
      scoringResult.categories,
      initialMilestone.category_scores
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 6. GENERATE AI ANALYSIS WITH COMPARISON CONTEXT
    // ─────────────────────────────────────────────────────────────────────────
    if (DEBUG) console.log('[MILESTONE] Generating milestone analysis');

    const assessmentData = await generateMilestoneAnalysis({
      businessName: clientData.business_name,
      milestoneType,
      currentScores: scoringResult,
      initialScores: {
        overall: initialMilestone.overall_score,
        grade: initialMilestone.overall_grade,
        categories: initialMilestone.category_scores
      },
      scoreDelta,
      categoryDeltas,
      seoptData,
      googlePlacesData,
      websiteAnalysis,
      socialMediaData
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 7. SAVE AUDIT TRAIL
    // ─────────────────────────────────────────────────────────────────────────
    let auditId = null;
    try {
      const { data: auditData } = await supabaseAdmin.from('assessment_audit').insert({
        client_slug: clientSlug,
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
      }).select('id').single();

      auditId = auditData?.id;
    } catch (auditError) {
      console.warn('Failed to save audit trail (non-fatal):', auditError.message);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. UPDATE MILESTONE RECORD
    // ─────────────────────────────────────────────────────────────────────────
    if (DEBUG) console.log('[MILESTONE] Saving milestone data');

    const { error: saveError } = await supabaseAdmin
      .from('milestone_assessments')
      .update({
        status: 'completed',
        generated_at: new Date().toISOString(),
        assessment_audit_id: auditId,
        overall_score: scoringResult.overall.score,
        overall_grade: scoringResult.overall.grade,
        category_scores: scoringResult.categories,
        score_delta: scoreDelta,
        category_deltas: categoryDeltas,
        assessment_data: assessmentData,
        error_message: null
      })
      .eq('client_slug', clientSlug)
      .eq('milestone_type', milestoneType);

    if (saveError) {
      throw new Error('Failed to save milestone: ' + saveError.message);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. TRIGGER EMAIL NOTIFICATION
    // ─────────────────────────────────────────────────────────────────────────
    if (DEBUG) console.log('[MILESTONE] Triggering notification');

    try {
      await triggerMilestoneNotification(supabaseAdmin, clientSlug, milestoneType, {
        businessName: clientData.business_name,
        currentScore: scoringResult.overall.score,
        initialScore: initialMilestone.overall_score,
        scoreDelta,
        categoryDeltas
      });
    } catch (notifyError) {
      console.error('Notification error (non-fatal):', notifyError.message);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 10. RETURN SUCCESS
    // ─────────────────────────────────────────────────────────────────────────
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        clientSlug,
        milestoneType,
        score: scoringResult.overall.score,
        grade: scoringResult.overall.grade,
        scoreDelta
      })
    };

  } catch (error) {
    console.error('[MILESTONE] Error:', error);

    // Mark milestone as failed
    if (clientSlug && milestoneType) {
      await supabaseAdmin
        .from('milestone_assessments')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('client_slug', clientSlug)
        .eq('milestone_type', milestoneType);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function calculateCategoryDeltas(currentCategories, initialCategories) {
  const deltas = {};

  for (const [key, current] of Object.entries(currentCategories)) {
    const initial = initialCategories?.[key];
    deltas[key] = {
      current: current.score,
      initial: initial?.score ?? null,
      delta: initial?.score != null ? current.score - initial.score : null,
      improved: initial?.score != null ? current.score > initial.score : null,
      currentGrade: current.grade,
      initialGrade: initial?.grade ?? null
    };
  }

  return deltas;
}


async function triggerMilestoneNotification(supabase, clientSlug, milestoneType, data) {
  // Get recipients: coach and PSM users
  const recipients = [];

  // Get coach email
  const { data: clientPlan } = await supabase
    .from('user_plans')
    .select('coach_email')
    .eq('client_slug', clientSlug)
    .eq('role', 'client')
    .single();

  if (clientPlan?.coach_email) {
    recipients.push(clientPlan.coach_email);
  }

  // Get PSM users (they have client_slug = '*')
  const { data: psmUsers } = await supabase
    .from('user_plans')
    .select('email')
    .eq('role', 'psm')
    .eq('client_slug', '*')
    .eq('active', true);

  if (psmUsers) {
    for (const psm of psmUsers) {
      if (!recipients.includes(psm.email)) {
        recipients.push(psm.email);
      }
    }
  }

  // Update milestone with recipients
  await supabase
    .from('milestone_assessments')
    .update({
      notification_recipients: recipients
    })
    .eq('client_slug', clientSlug)
    .eq('milestone_type', milestoneType);

  // The actual email sending will be done by the send-milestone-email Edge Function
  // which polls for completed milestones that haven't been notified yet
  console.log('[MILESTONE] Notification recipients:', recipients);
}


async function generateMilestoneAnalysis(params) {
  const {
    businessName,
    milestoneType,
    currentScores,
    initialScores,
    scoreDelta,
    categoryDeltas
  } = params;

  // Find improvements and declines
  const improvements = [];
  const declines = [];
  const noChange = [];

  for (const [key, delta] of Object.entries(categoryDeltas)) {
    if (delta.delta > 0) {
      improvements.push({ category: key, ...delta });
    } else if (delta.delta < 0) {
      declines.push({ category: key, ...delta });
    } else if (delta.delta === 0) {
      noChange.push({ category: key, ...delta });
    }
  }

  // Sort by magnitude
  improvements.sort((a, b) => b.delta - a.delta);
  declines.sort((a, b) => a.delta - b.delta);

  // Generate next priorities based on lowest scores
  const lowestCategories = Object.entries(currentScores.categories)
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, 3);

  return {
    milestone_type: milestoneType,
    comparison: {
      initial_score: initialScores.overall,
      initial_grade: initialScores.grade,
      current_score: currentScores.overall.score,
      current_grade: currentScores.overall.grade,
      score_delta: scoreDelta,
      trend: scoreDelta > 0 ? 'improving' : scoreDelta < 0 ? 'declining' : 'stable'
    },
    improvements: improvements.map(i => ({
      category: formatCategoryName(i.category),
      from_score: i.initial,
      to_score: i.current,
      delta: i.delta
    })),
    declines: declines.map(d => ({
      category: formatCategoryName(d.category),
      from_score: d.initial,
      to_score: d.current,
      delta: d.delta
    })),
    no_change: noChange.map(n => ({
      category: formatCategoryName(n.category),
      score: n.current
    })),
    next_priorities: lowestCategories.map(([key, data]) => ({
      category: formatCategoryName(key),
      current_score: data.score,
      grade: data.grade,
      focus_area: data.title || formatCategoryName(key)
    })),
    executive_summary: generateExecutiveSummary(businessName, milestoneType, scoreDelta, improvements, declines),
    generated_at: new Date().toISOString()
  };
}


function formatCategoryName(key) {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}


function generateExecutiveSummary(businessName, milestoneType, scoreDelta, improvements, declines) {
  const dayNumber = milestoneType.replace('-day', '');
  let summary = '';

  if (scoreDelta > 0) {
    summary = `At the ${dayNumber}-day mark, ${businessName} has improved their overall digital marketing score by ${scoreDelta} points. `;
    if (improvements.length > 0) {
      const topImprovement = improvements[0];
      summary += `The biggest gain came from ${formatCategoryName(topImprovement.category)} (+${topImprovement.delta} points). `;
    }
  } else if (scoreDelta < 0) {
    summary = `At the ${dayNumber}-day mark, ${businessName}'s overall score has decreased by ${Math.abs(scoreDelta)} points. `;
    if (declines.length > 0) {
      const topDecline = declines[0];
      summary += `The ${formatCategoryName(topDecline.category)} category needs attention (${topDecline.delta} points). `;
    }
  } else {
    summary = `At the ${dayNumber}-day mark, ${businessName}'s overall score remains stable. `;
  }

  if (improvements.length > 0 && scoreDelta >= 0) {
    summary += 'Keep the momentum going!';
  } else {
    summary += 'Focus on the priority areas identified below.';
  }

  return summary;
}


// ═══════════════════════════════════════════════════════════════════════════
// DATA FETCHING FUNCTIONS (simplified versions - can be expanded)
// ═══════════════════════════════════════════════════════════════════════════

async function fetchSEOptimerReport(websiteUrl) {
  const apiKey = process.env.SEOPTIMER_API_KEY;
  if (!apiKey) throw new Error('SEOPTIMER_API_KEY not configured');

  const response = await fetch('https://api.seoptimer.com/report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify({ url: websiteUrl })
  });

  if (!response.ok) {
    throw new Error(`SEOptimer API error: ${response.status}`);
  }

  return response.json();
}


async function fetchGooglePlacesByPlaceId(placeId) {
  const apiKey = process.env.GOOGLE_PLACES_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_KEY not configured');

  const fields = 'name,formatted_address,rating,user_ratings_total,reviews,website,formatted_phone_number,opening_hours,business_status';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(`Google Places error: ${data.status}`);
  }

  return data.result;
}


async function fetchGooglePlacesData(businessName, location, websiteUrl) {
  const apiKey = process.env.GOOGLE_PLACES_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_KEY not configured');

  const query = `${businessName} ${location || ''}`.trim();
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;

  const searchResponse = await fetch(searchUrl);
  const searchData = await searchResponse.json();

  if (searchData.status !== 'OK' || !searchData.results?.length) {
    throw new Error('No Google Places results found');
  }

  const placeId = searchData.results[0].place_id;
  return fetchGooglePlacesByPlaceId(placeId);
}


async function analyzeWebsiteContent(websiteUrl) {
  // Simplified website analysis - fetch homepage and look for key signals
  const response = await fetch(websiteUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JunctionBot/1.0)' },
    timeout: 15000
  });

  if (!response.ok) {
    throw new Error(`Website fetch error: ${response.status}`);
  }

  const html = await response.text();
  const htmlLower = html.toLowerCase();

  return {
    hasBooking: /book|reserve|availability|check.?in/i.test(htmlLower),
    hasPhone: /tel:|phone|call us|\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(html),
    hasEmail: /mailto:|@.*\.(com|ca|net|org)/.test(htmlLower),
    hasAddress: /address|location|directions|map/.test(htmlLower),
    hasHours: /hours|open|closed|schedule/.test(htmlLower),
    hasPricing: /price|\$|rate|cost|fee/.test(htmlLower),
    hasSSL: websiteUrl.startsWith('https'),
    pageSize: html.length,
    imageCount: (html.match(/<img/gi) || []).length
  };
}


async function getSocialMediaData(social) {
  // Use SociaVault API if available
  const apiKey = process.env.SOCIAVAULT_API_KEY;
  if (!apiKey) {
    return { _error: 'SOCIAVAULT_API_KEY not configured' };
  }

  const profiles = Object.entries(social)
    .filter(([, url]) => url)
    .map(([platform, url]) => ({ platform, url }));

  if (profiles.length === 0) {
    return { _error: 'No social profiles provided' };
  }

  const response = await fetch('https://api.sociavault.com/v1/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ profiles })
  });

  if (!response.ok) {
    throw new Error(`SociaVault API error: ${response.status}`);
  }

  return response.json();
}
