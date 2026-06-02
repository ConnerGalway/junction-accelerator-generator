import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAILERSEND_API_KEY       = Deno.env.get('MAILERSEND_API_KEY')!

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

  console.log(`Friday email run complete. Results:`, JSON.stringify(results))
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

  // Check send window: Friday 14:45–15:15 in the client's local timezone
  if (!isInSendWindow(client.timezone, 'Friday', 14, 45, 15, 15)) {
    return { status: 'skipped', reason: 'outside send window' }
  }

  // Fetch plan.json
  const planRes = await fetch(
    `https://accelerator.elearningu.com/${client.client_slug}/plan.json`
  )
  if (!planRes.ok) throw new Error(`plan.json fetch failed (${planRes.status})`)
  const plan = await planRes.json()

  const weekData = plan.weeks.find((w: { week: number }) => w.week === currentWeek)
  if (!weekData) throw new Error(`Week ${currentWeek} not found in plan.json`)

  // Build a lookup table: item_key → readable label
  const itemLabels = buildItemLabels(plan)

  // All item keys for this week (actions + checklist)
  const weekItemKeys = Object.keys(itemLabels).filter(k =>
    k.startsWith(`week-${currentWeek}-`)
  )
  const totalItems = weekItemKeys.length

  // Monday 00:00 of the current cohort week in the client's timezone, as UTC
  const weekStartUtc = getMondayMidnightUtc(client.timezone)

  // Fetch progress rows ticked this week for this client
  const { data: progressRows, error: progressError } = await supabase
    .from('progress')
    .select('item_key')
    .eq('client_slug', client.client_slug)
    .eq('week', currentWeek)
    .eq('checked', true)
    .gte('updated_at', weekStartUtc.toISOString())

  if (progressError) throw new Error(`Progress fetch failed: ${progressError.message}`)

  const checkedKeys   = new Set((progressRows ?? []).map((r: { item_key: string }) => r.item_key))
  const completedItems = weekItemKeys.filter(k => checkedKeys.has(k)).map(k => itemLabels[k])
  const incompleteItems = weekItemKeys.filter(k => !checkedKeys.has(k)).map(k => itemLabels[k])

  const completionPercent = totalItems > 0
    ? Math.round((completedItems.length / totalItems) * 100)
    : 0
  const noProgress = completionPercent === 0

  // Build and send
  const clientName = slugToName(client.client_slug)
  const recipients = buildRecipients(client.email, client.coach_email)

  await sendEmail({
    recipients,
    subject: `Your week ${currentWeek} recap — here's what you accomplished`,
    html: buildHtml({ clientName, weekNumber: currentWeek, completedItems, incompleteItems, completionPercent, noProgress, deepLink: weekData.deep_link }),
    text: buildText({ clientName, weekNumber: currentWeek, completedItems, incompleteItems, completionPercent, noProgress, deepLink: weekData.deep_link })
  })

  return { status: 'sent' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Monday midnight in client's timezone, returned as UTC Date
// Used to query progress rows updated "this cohort week"
// ─────────────────────────────────────────────────────────────────────────────

function getMondayMidnightUtc(timezone: string): Date {
  const now = new Date()

  // Get the full date/time in the target timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year:     'numeric',
    month:    '2-digit',
    day:      '2-digit',
    weekday:  'short',
    hour:     '2-digit',
    minute:   '2-digit',
    second:   '2-digit',
    hour12:   false
  }).formatToParts(now)

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0'

  const weekday = get('weekday')
  const year    = parseInt(get('year'))
  const month   = parseInt(get('month')) - 1   // 0-indexed for Date.UTC
  const day     = parseInt(get('day'))
  const hour    = parseInt(get('hour'))
  const minute  = parseInt(get('minute'))
  const second  = parseInt(get('second'))

  // Days since Monday (Mon=0 … Sun=6)
  const offsets: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
  const daysSinceMonday = offsets[weekday] ?? 0

  // Re-express "now" in local time as a UTC millisecond value (fake UTC) to get the offset
  const localAsUtcMs = Date.UTC(year, month, day, hour, minute, second)
  const tzOffsetMs   = localAsUtcMs - now.getTime()   // positive = ahead of UTC

  // Monday 00:00 in local time (also expressed as fake UTC)
  const mondayMidnightLocalMs = Date.UTC(year, month, day - daysSinceMonday, 0, 0, 0)

  // Subtract the offset to get the real UTC time
  return new Date(mondayMidnightLocalMs - tzOffsetMs)
}

// ─────────────────────────────────────────────────────────────────────────────
// Build item-key → label lookup from plan.json
// ─────────────────────────────────────────────────────────────────────────────

function buildItemLabels(plan: { weeks: Array<{ week: number; actions: string[]; checklist: string[] }> }): Record<string, string> {
  const labels: Record<string, string> = {}
  for (const week of plan.weeks) {
    week.actions.forEach((text, i) => {
      labels[`week-${week.week}-action-${i + 1}`] = text
    })
    week.checklist.forEach((text, i) => {
      labels[`week-${week.week}-check-${i + 1}`] = text
    })
  }
  return labels
}

// ─────────────────────────────────────────────────────────────────────────────
// Timezone send-window check (shared with monday function)
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

  const nowMins = hour * 60 + minute
  return nowMins >= startH * 60 + startM && nowMins <= endH * 60 + endM
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

