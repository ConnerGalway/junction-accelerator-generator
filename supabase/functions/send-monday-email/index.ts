import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL            = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAILERSEND_API_KEY      = Deno.env.get('MAILERSEND_API_KEY')!

const FROM_EMAIL = 'dashboard@elearningu.com'
const FROM_NAME  = 'Junction Accelerator'

// ─────────────────────────────────────────────────────────────────────────────
// Entry point — triggered hourly by Supabase Cron
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  })

  const { data: clients, error } = await supabase
    .from('user_plans')
    .select('email, client_slug, cohort_start_date, timezone, coach_email')
    .eq('role', 'client')
    .eq('active', true)

  if (error) {
    console.error('Failed to fetch clients:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const results: Array<{ client: string; status: string; reason?: string }> = []

  for (const client of clients ?? []) {
    try {
      const result = await processClient(supabase, client)
      results.push({ client: client.client_slug, ...result })
    } catch (err) {
      console.error(`Error processing ${client.client_slug}:`, err)
      results.push({ client: client.client_slug, status: 'error', reason: String(err) })
    }
  }

  console.log(`Monday email run complete. Results:`, JSON.stringify(results))
  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { 'Content-Type': 'application/json' }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Process one client
// ─────────────────────────────────────────────────────────────────────────────

async function processClient(
  supabase: ReturnType<typeof createClient>,
  client: { email: string; client_slug: string; cohort_start_date: string; timezone: string; coach_email: string | null }
): Promise<{ status: string; reason?: string }> {

  // Calculate current cohort week
  const cohortStart = new Date(client.cohort_start_date)
  const daysDiff    = Math.floor((Date.now() - cohortStart.getTime()) / 86400000)
  const currentWeek = Math.floor(daysDiff / 7) + 1

  if (currentWeek > 12) return { status: 'skipped', reason: 'programme complete' }
  if (currentWeek < 1)  return { status: 'skipped', reason: 'cohort not started' }

  // Check send window: Monday 07:45–08:15 in the client's local timezone
  if (!isInSendWindow(client.timezone, 'Monday', 7, 45, 8, 15)) {
    return { status: 'skipped', reason: 'outside send window' }
  }

  // Fetch plan.json for this client
  const planRes = await fetch(
    `https://accelerator.elearningu.com/${client.client_slug}/plan.json`
  )
  if (!planRes.ok) throw new Error(`plan.json fetch failed (${planRes.status})`)
  const plan = await planRes.json()

  const weekData = plan.weeks.find((w: { week: number }) => w.week === currentWeek)
  if (!weekData) throw new Error(`Week ${currentWeek} not found in plan.json`)

  // Get the rotating stat for this cohort week
  const statWeek = ((currentWeek - 1) % 52) + 1
  const { data: stat, error: statError } = await supabase
    .from('email_stats')
    .select('content, source, tone')
    .eq('week_number', statWeek)
    .single()

  if (statError) throw new Error(`email_stats fetch failed: ${statError.message}`)

  // Build and send the email
  const clientName = slugToName(client.client_slug)
  const recipients = buildRecipients(client.email, client.coach_email)

  await sendEmail({
    recipients,
    subject: `Your week ${currentWeek} plan is ready — ${clientName}`,
    html: buildHtml({ clientName, weekNumber: currentWeek, goal: plan.goal, weekData, stat }),
    text: buildText({ clientName, weekNumber: currentWeek, goal: plan.goal, weekData, stat })
  })

  return { status: 'sent' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Timezone send-window check
// ─────────────────────────────────────────────────────────────────────────────

function isInSendWindow(
  timezone: string,
  targetDay: string,
  startH: number, startM: number,
  endH: number,   endM: number
): boolean {
  const now   = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday:  'long',
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   false
  }).formatToParts(now)

  const weekday = parts.find(p => p.type === 'weekday')?.value ?? ''
  const hour    = parseInt(parts.find(p => p.type === 'hour')?.value   ?? '0')
  const minute  = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0')

  if (weekday !== targetDay) return false

  const nowMins   = hour * 60 + minute
  const startMins = startH * 60 + startM
  const endMins   = endH   * 60 + endM
  return nowMins >= startMins && nowMins <= endMins
}

// ─────────────────────────────────────────────────────────────────────────────
// MailerSend
// ─────────────────────────────────────────────────────────────────────────────

async function sendEmail(params: {
  recipients: Array<{ email: string }>
  subject:    string
  html:       string
  text:       string
}) {
  const res = await fetch('https://api.mailersend.com/v1/email', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${MAILERSEND_API_KEY}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({
      from: { email: FROM_EMAIL, name: FROM_NAME },
      to:   params.recipients,
      subject: params.subject,
      html:    params.html,
      text:    params.text
    })
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`MailerSend error ${res.status}: ${body}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function slugToName(slug: string): string {
  return slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function buildRecipients(
  clientEmail: string,
  coachEmail:  string | null
): Array<{ email: string }> {
  const seen = new Set<string>()
  const out: Array<{ email: string }> = []
  for (const email of [clientEmail, coachEmail]) {
    if (email && !seen.has(email)) { seen.add(email); out.push({ email }) }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Email content builders
// ─────────────────────────────────────────────────────────────────────────────

interface EmailParams {
  clientName:  string
  weekNumber:  number
  goal:        string
  weekData:    { title: string; actions: string[]; checklist: string[]; deep_link: string }
  stat:        { content: string; source: string; tone: string } | null
}

function buildHtml(p: EmailParams): string {
  const actionRows = p.weekData.actions.map((a, i) => `
    <tr>
      <td width="28" valign="top" style="padding-top:3px;">
        <div style="width:22px;height:22px;background-color:#11154b;border-radius:50%;text-align:center;line-height:22px;">
          <span style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#aadab6;">${i + 1}</span>
        </div>
      </td>
      <td style="padding-left:10px;">
        <p style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a2e;line-height:1.55;margin:0 0 4px;">${escHtml(a)}</p>
      </td>
    </tr>`).join('')

  const checkRows = p.weekData.checklist.map(c => `
    <tr>
      <td width="24" valign="top" style="padding-top:3px;">
        <div style="width:18px;height:18px;border:2px solid #aadab6;border-radius:4px;"></div>
      </td>
      <td style="padding-left:10px;">
        <p style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a2e;line-height:1.55;margin:0 0 4px;">${escHtml(c)}</p>
      </td>
    </tr>`).join('')

  const statBlock = p.stat ? buildStatBlock(p.stat) : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  @media only screen and (max-width:600px){
    .email-wrap{width:100%!important}
    .content{padding:28px 20px!important}
    .cta-btn{display:block!important;width:auto!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#e8e0d4;font-family:Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#e8e0d4;">
<tr><td align="center" style="padding:24px 12px;">

  <table role="presentation" class="email-wrap" width="600" cellspacing="0" cellpadding="0" border="0"
    style="max-width:600px;width:100%;background-color:#fcf5ec;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

    <!-- HEADER -->
    <tr>
      <td style="background-color:#11154b;padding:28px 40px;text-align:center;">
        <!-- LOGO -->
        <div style="font-family:Arial,sans-serif;font-weight:800;font-size:22px;color:#aadab6;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:6px;">eLearningU</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:0.12em;text-transform:uppercase;">Tourism Digital Marketing Accelerator</div>
      </td>
    </tr>

    <!-- WEEK BADGE -->
    <tr>
      <td style="background-color:#1d2260;padding:10px 40px;text-align:center;">
        <span style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#aadab6;letter-spacing:0.15em;text-transform:uppercase;">Week ${p.weekNumber} of 12</span>
      </td>
    </tr>

    <!-- BODY -->
    <tr>
      <td class="content" style="padding:40px;">

        <p style="font-family:Arial,sans-serif;font-size:15px;color:#6b6b8a;margin:0 0 4px;">Good morning,</p>
        <h1 style="font-family:Arial,sans-serif;font-size:26px;font-weight:800;color:#11154b;margin:0 0 28px;line-height:1.2;">${escHtml(p.clientName)}.</h1>

        <!-- Goal -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:32px;">
          <tr>
            <td style="background-color:#eef7f1;border-left:4px solid #aadab6;border-radius:0 8px 8px 0;padding:16px 20px;">
              <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#7fbf8e;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 8px;">Your 90-day goal</p>
              <p style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a2e;line-height:1.6;margin:0;">${escHtml(p.goal)}</p>
            </td>
          </tr>
        </table>

        <!-- Actions -->
        <h2 style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#11154b;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #aadab6;">This week's actions</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
          ${actionRows}
        </table>

        <!-- Checklist -->
        <h2 style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#11154b;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #aadab6;">You'll know you're done when...</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:32px;">
          ${checkRows}
        </table>

        <!-- CTA -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:36px;">
          <tr>
            <td align="center">
              <a href="${p.weekData.deep_link}" class="cta-btn"
                style="display:inline-block;background-color:#11154b;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.02em;">
                Open my week ${p.weekNumber} plan &rarr;
              </a>
            </td>
          </tr>
        </table>

        ${statBlock}

      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="background-color:#11154b;padding:24px 40px;text-align:center;">
        <p style="font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.6;margin:0 0 8px;">
          You're receiving this because you're enrolled in the Junction eLearningU Accelerator.
        </p>
        <p style="font-family:Arial,sans-serif;font-size:12px;margin:0;">
          <a href="{$unsubscribe}" style="color:#aadab6;text-decoration:underline;">Unsubscribe</a>
        </p>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>`
}

function buildStatBlock(stat: { content: string; source: string; tone: string }): string {
  const styles: Record<string, string> = {
    motivating: 'background-color:#eef7f1;border:1px solid #aadab6;',
    useful:     'background-color:#ecedf5;border:1px solid rgba(17,21,75,0.2);',
    funny:      'background-color:#fcf5ec;border:2px dashed #aadab6;'
  }
  const style = styles[stat.tone] ?? styles.useful

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="${style}border-radius:8px;padding:20px 24px;">
          <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#7fbf8e;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 10px;">This week in tourism</p>
          <p style="font-family:Arial,sans-serif;font-size:15px;color:#11154b;line-height:1.6;margin:0 0 10px;font-style:italic;">&ldquo;${escHtml(stat.content)}&rdquo;</p>
          <p style="font-family:Arial,sans-serif;font-size:12px;color:#6b6b8a;margin:0;">&mdash; ${escHtml(stat.source)}</p>
        </td>
      </tr>
    </table>`
}

function buildText(p: EmailParams): string {
  const actions   = p.weekData.actions.map((a, i) => `  ${i + 1}. ${a}`).join('\n')
  const checklist = p.weekData.checklist.map(c => `  ☐ ${c}`).join('\n')
  const stat      = p.stat ? `\n---\nThis week in tourism:\n"${p.stat.content}"\n— ${p.stat.source}\n` : ''

  return `Good morning, ${p.clientName}.

WEEK ${p.weekNumber} OF 12 — JUNCTION eLEARNINGU ACCELERATOR

YOUR 90-DAY GOAL
${p.goal}

THIS WEEK'S ACTIONS
${actions}

YOU'LL KNOW YOU'RE DONE WHEN...
${checklist}

Open your plan: ${p.weekData.deep_link}
${stat}
---
You're receiving this because you're enrolled in the Junction eLearningU Accelerator.`
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
