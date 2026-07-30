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

  try {
    console.log('[STEP 1] Parsing request body');
    // Parse request body
    const body = JSON.parse(event.body);
    const { businessName, slug, websiteUrl, location, social } = body;
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

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
    }

    // Check user role (admin or psm required)
    const { data: roleRows } = await supabaseAdmin
      .from('user_plans')
      .select('role')
      .eq('email', user.email)
      .eq('active', true)
      .in('role', ['admin', 'psm']);

    if (!roleRows || roleRows.length === 0) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin or PSM role required' }) };
    }

    console.log('[STEP 2] Auth verified, checking if project exists');
    // ─────────────────────────────────────────────────────────────────────────
    // 2. CHECK IF PROJECT/ASSESSMENT EXISTS
    // ─────────────────────────────────────────────────────────────────────────
    const { data: existingAssessment } = await supabaseAdmin
      .from('client_assessments')
      .select('id')
      .eq('client_slug', slug)
      .single();

    if (existingAssessment) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'An assessment with this slug already exists' })
      };
    }

    // Also check GitHub for existing project
    const checkUrl = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/clients/${slug}`;
    const checkRes = await fetch(checkUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (checkRes.status === 200) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'A project with this slug already exists in GitHub' })
      };
    }

    console.log('[STEP 3] Creating assessment record in Supabase');
    // ─────────────────────────────────────────────────────────────────────────
    // 3. CREATE PENDING ASSESSMENT RECORD
    // ─────────────────────────────────────────────────────────────────────────
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
        created_by: user.email
      });

    if (insertError) {
      console.error('Failed to create assessment record:', insertError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create assessment record' })
      };
    }

    console.log('[STEP 4] Fetching SEOptimer data');
    // ─────────────────────────────────────────────────────────────────────────
    // 4. FETCH SEOPTIMER DATA (REQUIRED)
    // ─────────────────────────────────────────────────────────────────────────
    if (!process.env.SEOPTIMER_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'SEOPTIMER_API_KEY is not configured. Add it to Netlify environment variables.' })
      };
    }

    let seoptData = null;
    try {
      seoptData = await fetchSEOptimerReport(websiteUrl);
    } catch (err) {
      console.error('SEOptimer error (non-fatal):', err.message);
      // SEOptimer failure is non-fatal - continue without SEO data
      // The assessment will still be generated with available information
      seoptData = {
        _error: err.message,
        _note: 'SEOptimer data unavailable - assessment generated with limited technical SEO data'
      };
    }

    console.log('[STEP 4] SEOptimer data received');
    // ─────────────────────────────────────────────────────────────────────────
    // 5. GENERATE ASSESSMENT WITH CLAUDE
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[STEP 5] Generating assessment with Claude');
    const assessmentData = await generateAssessmentWithClaude({
      businessName,
      websiteUrl,
      location,
      social,
      seoptData
    });

    console.log('[STEP 5] Claude assessment generated');
    // ─────────────────────────────────────────────────────────────────────────
    // 6. UPDATE ASSESSMENT RECORD WITH DATA
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[STEP 6] Updating Supabase with assessment data');
    const { error: updateError } = await supabaseAdmin
      .from('client_assessments')
      .update({
        assessment_data: assessmentData,
        seoptimer_raw: seoptData,
        overall_score: assessmentData.overall?.score || null,
        overall_grade: assessmentData.overall?.grade || null,
        status: 'completed'
      })
      .eq('client_slug', slug);

    if (updateError) {
      console.error('Failed to update assessment:', updateError);
    }

    console.log('[STEP 7] Fetching template from GitHub');
    // ─────────────────────────────────────────────────────────────────────────
    // 7. FETCH TEMPLATE AND GENERATE HTML
    // ─────────────────────────────────────────────────────────────────────────
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
    // 8. COMMIT TO GITHUB
    // ─────────────────────────────────────────────────────────────────────────
    const commitResult = await commitToGitHub([
      { path: `clients/${slug}/index.html`, content: html }
    ], `Add assessment: ${businessName}`);

    if (commitResult.error) {
      // Update status to failed
      await supabaseAdmin
        .from('client_assessments')
        .update({ status: 'failed', error_message: commitResult.error })
        .eq('client_slug', slug);

      return {
        statusCode: 500,
        body: JSON.stringify({ error: commitResult.error })
      };
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
          content: `You are a senior tourism and hospitality digital marketing consultant with 15+ years of experience. Analyze this tourism/hospitality business and generate a comprehensive digital marketing assessment from a TOURISM INDUSTRY perspective.

${context}

