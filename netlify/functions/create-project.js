// Netlify Function: Create Project
// Processes a plan.md file, generates accelerator page, commits to GitHub

import { createClient } from '@supabase/supabase-js';
// Parsing and rendering live in one shared module so the upload, the local
// regeneration script and the tests can never drift apart.
import { parsePlanMd, renderDashboard, generatePlanJson, validateDashboardHtml, hasAssessmentContent } from '../../shared/plan-generator.js';
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
    const { clientName, slug, onboardingCallDate, coachEmail: providedCoachEmail, planMd, assessmentId } = body;

    // Flag: are we adding a plan to an existing assessment?
    const isAddingPlanToAssessment = !!assessmentId;

    // Validate required fields
    if (!clientName || !slug || !onboardingCallDate || !planMd) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Validate coach email is provided
    if (!providedCoachEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Coach email is required' })
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
    // 1B. USE PROVIDED COACH EMAIL
    // ─────────────────────────────────────────────────────────────────────────
    const coachEmail = providedCoachEmail.toLowerCase();

    // ─────────────────────────────────────────────────────────────────────────
    // 2. CHECK IF PROJECT EXISTS (skip if adding plan to existing assessment)
    // ─────────────────────────────────────────────────────────────────────────
    if (!isAddingPlanToAssessment) {
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
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. PARSE PLAN.MD
    // ─────────────────────────────────────────────────────────────────────────
    // Check the plan first. A plan with problems is rejected with a list of
    // the exact changes needed; nothing is generated or committed.
    const report = validatePlan(planMd, { type: 'accelerator', slug });
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

    const planData = parsePlanMd(planMd);
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
    const templateUrl = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/template/accelerator-template.html?ref=${encodeURIComponent(GITHUB_BRANCH)}`;
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
    // ─────────────────────────────────────────────────────────────────────────
    // 4B. LOAD THE CLIENT'S ASSESSMENT
    // The assessment record in Supabase is the source of truth for the
    // Assessment page. Adding a plan replaces the assessment-only page, so the
    // findings must be carried into the new dashboard.
    // ─────────────────────────────────────────────────────────────────────────
    let assessment = null;
    {
      let query = supabaseAdmin.from('client_assessments').select('id, client_slug, assessment_data');
      query = assessmentId ? query.eq('id', assessmentId) : query.eq('client_slug', slug);
      const { data: assessmentRow, error: assessmentError } = await query.maybeSingle();

      if (assessmentError) {
        console.error('[create-project] Failed to load assessment:', assessmentError.message);
      }
      if (assessmentRow && hasAssessmentContent(assessmentRow.assessment_data)) {
        assessment = assessmentRow.assessment_data;
      }

      // When a plan is being added to an assessment, never replace that
      // assessment page with a dashboard whose Assessment page is blank.
      if (isAddingPlanToAssessment && !assessment) {
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: "The assessment for this client could not be loaded, so nothing was uploaded. The existing assessment page has not been changed. Check that the assessment has finished generating, then try again.",
            step: 'assessment'
          })
        };
      }
    }

    const { html: processedHtml, unfilledPlaceholders } = renderDashboard(templateContent, {
      clientName,
      slug,
      coachEmail,
      onboardingCallDate,
      assessment,
      ...planData
    });

    // Never commit a page that is not internally consistent
    const pageProblems = validateDashboardHtml(processedHtml);
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
    const planJson = generatePlanJson(clientName, slug, coachEmail, planData);

    // ─────────────────────────────────────────────────────────────────────────
    // 7. COMMIT TO GITHUB (3 files in single commit)
    // ─────────────────────────────────────────────────────────────────────────
    const commitMessage = isAddingPlanToAssessment
      ? `Add implementation plan: ${clientName}`
      : `Add accelerator project: ${clientName}`;

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
    // 8. ENSURE COACH HAS USER_PLANS ENTRY WITH ONBOARDING CALL DATE
    // ─────────────────────────────────────────────────────────────────────────
    // Coach may have been assigned during assessment generation (stored in client_assessments)
    // but not have a user_plans entry. Upsert to ensure they have access and the date is set.
    const { error: upsertError } = await supabaseAdmin
      .from('user_plans')
      .upsert({
        email: coachEmail.toLowerCase(),
        client_slug: slug,
        role: 'coach',
        active: true,
        cohort_start_date: onboardingCallDate,
        coach_email: null // coaches don't have coaches
      }, {
        onConflict: 'email,client_slug,role'
      });

    if (upsertError) {
      console.warn('Failed to upsert coach user_plans entry (non-fatal):', upsertError.message);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8B. SEED 30/60/90 DAY MILESTONES
    // Day 0 = onboardingCallDate
    // ─────────────────────────────────────────────────────────────────────────
    try {
      // Get notification recipients (coach + PSMs)
      const { data: recipients } = await supabaseAdmin
        .from('user_plans')
        .select('email, role')
        .or(`client_slug.eq.${slug},client_slug.eq.*`)
        .in('role', ['coach', 'psm'])
        .eq('active', true);

      const notificationEmails = recipients?.map(r => r.email) || [coachEmail];

      // Calculate milestone due dates from onboarding call date
      const addDays = (dateStr, days) => {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
      };

      const milestones = [
        {
          client_slug: slug,
          milestone_type: '30-day',
          due_date: addDays(onboardingCallDate, 30),
          status: 'pending',
          notification_recipients: notificationEmails
        },
        {
          client_slug: slug,
          milestone_type: '60-day',
          due_date: addDays(onboardingCallDate, 60),
          status: 'pending',
          notification_recipients: notificationEmails
        },
        {
          client_slug: slug,
          milestone_type: '90-day',
          due_date: addDays(onboardingCallDate, 90),
          status: 'pending',
          notification_recipients: notificationEmails
        }
      ];

      const { error: milestoneError } = await supabaseAdmin
        .from('milestone_assessments')
        .upsert(milestones, { onConflict: 'client_slug,milestone_type' });

      if (milestoneError) {
        console.warn('Failed to seed milestones (non-fatal):', milestoneError.message);
      } else {
        console.log(`Seeded 30/60/90 day milestones for ${slug}`);
      }
    } catch (milestoneErr) {
      console.warn('Failed to seed milestones (non-fatal):', milestoneErr.message);
    }

    // Note: Coach notification is now sent during assessment generation (not here)

    // ─────────────────────────────────────────────────────────────────────────
    // 9. SUCCESS
    // ─────────────────────────────────────────────────────────────────────────
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        slug,
        projectUrl: `/${slug}/`,
        commitUrl: commitResult.commitUrl,
        warnings: report.warnings,
        summary: report.summary,
        assessmentIncluded: !!assessment
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

// Build an error that says which GitHub step failed and why. GitHub's
// message never contains the token.
async function githubError(action, response) {
  let githubMessage = '';
  try { githubMessage = (await response.json()).message || ''; } catch (e) { /* no JSON body */ }
  const writeStep = action !== 'read the branch' && action !== 'read the latest commit';
  const hint = response.status === 401
    ? 'The GitHub token in the site settings is not valid or has expired.'
    : (response.status === 403 || response.status === 404)
      ? (writeStep
        ? 'The GitHub token can read this repository but is not allowed to write to it. It needs read and write access to the repository contents.'
        : 'The GitHub token cannot see this repository or branch.')
      : response.status === 409 || response.status === 422
        ? 'GitHub rejected the change. Someone else may have committed at the same moment. Try again.'
        : 'GitHub could not complete the request.';
  console.error(`[github] Could not ${action}:`, response.status, githubMessage);
  return new Error(`Could not ${action} on GitHub (status ${response.status}${githubMessage ? `: ${githubMessage}` : ''}). ${hint} Nothing was created.`);
}

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
    if (!refRes.ok) throw await githubError('read the branch', refRes);
    const refData = await refRes.json();
    const latestCommitSha = refData.object.sha;

    // 2. Get tree of latest commit
    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, { headers });
    if (!commitRes.ok) throw await githubError('read the latest commit', commitRes);
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
    if (!treeRes.ok) throw await githubError('save the new files', treeRes);
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
    if (!newCommitRes.ok) throw await githubError('create the commit', newCommitRes);
    const newCommitData = await newCommitRes.json();

    // 5. Update branch reference
    const updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: newCommitData.sha })
    });
    if (!updateRefRes.ok) throw await githubError('update the branch', updateRefRes);

    return { commitUrl: newCommitData.html_url };

  } catch (err) {
    return { error: err.message };
  }
}
