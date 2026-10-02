// Netlify Function: Notify Week Complete
// Sends notification email to PSM when a client completes 100% of tasks in a week

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

function formatClientName(slug) {
  // Convert slug like "alberni-adventure-gear" to "Alberni Adventure Gear"
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
    const { clientSlug, week, tasksCompleted, clientName } = body;

    // Validate required fields
    if (!clientSlug || !week || !tasksCompleted) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: clientSlug, week, tasksCompleted' })
      };
    }

    // Validate week number
    const weekNum = parseInt(week, 10);
    if (isNaN(weekNum) || weekNum < 1 || weekNum > 12) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Week must be a number between 1 and 12' })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. VERIFY AUTH
    // ─────────────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────────────
    // 2. VERIFY USER HAS CLIENT ACCESS TO THIS PROJECT
    // ─────────────────────────────────────────────────────────────────────────
    const { data: userAccess } = await supabaseAdmin
      .from('user_plans')
      .select('role, client_slug')
      .eq('email', user.email)
      .eq('client_slug', clientSlug)
      .eq('active', true);

    // Only clients can trigger completion notifications
    const hasClientAccess = userAccess?.some(row => row.role === 'client');

    if (!hasClientAccess) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only clients can trigger week completion notifications' })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. CHECK IF ALREADY NOTIFIED
    // ─────────────────────────────────────────────────────────────────────────
    const { data: existingCompletion } = await supabaseAdmin
      .from('week_completions')
      .select('id, notified_at')
      .eq('user_id', user.id)
      .eq('client_slug', clientSlug)
      .eq('week', weekNum)
      .single();

    if (existingCompletion?.notified_at) {
      // Already notified, skip silently
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Already notified',
          alreadyNotified: true
        })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. FIND PSM FOR THIS CLIENT
    // ─────────────────────────────────────────────────────────────────────────
    // First, look for a PSM with wildcard access (global PSM)
    const { data: psmRows } = await supabaseAdmin
      .from('user_plans')
      .select('email')
      .eq('role', 'psm')
      .eq('client_slug', '*')
      .eq('active', true);

    if (!psmRows || psmRows.length === 0) {
      console.warn('No PSM found with wildcard access - skipping notification');
      // Record completion without notification
      await recordCompletion(supabaseAdmin, user.id, clientSlug, weekNum, null);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Completion recorded, but no PSM configured for notifications',
          noPsm: true
        })
      };
    }

    const psmEmail = psmRows[0].email;

    // ─────────────────────────────────────────────────────────────────────────
    // 5. GET CLIENT INFO
    // ─────────────────────────────────────────────────────────────────────────
    const displayName = clientName || formatClientName(clientSlug);
    const safeClientName = escapeHtml(displayName);
    const safeUserEmail = escapeHtml(user.email);

    // Format tasks list
    const tasksList = Array.isArray(tasksCompleted)
      ? tasksCompleted.map(t => `<li style="margin: 4px 0; color: #11154b;">${escapeHtml(t)}</li>`).join('')
      : '';

    // ─────────────────────────────────────────────────────────────────────────
    // 6. SEND NOTIFICATION EMAIL TO PSM
    // ─────────────────────────────────────────────────────────────────────────
    const dashboardUrl = `https://accelerator.elearningu.com/clients/${encodeURIComponent(clientSlug)}/#week-${weekNum}`;

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
              <div style="display: inline-block; background: #d4edda; color: #155724; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 16px;">
                Week ${weekNum} Complete
              </div>
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #11154b;">${safeClientName} Finished Week ${weekNum}!</h1>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #6b6b8a;">
                Great news! <strong style="color: #11154b;">${safeUserEmail}</strong> has completed all tasks for Week ${weekNum} of their accelerator program.
              </p>
              ${tasksList ? `
              <div style="background: #f8f9fa; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px;">
                <div style="font-size: 13px; font-weight: 600; color: #6b6b8a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Tasks Completed</div>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                  ${tasksList}
                </ul>
              </div>
              ` : ''}
              <!-- Button -->
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #11154b; border-radius: 10px;">
                    <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; font-size: 15px; font-weight: 700; color: #aadab6; text-decoration: none;">
                      View Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f5ede0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6b6b8a;">
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
    let emailSent = false;
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
            to: [psmEmail],
            subject: `${safeClientName} completed Week ${weekNum}`,
            html: emailHtml
          })
        });

        if (!resendRes.ok) {
          const resendError = await resendRes.json();
          console.error('Resend API error:', resendError);
        } else {
          emailSent = true;
        }
      } catch (emailErr) {
        console.error('Email send error:', emailErr);
      }
    } else {
      console.warn('RESEND_API_KEY not configured - skipping email');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. RECORD COMPLETION
    // ─────────────────────────────────────────────────────────────────────────
    await recordCompletion(supabaseAdmin, user.id, clientSlug, weekNum, emailSent ? psmEmail : null);

    // ─────────────────────────────────────────────────────────────────────────
    // 8. SUCCESS
    // ─────────────────────────────────────────────────────────────────────────
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: emailSent ? `Notification sent to PSM (${psmEmail})` : 'Completion recorded',
        emailSent
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

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Record completion in database
// ═══════════════════════════════════════════════════════════════════════════

async function recordCompletion(supabase, userId, clientSlug, week, psmEmail) {
  const now = new Date().toISOString();

  // Upsert to handle both new completions and updates
  const { error } = await supabase
    .from('week_completions')
    .upsert({
      user_id: userId,
      client_slug: clientSlug,
      week: week,
      completed_at: now,
      notified_at: psmEmail ? now : null,
      psm_email: psmEmail
    }, {
      onConflict: 'user_id,client_slug,week'
    });

  if (error) {
    console.error('Failed to record completion:', error);
  }
}
