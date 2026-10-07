// Netlify Function: Notify Coach Assigned
// Sends notification email to a coach when they are assigned to a client project

import { createClient } from '@supabase/supabase-js';

// ===============================================================================
// UTILITIES
// ===============================================================================

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toTitleCase(slug) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function handler(event, context) {
  // CORS headers - restrict to production domain only
  const allowedOrigins = [
    'https://accelerator.elearningu.com',
    'https://junction-accelerator-generator.netlify.app'
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
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Response headers (includes CORS + content type)
  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json'
  };

  try {
    // Parse request body
    const body = JSON.parse(event.body);
    const { coachEmail, clientSlug, clientName, dashboardType } = body;

    // Validate required fields
    if (!coachEmail || !clientSlug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: coachEmail, clientSlug' })
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(coachEmail)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Please enter a valid email address' })
      };
    }

    // ---------------------------------------------------------------------------
    // 1. VERIFY AUTH
    // ---------------------------------------------------------------------------
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
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
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    // ---------------------------------------------------------------------------
    // 2. VERIFY SENDER HAS PERMISSION (admin/psm only can assign coaches)
    // ---------------------------------------------------------------------------
    const { data: senderAccess } = await supabaseAdmin
      .from('user_plans')
      .select('role, client_slug')
      .eq('email', user.email)
      .eq('active', true);

    const isAdminOrPSM = senderAccess?.some(row =>
      row.client_slug === '*' && (row.role === 'admin' || row.role === 'psm')
    );

    if (!isAdminOrPSM) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins and PSMs can assign coaches' })
      };
    }

    // ---------------------------------------------------------------------------
    // 3. GET CLIENT/PROJECT INFO
    // ---------------------------------------------------------------------------
    const displayName = clientName || toTitleCase(clientSlug);

    // Determine dashboard URL based on type
    let dashboardPath;
    if (dashboardType === 'experience') {
      dashboardPath = `/experience/${encodeURIComponent(clientSlug)}/`;
    } else if (dashboardType === 'elevated') {
      dashboardPath = `/elevated/${encodeURIComponent(clientSlug)}/`;
    } else {
      // Default: accelerator
      dashboardPath = `/clients/${encodeURIComponent(clientSlug)}/`;
    }
    const dashboardUrl = `https://accelerator.elearningu.com${dashboardPath}`;
    const myClientsUrl = 'https://accelerator.elearningu.com/my-clients/';

    // Escape user-provided content for HTML safety
    const safeSenderEmail = escapeHtml(user.email);
    const safeClientName = escapeHtml(displayName);
    const safeCoachEmail = escapeHtml(coachEmail);

    // ---------------------------------------------------------------------------
    // 4. BUILD AND SEND EMAIL VIA RESEND
    // ---------------------------------------------------------------------------
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #fcf5ec; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fcf5ec; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(17,21,75,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #11154b; padding: 32px; text-align: center;">
              <span style="font-size: 18px; font-weight: 800; color: #aadab6; letter-spacing: 0.06em; text-transform: uppercase;">eLearningU</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #11154b;">You've Been Assigned a New Client</h1>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #6b6b8a;">
                Great news! You have been assigned as the coach for <strong style="color: #11154b;">${safeClientName}</strong>.
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #6b6b8a;">
                You can now access their dashboard to view their assessment, track their progress, and support them through the program.
              </p>
              <!-- Info Box -->
              <div style="background-color: #f5ede0; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #11154b;">Project Details</p>
                <p style="margin: 0; font-size: 14px; color: #6b6b8a;">
                  <strong>Client:</strong> ${safeClientName}<br>
                  <strong>Dashboard Type:</strong> ${dashboardType === 'experience' ? 'Experience Design' : dashboardType === 'elevated' ? 'Elevated Masterclass' : 'Accelerator'}
                </p>
              </div>
              <!-- Buttons -->
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #11154b; border-radius: 10px; margin-right: 12px;">
                    <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 16px 28px; font-size: 15px; font-weight: 700; color: #aadab6; text-decoration: none;">
                      View Client Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #6b6b8a; text-align: center;">
                <a href="${myClientsUrl}" style="color: #11154b; text-decoration: underline;">View all your clients</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f5ede0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6b6b8a;">
                Assigned by ${safeSenderEmail}<br>
                eLearningU Accelerator Program<br>
                <a href="https://accelerator.elearningu.com" style="color: #11154b;">accelerator.elearningu.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // Send via Resend API
    if (process.env.RESEND_API_KEY) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'eLearningU <noreply@elearningu.com>',
            to: [coachEmail],
            subject: `New Client Assignment: ${safeClientName}`,
            html: emailHtml
          })
        });

        if (!resendRes.ok) {
          const resendError = await resendRes.json();
          console.error('Resend API error:', resendError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to send email. Please try again.' })
          };
        }
      } catch (emailErr) {
        console.error('Email send error:', emailErr);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to send email. Please try again.' })
        };
      }
    } else {
      console.warn('RESEND_API_KEY not configured - skipping email');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Email service not configured' })
      };
    }

    // ---------------------------------------------------------------------------
    // 5. SUCCESS
    // ---------------------------------------------------------------------------
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Coach notification sent to ${coachEmail}`
      })
    };

  } catch (err) {
    console.error('Unexpected error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Internal server error' })
    };
  }
}
