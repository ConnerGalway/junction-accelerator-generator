// Netlify Function: Verify Assessment Data
// Handles verification status updates and manual data overrides

import { createClient } from '@supabase/supabase-js';
import {
  verifyAssessmentData,
  applyManualOverrides,
  VERIFICATION_ENGINE_VERSION
} from '../../shared/verification-engine.js';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function handler(event, context) {
  console.log('[VERIFY] Function invoked');

  // CORS headers for browser requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { client_slug, manual_override, force_recheck, skip_verification } = body;

    console.log('[VERIFY] Request:', {
      client_slug,
      has_manual_override: !!manual_override,
      force_recheck: !!force_recheck,
      skip_verification: !!skip_verification
    });

    // Validate required fields
    if (!client_slug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'client_slug is required' })
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

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    // Check user role (admin, psm, or coach can verify)
    const { data: roleRows } = await supabaseAdmin
      .from('user_plans')
      .select('role')
      .eq('email', user.email)
      .eq('active', true)
      .in('role', ['admin', 'psm', 'coach']);

    if (!roleRows || roleRows.length === 0) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin, PSM, or Coach role required' })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. FETCH CURRENT ASSESSMENT
    // ─────────────────────────────────────────────────────────────────────────
    const { data: assessment, error: fetchError } = await supabaseAdmin
      .from('client_assessments')
      .select('*')
      .eq('client_slug', client_slug)
      .single();

    if (fetchError || !assessment) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Assessment not found' })
      };
    }

    console.log('[VERIFY] Found assessment:', {
      slug: assessment.client_slug,
      status: assessment.status,
      verification_status: assessment.verification_status
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 3. HANDLE SKIP VERIFICATION
    // ─────────────────────────────────────────────────────────────────────────
    if (skip_verification) {
      console.log('[VERIFY] User chose to skip verification');

      const { error: updateError } = await supabaseAdmin
        .from('client_assessments')
        .update({
          verification_status: 'skipped',
          verification_data: {
            ...(assessment.verification_data || {}),
            skipped_by: user.email,
            skipped_at: new Date().toISOString(),
            engine_version: VERIFICATION_ENGINE_VERSION
          }
        })
        .eq('client_slug', client_slug);

      if (updateError) {
        console.error('[VERIFY] Update error:', updateError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to update verification status' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          verification_status: 'skipped',
          message: 'Verification skipped. Assessment will be published with API data.'
        })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. HANDLE MANUAL OVERRIDE
    // ─────────────────────────────────────────────────────────────────────────
    if (manual_override) {
      console.log('[VERIFY] Processing manual override');

      // Add audit information
      const auditedOverride = {
        ...manual_override,
        verified_by: user.email,
        verified_at: new Date().toISOString()
      };

      // Apply overrides to existing social media data
      const existingSocialData = assessment.social_media_raw || {};
      const updatedSocialData = applyManualOverrides(existingSocialData, auditedOverride);

      // Update assessment with manual data
      const { error: updateError } = await supabaseAdmin
        .from('client_assessments')
        .update({
          verification_status: 'manually_verified',
          manual_overrides: auditedOverride,
          social_media_raw: updatedSocialData,
          verification_data: {
            ...(assessment.verification_data || {}),
            manually_verified_at: new Date().toISOString(),
            manually_verified_by: user.email,
            engine_version: VERIFICATION_ENGINE_VERSION
          }
        })
        .eq('client_slug', client_slug);

      if (updateError) {
        console.error('[VERIFY] Update error:', updateError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to save manual override' })
        };
      }

      console.log('[VERIFY] Manual override saved, triggering regeneration');

      // Return success - caller should trigger regeneration
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          verification_status: 'manually_verified',
          message: 'Manual data saved. Trigger regeneration to apply changes.',
          manual_override: auditedOverride
        })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. HANDLE FORCE RECHECK
    // ─────────────────────────────────────────────────────────────────────────
    if (force_recheck) {
      console.log('[VERIFY] Running verification recheck');

      // Get raw data from assessment
      const rawData = {
        seoptData: assessment.seoptimer_raw,
        googlePlacesData: assessment.google_places_raw,
        websiteAnalysis: assessment.website_analysis_raw,
        socialMediaData: assessment.social_media_raw
      };

      // Get social URLs
      const socialUrls = {
        instagram: assessment.social_instagram,
        facebook: assessment.social_facebook,
        tiktok: assessment.social_tiktok,
        youtube: assessment.social_youtube
      };

      // Run verification
      const verificationResult = await verifyAssessmentData(
        rawData,
        socialUrls,
        assessment.business_name,
        assessment.website_url
      );

      console.log('[VERIFY] Verification result:', {
        status: verificationResult.verification_status,
        verified: verificationResult.verified,
        discrepancies: verificationResult.discrepancies?.length || 0
      });

      // Update assessment with verification result
      const { error: updateError } = await supabaseAdmin
        .from('client_assessments')
        .update({
          verification_status: verificationResult.verification_status,
          verification_data: verificationResult
        })
        .eq('client_slug', client_slug);

      if (updateError) {
        console.error('[VERIFY] Update error:', updateError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to save verification result' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          verification_status: verificationResult.verification_status,
          verified: verificationResult.verified,
          confidence: verificationResult.confidence,
          discrepancies: verificationResult.discrepancies,
          warnings: verificationResult.warnings
        })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. DEFAULT: Return current verification status
    // ─────────────────────────────────────────────────────────────────────────
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        verification_status: assessment.verification_status || 'pending',
        verification_data: assessment.verification_data,
        manual_overrides: assessment.manual_overrides
      })
    };

  } catch (err) {
    console.error('[VERIFY] Unexpected error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: err.message
      })
    };
  }
}
