// Netlify Function: Regenerate Assessment
// Re-runs assessment for an existing client using their stored information

import { createClient } from '@supabase/supabase-js';

// Import shared functions from generate-assessment-background
// Note: In production, these should be in a shared module

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
    const { businessName, slug, websiteUrl, location, social } = body;
    console.log('[REGENERATE] Business:', businessName, 'Slug:', slug);

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
    await supabaseAdmin
      .from('client_assessments')
      .update({
        status: 'processing',
        error_message: null,
        reassessment_date: new Date().toISOString()
      })
      .eq('client_slug', slug);

    // ─────────────────────────────────────────────────────────────────────────
    // 4. FETCH SEOPTIMER DATA
    // ─────────────────────────────────────────────────────────────────────────
    let seoptData = null;
    try {
      seoptData = await fetchSEOptimerReport(websiteUrl);
    } catch (err) {
      console.error('SEOptimer error (non-fatal):', err.message);
      seoptData = { _error: err.message };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4b. FETCH GOOGLE PLACES DATA
    // ─────────────────────────────────────────────────────────────────────────
    let googlePlacesData = null;
    if (process.env.GOOGLE_PLACES_API_KEY) {
      try {
        googlePlacesData = await fetchGooglePlacesData(businessName, location);
      } catch (err) {
        console.error('Google Places error (non-fatal):', err.message);
        googlePlacesData = { _error: err.message };
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. GENERATE ASSESSMENT WITH CLAUDE
    // ─────────────────────────────────────────────────────────────────────────
    const assessmentData = await generateAssessmentWithClaude({
      businessName,
      websiteUrl,
      location,
      social,
      seoptData,
      googlePlacesData
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 6. UPDATE ASSESSMENT RECORD
    // ─────────────────────────────────────────────────────────────────────────
    const { error: updateError } = await supabaseAdmin
      .from('client_assessments')
      .update({
        assessment_data: assessmentData,
        seoptimer_raw: seoptData,
        google_places_raw: googlePlacesData,
        overall_score: assessmentData.overall?.score || null,
        overall_grade: assessmentData.overall?.grade || null,
        status: 'completed'
      })
      .eq('client_slug', slug);

    if (updateError) {
      console.error('Failed to update assessment:', updateError);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. UPDATE GITHUB HTML
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
      html = generateBasicAssessmentHtml({ businessName, slug, websiteUrl, assessmentData });
    }

    // Commit to GitHub (update existing file)
    await commitToGitHub([
      { path: `clients/${slug}/index.html`, content: html }
    ], `Regenerate assessment: ${businessName}`);

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
  let cleanUrl = websiteUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-api-key': process.env.SEOPTIMER_API_KEY
  };

  const createResponse = await fetch('https://api.seoptimer.com/v1/report/create', {
    method: 'POST',
    headers,
    body: JSON.stringify({ url: cleanUrl, pdf: 0 })
  });

  if (!createResponse.ok) {
    throw new Error(`SEOptimer create failed: ${createResponse.status}`);
  }

  const createResult = await createResponse.json();
  if (!createResult.success || !createResult.data?.id) {
    throw new Error('SEOptimer create failed');
  }

  const reportId = createResult.data.id;

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
      return reportData.data;
    }
  }

  throw new Error('SEOptimer report timed out');
}

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE PLACES API
// ═══════════════════════════════════════════════════════════════════════════

async function fetchGooglePlacesData(businessName, location) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const searchQuery = location ? `${businessName} ${location}` : businessName;

  const findPlaceUrl = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
  findPlaceUrl.searchParams.set('input', searchQuery);
  findPlaceUrl.searchParams.set('inputtype', 'textquery');
  findPlaceUrl.searchParams.set('fields', 'place_id,name,formatted_address');
  findPlaceUrl.searchParams.set('key', apiKey);

  const findResponse = await fetch(findPlaceUrl.toString());
  const findResult = await findResponse.json();

  if (findResult.status !== 'OK' || !findResult.candidates?.length) {
    return null;
  }

  const placeId = findResult.candidates[0].place_id;

  const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  detailsUrl.searchParams.set('place_id', placeId);
  detailsUrl.searchParams.set('fields', 'name,rating,user_ratings_total,reviews,price_level,website,formatted_phone_number,opening_hours,types');
  detailsUrl.searchParams.set('key', apiKey);

  const detailsResponse = await fetch(detailsUrl.toString());
  const detailsResult = await detailsResponse.json();

  if (detailsResult.status !== 'OK' || !detailsResult.result) {
    return null;
  }

  const place = detailsResult.result;
  return {
    name: place.name,
    rating: place.rating || null,
    totalReviews: place.user_ratings_total || 0,
    priceLevel: place.price_level || null,
    website: place.website || null,
    phone: place.formatted_phone_number || null,
    businessTypes: place.types || [],
    recentReviews: (place.reviews || []).slice(0, 5).map(r => ({
      rating: r.rating,
      text: r.text?.substring(0, 300) || '',
      relativeTime: r.relative_time_description,
      authorName: r.author_name
    }))
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CLAUDE ASSESSMENT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateAssessmentWithClaude(data) {
  const context = buildAssessmentContext(data);

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

DATA ACCURACY - CRITICAL:
- If "Google Business Profile Data (VERIFIED)" section is present above, use those EXACT numbers for reviews/rating
- DO NOT fabricate any statistics you don't have data for
- For TripAdvisor, Yelp, or other review platforms: say "Manual verification recommended" (we don't have this data)
- For social media follower counts: say "Manual verification recommended" (we don't have this data)
- If Google data is NOT available, say "Manual verification recommended" for review metrics
- NEVER guess or invent statistics - this damages credibility

Return ONLY valid JSON with this structure:
{
  "executive_summary": {
    "headline": "One sentence overall verdict",
    "key_strengths": ["Strength 1", "Strength 2", "Strength 3"],
    "critical_gaps": ["Gap 1", "Gap 2", "Gap 3"],
    "bottom_line": "What this means for their business"
  },
  "quick_wins": [
    {"task": "Task description", "time_estimate": "30 minutes", "impact": "Expected impact"}
  ],
  "tourism_context": {
    "visitor_profile": "Description of likely visitors",
    "discovery_journey": "How tourists find this business",
    "seasonal_considerations": "Seasonality effects",
    "trip_integration": "How it fits into trips",
    "competitive_landscape": "Competition analysis"
  },
  "overall": {
    "grade": "B+",
    "score": 76,
    "summary": "2-3 sentence assessment"
  },
  "categories": {
    "website_technical": { "grade": "B", "score": 72, "title": "Website & Technical Foundation", "summary": "...", "metrics": [], "findings": [], "recommendations": [] },
    "visitor_discovery": { "grade": "C", "score": 58, "title": "Visitor Discovery & Trip Integration", "summary": "...", "metrics": [], "findings": [], "recommendations": [] },
    "online_booking": { "grade": "B", "score": 68, "title": "Online Booking & Reservations", "summary": "...", "metrics": [], "findings": [], "recommendations": [] },
    "review_ecosystem": { "grade": "B", "score": 75, "title": "Reviews & Reputation", "summary": "...", "metrics": [], "findings": [], "recommendations": [] },
    "social_media": { "grade": "C", "score": 60, "title": "Social Media & Visual Content", "summary": "...", "metrics": [], "findings": [], "recommendations": [] },
    "local_seo": { "grade": "B", "score": 70, "title": "Local SEO & Maps Visibility", "summary": "...", "metrics": [], "findings": [], "recommendations": [] },
    "guest_experience": { "grade": "C", "score": 55, "title": "Digital Guest Experience", "summary": "...", "metrics": [], "findings": [], "recommendations": [] },
    "competitive_positioning": { "grade": "B", "score": 65, "title": "Competitive Positioning", "summary": "...", "metrics": [], "findings": [], "recommendations": [] }
  },
  "priority_recommendations": [
    {"category": "Category", "text": "Recommendation", "time_estimate": "3-4 hours", "impact": "high", "expected_result": "What improves"}
  ]
}

Output ONLY the JSON object. No markdown, no explanation.`
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.content[0].text;

  try {
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse Claude response');
    return getDefaultAssessment();
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
      if (url) context += `\n- ${platform}: ${url}`;
    });
  } else {
    context += '\n- None provided';
  }

  if (data.googlePlacesData && !data.googlePlacesData._error) {
    const gp = data.googlePlacesData;
    context += `\n\n## Google Business Profile Data (VERIFIED - USE THESE EXACT NUMBERS)
- Google Rating: ${gp.rating || 'N/A'} out of 5 stars
- Total Google Reviews: ${gp.totalReviews}
- Business Types: ${gp.businessTypes?.join(', ') || 'N/A'}`;

    if (gp.recentReviews?.length) {
      context += `\n\n### Recent Google Reviews:`;
      gp.recentReviews.forEach((review, i) => {
        context += `\n\n**Review ${i + 1}** (${review.rating}/5): "${review.text}"`;
      });
    }
  } else {
    context += `\n\n## Google Business Profile Data
- Not available - recommend manual verification`;
  }

  if (data.seoptData && !data.seoptData._error) {
    context += `\n\n## SEOptimer Technical Data
${JSON.stringify(data.seoptData, null, 2)}`;
  }

  return context;
}

function getDefaultAssessment() {
  return {
    overall: { grade: 'C', score: 50, summary: 'Assessment pending.' },
    categories: {},
    priority_recommendations: []
  };
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
