// Netlify Function: Create Experience Project
// Processes a plan.md file (experience format), generates experience dashboard, commits to GitHub

import { createClient } from '@supabase/supabase-js';
// Parsing and rendering live in a shared, tested module.
import { parseExperiencePlanMd, renderExperienceDashboard, generateExperiencePlanJson, validateExperienceHtml } from '../../shared/experience-generator.js';
import { validatePlan, formatReport } from '../../shared/plan-validator.js';

// The branch this function reads templates from and commits to. Production
// uses main. A Netlify deploy preview can set GITHUB_BRANCH to its own branch
// so test uploads never touch main.
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function handler(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body);
    const { clientName, slug, coachEmail, assessmentDate, planMd } = body;

    // Validate required fields (no cohortStartDate for experience)
    if (!clientName || !slug || !coachEmail || !assessmentDate || !planMd) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid slug format' })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. VERIFY AUTH
    // ─────────────────────────────────────────────────────────────────────────
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required' }) };
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
    }

    // Check user role
    const { data: roleRows } = await supabaseAdmin
      .from('user_plans')
      .select('role')
      .eq('email', user.email)
      .eq('active', true)
      .in('role', ['admin', 'psm']);

    if (!roleRows || roleRows.length === 0) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin or PSM role required' }) };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. CHECK IF PROJECT EXISTS
    // ─────────────────────────────────────────────────────────────────────────
    const checkUrl = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/clients/${slug}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;
    const checkRes = await fetch(checkUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (checkRes.status === 200) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'Project already exists', step: 'github' })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. PARSE PLAN.MD
    // ─────────────────────────────────────────────────────────────────────────
    // Check the plan first. A plan with problems is rejected with a list of
    // the exact changes needed; nothing is generated or committed.
    const report = validatePlan(planMd, { type: 'experience', slug });
    if (!report.ok) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: formatReport(report),
          step: 'validate',
          issues: report.errors,
          warnings: report.warnings
        })
      };
    }

    const planData = parseExperiencePlanMd(planMd);
    if (planData.error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: planData.error, step: 'parse' })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. FETCH TEMPLATE FROM GITHUB
    // ─────────────────────────────────────────────────────────────────────────
    // Read the template from the same branch the result is committed to, so the
    // function code and the template always come from the same place.
    const templateUrl = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/template/experience-template.html?ref=${encodeURIComponent(GITHUB_BRANCH)}`;
    const templateRes = await fetch(templateUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!templateRes.ok) {
      // Say why GitHub refused, so a configuration problem can be fixed
      // without guessing. GitHub's message never contains the token.
      let githubMessage = '';
      try { githubMessage = (await templateRes.json()).message || ''; } catch (e) { /* no JSON body */ }
      const hint = templateRes.status === 401
        ? 'The GitHub token in the site settings is not valid or has expired.'
        : templateRes.status === 403
          ? 'The GitHub token is not allowed to access this repository.'
          : templateRes.status === 404
            ? `The template was not found on the "${GITHUB_BRANCH}" branch, or the GitHub token cannot see this repository.`
            : 'GitHub could not be reached.';
      console.error('[github] Template fetch failed:', templateRes.status, githubMessage);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: `Could not read the dashboard template from GitHub (status ${templateRes.status}${githubMessage ? `: ${githubMessage}` : ''}). ${hint} Nothing was created.`,
          step: 'github'
        })
      };
    }

    const templateData = await templateRes.json();
    const templateContent = Buffer.from(templateData.content, 'base64').toString('utf-8');

    // ─────────────────────────────────────────────────────────────────────────
    // 5. PROCESS TEMPLATE
    // ─────────────────────────────────────────────────────────────────────────
    const { html: processedHtml, unfilledPlaceholders } = renderExperienceDashboard(templateContent, {
      clientName,
      slug,
      coachEmail,
      ...planData
    });

    // Never commit a page that is not internally consistent
    const pageProblems = validateExperienceHtml(processedHtml);
    if (unfilledPlaceholders.length > 0 || pageProblems.length > 0) {
      const details = [
        ...unfilledPlaceholders.map(name => `Template placeholder with no data: ${name}`),
        ...pageProblems.map(problem => problem.message)
      ];
      console.error('[generator] Refusing to commit an inconsistent page:', details.join(' | '));
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: `The dashboard could not be generated correctly, so nothing was uploaded. This is a problem with the generator or template, not with the plan.\n• ${details.slice(0, 8).join('\n• ')}`,
          step: 'generate',
          issues: details.map(message => ({ severity: 'error', line: null, message, fix: '' }))
        })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. GENERATE PLAN.JSON
    // ─────────────────────────────────────────────────────────────────────────
    const planJson = generateExperiencePlanJson(clientName, slug, coachEmail, planData);

    // ─────────────────────────────────────────────────────────────────────────
    // 7. COMMIT TO GITHUB (3 files in single commit)
    // ─────────────────────────────────────────────────────────────────────────
    const commitMessage = `Add experience project: ${clientName}`;

    const commitResult = await commitToGitHub([
      { path: `clients/${slug}/plan.md`, content: planMd },
      { path: `clients/${slug}/index.html`, content: processedHtml },
      { path: `clients/${slug}/plan.json`, content: JSON.stringify(planJson, null, 2) }
    ], commitMessage);

    if (commitResult.error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: commitResult.error, step: 'github' })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. CREATE OR UPDATE SUPABASE ENTRY (upsert logic)
    // ─────────────────────────────────────────────────────────────────────────
    // Check if coach already has an entry for this project
    const { data: existingCoach } = await supabaseAdmin
      .from('user_plans')
      .select('id')
      .eq('email', coachEmail)
      .eq('client_slug', slug);

    if (existingCoach && existingCoach.length > 0) {
      // Update existing record
      const { error: updateError } = await supabaseAdmin
        .from('user_plans')
        .update({
          role: 'coach',
          coach_email: coachEmail,
          dashboard_state: 'experience',
          active: true
        })
        .eq('id', existingCoach[0].id);

      if (updateError) {
        console.error('Supabase update error:', updateError);
      }
    } else {
      // Insert new record (no cohort_start_date - operator sets this themselves)
      const { error: dbError } = await supabaseAdmin
        .from('user_plans')
        .insert({
          email: coachEmail,
          role: 'coach',
          client_slug: slug,
          coach_email: coachEmail,
          dashboard_state: 'experience',
          active: true
        });

      if (dbError) {
        console.error('Supabase insert error:', dbError);
        // Don't fail the whole request - files are already committed
        // Log for manual recovery
      }
    }

    // Note: Experience projects do NOT seed 30/60/90 day milestones.
    // The operator sets their own start date via the dashboard UI.

    // ─────────────────────────────────────────────────────────────────────────
    // 8B. NOTIFY COACH OF ASSIGNMENT
    // ─────────────────────────────────────────────────────────────────────────
    try {
      if (coachEmail && process.env.RESEND_API_KEY) {
        const dashboardUrl = `https://accelerator.elearningu.com/${encodeURIComponent(slug)}/`;
        const myClientsUrl = 'https://accelerator.elearningu.com/my-clients/';

        const safeClientName = clientName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeSenderEmail = user.email.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const emailHtml = `
<!DOCTYPE html>
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
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #11154b;">You've Been Assigned a New Client</h1>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #6b6b8a;">
                Great news! You have been assigned as the coach for <strong style="color: #11154b;">${safeClientName}</strong>.
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #6b6b8a;">
                Their experience design dashboard has been created and you can now access it to track their progress and support them through the launch process.
              </p>
              <div style="background-color: #f5ede0; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #11154b;">Project Details</p>
                <p style="margin: 0; font-size: 14px; color: #6b6b8a;">
                  <strong>Client:</strong> ${safeClientName}<br>
                  <strong>Dashboard Type:</strong> Experience Design
                </p>
              </div>
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #11154b; border-radius: 10px;">
                    <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 16px 28px; font-size: 15px; font-weight: 700; color: #aadab6; text-decoration: none;">
                      View Client Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #6b6b8a; text-align: center;">
                <a href="${myClientsUrl}" style="color: #11154b; text-decoration: underline;">View all your clients</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #f5ede0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6b6b8a;">
                Assigned by ${safeSenderEmail}<br>
                eLearningU Accelerator Program<br>
                <a href="https://accelerator.elearningu.com" style="color: #11154b;">accelerator.elearningu.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim();

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'eLearningU <noreply@elearningu.com>',
            to: [coachEmail],
            subject: `New Client Assignment: ${safeClientName}`,
            html: emailHtml
          })
        });

        if (resendRes.ok) {
          console.log(`Coach notification sent to ${coachEmail} for ${slug}`);
        } else {
          const resendError = await resendRes.json();
          console.warn('Coach notification failed (non-fatal):', resendError);
        }
      }
    } catch (notifyErr) {
      console.warn('Failed to notify coach (non-fatal):', notifyErr.message);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. SUCCESS
    // ─────────────────────────────────────────────────────────────────────────
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        slug,
        projectUrl: `/${slug}/`,
        warnings: report.warnings,
        summary: report.summary,
        commitUrl: commitResult.commitUrl
      })
    };

  } catch (err) {
    console.error('Unexpected error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal server error' })
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GITHUB COMMIT
// ═══════════════════════════════════════════════════════════════════════════

async function commitToGitHub(files, message) {
  const headers = {
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = GITHUB_BRANCH;

  try {
    // 1. Get latest commit SHA
    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, { headers });
    if (!refRes.ok) throw new Error('Failed to get branch ref');
    const refData = await refRes.json();
    const latestCommitSha = refData.object.sha;

    // 2. Get tree of latest commit
    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, { headers });
    if (!commitRes.ok) throw new Error('Failed to get commit');
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    // 3. Create new tree
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: files.map(f => ({
          path: f.path,
          mode: '100644',
          type: 'blob',
          content: f.content
        }))
      })
    });
    if (!treeRes.ok) throw new Error('Failed to create tree');
    const treeData = await treeRes.json();

    // 4. Create commit
    const newCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        tree: treeData.sha,
        parents: [latestCommitSha]
      })
    });
    if (!newCommitRes.ok) throw new Error('Failed to create commit');
    const newCommitData = await newCommitRes.json();

    // 5. Update branch reference
    const updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: newCommitData.sha })
    });
    if (!updateRefRes.ok) throw new Error('Failed to update branch');

    return { commitUrl: newCommitData.html_url };

  } catch (err) {
    return { error: err.message };
  }
}
