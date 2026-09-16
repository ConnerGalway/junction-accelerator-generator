// Netlify Function: Create Experience Project
// Processes a plan.md file (experience format), generates experience dashboard, commits to GitHub

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
    const checkUrl = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/experience/${slug}`;
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
    const templateUrl = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/template/experience-template.html`;
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
      assessmentDate,
      ...planData
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 6. GENERATE PLAN.JSON
    // ─────────────────────────────────────────────────────────────────────────
    const planJson = generatePlanJson(clientName, slug, coachEmail, planData);

    // ─────────────────────────────────────────────────────────────────────────
    // 7. COMMIT TO GITHUB (3 files in single commit)
    // ─────────────────────────────────────────────────────────────────────────
    const commitMessage = `Add experience project: ${clientName}`;

    const commitResult = await commitToGitHub([
      { path: `experience/${slug}/plan.md`, content: planMd },
      { path: `experience/${slug}/index.html`, content: processedHtml },
      { path: `experience/${slug}/plan.json`, content: JSON.stringify(planJson, null, 2) }
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
    // 9. SUCCESS
    // ─────────────────────────────────────────────────────────────────────────
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        slug,
        projectUrl: `/experience/${slug}/`,
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
// PLAN.MD PARSER (Experience Format)
// ═══════════════════════════════════════════════════════════════════════════

function parsePlanMd(content) {
  try {
    const result = {
      meta: {},
      goal: '',
      experienceSentence: '',
      strategicPositioning: '',
      welcomeMessage: '',
      objectives: [],
      tactics: [],
      roadmap: { monthNames: [], weeks: [] },
      hasBookabilityChecklist: false,
      pricePoint: null,
      launchTarget: null
    };

    // Extract Meta section
    const metaMatch = content.match(/## Meta\n([\s\S]*?)(?=\n## )/);
    if (metaMatch) {
      const meta = metaMatch[1];
      const slugMatch = meta.match(/Client Slug:\s*(.+)/);
      const priceMatch = meta.match(/Price Point:\s*(.+)/);
      const launchMatch = meta.match(/Launch Target:\s*(.+)/);
      const bookabilityMatch = meta.match(/Has Bookability Checklist:\s*(.+)/);

      if (slugMatch) result.meta.clientSlug = slugMatch[1].trim();
      if (priceMatch) result.pricePoint = priceMatch[1].trim();
      if (launchMatch) result.launchTarget = launchMatch[1].trim();
      if (bookabilityMatch) result.hasBookabilityChecklist = bookabilityMatch[1].trim().toLowerCase() === 'yes';
    }

    // Extract Goal
    const goalMatch = content.match(/## Goal\n([\s\S]*?)(?=\n---|\n## )/);
    if (goalMatch) {
      result.goal = goalMatch[1].trim();
    } else {
      return { error: 'Missing "## Goal" section' };
    }

    // Extract The Experience (experience-specific)
    const experienceMatch = content.match(/## The Experience\n([\s\S]*?)(?=\n---|\n## )/);
    if (experienceMatch) {
      result.experienceSentence = experienceMatch[1].trim();
    }

    // Extract Strategic Positioning
    const posMatch = content.match(/## Strategic Positioning\n([\s\S]*?)(?=\n---|\n## )/);
    if (posMatch) {
      result.strategicPositioning = posMatch[1].trim();
    }

    // Extract Welcome Message
    const welcomeMatch = content.match(/## Welcome Message\n([\s\S]*?)(?=\n---|\n## )/);
    if (welcomeMatch) {
      result.welcomeMessage = welcomeMatch[1].trim();
    }

    // Extract Objectives (note: Track Pill instead of Tactic Pill)
    const objectivesMatch = content.match(/## Objectives\n([\s\S]*?)(?=\n---|\n## Launch Roadmap)/);
    if (objectivesMatch) {
      const objContent = objectivesMatch[1];
      const objMatches = objContent.matchAll(/### Objective (\d+)\nTitle:\s*(.+)\nDescription:\s*(.+)\nTrack Pill:\s*(.+)/g);
      for (const match of objMatches) {
        result.objectives.push({
          number: parseInt(match[1]),
          title: match[2].trim(),
          description: match[3].trim(),
          tacticPill: match[4].trim()  // Still called tacticPill in the data structure for template compatibility
        });
      }
    }

    // Extract Tracks (note: "## Track" instead of "## Tactic")
    const trackMatches = content.matchAll(/## Track (\d+):\s*(.+)\nPhase:\s*(.+)\nShort Label:\s*(.+)\nSubtitle:\s*(.+)/g);
    for (const match of trackMatches) {
      result.tactics.push({
        number: parseInt(match[1]),
        title: match[2].trim(),
        phase: match[3].trim(),
        shortLabel: match[4].trim(),
        subtitle: match[5].trim()
      });
    }

    if (result.tactics.length < 3) {
      return { error: 'Plan must have 3 tracks' };
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

    // Extract Weeks (note: lookahead uses "## Bookability" instead of "## GBP")
    const weekMatches = content.matchAll(/### Week (\d+):\s*(.+)\n\*\*Actions:\*\*\n([\s\S]*?)\*\*Checklist:\*\*\n([\s\S]*?)(?=### Week \d+|## Bookability|$)/g);
    for (const match of weekMatches) {
      const actions = match[3].trim().split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim());

      const checklist = match[4].trim().split('\n')
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
  // SIMPLE PLACEHOLDER REPLACEMENTS
  // ─────────────────────────────────────────────────────────────────────────
  const placeholders = {
    '{{CLIENT_NAME}}': data.clientName,
    '{{CLIENT_SLUG}}': data.slug,
    '{{PAGE_SUBTITLE}}': data.goal.slice(0, 100) + '...',
    '{{GOAL_TEXT}}': data.goal,
    '{{WM_SUBLINE}}': data.welcomeMessage || data.goal.slice(0, 150),
    '{{STRATEGIC_POSITIONING}}': data.strategicPositioning,
    '{{EXPERIENCE_SENTENCE}}': data.experienceSentence || '',
    '{{ASSESSMENT_DATE}}': formatDateLong(data.assessmentDate),
    '{{COHORT_START_DATE}}': '',  // Empty - operator sets this themselves
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

  // Tactics (called tracks in plan, but tactic in template)
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
  // CONDITIONAL BLOCKS (Experience-specific markers)
  // ─────────────────────────────────────────────────────────────────────────

  // Handle IF:PRICE_POINT
  if (data.pricePoint) {
    html = html.replace(/<!-- IF:PRICE_POINT -->/g, '');
    html = html.replace(/<!-- \/IF:PRICE_POINT -->/g, '');
    html = html.replace(/\{\{PRICE_POINT\}\}/g, data.pricePoint);
  } else {
    html = html.replace(/<!-- IF:PRICE_POINT -->[\s\S]*?<!-- \/IF:PRICE_POINT -->/g, '');
  }

  // Handle IF:LAUNCH_TARGET
  if (data.launchTarget) {
    html = html.replace(/<!-- IF:LAUNCH_TARGET -->/g, '');
    html = html.replace(/<!-- \/IF:LAUNCH_TARGET -->/g, '');
    const [title, desc] = data.launchTarget.split('·').map(s => s.trim());
    html = html.replace(/\{\{LAUNCH_TARGET_TITLE\}\}/g, title || '');
    html = html.replace(/\{\{LAUNCH_TARGET_DESC\}\}/g, desc || '');
  } else {
    html = html.replace(/<!-- IF:LAUNCH_TARGET -->[\s\S]*?<!-- \/IF:LAUNCH_TARGET -->/g, '');
  }

  // Handle IF:BOOKABILITY_CHECKLIST
  if (!data.hasBookabilityChecklist) {
    html = html.replace(/<!-- IF:BOOKABILITY_CHECKLIST -->[\s\S]*?<!-- \/IF:BOOKABILITY_CHECKLIST -->/g, '');
  } else {
    html = html.replace(/<!-- IF:BOOKABILITY_CHECKLIST -->/g, '');
    html = html.replace(/<!-- \/IF:BOOKABILITY_CHECKLIST -->/g, '');
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
      deep_link: `https://experience.elearningu.com/${slug}/#week-${week.number}`
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
  // Track 1: Weeks 1-4, Track 2: Weeks 5-8, Track 3: Weeks 9-12
  const start = (tacticNum - 1) * 4 + 1;
  return [start, start + 1, start + 2, start + 3];
}

function getTacticForWeek(weekNum) {
  if (weekNum <= 4) return 1;
  if (weekNum <= 8) return 2;
  return 3;
}
