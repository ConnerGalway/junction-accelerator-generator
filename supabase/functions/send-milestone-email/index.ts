import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAILERSEND_API_KEY = Deno.env.get('MAILERSEND_API_KEY')!

const FROM_EMAIL = 'dashboard@elearningu.com'
const FROM_NAME = 'Junction Accelerator'

// ─────────────────────────────────────────────────────────────────────────────
// Entry point — triggered hourly by Supabase Cron
// Sends notification emails for completed milestone assessments
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async () => {
  console.log('[send-milestone-email] Starting notification check')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  })

  const results: Array<{ client: string; milestone: string; status: string; reason?: string }> = []

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Find completed milestones that haven't been notified yet
    // ─────────────────────────────────────────────────────────────────────────
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('milestone_assessments')
      .select(`
        id,
        client_slug,
        milestone_type,
        overall_score,
        overall_grade,
        score_delta,
        category_deltas,
        assessment_data,
        notification_recipients
      `)
      .eq('status', 'completed')
      .is('notification_sent_at', null)
      .not('notification_recipients', 'is', null)

    if (fetchError) {
      console.error('Failed to fetch pending notifications:', fetchError.message)
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 })
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('[send-milestone-email] No pending notifications')
      return new Response(JSON.stringify({ message: 'No notifications pending', sent: 0 }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`[send-milestone-email] Found ${pendingNotifications.length} pending notifications`)

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Get client business names
    // ─────────────────────────────────────────────────────────────────────────
    const clientSlugs = [...new Set(pendingNotifications.map(n => n.client_slug))]
    const { data: clients } = await supabase
      .from('client_assessments')
      .select('client_slug, business_name')
      .in('client_slug', clientSlugs)

    const clientNames: Record<string, string> = {}
    for (const client of clients || []) {
      clientNames[client.client_slug] = client.business_name
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Send notifications
    // ─────────────────────────────────────────────────────────────────────────
    for (const notification of pendingNotifications) {
      try {
        const businessName = clientNames[notification.client_slug] || slugToName(notification.client_slug)
        const recipients = notification.notification_recipients as string[] || []

        if (recipients.length === 0) {
          console.log(`[send-milestone-email] No recipients for ${notification.client_slug}`)
          continue
        }

        // Build email content
        const emailContent = buildMilestoneEmail({
          businessName,
          milestoneType: notification.milestone_type,
          currentScore: notification.overall_score,
          currentGrade: notification.overall_grade,
          scoreDelta: notification.score_delta,
          categoryDeltas: notification.category_deltas as Record<string, CategoryDelta>,
          assessmentData: notification.assessment_data as AssessmentData,
          clientSlug: notification.client_slug
        })

        // Send to all recipients
        await sendEmail({
          recipients: recipients.map(email => ({ email })),
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        })

        // Mark as notified
        await supabase
          .from('milestone_assessments')
          .update({ notification_sent_at: new Date().toISOString() })
          .eq('id', notification.id)

        results.push({
          client: notification.client_slug,
          milestone: notification.milestone_type,
          status: 'sent',
          reason: `Sent to ${recipients.length} recipients`
        })

        console.log(`[send-milestone-email] Sent notification for ${notification.client_slug} / ${notification.milestone_type}`)

      } catch (err) {
        console.error(`Error sending notification for ${notification.client_slug}:`, err)
        results.push({
          client: notification.client_slug,
          milestone: notification.milestone_type,
          status: 'error',
          reason: String(err)
        })
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Return summary
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`[send-milestone-email] Complete. Results:`, JSON.stringify(results))

    return new Response(JSON.stringify({
      sent: results.filter(r => r.status === 'sent').length,
      errors: results.filter(r => r.status === 'error').length,
      results
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[send-milestone-email] Fatal error:', error)
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
})


// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface CategoryDelta {
  current: number
  initial: number | null
  delta: number | null
  improved: boolean | null
  currentGrade: string
  initialGrade: string | null
}

interface AssessmentData {
  improvements?: Array<{ category: string; delta: number }>
  declines?: Array<{ category: string; delta: number }>
  next_priorities?: Array<{ category: string; current_score: number }>
  executive_summary?: string
}


// ═══════════════════════════════════════════════════════════════════════════
// EMAIL BUILDING
// ═══════════════════════════════════════════════════════════════════════════

function buildMilestoneEmail(params: {
  businessName: string
  milestoneType: string
  currentScore: number
  currentGrade: string
  scoreDelta: number
  categoryDeltas: Record<string, CategoryDelta>
  assessmentData: AssessmentData
  clientSlug: string
}): { subject: string; html: string; text: string } {
  const {
    businessName,
    milestoneType,
    currentScore,
    currentGrade,
    scoreDelta,
    categoryDeltas,
    assessmentData,
    clientSlug
  } = params

  const dayNumber = milestoneType.replace('-day', '')
  const deltaSign = scoreDelta > 0 ? '+' : ''
  const trendEmoji = scoreDelta > 0 ? '📈' : scoreDelta < 0 ? '📉' : '➡️'

  // Build improvements list
  const improvements = Object.entries(categoryDeltas)
    .filter(([, d]) => d.delta && d.delta > 0)
    .sort((a, b) => (b[1].delta || 0) - (a[1].delta || 0))
    .slice(0, 3)

  // Build areas needing attention
  const needsAttention = Object.entries(categoryDeltas)
    .filter(([, d]) => d.delta && d.delta < 0)
    .sort((a, b) => (a[1].delta || 0) - (b[1].delta || 0))
    .slice(0, 3)

  // Subject line
  const subject = `${businessName} ${dayNumber}-Day Progress Report Ready ${trendEmoji}`

  // Plain text version
  const text = `
${businessName} ${dayNumber}-Day Progress Report

PROGRESS SUMMARY
Overall Score: ${currentScore}/100 (${currentGrade})
Change: ${deltaSign}${scoreDelta} points

${improvements.length > 0 ? `
TOP IMPROVEMENTS
${improvements.map(([cat, d]) => `+ ${formatCategoryName(cat)}: +${d.delta} points`).join('\n')}
` : ''}

${needsAttention.length > 0 ? `
AREAS NEEDING ATTENTION
${needsAttention.map(([cat, d]) => `- ${formatCategoryName(cat)}: ${d.delta} points`).join('\n')}
` : ''}

${assessmentData.next_priorities ? `
NEXT PRIORITIES
${assessmentData.next_priorities.map((p, i) => `${i + 1}. ${p.category} (Score: ${p.current_score})`).join('\n')}
` : ''}

View full assessment: https://accelerator.elearningu.com/${clientSlug}

---
Junction Accelerator
`

  // HTML version
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #11154b; color: #fff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0 0 8px; font-size: 24px; font-weight: 600; }
    .header .subtitle { opacity: 0.8; font-size: 14px; }
    .score-card { background: linear-gradient(135deg, #11154b 0%, #1a1f6b 100%); color: #fff; padding: 24px; margin: 24px; border-radius: 12px; text-align: center; }
    .score-big { font-size: 48px; font-weight: 700; margin-bottom: 4px; }
    .score-delta { display: inline-block; background: ${scoreDelta > 0 ? '#28a745' : scoreDelta < 0 ? '#dc3545' : '#6c757d'}; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; }
    .content { padding: 24px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #666; margin-bottom: 12px; }
    .improvement-item { display: flex; align-items: center; padding: 12px; background: #f0fdf4; border-radius: 8px; margin-bottom: 8px; }
    .improvement-item .icon { color: #22c55e; margin-right: 12px; }
    .decline-item { display: flex; align-items: center; padding: 12px; background: #fef2f2; border-radius: 8px; margin-bottom: 8px; }
    .decline-item .icon { color: #ef4444; margin-right: 12px; }
    .cta-button { display: inline-block; background: #11154b; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
    .footer { text-align: center; padding: 24px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${businessName}</h1>
      <div class="subtitle">${dayNumber}-Day Progress Report</div>
    </div>

    <div class="score-card">
      <div class="score-big">${currentScore}</div>
      <div style="opacity: 0.8; margin-bottom: 12px;">out of 100 (${currentGrade})</div>
      <div class="score-delta">${deltaSign}${scoreDelta} points</div>
    </div>

    <div class="content">
      ${improvements.length > 0 ? `
      <div class="section">
        <div class="section-title">Top Improvements</div>
        ${improvements.map(([cat, d]) => `
        <div class="improvement-item">
          <span class="icon">✅</span>
          <span><strong>${formatCategoryName(cat)}</strong>: +${d.delta} points</span>
        </div>
        `).join('')}
      </div>
      ` : ''}

      ${needsAttention.length > 0 ? `
      <div class="section">
        <div class="section-title">Areas Needing Attention</div>
        ${needsAttention.map(([cat, d]) => `
        <div class="decline-item">
          <span class="icon">⚠️</span>
          <span><strong>${formatCategoryName(cat)}</strong>: ${d.delta} points</span>
        </div>
        `).join('')}
      </div>
      ` : ''}

      ${assessmentData.executive_summary ? `
      <div class="section">
        <div class="section-title">Summary</div>
        <p style="color: #333; line-height: 1.6;">${assessmentData.executive_summary}</p>
      </div>
      ` : ''}

      <div style="text-align: center;">
        <a href="https://accelerator.elearningu.com/${clientSlug}" class="cta-button">View Full Assessment</a>
      </div>
    </div>

    <div class="footer">
      <p>Junction Accelerator by eLearningU</p>
    </div>
  </div>
</body>
</html>
`

  return { subject, html, text }
}


// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function formatCategoryName(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function slugToName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}


async function sendEmail(params: {
  recipients: Array<{ email: string; name?: string }>
  subject: string
  html: string
  text: string
}): Promise<void> {
  const response = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MAILERSEND_API_KEY}`
    },
    body: JSON.stringify({
      from: { email: FROM_EMAIL, name: FROM_NAME },
      to: params.recipients,
      subject: params.subject,
      html: params.html,
      text: params.text
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`MailerSend error: ${response.status} - ${errorText}`)
  }
}
