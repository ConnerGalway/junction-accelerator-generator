import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const NETLIFY_FUNCTION_URL = Deno.env.get('NETLIFY_FUNCTION_URL') || 'https://accelerator.elearningu.com/.netlify/functions'

// ─────────────────────────────────────────────────────────────────────────────
// Entry point — triggered daily by Supabase Cron (06:00 UTC recommended)
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async () => {
  console.log('[check-milestone-assessments] Starting daily check')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  })

  const results: Array<{ client: string; milestone: string; status: string; reason?: string }> = []

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Find all pending milestones that are due today or earlier
    // ─────────────────────────────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0]

    const { data: dueMilestones, error: fetchError } = await supabase
      .from('milestone_assessments')
      .select('id, client_slug, milestone_type, due_date')
      .eq('status', 'pending')
      .lte('due_date', today)
      .order('due_date', { ascending: true })

    if (fetchError) {
      console.error('Failed to fetch due milestones:', fetchError.message)
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 })
    }

    if (!dueMilestones || dueMilestones.length === 0) {
      console.log('[check-milestone-assessments] No milestones due today')
      return new Response(JSON.stringify({ message: 'No milestones due', processed: 0 }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`[check-milestone-assessments] Found ${dueMilestones.length} due milestones`)

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Process each due milestone
    // ─────────────────────────────────────────────────────────────────────────
    for (const milestone of dueMilestones) {
      try {
        console.log(`[check-milestone-assessments] Processing: ${milestone.client_slug} / ${milestone.milestone_type}`)

        // Mark as scheduled to prevent duplicate processing
        await supabase
          .from('milestone_assessments')
          .update({ status: 'scheduled' })
          .eq('id', milestone.id)

        // Trigger the Netlify function to generate the assessment
        const response = await fetch(`${NETLIFY_FUNCTION_URL}/generate-milestone-assessment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            clientSlug: milestone.client_slug,
            milestoneType: milestone.milestone_type
          })
        })

        if (response.ok) {
          const result = await response.json()
          results.push({
            client: milestone.client_slug,
            milestone: milestone.milestone_type,
            status: 'triggered',
            reason: `Score: ${result.score}, Delta: ${result.scoreDelta}`
          })
        } else {
          const errorText = await response.text()
          results.push({
            client: milestone.client_slug,
            milestone: milestone.milestone_type,
            status: 'error',
            reason: `HTTP ${response.status}: ${errorText}`
          })

          // Revert to pending so it can be retried
          await supabase
            .from('milestone_assessments')
            .update({ status: 'pending', error_message: errorText })
            .eq('id', milestone.id)
        }
      } catch (err) {
        console.error(`Error processing ${milestone.client_slug}/${milestone.milestone_type}:`, err)
        results.push({
          client: milestone.client_slug,
          milestone: milestone.milestone_type,
          status: 'error',
          reason: String(err)
        })

        // Revert to pending
        await supabase
          .from('milestone_assessments')
          .update({ status: 'pending', error_message: String(err) })
          .eq('milestone_assessments', milestone.id)
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Return summary
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`[check-milestone-assessments] Complete. Results:`, JSON.stringify(results))

    return new Response(JSON.stringify({
      processed: results.length,
      triggered: results.filter(r => r.status === 'triggered').length,
      errors: results.filter(r => r.status === 'error').length,
      results
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[check-milestone-assessments] Fatal error:', error)
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
})