CRITICAL INSTRUCTIONS:
1. Analyze through the lens of VISITOR/TOURIST discovery and experience, not just generic SEO
2. Consider: How do tourists find this place? What's their journey from discovery to visit?
3. Every metric needs a BENCHMARK (e.g., "85/100 - industry average is 65")
4. Recommendations need TIME ESTIMATES (e.g., "30 minutes", "2-3 hours", "1 week")
5. Be specific to THIS business - reference their actual location, offerings, unique features

DATA LIMITATIONS - CRITICAL:
- You have SEOptimer technical data (website speed, SEO, etc.) but NOT Google review data
- You do NOT have access to: Google review counts, review ratings, TripAdvisor reviews, or social media follower counts
- For review_ecosystem category: DO NOT claim specific numbers like "0 reviews" or "no reviews detected"
- Instead, provide recommendations for review strategy WITHOUT making false claims about current review status
- For any data you don't have, say "Unable to assess - manual verification recommended" or focus on general best practices
- NEVER fabricate or guess statistics you don't have - this damages credibility

Return ONLY valid JSON with this structure:

{
  "executive_summary": {
    "headline": "One sentence overall verdict",
    "key_strengths": ["Strength 1", "Strength 2", "Strength 3"],
    "critical_gaps": ["Gap 1", "Gap 2", "Gap 3"],
    "bottom_line": "What this means for their business in 1-2 sentences"
  },
  "quick_wins": [
    {"task": "Specific task description", "time_estimate": "30 minutes", "impact": "Description of expected impact"},
    {"task": "Task 2", "time_estimate": "1 hour", "impact": "Impact"},
    {"task": "Task 3", "time_estimate": "15 minutes", "impact": "Impact"},
    {"task": "Task 4", "time_estimate": "2 hours", "impact": "Impact"},
    {"task": "Task 5", "time_estimate": "1 hour", "impact": "Impact"}
  ],
  "tourism_context": {
    "visitor_profile": "Description of likely visitors (tourists vs locals, demographics, travel patterns)",
    "discovery_journey": "How tourists typically find and decide to visit this type of business",
    "seasonal_considerations": "How seasonality affects their digital strategy",
    "trip_integration": "How this business fits into a larger trip/itinerary",
    "competitive_landscape": "Who they're competing against for tourist attention"
  },
  "overall": {
    "grade": "B+",
    "score": 76,
    "summary": "2-3 sentence assessment from tourism consultant perspective"
  },
  "categories": {
    "website_technical": {
      "grade": "B",
      "score": 72,
      "title": "Website & Technical Foundation",
      "summary": "Assessment focusing on visitor experience, not just technical metrics",
      "metrics": [
        {"label": "Mobile Speed", "value": "65/100", "benchmark": "Tourism average: 55", "status": "good", "tooltip": "Why this matters for tourists"},
        {"label": "Metric 2", "value": "Value", "benchmark": "Benchmark", "status": "warning", "tooltip": "Context"}
      ],
      "findings": [
        {"type": "positive", "text": "Specific positive finding with context"},
        {"type": "negative", "text": "Specific issue with tourism impact explained"}
      ],
      "recommendations": [
        {"text": "Specific recommendation", "time_estimate": "2 hours", "impact": "Expected result"}
      ]
    },
    "visitor_discovery": {
      "grade": "C",
      "score": 58,
      "title": "Visitor Discovery & Trip Integration",
      "summary": "How easily tourists can find and learn about this business during trip planning",
      "metrics": [],
      "findings": [],
      "recommendations": []
    },
    "online_booking": {
      "grade": "B",
      "score": 68,
      "title": "Online Booking & Reservations",
      "summary": "Assessment of booking friction and conversion optimization",
      "metrics": [],
      "findings": [],
      "recommendations": []
    },
    "review_ecosystem": {
      "grade": "N/A",
      "score": null,
      "title": "Reviews & Reputation",
      "summary": "Review data not available in automated scan - manual verification of Google, TripAdvisor, and Yelp recommended",
      "metrics": [
        {"label": "Google Reviews", "value": "Manual check required", "benchmark": "Tourism businesses should aim for 100+ reviews", "status": "info", "tooltip": "We cannot automatically access Google review data"},
        {"label": "Review Response Rate", "value": "Manual check required", "benchmark": "Best practice: respond to 90%+ of reviews", "status": "info", "tooltip": "Check Google Business Profile for response status"}
      ],
      "findings": [
        {"type": "info", "text": "Review counts and ratings require manual verification on Google Maps, TripAdvisor, and Yelp"}
      ],
      "recommendations": [
        {"text": "Verify your Google Business Profile review count and average rating", "time_estimate": "10 minutes", "impact": "Essential baseline data"},
        {"text": "Set up Google review alerts and establish a response workflow", "time_estimate": "30 minutes", "impact": "Improve reputation management"},
        {"text": "Create a post-visit review request process for satisfied guests", "time_estimate": "2 hours", "impact": "Increase review volume over time"}
      ]
    },
    "social_media": {
      "grade": "C",
      "score": 60,
      "title": "Social Media & Visual Content",
      "summary": "Assessment based on provided social URLs - follower counts and engagement metrics require manual verification",
      "metrics": [
        {"label": "Platform Presence", "value": "Based on provided URLs", "benchmark": "Tourism businesses should be on Instagram, Facebook, and TikTok minimum", "status": "info", "tooltip": "We assess based on URLs you provided"},
        {"label": "Follower Count", "value": "Manual check required", "benchmark": "Varies by market size", "status": "info", "tooltip": "We cannot access private follower data"}
      ],
      "findings": [],
      "recommendations": []
    },
    "local_seo": {
      "grade": "B",
      "score": 70,
      "title": "Local SEO & Maps Visibility",
      "summary": "How visible they are when tourists search locally",
      "metrics": [],
      "findings": [],
      "recommendations": []
    },
    "guest_experience": {
      "grade": "C",
      "score": 55,
      "title": "Digital Guest Experience",
      "summary": "Pre-visit digital experience: Can visitors easily find hours, menus, parking, accessibility info?",
      "metrics": [],
      "findings": [],
      "recommendations": []
    },
    "competitive_positioning": {
      "grade": "B",
      "score": 65,
      "title": "Competitive Positioning",
      "summary": "Assessment relative to local competitors with realistic benchmarks",
      "metrics": [],
      "findings": [],
      "recommendations": []
    }
  },
  "priority_recommendations": [
    {"category": "Category Name", "text": "Detailed recommendation", "time_estimate": "3-4 hours", "impact": "high", "expected_result": "What will improve"},
    {"category": "Category 2", "text": "Recommendation 2", "time_estimate": "1 week", "impact": "high", "expected_result": "Result"},
    {"category": "Category 3", "text": "Recommendation 3", "time_estimate": "2 hours", "impact": "medium", "expected_result": "Result"},
    {"category": "Category 4", "text": "Recommendation 4", "time_estimate": "30 minutes", "impact": "medium", "expected_result": "Result"},
    {"category": "Category 5", "text": "Recommendation 5", "time_estimate": "4-6 hours", "impact": "medium", "expected_result": "Result"}
  ]
}

