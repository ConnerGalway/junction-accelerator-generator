// Netlify Function: Generate PDF
// Generates professional PDF reports for assessments, accelerator plans, and experience plans
// Uses DocRaptor API (or PDFShift as alternative) for high-quality PDF rendering

import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
  if (!dateStr) return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getGradeClass(grade) {
  if (!grade) return '';
  const letter = grade.charAt(0).toUpperCase();
  if (letter === 'A') return 'a';
  if (letter === 'B') return 'b';
  if (letter === 'C') return 'c';
  if (letter === 'D') return 'd';
  return 'f';
}

function getStatusClass(status) {
  if (!status) return '';
  const s = status.toLowerCase();
  if (s === 'good' || s === 'excellent') return 'good';
  if (s === 'warning' || s === 'needs improvement') return 'warning';
  if (s === 'critical' || s === 'poor') return 'critical';
  return '';
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function handler(event, context) {
  // CORS headers
  const allowedOrigins = [
    'https://accelerator.elearningu.com',
    'https://junction-accelerator-generator.netlify.app',
    'http://localhost:8888'
  ];
  const origin = event.headers.origin || event.headers.Origin || '';
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body);
    const { pdfType, clientSlug } = body;

    // Validate required fields
    if (!pdfType || !clientSlug) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required fields: pdfType, clientSlug' })
      };
    }

    // Validate PDF type
    const validTypes = ['assessment', 'accelerator', 'experience'];
    if (!validTypes.includes(pdfType)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: `Invalid pdfType. Must be one of: ${validTypes.join(', ')}` })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VERIFY AUTH
    // ─────────────────────────────────────────────────────────────────────────
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VERIFY USER HAS ACCESS TO THIS PROJECT
    // ─────────────────────────────────────────────────────────────────────────
    const { data: userAccess } = await supabaseAdmin
      .from('user_plans')
      .select('role, client_slug')
      .eq('email', user.email)
      .eq('active', true);

    const hasAccess = userAccess?.some(row =>
      row.client_slug === clientSlug ||
      (row.client_slug === '*' && (row.role === 'admin' || row.role === 'psm'))
    );

    if (!hasAccess) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: "You don't have permission to generate PDFs for this project" })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GENERATE PDF BASED ON TYPE
    // ─────────────────────────────────────────────────────────────────────────
    let html;
    let fileName;

    if (pdfType === 'assessment') {
      const result = await generateAssessmentHTML(clientSlug, supabaseAdmin);
      html = result.html;
      fileName = result.fileName;
    } else if (pdfType === 'accelerator') {
      const result = await generateAcceleratorHTML(clientSlug, supabaseAdmin);
      html = result.html;
      fileName = result.fileName;
    } else if (pdfType === 'experience') {
      const result = await generateExperienceHTML(clientSlug, supabaseAdmin);
      html = result.html;
      fileName = result.fileName;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CALL PDF GENERATION API
    // ─────────────────────────────────────────────────────────────────────────
    const pdfBuffer = await generatePDFFromHTML(html);

    // Return PDF directly as download
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString()
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true
    };

  } catch (err) {
    console.error('PDF generation error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message || 'Failed to generate PDF' })
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ASSESSMENT PDF GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

async function generateAssessmentHTML(clientSlug, supabase) {
  // Fetch assessment data
  const { data: assessment, error } = await supabase
    .from('client_assessments')
    .select('*')
    .eq('client_slug', clientSlug)
    .single();

  if (error || !assessment) {
    throw new Error(`Assessment not found for ${clientSlug}`);
  }

  const data = assessment.assessment_data;
  const clientName = escapeHtml(assessment.business_name || clientSlug);
  const assessmentDate = formatDate(assessment.created_at);

  // Build category cards for overview
  const categoryOrder = [
    'website_technical',
    'reviews_reputation',
    'booking_conversion',
    'social_media',
    'guest_experience',
    'local_visibility'
  ];

  const categoriesHTML = categoryOrder
    .filter(key => data.categories?.[key])
    .map(key => {
      const cat = data.categories[key];
      return `
        <div class="category-card">
          <div class="category-card-grade">${escapeHtml(cat.grade || '-')}</div>
          <div class="category-card-name">${escapeHtml(cat.title || key)}</div>
          <div class="category-card-score">${cat.score || 0}/100</div>
        </div>
      `;
    })
    .join('');

  // Build key strengths list
  const strengthsHTML = (data.executive_summary?.key_strengths || [])
    .map(s => `<li>${escapeHtml(s)}</li>`)
    .join('');

  // Build critical gaps list
  const gapsHTML = (data.executive_summary?.critical_gaps || [])
    .map(g => `<li>${escapeHtml(g)}</li>`)
    .join('');

  // Build category detail pages
  const categoryDetailsHTML = categoryOrder
    .filter(key => data.categories?.[key])
    .map(key => {
      const cat = data.categories[key];

      // Metrics
      const metricsHTML = (cat.metrics || [])
        .slice(0, 3)
        .map(m => `
          <div class="metric-card">
            <div class="label">${escapeHtml(m.label || '')}</div>
            <div class="value ${getStatusClass(m.status)}">${escapeHtml(m.value || '-')}</div>
          </div>
        `)
        .join('');

      // Findings
      const findingsHTML = (cat.findings || [])
        .slice(0, 6)
        .map(f => {
          const icon = f.type === 'positive' ? '+' : f.type === 'negative' ? '-' : 'i';
          return `
            <div class="finding">
              <div class="finding-icon ${f.type || 'info'}">${icon}</div>
              <div>${escapeHtml(f.text || '')}</div>
            </div>
          `;
        })
        .join('');

      // Recommendations
      const recommendationsHTML = (cat.recommendations || [])
        .slice(0, 4)
        .map(r => `
          <div class="recommendation-item">
            <span class="priority">${escapeHtml(r.priority || 'Medium')}</span>
            <p class="text">${escapeHtml(r.text || '')}</p>
            <div class="meta">
              <span>Time: ${escapeHtml(r.time_estimate || 'Varies')}</span>
              <span>Impact: ${escapeHtml(r.impact || 'Medium')}</span>
            </div>
          </div>
        `)
        .join('');

      const weight = data.overall?.scoreBreakdown?.[key]?.weight
        ? Math.round(data.overall.scoreBreakdown[key].weight * 100)
        : 0;

      return `
        <div class="category-page">
          <div class="category-header">
            <div class="category-grade-large">${escapeHtml(cat.grade || '-')}</div>
            <div class="category-header-text">
              <h2>${escapeHtml(cat.title || key)}</h2>
              <p class="score">Score: ${cat.score || 0}/100 | Weight: ${weight}%</p>
            </div>
          </div>

          <p class="category-summary">${escapeHtml(cat.summary || '')}</p>

          ${metricsHTML ? `<div class="metrics-grid">${metricsHTML}</div>` : ''}

          <div class="subsection-title">Key Findings</div>
          ${findingsHTML}

          <div class="subsection-title">Recommendations</div>
          ${recommendationsHTML}
        </div>
      `;
    })
    .join('');

  // Build quick wins
  const quickWinsHTML = (data.quick_wins || [])
    .slice(0, 5)
    .map((qw, i) => `
      <div class="quick-win-card">
        <div class="number">${i + 1}</div>
        <div class="task">${escapeHtml(qw.task || '')}</div>
        ${qw.impact ? `<div class="details">${escapeHtml(qw.impact)}</div>` : ''}
        <div class="meta-row">
          <div class="meta-item">
            <span class="meta-label">Time Required</span>
            <span class="meta-value">${escapeHtml(qw.time_estimate || 'Varies')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Confidence</span>
            <span class="meta-value">${escapeHtml(qw.confidence || 'High')}</span>
          </div>
        </div>
      </div>
    `)
    .join('');

  // Build priority recommendations
  const priorityRecsHTML = (data.priority_recommendations || [])
    .slice(0, 10)
    .map(pr => `
      <div class="priority-card">
        <div class="rank">${pr.priority || '?'}</div>
        <div class="content">
          <span class="category-tag">${escapeHtml(pr.category || '')}</span>
          <p class="text">${escapeHtml(pr.text || '')}</p>
          ${pr.expected_result ? `<p class="expected-result">Expected result: ${escapeHtml(pr.expected_result)}</p>` : ''}
        </div>
      </div>
    `)
    .join('');

  // Build final HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Digital Marketing Assessment - ${clientName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800&family=Open+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    ${getBaseCSS()}
    ${getAssessmentCSS()}
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover-page">
    <img src="https://accelerator.elearningu.com/assets/elearningu-logo-white.png" alt="eLearningU" class="cover-logo">
    <div class="cover-divider"></div>
    <h1 class="cover-title">Digital Marketing</h1>
    <p class="cover-subtitle">Assessment</p>
    <div class="cover-divider"></div>
    <p class="cover-client-name">${clientName}</p>
    <p class="cover-date">${assessmentDate}</p>
    <div class="cover-toc">
      <p class="cover-toc-title">What's Inside</p>
      <ul class="cover-toc-list">
        <li class="cover-toc-item"><span class="cover-toc-link">Executive Summary</span></li>
        <li class="cover-toc-item"><span class="cover-toc-link">Category Breakdown</span></li>
        <li class="cover-toc-item"><span class="cover-toc-link">Quick Wins</span></li>
        <li class="cover-toc-item"><span class="cover-toc-link">Priority Recommendations</span></li>
        <li class="cover-toc-item"><span class="cover-toc-link">Next Steps</span></li>
      </ul>
    </div>
  </div>

  <!-- HOW TO USE -->
  <div class="page-break">
    <h1 class="section-title">How to Use This Report</h1>
    <div class="section-title-underline"></div>
    <p style="font-size: 11pt; line-height: 1.8; margin-bottom: 24px;">
      This assessment provides a comprehensive analysis of your digital marketing presence across six key categories. It is designed to give you a clear picture of where you stand today and what actions will have the greatest impact on attracting and converting visitors.
    </p>
    <div class="subsection-title">The Overall Grade</div>
    <p style="font-size: 11pt; line-height: 1.7; margin-bottom: 20px;">
      Your overall grade reflects the weighted average of all category scores, emphasizing the areas that matter most for tourism businesses: reviews and reputation, booking conversion, and local visibility.
    </p>
    <div class="subsection-title">The Category Breakdown</div>
    <p style="font-size: 11pt; line-height: 1.7; margin-bottom: 20px;">
      Each category includes a detailed analysis of what's working, what needs attention, and specific recommendations to improve. Focus on one category at a time rather than trying to address everything at once.
    </p>
    <div class="subsection-title">Quick Wins</div>
    <p style="font-size: 11pt; line-height: 1.7; margin-bottom: 20px;">
      These are high-impact, low-effort actions you can take immediately. Many can be completed in under an hour and will start improving your digital presence right away.
    </p>
    <div class="content-card" style="margin-top: 32px;">
      <p style="font-size: 10pt; line-height: 1.6;">
        <strong>Need help implementing these recommendations?</strong> Our Tourism Digital Marketing Accelerator program provides hands-on coaching to turn this assessment into a working marketing system. Contact us at <span style="color: #067cbc;">support@elearningu.com</span> to learn more.
      </p>
    </div>
  </div>

  <!-- EXECUTIVE SUMMARY -->
  <div class="page-break">
    <h1 class="section-title">Executive Summary</h1>
    <div class="section-title-underline"></div>
    <div class="overview-grade">
      <div class="grade-circle large">${escapeHtml(data.overall?.grade || '-')}</div>
      <div class="overview-grade-details">
        <h3>Overall Score: ${data.overall?.score || 0}/100</h3>
        <p>${escapeHtml(data.executive_summary?.headline || '')}</p>
      </div>
    </div>
    <div class="category-grid">${categoriesHTML}</div>
    <div class="strengths-gaps">
      <div class="column strengths">
        <h4>Key Strengths</h4>
        <ul class="bullet-list positive">${strengthsHTML}</ul>
      </div>
      <div class="column gaps">
        <h4>Critical Gaps</h4>
        <ul class="bullet-list negative">${gapsHTML}</ul>
      </div>
    </div>
    <div class="executive-summary">
      <h3>The Bottom Line</h3>
      <p>${escapeHtml(data.executive_summary?.bottom_line || '')}</p>
    </div>
  </div>

  <!-- CATEGORY DETAILS -->
  ${categoryDetailsHTML}

  <!-- QUICK WINS -->
  <div class="quick-wins-section">
    <h1 class="section-title">Quick Wins</h1>
    <div class="section-title-underline"></div>
    <p style="font-size: 11pt; line-height: 1.7; margin-bottom: 24px;">
      These are high-impact improvements you can make quickly. Most take under an hour and will start improving your digital presence immediately.
    </p>
    ${quickWinsHTML}
  </div>

  <!-- PRIORITY RECOMMENDATIONS -->
  <div class="priority-recommendations">
    <h1 class="section-title">Priority Recommendations</h1>
    <div class="section-title-underline"></div>
    <p style="font-size: 11pt; line-height: 1.7; margin-bottom: 24px;">
      The following recommendations are ranked by expected impact on your business. Focus on addressing these in order over the next 90 days.
    </p>
    ${priorityRecsHTML}
  </div>

  <!-- THANK YOU -->
  <div class="thank-you-page">
    <h1 class="thank-you-title">Thank You</h1>
    <div class="section-title-underline"></div>
    <div class="thank-you-content">
      <p style="margin-bottom: 16px;">
        This assessment is just the beginning. The real value comes from taking action on the recommendations and building a sustainable marketing system for your business.
      </p>
      <p style="margin-bottom: 16px;">
        If you have questions about any of the findings or recommendations in this report, or if you would like help implementing them, please reach out. We are here to support your success.
      </p>
    </div>
    <div class="contact-box">
      <p class="contact-label">Questions? Reach out any time:</p>
      <span class="contact-email">support@elearningu.com</span>
    </div>
    <div class="page-footer">
      <p>Powered by eLearningU | accelerator.elearningu.com</p>
    </div>
  </div>

</body>
</html>
  `.trim();

  return {
    html,
    fileName: `${clientSlug}-digital-marketing-assessment.pdf`
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCELERATOR PDF GENERATOR (Placeholder)
// ═══════════════════════════════════════════════════════════════════════════

async function generateAcceleratorHTML(clientSlug, supabase) {
  // TODO: Implement accelerator plan PDF generation
  throw new Error('Accelerator PDF generation not yet implemented');
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPERIENCE PDF GENERATOR (Placeholder)
// ═══════════════════════════════════════════════════════════════════════════

async function generateExperienceHTML(clientSlug, supabase) {
  // TODO: Implement experience plan PDF generation
  throw new Error('Experience PDF generation not yet implemented');
}

// ═══════════════════════════════════════════════════════════════════════════
// PDF GENERATION API CALL
// ═══════════════════════════════════════════════════════════════════════════

async function generatePDFFromHTML(html) {
  // Check which PDF service is configured
  if (process.env.DOCRAPTOR_API_KEY) {
    return await generateWithDocRaptor(html);
  } else if (process.env.PDFSHIFT_API_KEY) {
    return await generateWithPDFShift(html);
  } else {
    throw new Error('No PDF generation service configured. Set DOCRAPTOR_API_KEY or PDFSHIFT_API_KEY.');
  }
}

async function generateWithDocRaptor(html) {
  const response = await fetch('https://docraptor.com/docs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_credentials: process.env.DOCRAPTOR_API_KEY,
      doc: {
        document_content: html,
        type: 'pdf',
        test: process.env.NODE_ENV !== 'production',
        prince_options: {
          media: 'print',
          baseurl: 'https://accelerator.elearningu.com'
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DocRaptor error: ${response.status} - ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function generateWithPDFShift(html) {
  const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`api:${process.env.PDFSHIFT_API_KEY}`).toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      source: html,
      landscape: false,
      format: 'Letter',
      margin: '0.75in'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PDFShift error: ${response.status} - ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// ═══════════════════════════════════════════════════════════════════════════
// INLINE CSS (to ensure styles are embedded in HTML sent to PDF service)
// ═══════════════════════════════════════════════════════════════════════════

function getBaseCSS() {
  return `
    :root {
      --navy-900: #11154b;
      --navy-800: #1a1f6b;
      --mint-500: #aadab6;
      --cream-100: #fcf5ec;
      --cream-200: #f5ede0;
      --link-blue: #067cbc;
      --muted: #6b6b8a;
      --success: #28a745;
      --danger: #dc3545;
      --font-display: 'Raleway', sans-serif;
      --font-body: 'Open Sans', sans-serif;
    }

    @page { size: letter; margin: 0.75in 0.65in 0.85in 0.65in; }
    @page cover { margin: 0; }
    @page :first { margin: 0; }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      font-family: var(--font-body);
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .cover-page {
      page: cover;
      width: 100%;
      height: 100vh;
      background: linear-gradient(135deg, var(--navy-900) 0%, var(--navy-800) 100%);
      padding: 2.5in 1.25in 1.5in;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }

    .cover-page::before {
      content: '';
      position: absolute;
      bottom: -10%;
      left: -5%;
      width: 50%;
      height: 70%;
      background: linear-gradient(135deg, rgba(170, 218, 182, 0.15) 0%, rgba(170, 218, 182, 0.05) 100%);
      transform: rotate(-15deg);
      border-radius: 40% 60% 70% 30%;
    }

    .cover-logo { width: 140px; margin-bottom: 2rem; }
    .cover-divider { width: 100%; height: 3px; background: var(--mint-500); margin: 1.5rem 0; }
    .cover-title { font-family: var(--font-display); font-size: 42pt; font-weight: 700; color: #ffffff; line-height: 1.1; margin-bottom: 0.5rem; }
    .cover-subtitle { font-family: var(--font-display); font-size: 42pt; font-weight: 700; color: var(--mint-500); line-height: 1.1; margin-bottom: 2rem; }
    .cover-client-name { font-family: var(--font-display); font-size: 28pt; font-weight: 400; color: #ffffff; margin-bottom: 0.25rem; }
    .cover-date { font-size: 12pt; color: rgba(255, 255, 255, 0.7); }

    .cover-toc {
      position: absolute;
      right: 1.25in;
      top: 50%;
      transform: translateY(-50%);
      background: #ffffff;
      border-radius: 16px;
      padding: 1.5rem 2rem;
      width: 260px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    }
    .cover-toc-title { font-family: var(--font-body); font-size: 10pt; font-weight: 600; color: var(--muted); margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .cover-toc-list { list-style: none; }
    .cover-toc-item { margin-bottom: 0.5rem; }
    .cover-toc-link { display: block; padding: 10px 16px; background: linear-gradient(135deg, rgba(170, 218, 182, 0.3) 0%, rgba(170, 218, 182, 0.15) 100%); border-radius: 8px; font-family: var(--font-display); font-size: 10pt; font-weight: 600; color: var(--navy-900); }

    .section-title { font-family: var(--font-display); font-size: 32pt; font-weight: 700; color: var(--navy-900); margin-bottom: 0.5rem; line-height: 1.2; }
    .section-title-underline { width: 100%; height: 2px; background: linear-gradient(90deg, var(--link-blue) 0%, var(--link-blue) 30%, transparent 100%); margin-bottom: 2rem; }
    .subsection-title { font-family: var(--font-display); font-size: 18pt; font-weight: 700; color: var(--link-blue); margin-top: 2rem; margin-bottom: 1rem; }

    .page-break { page-break-before: always; }
    .avoid-break { page-break-inside: avoid; }

    .content-card { background: var(--cream-100); border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; page-break-inside: avoid; }

    .bullet-list { list-style: none; padding-left: 0; }
    .bullet-list li { position: relative; padding-left: 20px; margin-bottom: 0.5rem; font-size: 10pt; line-height: 1.5; }
    .bullet-list li::before { content: ''; position: absolute; left: 0; top: 8px; width: 6px; height: 6px; background: var(--navy-900); border-radius: 50%; }
    .bullet-list.positive li::before { background: var(--success); }
    .bullet-list.negative li::before { background: var(--danger); }

    .thank-you-page { page-break-before: always; }
    .thank-you-title { font-family: var(--font-display); font-size: 42pt; font-weight: 700; color: var(--navy-900); margin-bottom: 1.5rem; }
    .thank-you-content { max-width: 65%; font-size: 11pt; line-height: 1.7; color: #333; }
    .contact-box { background: var(--cream-100); border-radius: 8px; padding: 1rem 1.5rem; margin-top: 2rem; display: inline-block; }
    .contact-label { font-size: 9pt; color: var(--muted); margin-bottom: 0.25rem; }
    .contact-email { font-family: var(--font-display); font-weight: 600; color: var(--navy-900); background: #ffffff; padding: 6px 12px; border-radius: 4px; display: inline-block; }
    .page-footer { background: var(--navy-900); color: #ffffff; padding: 1.5rem; text-align: center; margin-top: 3rem; }
    .page-footer p { font-size: 10pt; opacity: 0.9; }
  `;
}

function getAssessmentCSS() {
  return `
    .overview-grade { display: flex; align-items: center; gap: 32px; background: var(--cream-100); border-radius: 16px; padding: 24px 32px; margin: 24px 0; }
    .grade-circle { width: 100px; height: 100px; border-radius: 50%; background: var(--mint-500); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 36pt; font-weight: 800; color: var(--navy-900); flex-shrink: 0; }
    .grade-circle.large { width: 140px; height: 140px; font-size: 48pt; }
    .overview-grade-details h3 { font-family: var(--font-display); font-size: 16pt; font-weight: 600; color: var(--navy-900); margin-bottom: 8px; }
    .overview-grade-details p { font-size: 11pt; line-height: 1.6; color: #333; }

    .category-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1.5rem 0; }
    .category-card { background: #ffffff; border: 1px solid var(--cream-200); border-radius: 12px; padding: 1rem; text-align: center; }
    .category-card-grade { font-family: var(--font-display); font-size: 24pt; font-weight: 700; color: var(--navy-900); }
    .category-card-name { font-size: 9pt; color: var(--muted); margin-top: 0.25rem; }
    .category-card-score { font-size: 10pt; font-weight: 600; color: var(--navy-900); }

    .strengths-gaps { display: flex; gap: 24px; margin: 24px 0; }
    .strengths-gaps .column { flex: 1; background: #ffffff; border-radius: 12px; padding: 20px; border: 1px solid var(--cream-200); }
    .strengths-gaps .column h4 { font-family: var(--font-display); font-size: 12pt; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .strengths-gaps .column.strengths h4 { color: var(--success); }
    .strengths-gaps .column.gaps h4 { color: var(--danger); }

    .executive-summary { background: var(--navy-900); color: #ffffff; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .executive-summary h3 { font-family: var(--font-display); font-size: 14pt; font-weight: 700; color: var(--mint-500); margin-bottom: 12px; }
    .executive-summary p { font-size: 11pt; line-height: 1.7; opacity: 0.95; }

    .category-page { page-break-before: always; }
    .category-header { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid var(--cream-200); }
    .category-grade-large { width: 80px; height: 80px; border-radius: 50%; background: var(--mint-500); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 28pt; font-weight: 800; color: var(--navy-900); flex-shrink: 0; }
    .category-header-text h2 { font-family: var(--font-display); font-size: 22pt; font-weight: 700; color: var(--navy-900); margin-bottom: 4px; }
    .category-header-text .score { font-size: 12pt; color: var(--muted); }
    .category-summary { font-size: 11pt; line-height: 1.7; color: #333; margin-bottom: 24px; }

    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
    .metric-card { background: var(--cream-100); border-radius: 8px; padding: 12px 16px; text-align: center; }
    .metric-card .label { font-size: 9pt; color: var(--muted); margin-bottom: 4px; }
    .metric-card .value { font-family: var(--font-display); font-size: 14pt; font-weight: 700; color: var(--navy-900); }
    .metric-card .value.good { color: var(--success); }
    .metric-card .value.warning { color: #ffc107; }
    .metric-card .value.critical { color: var(--danger); }

    .finding { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 10pt; line-height: 1.5; }
    .finding-icon { flex-shrink: 0; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; margin-top: 2px; }
    .finding-icon.positive { background: #d4edda; color: #155724; }
    .finding-icon.negative { background: #f8d7da; color: #721c24; }
    .finding-icon.info { background: #d1ecf1; color: #0c5460; }

    .recommendation-item { background: var(--cream-100); border-radius: 8px; padding: 16px; margin-bottom: 12px; page-break-inside: avoid; }
    .recommendation-item .priority { display: inline-block; background: var(--navy-900); color: #ffffff; font-family: var(--font-display); font-size: 9pt; font-weight: 700; padding: 2px 8px; border-radius: 4px; margin-bottom: 8px; text-transform: capitalize; }
    .recommendation-item .text { font-size: 10pt; line-height: 1.6; color: #333; margin-bottom: 8px; }
    .recommendation-item .meta { display: flex; gap: 20px; font-size: 9pt; color: var(--muted); }

    .quick-wins-section { page-break-before: always; }
    .quick-win-card { background: #ffffff; border: 1px solid var(--cream-200); border-radius: 12px; padding: 20px; margin-bottom: 16px; page-break-inside: avoid; }
    .quick-win-card .number { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: var(--mint-500); color: var(--navy-900); border-radius: 50%; font-family: var(--font-display); font-size: 12pt; font-weight: 700; margin-bottom: 12px; }
    .quick-win-card .task { font-family: var(--font-display); font-size: 12pt; font-weight: 600; color: var(--navy-900); margin-bottom: 8px; line-height: 1.4; }
    .quick-win-card .details { font-size: 10pt; color: #555; line-height: 1.6; margin-bottom: 12px; }
    .quick-win-card .meta-row { display: flex; gap: 24px; padding-top: 12px; border-top: 1px solid var(--cream-200); font-size: 9pt; }
    .quick-win-card .meta-item { display: flex; flex-direction: column; gap: 2px; }
    .quick-win-card .meta-label { color: var(--muted); font-weight: 500; }
    .quick-win-card .meta-value { color: var(--navy-900); font-weight: 600; }

    .priority-recommendations { page-break-before: always; }
    .priority-card { display: flex; gap: 16px; background: var(--cream-100); border-radius: 12px; padding: 20px; margin-bottom: 16px; page-break-inside: avoid; }
    .priority-card .rank { flex-shrink: 0; width: 40px; height: 40px; background: var(--navy-900); color: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 16pt; font-weight: 700; }
    .priority-card .content { flex: 1; }
    .priority-card .category-tag { display: inline-block; background: rgba(6, 124, 188, 0.1); color: var(--link-blue); font-size: 9pt; font-weight: 600; padding: 2px 8px; border-radius: 4px; margin-bottom: 8px; }
    .priority-card .text { font-size: 10pt; line-height: 1.6; color: #333; margin-bottom: 8px; }
    .priority-card .expected-result { font-size: 9pt; color: var(--muted); font-style: italic; }
  `;
}
