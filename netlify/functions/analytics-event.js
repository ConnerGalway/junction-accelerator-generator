// Netlify Function: Analytics Event
// POST: Receives analytics events from sendBeacon (page unload) and client-side batches
// This endpoint uses service role to insert events, as sendBeacon cannot include auth headers

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json'
  };

  try {
    // Parse the request body
    const body = event.body;
    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No body provided' })
      };
    }

    let events;
    try {
      events = JSON.parse(body);
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON' })
      };
    }

    // Ensure events is an array
    if (!Array.isArray(events)) {
      events = [events];
    }

    // Validate events have required fields
    const validEvents = events.filter(evt =>
      evt.user_id &&
      evt.user_email &&
      evt.user_role &&
      evt.client_slug &&
      evt.event_type
    );

    if (validEvents.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No valid events provided' })
      };
    }

    // Sanitize events - ensure created_at is present
    const sanitizedEvents = validEvents.map(evt => ({
      user_id: evt.user_id,
      user_email: evt.user_email,
      user_role: evt.user_role,
      client_slug: evt.client_slug,
      event_type: evt.event_type,
      event_data: evt.event_data || {},
      created_at: evt.created_at || new Date().toISOString()
    }));

    // Initialize Supabase with service role (for sendBeacon which has no auth header)
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Insert events
    const { error: insertError } = await supabaseAdmin
      .from('analytics_events')
      .insert(sanitizedEvents);

    if (insertError) {
      console.error('Analytics insert error:', insertError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to save events' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, count: sanitizedEvents.length })
    };

  } catch (err) {
    console.error('Analytics event error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}
