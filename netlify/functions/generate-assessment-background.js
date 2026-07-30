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

    let seoptData;
    try {
      seoptData = await fetchSEOptimerReport(websiteUrl);
    } catch (err) {
      console.error('SEOptimer error:', err.message);
      // Update status to failed
      await supabaseAdmin
        .from('client_assessments')
        .update({ status: 'failed', error_message: `SEOptimer API error: ${err.message}` })
        .eq('client_slug', slug);

      return {
        statusCode: 500,
        body: JSON.stringify({ error: `SEOptimer API error: ${err.message}` })
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
        assessmentData
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

  // Step 2: Poll for the report results (may take a few seconds to process)
  const maxAttempts = 20;  // Max 20 attempts
  const pollInterval = 1500;  // 1.5 seconds between attempts (30 seconds max)

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
      model: 'claude-haiku-4-5',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: `Analyze this business and generate a digital marketing assessment. Return ONLY valid JSON - no markdown, no explanation, just the JSON object.

${context}

Return a JSON object with this EXACT structure (fill in real data based on the business info above):

{"overall":{"grade":"B","score":72,"summary":"Brief overall assessment"},"categories":{"website_technical":{"grade":"B","score":70,"title":"Website & Technical Foundation","summary":"Assessment of website","metrics":[{"label":"Metric Name","value":"Value","status":"good","tooltip":"Explanation"}],"findings":[{"type":"positive","text":"Good finding"},{"type":"negative","text":"Issue found"}],"recommendations":[{"priority":"high","text":"Recommendation"}]},"ai_search_readiness":{"grade":"C","score":55,"title":"AI Search Readiness","summary":"Assessment","metrics":[],"findings":[],"recommendations":[]},"online_booking":{"grade":"B","score":65,"title":"Online Booking Analysis","summary":"Assessment","metrics":[],"findings":[],"recommendations":[]},"review_ecosystem":{"grade":"B","score":70,"title":"Review Ecosystem","summary":"Assessment","metrics":[],"findings":[],"recommendations":[]},"social_media_health":{"grade":"C","score":60,"title":"Social Media Health","summary":"Assessment","metrics":[],"findings":[],"recommendations":[]},"local_seo":{"grade":"B","score":68,"title":"Local SEO & Visibility","summary":"Assessment","metrics":[],"findings":[],"recommendations":[]},"email_marketing":{"grade":"C","score":50,"title":"Email Marketing Readiness","summary":"Assessment","metrics":[],"findings":[],"recommendations":[]},"competitive_positioning":{"grade":"B","score":65,"title":"Competitive Positioning","summary":"Assessment","metrics":[],"findings":[],"recommendations":[]}},"priority_recommendations":[{"category":"SEO","priority":"high","text":"Top recommendation","impact":"high","effort":"low"}]}

IMPORTANT: Output ONLY the JSON object. No text before or after. Each category must have at least 2 metrics, 2 findings, and 2 recommendations with real, specific analysis based on the business data provided.`
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
    '{{OVERALL_SUMMARY}}': data.assessmentData.overall?.summary || ''
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
