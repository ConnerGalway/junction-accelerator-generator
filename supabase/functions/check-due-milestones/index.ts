/**
 * check-due-milestones
 *
 * Supabase Edge Function that runs daily via cron to check for
 * pending milestone assessments that are due and trigger their generation.
 *
 * Cron schedule: 0 6 * * * (daily at 6 AM UTC)
 *
 * To set up the cron job in Supabase:
 *   SELECT cron.schedule(
 *     'check-due-milestones',
 *     '0 6 * * *',
 *     $$SELECT net.http_post(
 *       url := 'https://[project-ref].supabase.co/functions/v1/check-due-milestones',
 *       headers := '{"Authorization": "Bearer [service-role-key]"}'::jsonb
 *     )$$
 *   );
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NETLIFY_GENERATE_URL = Deno.env.get('NETLIFY_GENERATE_MILESTONE_URL') ||
  'https://accelerator.elearningu.com/.netlify/functions/generate-milestone-assessment';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log('[check-due-milestones] Starting check...');

    // Get all pending milestones that are due today or earlier
    const { data: dueMilestones, error: queryError } = await supabase
      .from('milestone_assessments')
      .select('id, client_slug, milestone_type, due_date')
      .eq('status', 'pending')
      .lte('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true });

    if (queryError) {
      throw new Error(`Query error: ${queryError.message}`);
    }

    if (!dueMilestones || dueMilestones.length === 0) {
      console.log('[check-due-milestones] No due milestones found');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No due milestones' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[check-due-milestones] Found ${dueMilestones.length} due milestone(s)`);

    const results = [];

    for (const milestone of dueMilestones) {
      console.log(`[check-due-milestones] Processing: ${milestone.client_slug} - ${milestone.milestone_type}`);

      // Update status to 'scheduled'
      const { error: updateError } = await supabase
        .from('milestone_assessments')
        .update({ status: 'scheduled' })
        .eq('id', milestone.id);

      if (updateError) {
        console.error(`[check-due-milestones] Failed to update status: ${updateError.message}`);
        results.push({
          clientSlug: milestone.client_slug,
          milestoneType: milestone.milestone_type,
          success: false,
          error: updateError.message
        });
        continue;
      }

      // Trigger the generation function
      try {
        const response = await fetch(NETLIFY_GENERATE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            clientSlug: milestone.client_slug,
            milestoneType: milestone.milestone_type
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log(`[check-due-milestones] Triggered: ${milestone.client_slug} - ${milestone.milestone_type}`);

        results.push({
          clientSlug: milestone.client_slug,
          milestoneType: milestone.milestone_type,
          success: true,
          score: result.score,
          grade: result.grade
        });

      } catch (fetchError) {
        console.error(`[check-due-milestones] Trigger failed: ${fetchError.message}`);

        // Revert status back to pending
        await supabase
          .from('milestone_assessments')
          .update({
            status: 'failed',
            error_message: fetchError.message
          })
          .eq('id', milestone.id);

        results.push({
          clientSlug: milestone.client_slug,
          milestoneType: milestone.milestone_type,
          success: false,
          error: fetchError.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[check-due-milestones] Complete: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: dueMilestones.length,
        successful: successCount,
        failed: failCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[check-due-milestones] Error:', error);

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
