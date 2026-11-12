const MAILERSEND_API_KEY = Deno.env.get('MAILERSEND_API_KEY') || ''
const FROM_EMAIL = 'dashboard@elearningu.com'
const FROM_NAME = 'Junction Accelerator'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const recipientEmail = url.searchParams.get('email') || 'brooke@elearningu.com'

  // Debug: check if API key is available
  if (!MAILERSEND_API_KEY) {
    return new Response(JSON.stringify({
      error: 'MAILERSEND_API_KEY not found in environment',
      availableEnvKeys: Object.keys(Deno.env.toObject()).filter(k => !k.includes('KEY') && !k.includes('SECRET'))
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Debug key format
  const keyInfo = {
    length: MAILERSEND_API_KEY.length,
    prefix: MAILERSEND_API_KEY.substring(0, 6),
    suffix: MAILERSEND_API_KEY.substring(MAILERSEND_API_KEY.length - 4)
  }

  // Test MailerSend API connectivity first
  const testRes = await fetch('https://api.mailersend.com/v1/domains', {
    headers: {
      'Authorization': `Bearer ${MAILERSEND_API_KEY}`,
      'Content-Type': 'application/json'
    }
  })

  if (!testRes.ok) {
    const testBody = await testRes.text()
    return new Response(JSON.stringify({
      error: 'MailerSend API test failed',
      status: testRes.status,
      body: testBody,
      keyInfo
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const domains = await testRes.json()

  const results: string[] = []

  try {
    // EMAIL 1: MONDAY PLAN EMAIL
    await sendEmail({
      to: recipientEmail,
      subject: '[TEST] Your week 3 plan is ready: Sample Tourism Business',
      html: buildMondayHtml(),
      text: buildMondayText()
    })
    results.push('Monday email sent')

    // EMAIL 2: FRIDAY RECAP EMAIL
    await sendEmail({
      to: recipientEmail,
      subject: '[TEST] Your week 3 recap: here\'s what you accomplished',
      html: buildFridayHtml(),
      text: buildFridayText()
    })
    results.push('Friday email sent')

    // EMAIL 3: MILESTONE ASSESSMENT EMAIL
    await sendEmail({
      to: recipientEmail,
      subject: '[TEST] Sample Tourism Business 30-Day Progress Report Ready',
      html: buildMilestoneHtml(),
      text: buildMilestoneText()
    })
    results.push('Milestone email sent')

    // EMAIL 4: WEEK COMPLETION EMAIL (sent to PSM/Coach)
    await sendEmail({
      to: recipientEmail,
      subject: '[TEST] Sample Tourism Business completed Week 3',
      html: buildWeekCompleteHtml(),
      text: buildWeekCompleteText()
    })
    results.push('Week completion email sent')

    // EMAIL 5: EXPLANATION EMAIL
    await sendEmail({
      to: recipientEmail,
      subject: 'Junction Accelerator: Automated Email Schedule & Content Guide',
      html: buildExplanationHtml(),
      text: buildExplanationText()
    })
    results.push('Explanation email sent')

    return new Response(JSON.stringify({ success: true, results, sentTo: recipientEmail }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), results, keyInfo }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function sendEmail(params: { to: string; subject: string; html: string; text: string }) {
  const res = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MAILERSEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: { email: FROM_EMAIL, name: FROM_NAME },
      to: [{ email: params.to }],
      subject: params.subject,
      html: params.html,
      text: params.text
    })
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`MailerSend error ${res.status}: ${body}`)
  }
}

function buildMondayHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#e8e0d4;font-family:Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#e8e0d4;">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#fcf5ec;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
    <tr>
      <td style="background-color:#11154b;padding:28px 40px;text-align:center;">
        <div style="font-family:Arial,sans-serif;font-weight:800;font-size:22px;color:#aadab6;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:6px;">eLearningU</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:0.12em;text-transform:uppercase;">Tourism Digital Marketing Accelerator</div>
      </td>
    </tr>
    <tr>
      <td style="background-color:#1d2260;padding:10px 40px;text-align:center;">
        <span style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#aadab6;letter-spacing:0.15em;text-transform:uppercase;">Week 3 of 12</span>
      </td>
    </tr>
    <tr>
      <td style="padding:40px;">
        <p style="font-family:Arial,sans-serif;font-size:15px;color:#6b6b8a;margin:0 0 4px;">Good morning,</p>
        <h1 style="font-family:Arial,sans-serif;font-size:26px;font-weight:800;color:#11154b;margin:0 0 28px;line-height:1.2;">Sample Tourism Business.</h1>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:32px;">
          <tr>
            <td style="background-color:#eef7f1;border-left:4px solid #aadab6;border-radius:0 8px 8px 0;padding:16px 20px;">
              <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#7fbf8e;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 8px;">Your 90-day goal</p>
              <p style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a2e;line-height:1.6;margin:0;">Make your business as discoverable online as it is well-regarded in person: accurate listings, a content system that runs without you, and a website that answers visitor questions.</p>
            </td>
          </tr>
        </table>

        <h2 style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#11154b;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #aadab6;">This week's actions</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
          <tr>
            <td width="28" valign="top" style="padding-top:3px;"><div style="width:22px;height:22px;background-color:#11154b;border-radius:50%;text-align:center;line-height:22px;"><span style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#aadab6;">1</span></div></td>
            <td style="padding-left:10px;"><p style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a2e;line-height:1.55;margin:0 0 12px;">Set up Meta Business Suite; confirm Facebook and Instagram are linked</p></td>
          </tr>
          <tr>
            <td width="28" valign="top" style="padding-top:3px;"><div style="width:22px;height:22px;background-color:#11154b;border-radius:50%;text-align:center;line-height:22px;"><span style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#aadab6;">2</span></div></td>
            <td style="padding-left:10px;"><p style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a2e;line-height:1.55;margin:0 0 12px;">Publish first three social posts across platforms</p></td>
          </tr>
          <tr>
            <td width="28" valign="top" style="padding-top:3px;"><div style="width:22px;height:22px;background-color:#11154b;border-radius:50%;text-align:center;line-height:22px;"><span style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#aadab6;">3</span></div></td>
            <td style="padding-left:10px;"><p style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a2e;line-height:1.55;margin:0 0 12px;">Schedule next week's posts using content library assets</p></td>
          </tr>
          <tr>
            <td width="28" valign="top" style="padding-top:3px;"><div style="width:22px;height:22px;background-color:#11154b;border-radius:50%;text-align:center;line-height:22px;"><span style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#aadab6;">4</span></div></td>
            <td style="padding-left:10px;"><p style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a2e;line-height:1.55;margin:0 0 4px;">Audit all directory listings for accuracy</p></td>
          </tr>
        </table>

        <h2 style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#11154b;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #aadab6;">You'll know you're done when...</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:32px;">
          <tr>
            <td width="24" valign="top" style="padding-top:3px;"><div style="width:18px;height:18px;border:2px solid #aadab6;border-radius:4px;"></div></td>
            <td style="padding-left:10px;"><p style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a2e;line-height:1.55;margin:0 0 12px;">Meta Business Suite shows Facebook and Instagram connected</p></td>
          </tr>
          <tr>
            <td width="24" valign="top" style="padding-top:3px;"><div style="width:18px;height:18px;border:2px solid #aadab6;border-radius:4px;"></div></td>
            <td style="padding-left:10px;"><p style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a2e;line-height:1.55;margin:0 0 12px;">Three posts are live across Instagram and Facebook</p></td>
          </tr>
          <tr>
            <td width="24" valign="top" style="padding-top:3px;"><div style="width:18px;height:18px;border:2px solid #aadab6;border-radius:4px;"></div></td>
            <td style="padding-left:10px;"><p style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a2e;line-height:1.55;margin:0 0 12px;">Next week's posts are scheduled in advance</p></td>
          </tr>
          <tr>
            <td width="24" valign="top" style="padding-top:3px;"><div style="width:18px;height:18px;border:2px solid #aadab6;border-radius:4px;"></div></td>
            <td style="padding-left:10px;"><p style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a2e;line-height:1.55;margin:0 0 4px;">Directory audit complete; incorrect listings flagged</p></td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:36px;">
          <tr>
            <td align="center">
              <a href="https://accelerator.elearningu.com/sample/#week-3" style="display:inline-block;background-color:#11154b;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.02em;">Open my week 3 plan &rarr;</a>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background-color:#eef7f1;border:1px solid #aadab6;border-radius:8px;padding:20px 24px;">
              <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#7fbf8e;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 10px;">This week in tourism</p>
              <p style="font-family:Arial,sans-serif;font-size:15px;color:#11154b;line-height:1.6;margin:0 0 10px;font-style:italic;">&ldquo;78% of travellers say they research destinations on social media before booking.&rdquo;</p>
              <p style="font-family:Arial,sans-serif;font-size:12px;color:#6b6b8a;margin:0;">&mdash; Destination Canada, 2024</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background-color:#11154b;padding:24px 40px;text-align:center;">
        <p style="font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.6;margin:0;">You're receiving this because you're enrolled in the Junction eLearningU Accelerator.</p>
      </td>
    </tr>
  </table>
</td></tr>
</table>
</body>
</html>`
}

function buildMondayText(): string {
  return `Good morning, Sample Tourism Business.

WEEK 3 OF 12: JUNCTION eLEARNINGU ACCELERATOR

YOUR 90-DAY GOAL
Make your business as discoverable online as it is well-regarded in person.

THIS WEEK'S ACTIONS
1. Set up Meta Business Suite; confirm Facebook and Instagram are linked
2. Publish first three social posts across platforms
3. Schedule next week's posts using content library assets
4. Audit all directory listings for accuracy

YOU'LL KNOW YOU'RE DONE WHEN...
- Meta Business Suite shows Facebook and Instagram connected
- Three posts are live across Instagram and Facebook
- Next week's posts are scheduled in advance
- Directory audit complete; incorrect listings flagged

Open your plan: https://accelerator.elearningu.com/sample/#week-3`
}

function buildFridayHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#e8e0d4;font-family:Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#e8e0d4;">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#fcf5ec;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
    <tr>
      <td style="background-color:#11154b;padding:28px 40px;text-align:center;">
        <div style="font-family:Arial,sans-serif;font-weight:800;font-size:22px;color:#aadab6;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:6px;">eLearningU</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:0.12em;text-transform:uppercase;">Tourism Digital Marketing Accelerator</div>
      </td>
    </tr>
    <tr>
      <td style="background-color:#1d2260;padding:10px 40px;text-align:center;">
        <span style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#aadab6;letter-spacing:0.15em;text-transform:uppercase;">Week 3 Recap</span>
      </td>
    </tr>
    <tr>
      <td style="padding:40px;">
        <p style="font-family:Arial,sans-serif;font-size:15px;color:#6b6b8a;margin:0 0 4px;">Nice work this week,</p>
        <h1 style="font-family:Arial,sans-serif;font-size:26px;font-weight:800;color:#11154b;margin:0 0 28px;line-height:1.2;">Sample Tourism Business.</h1>

        <p style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#11154b;margin:0 0 8px;">75% complete this week</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
          <tr>
            <td style="background-color:#e0d8cc;border-radius:99px;height:8px;overflow:hidden;">
              <div style="background-color:#7fbf8e;height:8px;border-radius:99px;width:75%;min-width:4px;"></div>
            </td>
          </tr>
        </table>

        <h2 style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#11154b;margin:0 0 14px;padding-bottom:10px;border-bottom:2px solid #aadab6;">Here's what you completed:</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
          <tr>
            <td width="28" valign="top" style="padding-top:2px;"><div style="width:20px;height:20px;background-color:#aadab6;border-radius:50%;text-align:center;line-height:20px;"><span style="font-family:Arial,sans-serif;font-size:12px;color:#11154b;font-weight:700;">&#10003;</span></div></td>
            <td style="padding-left:10px;"><p style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a2e;line-height:1.5;margin:0 0 12px;">Meta Business Suite shows Facebook and Instagram connected</p></td>
          </tr>
          <tr>
            <td width="28" valign="top" style="padding-top:2px;"><div style="width:20px;height:20px;background-color:#aadab6;border-radius:50%;text-align:center;line-height:20px;"><span style="font-family:Arial,sans-serif;font-size:12px;color:#11154b;font-weight:700;">&#10003;</span></div></td>
            <td style="padding-left:10px;"><p style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a2e;line-height:1.5;margin:0 0 12px;">Three posts are live across Instagram and Facebook</p></td>
          </tr>
          <tr>
            <td width="28" valign="top" style="padding-top:2px;"><div style="width:20px;height:20px;background-color:#aadab6;border-radius:50%;text-align:center;line-height:20px;"><span style="font-family:Arial,sans-serif;font-size:12px;color:#11154b;font-weight:700;">&#10003;</span></div></td>
            <td style="padding-left:10px;"><p style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a2e;line-height:1.5;margin:0 0 6px;">Next week's posts are scheduled in advance</p></td>
          </tr>
        </table>

        <h2 style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#6b6b8a;margin:0 0 14px;padding-bottom:10px;border-bottom:1px solid #e0d8cc;">Still on the list:</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:8px;">
          <tr>
            <td width="28" valign="top" style="padding-top:3px;"><div style="width:18px;height:18px;border:2px solid #d0cec8;border-radius:4px;"></div></td>
            <td style="padding-left:10px;"><p style="font-family:Arial,sans-serif;font-size:14px;color:#6b6b8a;line-height:1.5;margin:0 0 6px;">Directory audit complete; incorrect listings flagged</p></td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:32px;">
          <tr>
            <td align="center">
              <a href="https://accelerator.elearningu.com/sample/#week-3" style="display:inline-block;background-color:#11154b;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.02em;">Jump back into my plan &rarr;</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background-color:#11154b;padding:24px 40px;text-align:center;">
        <p style="font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.6;margin:0;">You're receiving this because you're enrolled in the Junction eLearningU Accelerator.</p>
      </td>
    </tr>
  </table>
</td></tr>
</table>
</body>
</html>`
}

function buildFridayText(): string {
  return `Nice work this week, Sample Tourism Business.

WEEK 3 RECAP: JUNCTION eLEARNINGU ACCELERATOR

75% complete this week

WHAT YOU COMPLETED:
  - Meta Business Suite shows Facebook and Instagram connected
  - Three posts are live across Instagram and Facebook
  - Next week's posts are scheduled in advance

STILL ON THE LIST:
  - Directory audit complete; incorrect listings flagged

Jump back in: https://accelerator.elearningu.com/sample/#week-3`
}

function buildMilestoneHtml(): string {
  return `<!DOCTYPE html>
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
    .score-delta { display: inline-block; background: #28a745; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; }
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
      <h1>Sample Tourism Business</h1>
      <div class="subtitle">30-Day Progress Report</div>
    </div>
    <div class="score-card">
      <div class="score-big">68</div>
      <div style="opacity: 0.8; margin-bottom: 12px;">out of 100 (C+)</div>
      <div class="score-delta">+12 points</div>
    </div>
    <div class="content">
      <div class="section">
        <div class="section-title">Top Improvements</div>
        <div class="improvement-item">
          <span class="icon">&#10003;</span>
          <span><strong>Google Business Profile</strong>: +18 points</span>
        </div>
        <div class="improvement-item">
          <span class="icon">&#10003;</span>
          <span><strong>Social Media Presence</strong>: +14 points</span>
        </div>
        <div class="improvement-item">
          <span class="icon">&#10003;</span>
          <span><strong>Review Management</strong>: +8 points</span>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Areas Needing Attention</div>
        <div class="decline-item">
          <span class="icon">!</span>
          <span><strong>Website Content</strong>: -2 points</span>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Summary</div>
        <p style="color: #333; line-height: 1.6;">Strong progress in the first 30 days. Google Business Profile is now fully optimized and social media posting is consistent. Focus next month on website content updates and expanding the content library.</p>
      </div>
      <div style="text-align: center;">
        <a href="https://accelerator.elearningu.com/sample" class="cta-button">View Full Assessment</a>
      </div>
    </div>
    <div class="footer">
      <p>Junction Accelerator by eLearningU</p>
    </div>
  </div>
</body>
</html>`
}

function buildMilestoneText(): string {
  return `Sample Tourism Business 30-Day Progress Report

PROGRESS SUMMARY
Overall Score: 68/100 (C+)
Change: +12 points

TOP IMPROVEMENTS
+ Google Business Profile: +18 points
+ Social Media Presence: +14 points
+ Review Management: +8 points

AREAS NEEDING ATTENTION
- Website Content: -2 points

SUMMARY
Strong progress in the first 30 days. Google Business Profile is now fully optimized and social media posting is consistent.

View full assessment: https://accelerator.elearningu.com/sample`
}

function buildWeekCompleteHtml(): string {
  return `<!DOCTYPE html>
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
          <tr>
            <td style="background-color: #11154b; padding: 32px; text-align: center;">
              <span style="font-size: 18px; font-weight: 800; color: #aadab6; letter-spacing: 0.06em; text-transform: uppercase;">eLearningU</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 32px;">
              <div style="display: inline-block; background: #d4edda; color: #155724; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 16px;">Week 3 Complete</div>
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #11154b;">Sample Tourism Business Finished Week 3!</h1>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #6b6b8a;">Great news! <strong style="color: #11154b;">client@example.com</strong> has completed all tasks for Week 3 of their accelerator program.</p>
              <div style="background: #f8f9fa; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px;">
                <div style="font-size: 13px; font-weight: 600; color: #6b6b8a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Tasks Completed</div>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                  <li style="margin: 4px 0; color: #11154b;">Meta Business Suite shows Facebook and Instagram connected</li>
                  <li style="margin: 4px 0; color: #11154b;">Three posts are live across Instagram and Facebook</li>
                  <li style="margin: 4px 0; color: #11154b;">Next week's posts are scheduled in advance</li>
                  <li style="margin: 4px 0; color: #11154b;">Directory audit complete; incorrect listings flagged</li>
                </ul>
              </div>
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #11154b; border-radius: 10px;">
                    <a href="https://accelerator.elearningu.com/sample/#week-3" target="_blank" style="display: inline-block; padding: 16px 32px; font-size: 15px; font-weight: 700; color: #aadab6; text-decoration: none;">View Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #f5ede0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6b6b8a;">eLearningU Accelerator Program<br><a href="https://accelerator.elearningu.com" style="color: #11154b;">accelerator.elearningu.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildWeekCompleteText(): string {
  return `Sample Tourism Business Finished Week 3!

Great news! client@example.com has completed all tasks for Week 3 of their accelerator program.

TASKS COMPLETED:
- Meta Business Suite shows Facebook and Instagram connected
- Three posts are live across Instagram and Facebook
- Next week's posts are scheduled in advance
- Directory audit complete; incorrect listings flagged

View Dashboard: https://accelerator.elearningu.com/sample/#week-3`
}

function buildExplanationHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; line-height: 1.6; }
    .container { max-width: 640px; margin: 0 auto; background: #fff; }
    .header { background: #11154b; color: #fff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
    .content { padding: 32px; }
    h2 { color: #11154b; font-size: 18px; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #aadab6; }
    h2:first-of-type { margin-top: 0; }
    .email-card { background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 16px; border-left: 4px solid #aadab6; }
    .email-card h3 { margin: 0 0 8px; color: #11154b; font-size: 16px; }
    .email-card .timing { font-size: 13px; color: #666; font-weight: 600; margin-bottom: 12px; }
    .email-card .recipients { font-size: 13px; color: #888; margin-bottom: 8px; }
    .email-card ul { margin: 8px 0 0; padding-left: 20px; font-size: 14px; color: #444; }
    .email-card li { margin: 4px 0; }
    .note { background: #eef7f1; border-radius: 8px; padding: 16px; margin-top: 24px; font-size: 14px; color: #333; }
    .footer { text-align: center; padding: 24px; color: #666; font-size: 12px; background: #f8f9fa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Automated Email Schedule & Content Guide</h1>
    </div>
    <div class="content">
      <p style="font-size: 15px; color: #444;">This guide explains exactly when clients receive automated emails from the Junction Accelerator system, and what each email contains.</p>

      <h2>Email Schedule Overview</h2>

      <div class="email-card">
        <h3>1. Monday Plan Email</h3>
        <div class="timing">Every Monday, 7:45-8:15 AM (client's local timezone)</div>
        <div class="recipients">Sent to: Client + Coach (if assigned)</div>
        <ul>
          <li>Greeting with client business name</li>
          <li>Their 90-day goal (highlighted box)</li>
          <li>This week's numbered action items</li>
          <li>"You'll know you're done when..." checklist</li>
          <li>CTA button linking to their week's plan</li>
          <li>Rotating tourism statistic/quote</li>
        </ul>
      </div>

      <div class="email-card">
        <h3>2. Friday Recap Email</h3>
        <div class="timing">Every Friday, 2:45-3:15 PM (client's local timezone)</div>
        <div class="recipients">Sent to: Client + Coach (if assigned)</div>
        <ul>
          <li>Progress bar showing completion percentage</li>
          <li>List of completed tasks (with checkmarks)</li>
          <li>List of incomplete tasks (if any)</li>
          <li>Encouraging message if no progress made</li>
          <li>CTA button to continue working</li>
        </ul>
      </div>

      <div class="email-card">
        <h3>3. Milestone Assessment Email</h3>
        <div class="timing">After 30-day, 60-day, and 90-day assessments complete</div>
        <div class="recipients">Sent to: Configured notification recipients</div>
        <ul>
          <li>Overall score (0-100) and letter grade</li>
          <li>Point change from previous assessment</li>
          <li>Top 3 improvements with point gains</li>
          <li>Areas needing attention (if any declines)</li>
          <li>Executive summary of progress</li>
          <li>CTA button to view full assessment</li>
        </ul>
      </div>

      <div class="email-card">
        <h3>4. Week Completion Notification</h3>
        <div class="timing">Immediately when client completes 100% of a week's tasks</div>
        <div class="recipients">Sent to: PSM (Program Success Manager)</div>
        <ul>
          <li>Client business name and week number</li>
          <li>Client's email address</li>
          <li>Full list of completed task names</li>
          <li>CTA button to view their dashboard</li>
        </ul>
      </div>

      <h2>Technical Details</h2>
      <ul style="font-size: 14px; color: #444;">
        <li><strong>Timezone handling:</strong> Monday and Friday emails use the client's configured timezone so emails arrive at the right local time</li>
        <li><strong>Week calculation:</strong> Based on cohort_start_date in the database; weeks 1-12 only</li>
        <li><strong>Duplicate prevention:</strong> System tracks sent notifications to avoid sending the same email twice</li>
        <li><strong>Active clients only:</strong> Only clients with <code>active = true</code> receive emails</li>
        <li><strong>Email service:</strong> MailerSend API for Monday/Friday/Milestone; Resend API for week completion</li>
      </ul>

      <div class="note">
        <strong>Note:</strong> Emails are triggered by Supabase cron jobs that run hourly. The system checks if it's the right day/time window in each client's timezone before sending.
      </div>
    </div>
    <div class="footer">
      <p>Junction Accelerator System Documentation</p>
    </div>
  </div>
</body>
</html>`
}

function buildExplanationText(): string {
  return `JUNCTION ACCELERATOR: AUTOMATED EMAIL SCHEDULE & CONTENT GUIDE

This guide explains exactly when clients receive automated emails and what each contains.

================================================================================

1. MONDAY PLAN EMAIL
   When: Every Monday, 7:45-8:15 AM (client's local timezone)
   Recipients: Client + Coach (if assigned)

   Contents:
   - Greeting with client business name
   - Their 90-day goal (highlighted)
   - This week's numbered action items
   - "You'll know you're done when..." checklist
   - CTA button linking to their week's plan
   - Rotating tourism statistic/quote

================================================================================

2. FRIDAY RECAP EMAIL
   When: Every Friday, 2:45-3:15 PM (client's local timezone)
   Recipients: Client + Coach (if assigned)

   Contents:
   - Progress bar showing completion percentage
   - List of completed tasks (with checkmarks)
   - List of incomplete tasks (if any)
   - Encouraging message if no progress made
   - CTA button to continue working

================================================================================

3. MILESTONE ASSESSMENT EMAIL
   When: After 30-day, 60-day, and 90-day assessments complete
   Recipients: Configured notification recipients

   Contents:
   - Overall score (0-100) and letter grade
   - Point change from previous assessment
   - Top 3 improvements with point gains
   - Areas needing attention (if any declines)
   - Executive summary of progress
   - CTA button to view full assessment

================================================================================

4. WEEK COMPLETION NOTIFICATION
   When: Immediately when client completes 100% of a week's tasks
   Recipients: PSM (Program Success Manager)

   Contents:
   - Client business name and week number
   - Client's email address
   - Full list of completed task names
   - CTA button to view their dashboard

================================================================================

TECHNICAL DETAILS:

- Timezone handling: Monday and Friday emails use the client's configured timezone
- Week calculation: Based on cohort_start_date; weeks 1-12 only
- Duplicate prevention: System tracks sent notifications
- Active clients only: Only clients with active=true receive emails
- Email service: MailerSend API for scheduled emails; Resend API for completions

Emails are triggered by Supabase cron jobs running hourly.

---
Junction Accelerator System Documentation`
}
