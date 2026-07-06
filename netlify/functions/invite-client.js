// Netlify Function: Invite Client
// Creates a user_plans entry and sends invitation email via Resend

import { createClient } from '@supabase/supabase-js';

export async function handler(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  try {
    // Parse request body
    const body = JSON.parse(event.body);
    const { email, clientSlug, clientName, inviterEmail } = body;

    // Validate required fields
    if (!email || !clientSlug || !clientName || !inviterEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Please enter a valid email address' })
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
    // 2. VERIFY INVITER HAS ACCESS TO THIS PROJECT
    // ─────────────────────────────────────────────────────────────────────────
    const { data: inviterAccess } = await supabaseAdmin
      .from('user_plans')
      .select('role, client_slug')
      .eq('email', user.email)
      .eq('active', true);

    const hasAccess = inviterAccess?.some(row =>
      row.client_slug === clientSlug ||
      (row.client_slug === '*' && (row.role === 'admin' || row.role === 'psm'))
    );

    if (!hasAccess) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "You don't have permission to share this project" })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. CHECK IF EMAIL ALREADY HAS ACCESS (active or inactive)
    // ─────────────────────────────────────────────────────────────────────────
    const { data: existingAccess } = await supabaseAdmin
      .from('user_plans')
      .select('id, active')
      .eq('email', email.toLowerCase())
      .eq('client_slug', clientSlug);

    if (existingAccess && existingAccess.length > 0) {
      const existingRow = existingAccess[0];

      if (existingRow.active) {
        // Already has active access
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'This email already has access to this dashboard',
            alreadyExists: true
          })
        };
      } else {
        // Reactivate existing inactive record
        const { error: updateError } = await supabaseAdmin
          .from('user_plans')
          .update({ active: true })
          .eq('id', existingRow.id);

        if (updateError) {
          console.error('Supabase update error:', updateError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to grant access. Please try again.' })
          };
        }
      }
    } else {
      // ─────────────────────────────────────────────────────────────────────────
      // 4. CREATE NEW USER_PLANS ENTRY
      // ─────────────────────────────────────────────────────────────────────────
      const { error: insertError } = await supabaseAdmin
        .from('user_plans')
        .insert({
          email: email.toLowerCase(),
          role: 'client',
          client_slug: clientSlug,
          active: true
        });

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to grant access. Please try again.' })
        };
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. SEND INVITATION EMAIL VIA RESEND
    // ─────────────────────────────────────────────────────────────────────────
    const projectUrl = `https://accelerator.elearningu.com/${clientSlug}/`;

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
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #11154b;">You've Been Invited!</h1>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #6b6b8a;">
                <strong style="color: #11154b;">${inviterEmail}</strong> has shared access to the <strong style="color: #11154b;">${clientName}</strong> accelerator dashboard with you.
              </p>
              <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #6b6b8a;">
                Click the button below to view your dashboard and track your 90-day marketing plan progress.
              </p>
              <!-- Button -->
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #11154b; border-radius: 10px;">
                    <a href="${projectUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; font-size: 15px; font-weight: 700; color: #aadab6; text-decoration: none;">
                      View Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 32px 0 0; font-size: 13px; line-height: 1.6; color: #6b6b8a;">
                If you don't have an account yet, you'll be prompted to create one when you click the link.
              </p>
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
            to: [email],
            subject: `You've been invited to ${clientName} Dashboard`,
            html: emailHtml
          })
        });

        if (!resendRes.ok) {
          const resendError = await resendRes.json();
          console.error('Resend API error:', resendError);
          // Don't fail the request - access was already granted
        }
      } catch (emailErr) {
        console.error('Email send error:', emailErr);
        // Don't fail the request - access was already granted
      }
    } else {
      console.warn('RESEND_API_KEY not configured - skipping email');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. SUCCESS
    // ─────────────────────────────────────────────────────────────────────────
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Invitation sent to ${email}`
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
