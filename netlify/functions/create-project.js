// Netlify Function: Create Project
// Processes a plan.md file, generates accelerator page, commits to GitHub

import { createClient } from '@supabase/supabase-js';

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
      const checkUrl = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/clients/${slug}`;
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
    const templateUrl = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/template/accelerator-template.html`;
    const templateRes = await fetch(templateUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!templateRes.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch template', step: 'github' })
      };
    }

    const templateData = await templateRes.json();
    const templateContent = Buffer.from(templateData.content, 'base64').toString('utf-8');

    // ─────────────────────────────────────────────────────────────────────────
    // 5. PROCESS TEMPLATE
    // ─────────────────────────────────────────────────────────────────────────
    const processedHtml = processTemplate(templateContent, {
      clientName,
      slug,
      coachEmail,
      onboardingCallDate,
      ...planData
    });

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
// PLAN.MD PARSER
// ═══════════════════════════════════════════════════════════════════════════

function parsePlanMd(content) {
  try {
    // ─────────────────────────────────────────────────────────────────────────
    // FORMAT VALIDATION
    // Check for required sections before parsing to provide clear error messages
    // ─────────────────────────────────────────────────────────────────────────
    const validationErrors = [];

    if (!content.includes('## Goal')) {
      validationErrors.push('Missing "## Goal" section');
    }
    if (!content.match(/## Tactic \d+:/)) {
      validationErrors.push('Missing "## Tactic N:" sections');
    }
    if (!content.match(/### Week \d+:/)) {
      validationErrors.push('Missing "### Week N:" sections in roadmap');
    }

    // Count tactics and weeks to validate completeness
    const tacticMatches = content.match(/## Tactic \d+:/g) || [];
    if (tacticMatches.length < 3) {
      validationErrors.push(`Found ${tacticMatches.length} tactics, expected at least 3`);
    }

    const weekMatches = content.match(/### Week \d+:/g) || [];
    if (weekMatches.length < 12) {
      validationErrors.push(`Found ${weekMatches.length} weeks, expected 12`);
    }

    // Return early if critical validation errors
    if (validationErrors.length > 0 && !content.includes('## Goal')) {
      return { error: validationErrors.join('; ') };
    }

    const result = {
      meta: {},
      goal: '',
      strategicPositioning: '',
      welcomeMessage: '',
      objectives: [],
      tactics: [],
      roadmap: { monthNames: [], weeks: [] },
      hasGbpQuickWins: false,
      hasProjections: false,
      gbpQuickWinsContent: '',
      grantBudget: null,
      targetMilestone: null
    };

    // Extract Meta section
    const metaMatch = content.match(/## Meta[\r\n]+([\s\S]*?)(?=[\r\n]+## )/);
    if (metaMatch) {
      const meta = metaMatch[1];
      const slugMatch = meta.match(/Client Slug:\s*(.+)/);
      const budgetMatch = meta.match(/Grant Budget:\s*(.+)/);
      const milestoneMatch = meta.match(/Target Milestone:\s*(.+)/);
      const gbpMatch = meta.match(/Has GBP Quick Wins:\s*(.+)/);
      const projectionsMatch = meta.match(/Has Projections:\s*(.+)/);

      if (slugMatch) result.meta.clientSlug = slugMatch[1].trim();
      if (budgetMatch) result.grantBudget = budgetMatch[1].trim();
      if (milestoneMatch) result.targetMilestone = milestoneMatch[1].trim();
      if (gbpMatch) result.hasGbpQuickWins = gbpMatch[1].trim().toLowerCase() === 'yes';
      if (projectionsMatch) result.hasProjections = projectionsMatch[1].trim().toLowerCase() === 'yes';
    }

    // Extract Goal (more forgiving regex that handles \r\n and various line endings)
    const goalMatch = content.match(/## Goal[\r\n]+([\s\S]*?)(?=[\r\n]+---|\n## |$)/);
    if (goalMatch) {
      result.goal = goalMatch[1].trim();
    } else {
      return { error: 'Missing "## Goal" section' };
    }

    // Extract Strategic Positioning
    const posMatch = content.match(/## Strategic Positioning[\r\n]+([\s\S]*?)(?=[\r\n]+---|\n## |$)/);
    if (posMatch) {
      result.strategicPositioning = posMatch[1].trim();
    }

    // Extract Welcome Message
    const welcomeMatch = content.match(/## Welcome Message[\r\n]+([\s\S]*?)(?=[\r\n]+---|\n## |$)/);
    if (welcomeMatch) {
      result.welcomeMessage = welcomeMatch[1].trim();
    }

    // Extract Objectives (more forgiving regex)
    const objectivesMatch = content.match(/## Objectives[\r\n]+([\s\S]*?)(?=[\r\n]+---|\n## 90-Day Roadmap|$)/);
    if (objectivesMatch) {
      const objContent = objectivesMatch[1];
      // More forgiving pattern that handles variable whitespace
      const objMatches = objContent.matchAll(/### Objective (\d+)[\r\n]+Title:\s*(.+?)[\r\n]+Description:\s*(.+?)[\r\n]+Tactic Pill:\s*(.+?)(?=[\r\n]+###|\n## |$)/g);
      for (const match of objMatches) {
        result.objectives.push({
          number: parseInt(match[1]),
          title: match[2].trim(),
          description: match[3].trim(),
          tacticPill: match[4].trim()
        });
      }
    }

    // Extract Tactics with full content
    const tacticSections = content.split(/(?=## Tactic \d+:)/g).filter(s => s.startsWith('## Tactic'));

    for (const section of tacticSections) {
      // More forgiving header pattern that handles variable whitespace
      const headerMatch = section.match(/## Tactic (\d+):\s*(.+?)[\r\n]+Phase:\s*(.+?)[\r\n]+Short Label:\s*(.+?)[\r\n]+Subtitle:\s*(.+?)(?=[\r\n]+###|$)/s);
      if (!headerMatch) continue;

      const tactic = {
        number: parseInt(headerMatch[1]),
        title: headerMatch[2].trim(),
        phase: headerMatch[3].trim(),
        shortLabel: headerMatch[4].trim(),
        subtitle: headerMatch[5].trim(),
        whatHeard: '',
        whatIs: '',
        whyMatters: '',
        implementationSteps: [],
        breakdowns: [], // Part A/B/C/D titles and descriptions
        successMetrics: [],
        tips: [],
        resources: []
      };

      // Extract "What We Heard From You" (more forgiving regex)
      const heardMatch = section.match(/### What We Heard From You[\r\n]+([\s\S]*?)(?=[\r\n]+### |$)/);
      if (heardMatch) tactic.whatHeard = heardMatch[1].trim();

      // Extract "What This Is"
      const whatIsMatch = section.match(/### What This Is[\r\n]+([\s\S]*?)(?=[\r\n]+### |$)/);
      if (whatIsMatch) tactic.whatIs = whatIsMatch[1].trim();

      // Extract "Why It Matters"
      const whyMattersMatch = section.match(/### Why It Matters[\r\n]+([\s\S]*?)(?=[\r\n]+### |$)/);
      if (whyMattersMatch) tactic.whyMatters = whyMattersMatch[1].trim();

      // Extract Implementation Steps
      const stepsMatch = section.match(/### Implementation Steps[\r\n]+([\s\S]*?)(?=[\r\n]+### Success Metrics|$)/);
      if (stepsMatch) {
        const stepsContent = stepsMatch[1];
        const parts = stepsContent.split(/#### Part [A-Z]:/).filter(p => p.trim());
        const partHeaders = stepsContent.match(/#### Part [A-Z]:\s*(.+)/g) || [];

        let stepNum = 1;
        parts.forEach((part, idx) => {
          const partTitle = partHeaders[idx] ? partHeaders[idx].replace(/#### Part [A-Z]:\s*/, '').trim() : '';
          const stepMatches = part.matchAll(/(\d+)\.\s+\*\*(.+?)\*\*\n([\s\S]*?)(?=\n\d+\.|$)/g);

          // Collect first step title as breakdown description
          let firstStepTitle = '';

          for (const step of stepMatches) {
            const bullets = step[3].trim().split('\n')
              .filter(line => line.trim().startsWith('-'))
              .map(line => line.replace(/^\s*-\s*/, '').trim());

            if (!firstStepTitle) {
              firstStepTitle = step[2].trim();
            }

            tactic.implementationSteps.push({
              number: stepNum++,
              partLabel: partTitle,
              title: step[2].trim(),
              bullets
            });
          }

          // Add breakdown entry for this Part
          if (partTitle) {
            // Convert long part titles to shorter breakdown titles (2-4 words)
            const shortTitle = shortenPartTitle(partTitle);
            tactic.breakdowns.push({
              title: shortTitle,
              description: firstStepTitle || partTitle
            });
          }
        });
      }

      // Extract Success Metrics table
      const metricsMatch = section.match(/### Success Metrics\n\n\| Metric \| 30 Days \| 60 Days \| 90 Days \|\n\|[\s\S]*?\n([\s\S]*?)(?=\n### Tips|\n---)/);
      if (metricsMatch) {
        const rows = metricsMatch[1].trim().split('\n').filter(r => r.startsWith('|'));
        for (const row of rows) {
          const cells = row.split('|').filter(c => c.trim()).map(c => c.trim());
          if (cells.length >= 4) {
            tactic.successMetrics.push({
              metric: cells[0],
              day30: cells[1],
              day60: cells[2],
              day90: cells[3]
            });
          }
        }
      }

      // Extract Tips (more forgiving regex)
      const tipsMatch = section.match(/### Tips[\r\n]+([\s\S]*?)(?=[\r\n]+### Resources|$)/);
      if (tipsMatch) {
        tactic.tips = tipsMatch[1].trim().split(/[\r\n]+/)
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace(/^-\s*/, '').trim());
      }

      // Extract Resources (more forgiving regex)
      const resourcesMatch = section.match(/### Resources[\r\n]+([\s\S]*?)(?=[\r\n]+---|\n## |$)/);
      if (resourcesMatch) {
        const resourceLines = resourcesMatch[1].trim().split('\n')
          .filter(line => line.trim().startsWith('-'));

        for (const line of resourceLines) {
          const linkMatch = line.match(/\[(.+?)\]\((.+?)\)(?::\s*(.+))?/);
          if (linkMatch) {
            tactic.resources.push({
              title: linkMatch[1],
              url: linkMatch[2],
              description: linkMatch[3] ? linkMatch[3].trim() : ''
            });
          }
        }
      }

      result.tactics.push(tactic);
    }

    if (result.tactics.length < 3) {
      return { error: 'Plan must have at least 3 tactics' };
    }

    // Extract Month Names
    const month1Match = content.match(/Month 1 Name:\s*(.+)/);
    const month2Match = content.match(/Month 2 Name:\s*(.+)/);
    const month3Match = content.match(/Month 3 Name:\s*(.+)/);
    result.roadmap.monthNames = [
      month1Match ? month1Match[1].trim() : 'Month 1',
      month2Match ? month2Match[1].trim() : 'Month 2',
      month3Match ? month3Match[1].trim() : 'Month 3'
    ];

    // Extract Weeks (more forgiving regex that handles variable whitespace)
    const weekMatchesIter = content.matchAll(/### Week (\d+):\s*(.+?)[\r\n]+\*\*Actions:\*\*[\r\n]+([\s\S]*?)\*\*Checklist:\*\*[\r\n]+([\s\S]*?)(?=### Week \d+|## GBP|$)/g);
    for (const match of weekMatchesIter) {
      const actions = match[3].trim().split(/[\r\n]+/)
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim());

      const checklist = match[4].trim().split(/[\r\n]+/)
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*\[.\]\s*/, '').trim());

      result.roadmap.weeks.push({
        number: parseInt(match[1]),
        title: match[2].trim(),
        actions,
        checklist
      });
    }

    if (result.roadmap.weeks.length < 12) {
      return { error: `Found ${result.roadmap.weeks.length} weeks, expected 12` };
    }

    // Extract GBP Quick Wins content
    if (result.hasGbpQuickWins) {
      const gbpMatch = content.match(/## GBP Quick Wins\n\n([\s\S]*?)$/);
      if (gbpMatch) {
        result.gbpQuickWinsContent = gbpMatch[1].trim();
      }
    }

    return result;

  } catch (err) {
    return { error: `Parse error: ${err.message}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE PROCESSOR
// ═══════════════════════════════════════════════════════════════════════════

function processTemplate(template, data) {
  let html = template;

  // ─────────────────────────────────────────────────────────────────────────
  // REMOVE TEMPLATE HEADER COMMENT
  // This comment contains placeholder documentation that shouldn't appear in output
  // ─────────────────────────────────────────────────────────────────────────
  html = html.replace(/^<!--[\s\S]*?-->\s*(?=<!DOCTYPE)/m, '');

  // ─────────────────────────────────────────────────────────────────────────
  // SIMPLE PLACEHOLDER REPLACEMENTS
  // ─────────────────────────────────────────────────────────────────────────
  const placeholders = {
    '{{CLIENT_NAME}}': data.clientName,
    '{{CLIENT_SLUG}}': data.slug,
    '{{PAGE_SUBTITLE}}': data.goal.slice(0, 100) + '...',
    '{{GOAL_TEXT}}': data.goal,
    '{{WM_SUBLINE}}': data.welcomeMessage || data.goal.slice(0, 150),
    '{{STRATEGIC_POSITIONING}}': data.strategicPositioning,
    '{{ASSESSMENT_DATE}}': formatDateLong(data.onboardingCallDate),
    '{{COHORT_START_DATE}}': formatDateLong(data.onboardingCallDate),
    '{{ONBOARDING_CALL_DATE}}': formatDateLong(data.onboardingCallDate),
    '{{COACH_EMAIL}}': data.coachEmail,
    '{{MONTH_1_NAME}}': data.roadmap.monthNames[0],
    '{{MONTH_2_NAME}}': data.roadmap.monthNames[1],
    '{{MONTH_3_NAME}}': data.roadmap.monthNames[2]
  };

  // Calculate total tasks
  let totalTasks = 0;
  data.roadmap.weeks.forEach(w => {
    totalTasks += w.checklist.length;
  });
  placeholders['{{TOTAL_TASKS}}'] = totalTasks.toString();

  // Objectives
  for (let i = 0; i < 3; i++) {
    const obj = data.objectives[i] || { title: '', description: '', tacticPill: '' };
    placeholders[`{{OBJECTIVE_${i + 1}_TITLE}}`] = obj.title;
    placeholders[`{{OBJECTIVE_${i + 1}_DESC}}`] = obj.description;
    placeholders[`{{OBJECTIVE_${i + 1}_TACTIC_PILL}}`] = obj.tacticPill;
  }

  // Tactics
  for (let i = 0; i < 3; i++) {
    const tactic = data.tactics[i] || { title: '', shortLabel: '', phase: '', subtitle: '' };
    placeholders[`{{TACTIC_${i + 1}_TITLE}}`] = tactic.title;
    placeholders[`{{TACTIC_${i + 1}_NAV_LABEL}}`] = tactic.shortLabel;
    placeholders[`{{TACTIC_${i + 1}_PHASE}}`] = tactic.phase;
    placeholders[`{{TACTIC_${i + 1}_SUBTITLE}}`] = tactic.subtitle;

    // Count checklist items for this tactic
    const tacticWeeks = getTacticWeeks(i + 1);
    let tacticTotal = 0;
    data.roadmap.weeks.forEach(w => {
      if (tacticWeeks.includes(w.number)) {
        tacticTotal += w.checklist.length;
      }
    });
    placeholders[`{{TACTIC_${i + 1}_TOTAL}}`] = tacticTotal.toString();
  }

  // Apply all simple replacements
  for (const [placeholder, value] of Object.entries(placeholders)) {
    html = html.split(placeholder).join(value || '');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONDITIONAL BLOCKS
  // ─────────────────────────────────────────────────────────────────────────

  // Handle IF:GRANT_BUDGET
  if (data.grantBudget) {
    html = html.replace(/<!-- IF:GRANT_BUDGET -->/g, '');
    html = html.replace(/<!-- \/IF:GRANT_BUDGET -->/g, '');
    html = html.replace(/\{\{GRANT_BUDGET\}\}/g, data.grantBudget);
  } else {
    html = html.replace(/<!-- IF:GRANT_BUDGET -->[\s\S]*?<!-- \/IF:GRANT_BUDGET -->/g, '');
  }

  // Handle IF:TARGET_MILESTONE
  if (data.targetMilestone) {
    html = html.replace(/<!-- IF:TARGET_MILESTONE -->/g, '');
    html = html.replace(/<!-- \/IF:TARGET_MILESTONE -->/g, '');
    const [title, desc] = data.targetMilestone.split('·').map(s => s.trim());
    html = html.replace(/\{\{MILESTONE_TITLE\}\}/g, title || '');
    html = html.replace(/\{\{MILESTONE_DESC\}\}/g, desc || '');
  } else {
    html = html.replace(/<!-- IF:TARGET_MILESTONE -->[\s\S]*?<!-- \/IF:TARGET_MILESTONE -->/g, '');
  }

  // Handle IF:GBP_QUICK_WINS
  if (!data.hasGbpQuickWins) {
    html = html.replace(/<!-- IF:GBP_QUICK_WINS -->[\s\S]*?<!-- \/IF:GBP_QUICK_WINS -->/g, '');
  } else {
    html = html.replace(/<!-- IF:GBP_QUICK_WINS -->/g, '');
    html = html.replace(/<!-- \/IF:GBP_QUICK_WINS -->/g, '');
  }

  // Handle IF:QUICK_WINS (same as GBP_QUICK_WINS for backwards compatibility)
  if (!data.hasGbpQuickWins) {
    html = html.replace(/<!-- IF:QUICK_WINS -->[\s\S]*?<!-- ENDIF:QUICK_WINS -->/g, '');
  } else {
    html = html.replace(/<!-- IF:QUICK_WINS -->/g, '');
    html = html.replace(/<!-- ENDIF:QUICK_WINS -->/g, '');
  }

  // Handle IF:PROJECTIONS - only include for accommodation businesses with explicit projections
  if (!data.hasProjections) {
    html = html.replace(/<!-- IF:PROJECTIONS -->[\s\S]*?<!-- ENDIF:PROJECTIONS -->/g, '');
  } else {
    html = html.replace(/<!-- IF:PROJECTIONS -->/g, '');
    html = html.replace(/<!-- ENDIF:PROJECTIONS -->/g, '');
  }

  // Handle IF:TACTIC_4 - remove 4th tactic content if only 3 tactics
  if (data.tactics.length < 4) {
    html = html.replace(/<!-- IF:TACTIC_4 -->[\s\S]*?<!-- ENDIF:TACTIC_4 -->/g, '');
    // Also clean up 4th objective if exists
    html = html.replace(/\{\{OBJECTIVE_4_TITLE\}\}/g, '');
    html = html.replace(/\{\{OBJECTIVE_4_DESC\}\}/g, '');
    html = html.replace(/\{\{OBJECTIVE_4_TACTIC_PILL\}\}/g, '');
    html = html.replace(/\{\{TACTIC_4_TITLE\}\}/g, '');
    html = html.replace(/\{\{TACTIC_4_NAV_LABEL\}\}/g, '');
    html = html.replace(/\{\{TACTIC_4_PHASE\}\}/g, '');
    html = html.replace(/\{\{TACTIC_4_SUBTITLE\}\}/g, '');
    html = html.replace(/\{\{TACTIC_4_TOTAL\}\}/g, '0');
    // Clean up Tactic 4 breakdown and time placeholders
    html = html.replace(/\{\{TACTIC_4_TIME_VALUE\}\}/g, '');
    html = html.replace(/\{\{TACTIC_4_TIME_CONTEXT\}\}/g, '');
    for (let m = 1; m <= 4; m++) {
      html = html.replace(new RegExp(`\\{\\{T4_BREAKDOWN_${m}_TITLE\\}\\}`, 'g'), '');
      html = html.replace(new RegExp(`\\{\\{T4_BREAKDOWN_${m}_DESC\\}\\}`, 'g'), '');
    }
  } else {
    html = html.replace(/<!-- IF:TACTIC_4 -->/g, '');
    html = html.replace(/<!-- ENDIF:TACTIC_4 -->/g, '');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TACTIC CONTENT PLACEHOLDERS
  // ─────────────────────────────────────────────────────────────────────────
  const tacticCount = Math.min(data.tactics.length, 4);
  for (let i = 0; i < tacticCount; i++) {
    const tactic = data.tactics[i];
    if (!tactic) continue;

    const n = i + 1;

    // Overview content
    html = html.split(`{{TACTIC_${n}_HEARD}}`).join(escapeHtml(tactic.whatHeard || ''));
    html = html.split(`{{TACTIC_${n}_WHAT_IS}}`).join(escapeHtml(tactic.whatIs || ''));
    html = html.split(`{{TACTIC_${n}_MATTERS}}`).join(escapeHtml(tactic.whyMatters || ''));

    // Implementation Steps HTML
    const stepsHtml = generateImplementationStepsHtml(tactic.implementationSteps, n);
    html = html.split(`{{TACTIC_${n}_IMPLEMENTATION_STEPS}}`).join(stepsHtml);

    // Success Metrics HTML (table rows)
    const metricsHtml = generateMetricsRowsHtml(tactic.successMetrics);
    html = html.split(`{{TACTIC_${n}_METRICS_ROWS}}`).join(metricsHtml);

    // Tips HTML
    const tipsHtml = generateTipsHtml(tactic.tips, n);
    html = html.split(`{{TACTIC_${n}_TIPS}}`).join(tipsHtml);

    // Resources HTML
    const resourcesHtml = generateResourcesHtml(tactic.resources, n);
    html = html.split(`{{TACTIC_${n}_RESOURCES}}`).join(resourcesHtml);

    // Breakdown placeholders (Part A/B/C/D titles and descriptions)
    for (let m = 1; m <= 4; m++) {
      const breakdown = tactic.breakdowns[m - 1] || { title: '', description: '' };
      html = html.split(`{{T${n}_BREAKDOWN_${m}_TITLE}}`).join(escapeHtml(breakdown.title));
      html = html.split(`{{T${n}_BREAKDOWN_${m}_DESC}}`).join(escapeHtml(breakdown.description));
    }

    // Time commitment placeholders (derived from step count)
    const timeCommitment = estimateTimeCommitment(tactic);
    html = html.split(`{{TACTIC_${n}_TIME_VALUE}}`).join(timeCommitment.value);
    html = html.split(`{{TACTIC_${n}_TIME_CONTEXT}}`).join(timeCommitment.context);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE PLACEHOLDERS
  // Derive phase info from tactics or use sensible defaults
  // ─────────────────────────────────────────────────────────────────────────
  const phases = [
    {
      name: data.tactics[0]?.phase || 'Foundation',
      weeks: 'WEEKS 1-4',
      desc: data.tactics[0]?.phase ? data.tactics[0].phase.split(' ')[0] : 'Build the base'
    },
    {
      name: data.tactics[1]?.phase || 'Growth',
      weeks: 'WEEKS 5-8',
      desc: data.tactics[1]?.phase ? data.tactics[1].phase.split(' ')[0] : 'Scale up'
    },
    {
      name: data.tactics[2]?.phase || 'Optimization',
      weeks: 'WEEKS 9-12',
      desc: data.tactics[2]?.phase ? data.tactics[2].phase.split(' ')[0] : 'Refine & sustain'
    }
  ];

  for (let i = 0; i < 3; i++) {
    const n = i + 1;
    html = html.split(`{{PHASE_${n}_WEEKS}}`).join(phases[i].weeks);
    html = html.split(`{{PHASE_${n}_NAME}}`).join(phases[i].name);
    html = html.split(`{{PHASE_${n}_DESC}}`).join(phases[i].desc);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WEEK 1 DASHBOARD PLACEHOLDERS (Your Next Step card)
  // ─────────────────────────────────────────────────────────────────────────
  const week1 = data.roadmap.weeks[0];
  html = html.split('{{WEEK_1_SHORT_TITLE}}').join(week1?.title || 'Get Started');
  html = html.split('{{WEEK_1_HEADLINE}}').join(week1?.actions[0] ? stripMarkdown(week1.actions[0]).replace(/→ links to:.*$/, '').trim() : 'Begin your 90-day journey');
  html = html.split('{{WEEK_1_TIME}}').join('2-3 hours this week');
  html = html.split('{{WEEK_1_WHO}}').join('You + your team');
  html = html.split('{{WEEK_1_TASK_COUNT}}').join((week1?.checklist?.length || 0).toString());

  // ─────────────────────────────────────────────────────────────────────────
  // ROADMAP WEEK HTML GENERATION
  // ─────────────────────────────────────────────────────────────────────────
  const monthTotals = { 1: 0, 2: 0, 3: 0 };
  data.roadmap.weeks.forEach(w => {
    const month = Math.ceil(w.number / 4);
    monthTotals[month] += w.checklist.length;
  });

  html = html.split('{{MONTH_1_TOTAL}}').join(monthTotals[1].toString());
  html = html.split('{{MONTH_2_TOTAL}}').join(monthTotals[2].toString());
  html = html.split('{{MONTH_3_TOTAL}}').join(monthTotals[3].toString());

  // Generate week HTML for each month
  for (let month = 1; month <= 3; month++) {
    const startWeek = (month - 1) * 4 + 1;
    const endWeek = month * 4;
    const monthWeeks = data.roadmap.weeks.filter(w => w.number >= startWeek && w.number <= endWeek);
    const monthWeeksHtml = monthWeeks.map(w => generateWeekCardHtml(w)).join('\n');
    html = html.split(`{{MONTH_${month}_WEEKS}}`).join(monthWeeksHtml);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUICK WINS PAGE CONTENT
  // ─────────────────────────────────────────────────────────────────────────
  if (data.hasGbpQuickWins && data.gbpQuickWinsContent) {
    const quickWinsHtml = generateQuickWinsHtml(data.gbpQuickWinsContent);
    html = html.split('{{QUICK_WINS_PAGE_CONTENT}}').join(quickWinsHtml);
  } else {
    html = html.split('{{QUICK_WINS_PAGE_CONTENT}}').join('');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEFAULT/LABEL PLACEHOLDERS
  // ─────────────────────────────────────────────────────────────────────────
  html = html.split('{{OBJECTIVES_LABEL}}').join('Your Objectives');
  html = html.split('{{TACTICS_LABEL}}').join('Your Tactics');
  html = html.split('{{ROADMAP_CALLOUT}}').join('');

  // Assessment placeholders - set to empty or defaults (assessment data comes from separate source)
  html = html.split('{{OVERALL_SCORE}}').join('--');
  html = html.split('{{OVERALL_GRADE}}').join('--');
  html = html.split('{{ASSESSMENT_SUMMARY}}').join('Assessment data will be populated when available.');
  html = html.split('{{EXECUTIVE_HEADLINE}}').join('');
  html = html.split('{{KEY_STRENGTHS}}').join('');
  html = html.split('{{CRITICAL_GAPS}}').join('');
  html = html.split('{{BOTTOM_LINE}}').join('');
  html = html.split('{{QUICK_WINS_CARDS}}').join('');
  html = html.split('{{PRIORITY_RECOMMENDATIONS}}').join('');
  html = html.split('{{CATEGORY_CARDS}}').join('');
  html = html.split('{{PROJECTIONS_NOTE}}').join('');
  html = html.split('{{PRINT_SUMMARY_STATS}}').join('');

  // Assessment category placeholders - set to defaults until assessment is available
  for (let n = 1; n <= 6; n++) {
    html = html.split(`{{CATEGORY_${n}_SCORE}}`).join('--');
    html = html.split(`{{CATEGORY_${n}_GRADE}}`).join('--');
    html = html.split(`{{CATEGORY_${n}_GRADE_CLASS}}`).join('');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BUILD JAVASCRIPT ARRAYS
  // ─────────────────────────────────────────────────────────────────────────
  const allCheckIds = [];
  const weekChecks = {};
  const monthChecks = { 1: [], 2: [], 3: [] };
  const tacticChecks = { 1: [], 2: [], 3: [] };

  data.roadmap.weeks.forEach(week => {
    weekChecks[week.number] = [];
    const month = Math.ceil(week.number / 4);
    const tacticNum = getTacticForWeek(week.number);

    week.checklist.forEach((_, idx) => {
      const id = `week-${week.number}-check-${idx + 1}`;
      allCheckIds.push(id);
      weekChecks[week.number].push(id);
      monthChecks[month].push(id);
      tacticChecks[tacticNum].push(id);
    });
  });

  // Replace JavaScript arrays in template
  html = html.replace(
    /const ALL_CHECK_IDS\s*=\s*\[[\s\S]*?\];/,
    `const ALL_CHECK_IDS = ${JSON.stringify(allCheckIds)};`
  );

  html = html.replace(
    /const WEEK_CHECKS\s*=\s*\{[\s\S]*?\};/,
    `const WEEK_CHECKS = ${JSON.stringify(weekChecks)};`
  );

  html = html.replace(
    /const MONTH_CHECKS\s*=\s*\{[\s\S]*?\};/,
    `const MONTH_CHECKS = ${JSON.stringify(monthChecks)};`
  );

  html = html.replace(
    /const TACTIC_CHECKS\s*=\s*\{[\s\S]*?\};/,
    `const TACTIC_CHECKS = ${JSON.stringify(tacticChecks)};`
  );

  // ─────────────────────────────────────────────────────────────────────────
  // JAVASCRIPT CONFIGURATION OBJECTS
  // Build WEEK_TITLES, WEEK_TACTICS, and PHASES for dashboard JS
  // ─────────────────────────────────────────────────────────────────────────
  const weekTitles = {};
  const weekTactics = {};
  data.roadmap.weeks.forEach(w => {
    weekTitles[w.number] = w.title;
    weekTactics[w.number] = getTacticForWeek(w.number);
  });

  const phasesObj = {
    1: phases[0].name,
    2: phases[1].name,
    3: phases[2].name
  };

  // Replace JS configuration placeholders
  html = html.replace(/\/\* \{\{WEEK_TITLES\}\} \*\//, JSON.stringify(weekTitles));
  html = html.replace(/\/\* \{\{WEEK_TACTICS\}\} \*\//, JSON.stringify(weekTactics));
  html = html.replace(/\/\* \{\{PHASES\}\} \*\//, JSON.stringify(phasesObj));

  // ─────────────────────────────────────────────────────────────────────────
  // POST-PROCESSING VALIDATION
  // Check for any remaining unfilled placeholders and warn
  // ─────────────────────────────────────────────────────────────────────────
  const remainingPlaceholders = html.match(/\{\{[A-Z_0-9]+\}\}/g) || [];
  if (remainingPlaceholders.length > 0) {
    const unique = [...new Set(remainingPlaceholders)];
    console.warn(`[create-project] WARNING: ${unique.length} unfilled placeholder types detected:`, unique.slice(0, 15).join(', '));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CLEANUP FALLBACK
  // Remove any remaining placeholders to prevent raw {{PLACEHOLDER}} in output
  // ─────────────────────────────────────────────────────────────────────────
  html = html.replace(/\{\{[A-Z_0-9]+\}\}/g, '');

  return html;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAN.JSON GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

function generatePlanJson(clientName, slug, coachEmail, planData) {
  return {
    client_name: clientName,
    client_slug: slug,
    goal: planData.goal,
    coach_email: coachEmail,
    weeks: planData.roadmap.weeks.map(week => ({
      week: week.number,
      month: Math.ceil(week.number / 4),
      title: `Week ${week.number}: ${week.title}`,
      actions: week.actions.map(stripMarkdown),
      checklist: week.checklist.map(stripMarkdown),
      deep_link: `https://accelerator.elearningu.com/${slug}/#week-${week.number}`
    }))
  };
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
  const branch = process.env.GITHUB_BRANCH || 'main';

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

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function formatDateLong(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // Bold
    .replace(/\*(.+?)\*/g, '$1')       // Italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links
    .replace(/`(.+?)`/g, '$1')         // Code
    .trim();
}

function getTacticWeeks(tacticNum) {
  // Tactic 1: Weeks 1-4, Tactic 2: Weeks 5-8, Tactic 3: Weeks 9-12
  const start = (tacticNum - 1) * 4 + 1;
  return [start, start + 1, start + 2, start + 3];
}

function getTacticForWeek(weekNum) {
  if (weekNum <= 4) return 1;
  if (weekNum <= 8) return 2;
  return 3;
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function shortenPartTitle(partTitle) {
  // Convert long "Part A: Section Name" titles to short 2-4 word breakdown titles
  // Examples:
  // "Decide and Create" -> "Decide & Create"
  // "Complete Each Listing" -> "Complete Listings"
  // "Posts, Reviews, and the Weekly Routine" -> "Posts & Reviews"
  // "Build the Pages That Do the Work" -> "Build Key Pages"

  if (!partTitle) return '';

  // Remove common filler words and simplify
  let short = partTitle
    .replace(/\band\b/gi, '&')
    .replace(/\bthe\b/gi, '')
    .replace(/\beach\b/gi, '')
    .replace(/\bthat\b/gi, '')
    .replace(/\bdo\b/gi, '')
    .replace(/\bwork\b/gi, '')
    .replace(/,\s*/g, ' & ')
    .replace(/\s+/g, ' ')
    .trim();

  // Clean up dangling articles and prepositions at the end
  short = short.replace(/\s+(of|for|to|in|on|at|&)\s*$/i, '');

  // If still too long (more than 4 words), take first 3 words
  const words = short.split(' ').filter(w => w.length > 0);
  if (words.length > 4) {
    // Try to find a natural break point
    short = words.slice(0, 3).join(' ');
    // Clean up if ends with &
    short = short.replace(/\s*&\s*$/, '');
  }

  // If result is too short or awkward, use original trimmed to 4 words
  if (short.length < 4) {
    const origWords = partTitle.split(' ').slice(0, 4);
    short = origWords.join(' ');
  }

  return short;
}

function estimateTimeCommitment(tactic) {
  // Estimate time commitment based on number of steps and bullets
  const totalSteps = tactic.implementationSteps?.length || 0;
  const totalBullets = tactic.implementationSteps?.reduce((sum, step) => sum + (step.bullets?.length || 0), 0) || 0;

  // Rough heuristic: ~15 min per step, ~5 min per bullet
  const totalMinutes = (totalSteps * 15) + (totalBullets * 5);

  if (totalMinutes <= 60) {
    return { value: '30-60 min', context: 'per week' };
  } else if (totalMinutes <= 120) {
    return { value: '1-2 hrs', context: 'per week' };
  } else if (totalMinutes <= 180) {
    return { value: '2-3 hrs', context: 'per week' };
  } else {
    return { value: '3-4 hrs', context: 'per week' };
  }
}

function generateImplementationStepsHtml(steps, tacticNum) {
  if (!steps || steps.length === 0) return '<p>Implementation steps will be added.</p>';

  let html = '';
  let currentPart = '';
  let bulletNum = 1;

  for (const step of steps) {
    // Add part header if it changes
    if (step.partLabel && step.partLabel !== currentPart) {
      currentPart = step.partLabel;
      html += `<div class="tactic-part-header">${escapeHtml(currentPart)}</div>\n`;
    }

    html += `<li class="step-item" id="step-t${tacticNum}-${step.number}">\n`;
    html += `  <div class="step-num">${step.number}</div>\n`;
    html += `  <div class="tactic-step-content">\n`;
    html += `    <div class="tactic-step-title" data-editable-key="tactic-${tacticNum}-step-${step.number}-title">${escapeHtml(step.title)}</div>\n`;

    if (step.bullets && step.bullets.length > 0) {
      html += `    <ul class="tactic-step-bullets">\n`;
      for (const bullet of step.bullets) {
        html += `      <li data-editable-key="t${tacticNum}-bullet-${bulletNum}">${escapeHtml(stripMarkdown(bullet))}</li>\n`;
        bulletNum++;
      }
      html += `    </ul>\n`;
    }

    html += `  </div>\n`;
    html += `</li>\n`;
  }

  return `<ol class="tactic-steps-list">\n${html}</ol>`;
}

function generateMetricsRowsHtml(metrics) {
  if (!metrics || metrics.length === 0) return '<tr><td colspan="4">Metrics will be added.</td></tr>';

  return metrics.map(m =>
    `<tr>
      <td>${escapeHtml(m.metric)}</td>
      <td>${escapeHtml(m.day30)}</td>
      <td>${escapeHtml(m.day60)}</td>
      <td>${escapeHtml(m.day90)}</td>
    </tr>`
  ).join('\n');
}

function generateTipsHtml(tips, tacticNum) {
  if (!tips || tips.length === 0) return '<li>Tips will be added.</li>';

  return tips.map((tip, idx) =>
    `<li data-editable-key="t${tacticNum}-tip-${idx + 1}">${escapeHtml(tip)}</li>`
  ).join('\n');
}

function generateResourcesHtml(resources, tacticNum) {
  if (!resources || resources.length === 0) return '<li>Resources will be added.</li>';

  return resources.map((r, idx) =>
    `<li><a href="${escapeHtml(r.url)}" data-editable-link="t${tacticNum}-resource-${idx + 1}" target="_blank">${escapeHtml(r.title)}</a>${r.description ? ': ' + escapeHtml(r.description) : ''}</li>`
  ).join('\n');
}

function generateWeekCardHtml(week) {
  const checklistCount = week.checklist.length;

  let actionsHtml = '';
  for (let i = 0; i < week.actions.length; i++) {
    const action = stripMarkdown(week.actions[i]);
    // Check for "links to" annotation
    const linkMatch = action.match(/→ links to: Tactic (\d+) \/ Step (\d+)/);
    let actionText = action.replace(/→ links to:.*$/, '').trim();
    let howtoBtn = '';
    if (linkMatch) {
      howtoBtn = ` <button class="howto-link" onclick="howToLink('tactic${linkMatch[1]}','step-t${linkMatch[1]}-${linkMatch[2]}')">how to</button>`;
    }
    actionsHtml += `<li class="week-task-item"><div class="week-task-dot"></div><span class="week-task-text" data-editable-key="week-${week.number}-action-${i + 1}">${escapeHtml(actionText)}</span>${howtoBtn}</li>\n`;
  }

  let checklistHtml = '';
  for (let i = 0; i < week.checklist.length; i++) {
    const item = stripMarkdown(week.checklist[i]);
    const checkId = `week-${week.number}-check-${i + 1}`;
    checklistHtml += `<div class="check-row">
      <input type="checkbox" class="check-input" id="${checkId}" data-key="${checkId}" onchange="onCheck(this)">
      <label class="check-label" for="${checkId}" data-editable-key="${checkId}-label">${escapeHtml(item)}</label>
    </div>\n`;
  }

  return `<div class="week-card" id="wc-${week.number}" data-week="${week.number}">
  <div class="week-card-header" onclick="toggleWeek(${week.number})">
    <div class="week-num">W${week.number}</div>
    <div class="week-title" data-editable-key="week-${week.number}-title">${escapeHtml(week.title)}</div>
    <div class="week-progress-pill" id="wp-${week.number}">0 / ${checklistCount}</div>
    <svg class="week-chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
  </div>
  <div class="week-card-body">
    <div class="week-cols">
      <div>
        <div class="week-col-label">This Week's Actions</div>
        <ul class="week-tasks-list">
          ${actionsHtml}
        </ul>
      </div>
      <div>
        <div class="week-col-label">Completion Checklist</div>
        <div class="check-list">
          ${checklistHtml}
        </div>
      </div>
    </div>
    <div class="week-note-section"><div class="week-note-label">Week Notes</div><textarea class="note-textarea" id="note-week-${week.number}" placeholder="Add general notes for this week…" oninput="saveNote('week_${week.number}',this.value)" style="width:100%"></textarea></div>
  </div>
</div>`;
}

function generateQuickWinsHtml(content) {
  if (!content) return '';

  // Parse the markdown content into HTML
  let html = '';
  const sections = content.split(/### /);

  for (const section of sections) {
    if (!section.trim()) continue;

    const lines = section.split('\n');
    const title = lines[0].trim();
    const items = lines.slice(1).filter(l => l.trim().startsWith('-'));

    html += `<div class="quick-wins-section card" style="margin-bottom:20px">\n`;
    html += `  <div class="card-header"><h3 class="card-title">${escapeHtml(title)}</h3></div>\n`;
    html += `  <div class="card-body">\n`;
    html += `    <ul class="quick-wins-list" style="list-style:none;padding:0">\n`;

    let qwIndex = 1;
    for (const item of items) {
      const text = item.replace(/^-\s*/, '').trim();
      // Parse bold title and description
      const boldMatch = text.match(/^\*\*(.+?)\*\*\.?\s*(.*)/);
      if (boldMatch) {
        html += `      <li style="margin-bottom:16px"><strong>${escapeHtml(boldMatch[1])}</strong> ${escapeHtml(boldMatch[2])}</li>\n`;
      } else {
        html += `      <li style="margin-bottom:16px" data-editable-key="qw-${qwIndex}-label">${escapeHtml(text)}</li>\n`;
      }
      qwIndex++;
    }

    html += `    </ul>\n`;
    html += `  </div>\n`;
    html += `</div>\n`;
  }

  return html;
}
