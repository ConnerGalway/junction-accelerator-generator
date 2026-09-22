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

          <div class="findings-section">
            <div class="subsection-title">Key Findings</div>
            <div class="findings-container">${findingsHTML}</div>
          </div>

          <div class="recommendations-section">
            <div class="subsection-title">Recommendations</div>
            ${recommendationsHTML}
          </div>
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
    <div class="cover-left">
      <img src="https://accelerator.elearningu.com/assets/elearningu-logo-white.png" alt="eLearningU" class="cover-logo">
      <div class="cover-divider"></div>
      <h1 class="cover-title">Digital Marketing</h1>
      <p class="cover-subtitle">Assessment</p>
      <div class="cover-divider"></div>
      <p class="cover-client-name">${clientName}</p>
      <p class="cover-date">${assessmentDate}</p>
    </div>
    <div class="cover-right">
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
      padding: 1.5in 1in 1in;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: stretch;
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
      z-index: 0;
    }

    .cover-left {
      display: flex;
      flex-direction: column;
      justify-content: center;
      max-width: 55%;
      z-index: 1;
    }

    .cover-right {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      z-index: 1;
    }

    .cover-logo { width: 120px; margin-bottom: 1.5rem; }
    .cover-divider { width: 100%; height: 3px; background: var(--mint-500); margin: 1rem 0; }
    .cover-title { font-family: var(--font-display); font-size: 36pt; font-weight: 700; color: #ffffff; line-height: 1.1; margin-bottom: 0.25rem; }
    .cover-subtitle { font-family: var(--font-display); font-size: 36pt; font-weight: 700; color: var(--mint-500); line-height: 1.1; margin-bottom: 1.5rem; }
    .cover-client-name { font-family: var(--font-display); font-size: 22pt; font-weight: 400; color: #ffffff; margin-bottom: 0.25rem; line-height: 1.3; }
    .cover-date { font-size: 11pt; color: rgba(255, 255, 255, 0.7); }

    .cover-toc {
      background: #ffffff;
      border-radius: 16px;
      padding: 1.25rem 1.5rem;
      width: 220px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    }
    .cover-toc-title { font-family: var(--font-body); font-size: 9pt; font-weight: 600; color: var(--muted); margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .cover-toc-list { list-style: none; }
    .cover-toc-item { margin-bottom: 0.4rem; }
    .cover-toc-link { display: block; padding: 8px 12px; background: linear-gradient(135deg, rgba(170, 218, 182, 0.3) 0%, rgba(170, 218, 182, 0.15) 100%); border-radius: 6px; font-family: var(--font-display); font-size: 9pt; font-weight: 600; color: var(--navy-900); }

    /* ══════════════════════════════════════════════════════════════════════
       TYPOGRAPHY & SECTION HEADERS
       ══════════════════════════════════════════════════════════════════════ */
    .section-title {
      font-family: var(--font-display);
      font-size: 28pt;
      font-weight: 700;
      color: var(--navy-900);
      margin-bottom: 0.5rem;
      line-height: 1.2;
      page-break-after: avoid;
    }
    .section-title-underline {
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, var(--link-blue) 0%, var(--link-blue) 30%, transparent 100%);
      margin-bottom: 1.5rem;
      page-break-after: avoid;
    }
    .subsection-title {
      font-family: var(--font-display);
      font-size: 14pt;
      font-weight: 700;
      color: var(--link-blue);
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
      page-break-after: avoid;
    }

    /* ══════════════════════════════════════════════════════════════════════
       PAGE BREAK CONTROLS
       ══════════════════════════════════════════════════════════════════════ */
    .page-break { page-break-before: always; padding-top: 0; }
    .avoid-break { page-break-inside: avoid; }

    /* Prevent orphaned headers */
    h1, h2, h3, h4 { page-break-after: avoid; }

    /* Prevent widows and orphans in paragraphs */
    p { widows: 3; orphans: 3; }

    .content-card {
      background: var(--cream-100);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 1rem;
      page-break-inside: avoid;
    }

    /* ══════════════════════════════════════════════════════════════════════
       LISTS
       ══════════════════════════════════════════════════════════════════════ */
    .bullet-list { list-style: none; padding-left: 0; }
    .bullet-list li {
      position: relative;
      padding-left: 18px;
      margin-bottom: 0.4rem;
      font-size: 10pt;
      line-height: 1.5;
      page-break-inside: avoid;
    }
    .bullet-list li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 7px;
      width: 5px;
      height: 5px;
      background: var(--navy-900);
      border-radius: 50%;
    }
    .bullet-list.positive li::before { background: var(--success); }
    .bullet-list.negative li::before { background: var(--danger); }

    /* ══════════════════════════════════════════════════════════════════════
       THANK YOU PAGE
       ══════════════════════════════════════════════════════════════════════ */
    .thank-you-page {
      page-break-before: always;
      display: flex;
      flex-direction: column;
      min-height: 80vh;
    }
    .thank-you-title {
      font-family: var(--font-display);
      font-size: 36pt;
      font-weight: 700;
      color: var(--navy-900);
      margin-bottom: 1.5rem;
    }
    .thank-you-content {
      max-width: 70%;
      font-size: 11pt;
      line-height: 1.8;
      color: #333;
      flex-grow: 1;
    }
    .contact-box {
      background: var(--cream-100);
      border-radius: 8px;
      padding: 1rem 1.5rem;
      margin-top: 2rem;
      display: inline-block;
    }
    .contact-label { font-size: 9pt; color: var(--muted); margin-bottom: 0.25rem; }
    .contact-email {
      font-family: var(--font-display);
      font-weight: 600;
      color: var(--navy-900);
      background: #ffffff;
      padding: 6px 12px;
      border-radius: 4px;
      display: inline-block;
    }
    .page-footer {
      background: var(--navy-900);
      color: #ffffff;
      padding: 1rem 1.5rem;
      text-align: center;
      margin-top: auto;
      border-radius: 8px;
    }
    .page-footer p { font-size: 9pt; opacity: 0.9; margin: 0; }
  `;
}

function getAssessmentCSS() {
  return `
    /* ══════════════════════════════════════════════════════════════════════
       EXECUTIVE SUMMARY - OVERVIEW GRADE
       ══════════════════════════════════════════════════════════════════════ */
    .overview-grade {
      display: flex;
      align-items: center;
      gap: 24px;
      background: var(--cream-100);
      border-radius: 12px;
      padding: 20px 24px;
      margin: 20px 0;
      page-break-inside: avoid;
    }
    .grade-circle {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: var(--mint-500);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-size: 32pt;
      font-weight: 800;
      color: var(--navy-900);
      flex-shrink: 0;
    }
    .grade-circle.large { width: 110px; height: 110px; font-size: 40pt; }
    .overview-grade-details h3 {
      font-family: var(--font-display);
      font-size: 14pt;
      font-weight: 600;
      color: var(--navy-900);
      margin-bottom: 6px;
    }
    .overview-grade-details p { font-size: 10pt; line-height: 1.6; color: #333; }

    /* ══════════════════════════════════════════════════════════════════════
       CATEGORY GRID
       ══════════════════════════════════════════════════════════════════════ */
    .category-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 1rem 0;
      page-break-inside: avoid;
    }
    .category-card {
      flex: 1 1 30%;
      min-width: 140px;
      background: #ffffff;
      border: 1px solid var(--cream-200);
      border-radius: 10px;
      padding: 12px;
      text-align: center;
      page-break-inside: avoid;
    }
    .category-card-grade {
      font-family: var(--font-display);
      font-size: 20pt;
      font-weight: 700;
      color: var(--navy-900);
    }
    .category-card-name {
      font-size: 8pt;
      color: var(--muted);
      margin-top: 2px;
      line-height: 1.3;
    }
    .category-card-score {
      font-size: 9pt;
      font-weight: 600;
      color: var(--navy-900);
      margin-top: 2px;
    }

    /* ══════════════════════════════════════════════════════════════════════
       STRENGTHS & GAPS
       ══════════════════════════════════════════════════════════════════════ */
    .strengths-gaps {
      display: flex;
      gap: 16px;
      margin: 16px 0;
      page-break-inside: avoid;
    }
    .strengths-gaps .column {
      flex: 1;
      background: #ffffff;
      border-radius: 10px;
      padding: 14px;
      border: 1px solid var(--cream-200);
    }
    .strengths-gaps .column h4 {
      font-family: var(--font-display);
      font-size: 11pt;
      font-weight: 700;
      margin-bottom: 10px;
    }
    .strengths-gaps .column.strengths h4 { color: var(--success); }
    .strengths-gaps .column.gaps h4 { color: var(--danger); }

    /* ══════════════════════════════════════════════════════════════════════
       EXECUTIVE SUMMARY BOX
       ══════════════════════════════════════════════════════════════════════ */
    .executive-summary {
      background: var(--navy-900);
      color: #ffffff;
      border-radius: 10px;
      padding: 18px 20px;
      margin: 16px 0;
      page-break-inside: avoid;
    }
    .executive-summary h3 {
      font-family: var(--font-display);
      font-size: 12pt;
      font-weight: 700;
      color: var(--mint-500);
      margin-bottom: 8px;
    }
    .executive-summary p { font-size: 10pt; line-height: 1.6; opacity: 0.95; }

    /* ══════════════════════════════════════════════════════════════════════
       CATEGORY DETAIL PAGES
       ══════════════════════════════════════════════════════════════════════ */
    .category-page { page-break-before: always; }
    .category-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid var(--cream-200);
      page-break-inside: avoid;
      page-break-after: avoid;
    }
    .category-grade-large {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--mint-500);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-size: 22pt;
      font-weight: 800;
      color: var(--navy-900);
      flex-shrink: 0;
    }
    .category-header-text h2 {
      font-family: var(--font-display);
      font-size: 18pt;
      font-weight: 700;
      color: var(--navy-900);
      margin-bottom: 2px;
    }
    .category-header-text .score { font-size: 10pt; color: var(--muted); }
    .category-summary {
      font-size: 10pt;
      line-height: 1.6;
      color: #333;
      margin-bottom: 16px;
    }

    /* ══════════════════════════════════════════════════════════════════════
       METRICS GRID
       ══════════════════════════════════════════════════════════════════════ */
    .metrics-grid {
      display: flex;
      gap: 10px;
      margin: 14px 0;
      page-break-inside: avoid;
    }
    .metric-card {
      flex: 1;
      background: var(--cream-100);
      border-radius: 8px;
      padding: 10px 12px;
      text-align: center;
    }
    .metric-card .label { font-size: 8pt; color: var(--muted); margin-bottom: 3px; }
    .metric-card .value {
      font-family: var(--font-display);
      font-size: 12pt;
      font-weight: 700;
      color: var(--navy-900);
    }
    .metric-card .value.good { color: var(--success); }
    .metric-card .value.warning { color: #e6a700; }
    .metric-card .value.critical { color: var(--danger); }

    /* ══════════════════════════════════════════════════════════════════════
       FINDINGS
       ══════════════════════════════════════════════════════════════════════ */
    .findings-container {
      margin-bottom: 16px;
    }
    .finding {
      display: flex;
      gap: 8px;
      margin-bottom: 6px;
      font-size: 9pt;
      line-height: 1.5;
      page-break-inside: avoid;
    }
    .finding-icon {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 700;
      margin-top: 1px;
    }
    .finding-icon.positive { background: #d4edda; color: #155724; }
    .finding-icon.negative { background: #f8d7da; color: #721c24; }
    .finding-icon.info { background: #d1ecf1; color: #0c5460; }

    /* ══════════════════════════════════════════════════════════════════════
       RECOMMENDATIONS
       ══════════════════════════════════════════════════════════════════════ */
    .recommendation-item {
      background: var(--cream-100);
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    .recommendation-item .priority {
      display: inline-block;
      background: var(--navy-900);
      color: #ffffff;
      font-family: var(--font-display);
      font-size: 8pt;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      margin-bottom: 6px;
      text-transform: capitalize;
    }
    .recommendation-item .text {
      font-size: 9pt;
      line-height: 1.5;
      color: #333;
      margin-bottom: 6px;
    }
    .recommendation-item .meta {
      display: flex;
      gap: 16px;
      font-size: 8pt;
      color: var(--muted);
    }

    /* ══════════════════════════════════════════════════════════════════════
       QUICK WINS SECTION
       ══════════════════════════════════════════════════════════════════════ */
    .quick-wins-section { page-break-before: always; }
    .quick-win-card {
      background: #ffffff;
      border: 1px solid var(--cream-200);
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .quick-win-card .number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: var(--mint-500);
      color: var(--navy-900);
      border-radius: 50%;
      font-family: var(--font-display);
      font-size: 11pt;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .quick-win-card .task {
      font-family: var(--font-display);
      font-size: 11pt;
      font-weight: 600;
      color: var(--navy-900);
      margin-bottom: 6px;
      line-height: 1.4;
    }
    .quick-win-card .details {
      font-size: 9pt;
      color: #555;
      line-height: 1.5;
      margin-bottom: 10px;
    }
    .quick-win-card .meta-row {
      display: flex;
      gap: 20px;
      padding-top: 10px;
      border-top: 1px solid var(--cream-200);
      font-size: 8pt;
    }
    .quick-win-card .meta-item { display: flex; flex-direction: column; gap: 1px; }
    .quick-win-card .meta-label { color: var(--muted); font-weight: 500; }
    .quick-win-card .meta-value { color: var(--navy-900); font-weight: 600; }

    /* ══════════════════════════════════════════════════════════════════════
       PRIORITY RECOMMENDATIONS SECTION
       ══════════════════════════════════════════════════════════════════════ */
    .priority-recommendations { page-break-before: always; }
    .priority-card {
      display: flex;
      gap: 12px;
      background: var(--cream-100);
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    .priority-card .rank {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      background: var(--navy-900);
      color: #ffffff;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-size: 13pt;
      font-weight: 700;
    }
    .priority-card .content { flex: 1; }
    .priority-card .category-tag {
      display: inline-block;
      background: rgba(6, 124, 188, 0.1);
      color: var(--link-blue);
      font-size: 8pt;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 3px;
      margin-bottom: 5px;
    }
    .priority-card .text {
      font-size: 9pt;
      line-height: 1.5;
      color: #333;
      margin-bottom: 5px;
    }
    .priority-card .expected-result {
      font-size: 8pt;
      color: var(--muted);
      font-style: italic;
    }
  `;
}