REQUIREMENTS:
- Each category MUST have 3-4 metrics with benchmarks, 3-4 findings, and 3-4 recommendations with time estimates
- Reference the ACTUAL business name, location, and features from the data provided
- Frame everything from a TOURIST'S perspective - how does this help visitors?
- Include specific, actionable tasks - not generic advice
- Time estimates should be realistic for a small business owner to DIY
- Benchmarks should compare to similar tourism/hospitality businesses

Output ONLY the JSON object. No markdown, no explanation.`
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

## Social Media Accounts`;

  if (data.social) {
    Object.entries(data.social).forEach(([platform, url]) => {
      if (url) {
        context += `\n- ${platform}: ${url}`;
      }
    });
  } else {
    context += '\n- None provided';
  }

  if (data.seoptData) {
    context += `\n\n## SEOptimer Technical Data
${JSON.stringify(data.seoptData, null, 2)}`;
  }

  return context;
}

function getDefaultAssessment() {
  const categories = [
    { key: 'website_technical', title: 'Website & Technical Foundation' },
    { key: 'ai_search_readiness', title: 'AI Search Readiness' },
    { key: 'online_booking', title: 'Online Booking Analysis' },
    { key: 'review_ecosystem', title: 'Review Ecosystem' },
    { key: 'social_media_health', title: 'Social Media Health' },
    { key: 'local_seo', title: 'Local SEO & Visibility' },
    { key: 'email_marketing', title: 'Email Marketing Readiness' },
    { key: 'competitive_positioning', title: 'Competitive Positioning' }
  ];

  const result = {
    overall: { grade: 'C', score: 50, summary: 'Assessment pending detailed analysis.' },
    categories: {},
    priority_recommendations: []
  };

  categories.forEach(cat => {
    result.categories[cat.key] = {
      grade: 'C',
      score: 50,
      title: cat.title,
      summary: 'Detailed analysis pending.',
      metrics: [],
      findings: [],
      recommendations: []
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
