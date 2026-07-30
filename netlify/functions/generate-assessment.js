// Netlify Function: Generate Assessment
// Analyzes a business's digital marketing presence and generates an assessment dashboard

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function handler(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body);
    const { businessName, slug, websiteUrl, location, social } = body;

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

    // ─────────────────────────────────────────────────────────────────────────
    // 4. FETCH SEOPTIMER DATA
    // ─────────────────────────────────────────────────────────────────────────
    let seoptData = null;
    try {
      seoptData = await fetchSEOptimerReport(websiteUrl);
    } catch (err) {
      console.error('SEOptimer error:', err.message);
      // Continue without SEOptimer data - we'll use Claude for analysis
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. GENERATE ASSESSMENT WITH CLAUDE
    // ─────────────────────────────────────────────────────────────────────────
    const assessmentData = await generateAssessmentWithClaude({
      businessName,
      websiteUrl,
      location,
      social,
      seoptData
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 6. UPDATE ASSESSMENT RECORD WITH DATA
    // ─────────────────────────────────────────────────────────────────────────
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

async function fetchSEOptimerReport(url) {
  if (!process.env.SEOPTIMER_API_KEY) {
    throw new Error('SEOPTIMER_API_KEY not configured');
  }

  const response = await fetch('https://api.seoptimer.com/v2/report', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SEOPTIMER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SEOptimer API error: ${response.status} - ${text}`);
  }

  return response.json();
}

// ═══════════════════════════════════════════════════════════════════════════
// CLAUDE ASSESSMENT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateAssessmentWithClaude(data) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  // Build context from available data
  const context = buildAssessmentContext(data);

  // Generate comprehensive assessment in a single call for efficiency
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: `You are a world-class tourism digital marketing consultant. Analyze this business and generate a comprehensive digital marketing assessment.

${context}

Generate a detailed assessment covering ALL 8 categories. For each category, provide:
- A letter grade (A, B, C, D, or F)
- A score (0-100)
- A 2-3 sentence summary
- 3-5 specific metrics with values and status (good/warning/critical)
- 2-4 findings (mix of positive and negative)
- 2-4 prioritized recommendations

Return your assessment as a JSON object with this exact structure:
{
  "overall": {
    "grade": "B+",
    "score": 78,
    "summary": "Overall assessment summary..."
  },
  "categories": {
    "website_technical": {
      "grade": "B",
      "score": 72,
      "title": "Website & Technical Foundation",
      "summary": "...",
      "metrics": [
        { "label": "Page Speed", "value": "2.3s", "status": "warning", "tooltip": "Optimal is under 2s" }
      ],
      "findings": [
        { "type": "positive", "text": "SSL certificate is valid and properly configured" },
        { "type": "negative", "text": "Missing H1 tag on homepage" }
      ],
      "recommendations": [
        { "priority": "high", "text": "Add descriptive H1 tag to homepage" }
      ]
    },
    "ai_search_readiness": { ... },
    "online_booking": { ... },
    "review_ecosystem": { ... },
    "social_media_health": { ... },
    "local_seo": { ... },
    "email_marketing": { ... },
    "competitive_positioning": { ... }
  },
  "priority_recommendations": [
    { "category": "SEO", "priority": "high", "text": "...", "impact": "high", "effort": "low" }
  ]
}

Be specific and actionable. Base your assessment on the data provided and reasonable inferences for a tourism business. If certain data is not available, make informed estimates based on typical patterns for similar businesses.`
    }]
  });

  // Parse the response
  try {
    const content = response.content[0].text;
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    return JSON.parse(jsonStr);
  } catch (parseError) {
    console.error('Failed to parse Claude response:', parseError);
    // Return a default structure
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

  try {
    // 1. Get latest commit SHA
    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, { headers });
    if (!refRes.ok) throw new Error('Failed to get branch ref');
    const refData = await refRes.json();
    const latestCommitSha = refData.object.sha;

    // 2. Get tree of latest commit
    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, { headers });
    if (!commitRes.ok) throw new Error('Failed to get commit');
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    // 3. Create new tree
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
    if (!treeRes.ok) throw new Error('Failed to create tree');
    const treeData = await treeRes.json();

    // 4. Create commit
    const newCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        tree: treeData.sha,
        parents: [latestCommitSha]
      })
    });
    if (!newCommitRes.ok) throw new Error('Failed to create commit');
    const newCommitData = await newCommitRes.json();

    // 5. Update branch reference
    const updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: newCommitData.sha })
    });
    if (!updateRefRes.ok) throw new Error('Failed to update branch');

    return { commitUrl: newCommitData.html_url };

  } catch (err) {
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
