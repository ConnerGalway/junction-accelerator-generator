// Netlify Function: Grant Coach Access
// Gives a coach their own user_plans row for a client so they can open the
// dashboard, and removes a replaced coach's access. Called by Edit Project
// and Change Coach on the My Clients page:
//   { clientSlug, coachEmail, startDate? }  grants access, before the save
//   { clientSlug, revokeCoachEmail }        removes access, after the save
// The browser cannot insert into user_plans itself, so this runs with the
// service role after checking the caller is staff for that client.

import { createClient } from '@supabase/supabase-js';
import { ensureCoachAccess, revokeCoachAccess, canAssignCoach } from '../../shared/coach-access.js';

export async function handler(event, context) {
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

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };
  const respond = (statusCode, payload) => ({ statusCode, headers, body: JSON.stringify(payload) });

  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  try {
    const { coachEmail, clientSlug, startDate, revokeCoachEmail } = JSON.parse(event.body || '{}');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!clientSlug || (!coachEmail && !revokeCoachEmail)) {
      return respond(400, { error: 'Missing required fields: clientSlug and a coach email' });
    }
    if (coachEmail && !emailPattern.test(coachEmail.trim())) {
      return respond(400, { error: 'Please enter a valid coach email address' });
    }
    if (revokeCoachEmail && !emailPattern.test(revokeCoachEmail.trim())) {
      return respond(400, { error: 'Invalid previous coach email address' });
    }
    if (!/^[a-z0-9-]+$/.test(clientSlug)) {
      return respond(400, { error: 'Invalid client' });
    }
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return respond(400, { error: 'Invalid start date' });
    }

    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return respond(401, { error: 'Authentication required' });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return respond(401, { error: 'Invalid token' });
    }

    const { data: callerRows } = await supabaseAdmin
      .from('user_plans')
      .select('role, client_slug')
      .eq('email', user.email)
      .eq('active', true);

    // A coach named in the client's coach_email label may also save the project,
    // which is how a coach who is missing their own row repairs it.
    const { data: labelRows } = await supabaseAdmin
      .from('user_plans')
      .select('id')
      .eq('client_slug', clientSlug)
      .ilike('coach_email', user.email.replace(/[\\%_]/g, '\\$&'))
      .limit(1);
    const isLabelledCoach = !!(labelRows && labelRows.length > 0);

    if (!isLabelledCoach && !canAssignCoach(callerRows, clientSlug)) {
      return respond(403, { error: "You don't have permission to assign a coach to this project" });
    }

    let action = null;
    if (coachEmail) {
      const result = await ensureCoachAccess(supabaseAdmin, {
        coachEmail,
        slug: clientSlug,
        startDate: startDate || undefined
      });

      if (!result.ok) {
        console.error('[grant-coach-access]', clientSlug, result.error);
        return respond(500, { error: result.error });
      }
      action = result.action;
    }

    let revoked = 0;
    if (revokeCoachEmail) {
      const previous = revokeCoachEmail.trim().toLowerCase();

      // Never remove the coach the project currently names. The page saves the
      // new coach first, so by now the label should have moved on.
      const { data: currentRows } = await supabaseAdmin
        .from('user_plans')
        .select('coach_email')
        .eq('client_slug', clientSlug)
        .eq('active', true);
      const stillAssigned = (coachEmail || '').trim().toLowerCase() === previous
        || (currentRows || []).some(row => (row.coach_email || '').toLowerCase() === previous);

      if (stillAssigned) {
        return respond(409, { error: 'That coach is still assigned to this project, so their access was kept.' });
      }

      const result = await revokeCoachAccess(supabaseAdmin, { coachEmail: previous, slug: clientSlug });
      if (!result.ok) {
        console.error('[grant-coach-access]', clientSlug, result.error);
        return respond(500, { error: result.error });
      }
      revoked = result.revoked;
    }

    return respond(200, { success: true, action, revoked });
  } catch (err) {
    console.error('[grant-coach-access] Unexpected error:', err);
    return respond(500, { error: err.message || 'Internal server error' });
  }
}