function buildRecipients(clientEmail: string, coachEmail: string | null): Array<{ email: string }> {
  const seen = new Set<string>()
  const out: Array<{ email: string }> = []
  for (const email of [clientEmail, coachEmail]) {
    if (email && !seen.has(email)) { seen.add(email); out.push({ email }) }
  }
  return out
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─────────────────────────────────────────────────────────────────────────────
// Email content builders
// ─────────────────────────────────────────────────────────────────────────────

interface EmailParams {
  clientName:       string
  weekNumber:       number
  completedItems:   string[]
  incompleteItems:  string[]
  completionPercent: number
  noProgress:       boolean
  deepLink:         string
}

function buildHtml(p: EmailParams): string {
  const completedRows = p.completedItems.map(item => `
    <tr>
      <td width="28" valign="top" style="padding-top:2px;">
        <div style="width:20px;height:20px;background-color:#aadab6;border-radius:50%;text-align:center;line-height:20px;">
          <span style="font-family:Arial,sans-serif;font-size:12px;color:#11154b;font-weight:700;">&#10003;</span>
        </div>
      </td>
      <td style="padding-left:10px;">
        <p style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a2e;line-height:1.5;margin:0 0 6px;">${escHtml(item)}</p>
      </td>
    </tr>`).join('')

  const incompleteRows = p.incompleteItems.map(item => `
    <tr>
      <td width="28" valign="top" style="padding-top:3px;">
        <div style="width:18px;height:18px;border:2px solid #d0cec8;border-radius:4px;"></div>
      </td>
      <td style="padding-left:10px;">
        <p style="font-family:Arial,sans-serif;font-size:14px;color:#6b6b8a;line-height:1.5;margin:0 0 6px;">${escHtml(item)}</p>
      </td>
    </tr>`).join('')

  const progressSection = p.noProgress ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
      <tr>
        <td style="background-color:#eef7f1;border-left:4px solid #aadab6;border-radius:0 8px 8px 0;padding:20px 24px;">
          <p style="font-family:Arial,sans-serif;font-size:15px;color:#11154b;line-height:1.65;margin:0;">
            This week got busy — that happens. Your plan is still there waiting for you, exactly where you left it. Even one small action this weekend makes a difference.
          </p>
        </td>
      </tr>
    </table>` : `
    <!-- Completion bar -->
    <p style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#11154b;margin:0 0 8px;">${p.completionPercent}% complete this week</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#e0d8cc;border-radius:99px;height:8px;overflow:hidden;">
          <div style="background-color:#7fbf8e;height:8px;border-radius:99px;width:${p.completionPercent}%;min-width:4px;"></div>
        </td>
      </tr>
    </table>

    <!-- Completed items -->
    <h2 style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#11154b;margin:0 0 14px;padding-bottom:10px;border-bottom:2px solid #aadab6;">Here's what you completed:</h2>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:${p.incompleteItems.length > 0 ? '28' : '8'}px;">
      ${completedRows}
    </table>

    ${p.incompleteItems.length > 0 ? `
    <!-- Incomplete nudge -->
    <h2 style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#6b6b8a;margin:0 0 14px;padding-bottom:10px;border-bottom:1px solid #e0d8cc;">Still on the list:</h2>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:8px;">
      ${incompleteRows}
    </table>` : ''}`

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
    .bar-fill{min-width:4px!important}
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
        <span style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#aadab6;letter-spacing:0.15em;text-transform:uppercase;">Week ${p.weekNumber} Recap</span>
      </td>
    </tr>

    <!-- BODY -->
    <tr>
      <td class="content" style="padding:40px;">

        <p style="font-family:Arial,sans-serif;font-size:15px;color:#6b6b8a;margin:0 0 4px;">${p.noProgress ? 'Hey there,' : 'Nice work this week,'}</p>
        <h1 style="font-family:Arial,sans-serif;font-size:26px;font-weight:800;color:#11154b;margin:0 0 28px;line-height:1.2;">${escHtml(p.clientName)}.</h1>

        ${progressSection}

        <!-- CTA -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:32px;">
          <tr>
            <td align="center">
              <a href="${p.deepLink}" class="cta-btn"
                style="display:inline-block;background-color:#11154b;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.02em;">
                Jump back into my plan &rarr;
              </a>
            </td>
          </tr>
        </table>

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

function buildText(p: EmailParams): string {
  if (p.noProgress) {
    return `${p.noProgress ? 'Hey there' : 'Nice work this week'}, ${p.clientName}.

WEEK ${p.weekNumber} RECAP — JUNCTION eLEARNINGU ACCELERATOR

This week got busy — that happens. Your plan is still there waiting for you, exactly where you left it. Even one small action this weekend makes a difference.

Jump back in: ${p.deepLink}

---
You're receiving this because you're enrolled in the Junction eLearningU Accelerator.`
  }

  const completed  = p.completedItems.map(i => `  ✓ ${i}`).join('\n')
  const incomplete = p.incompleteItems.length > 0
    ? `\nSTILL ON THE LIST:\n${p.incompleteItems.map(i => `  ○ ${i}`).join('\n')}\n`
    : ''

  return `Nice work this week, ${p.clientName}.

WEEK ${p.weekNumber} RECAP — JUNCTION eLEARNINGU ACCELERATOR

${p.completionPercent}% complete this week

WHAT YOU COMPLETED:
${completed}
${incomplete}
Jump back in: ${p.deepLink}

---
You're receiving this because you're enrolled in the Junction eLearningU Accelerator.`
}
