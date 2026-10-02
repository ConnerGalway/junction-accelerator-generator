// Netlify Function: Content Edits
// GET: Fetch all content edits for a client (any authenticated user with access)
// POST: Save content edit (Admin/PSM/Coach only)

import { createClient } from '@supabase/supabase-js';

export async function handler(event, context) {
  // CORS headers
  const allowedOrigins = [
    'https://accelerator.elearningu.com',
    'https://junction-accelerator-generator.netlify.app'
  ];
  const origin = event.headers.origin || event.headers.Origin || '';
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json'
  };

  try {
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
    // 2. GET USER'S ACCESS LEVEL
    // ─────────────────────────────────────────────────────────────────────────
    const { data: userAccess } = await supabaseAdmin
      .from('user_plans')
      .select('role, client_slug')
      .eq('email', user.email)
      .eq('active', true);

    if (!userAccess || userAccess.length === 0) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'No access found' })
      };
    }

    // Determine user's highest role and access
    const isAdminOrPsm = userAccess.some(row =>
      row.client_slug === '*' && (row.role === 'admin' || row.role === 'psm')
    );
    const isCoach = userAccess.some(row => row.role === 'coach');
    const coachSlugs = userAccess
      .filter(row => row.role === 'coach')
      .map(row => row.client_slug);
    const clientSlugs = userAccess
      .filter(row => row.role === 'client')
      .map(row => row.client_slug);

    // ─────────────────────────────────────────────────────────────────────────
    // 3. HANDLE GET: Fetch edits for a client
    // ─────────────────────────────────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const clientSlug = event.queryStringParameters?.client_slug;

      if (!clientSlug) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'client_slug query parameter is required' })
        };
      }

      // Check access to this client
      const hasReadAccess = isAdminOrPsm ||
        coachSlugs.includes(clientSlug) ||
        clientSlugs.includes(clientSlug);

      if (!hasReadAccess) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'No access to this client' })
        };
      }

      // Fetch edits
      const { data: edits, error: fetchError } = await supabaseAdmin
        .from('content_edits')
        .select('content_key, edited_value, edited_by, edited_at')
        .eq('client_slug', clientSlug);

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to fetch edits' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ edits: edits || [] })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. HANDLE POST: Save content edits
    // ─────────────────────────────────────────────────────────────────────────
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      const { clientSlug, edits } = body;

      // Validate request
      if (!clientSlug || !edits || !Array.isArray(edits)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'clientSlug and edits array are required' })
        };
      }

      // Check write access (Admin/PSM/Coach only, not clients)
      const hasWriteAccess = isAdminOrPsm ||
        (isCoach && coachSlugs.includes(clientSlug));

      if (!hasWriteAccess) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'You do not have permission to edit this content' })
        };
      }

      // Process each edit
      const results = [];
      for (const edit of edits) {
        const { contentKey, editedValue, originalValue } = edit;

        if (!contentKey || editedValue === undefined) {
          results.push({ contentKey, success: false, error: 'Missing contentKey or editedValue' });
          continue;
        }

        // Check if an edit already exists for this content_key
        const { data: existing } = await supabaseAdmin
          .from('content_edits')
          .select('id, original_value')
          .eq('client_slug', clientSlug)
          .eq('content_key', contentKey)
          .single();

        if (existing) {
          // Update existing edit (preserve original_value from first edit)
          const { error: updateError } = await supabaseAdmin
            .from('content_edits')
            .update({
              edited_value: editedValue,
              edited_by: user.email,
              edited_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error('Update error:', updateError);
            results.push({ contentKey, success: false, error: 'Update failed' });
          } else {
            results.push({ contentKey, success: true, action: 'updated' });
          }
        } else {
          // Insert new edit
          const { error: insertError } = await supabaseAdmin
            .from('content_edits')
            .insert({
              client_slug: clientSlug,
              content_key: contentKey,
              edited_value: editedValue,
              original_value: originalValue || null,
              edited_by: user.email
            });

          if (insertError) {
            console.error('Insert error:', insertError);
            results.push({ contentKey, success: false, error: 'Insert failed' });
          } else {
            results.push({ contentKey, success: true, action: 'inserted' });
          }
        }
      }

      const allSuccess = results.every(r => r.success);

      return {
        statusCode: allSuccess ? 200 : 207,
        headers,
        body: JSON.stringify({
          success: allSuccess,
          results
        })
      };
    }

    // Method not allowed
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
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
