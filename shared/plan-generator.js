/**
 * Accelerator plan generator: the single source of truth for turning a
 * plan.md file into a client dashboard (index.html) and plan.json.
 *
 * Used by:
 *   - netlify/functions/create-project.js  (the "Add Plan" upload)
 *   - scripts/regenerate-dashboards.js     (local regeneration)
 *   - tests/plan-generator.test.js
 *
 * This module is pure: no network, no filesystem, no environment variables.
 * Do not copy these functions into other files. Import them.
 */

// ═══════════════════════════════════════════════════════════════════════════
// PLAN.MD PARSER
// ═══════════════════════════════════════════════════════════════════════════

function parsePlanMd(rawContent) {
  try {
    // Tolerate common formatting variations before parsing
    const content = normalisePlanMd(rawContent);
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

    // Extract Objectives. Fields are read by label, so their order and the
    // blank lines between them do not matter.
    const objectivesMatch = content.match(/(?:^|\n)## Objectives[ \t]*\n([\s\S]*?)(?=\n## |$)/);
    if (objectivesMatch) {
      const blocks = objectivesMatch[1].split(/\n(?=### Objective \d+)/).filter(block => /^\s*### Objective \d+/.test(block));
      for (const block of blocks) {
        const fields = readFields(block, ['Title', 'Description', 'Tactic Pill']);
        result.objectives.push({
          number: parseInt(block.match(/### Objective (\d+)/)[1]),
          title: fields['Title'],
          description: fields['Description'],
          tacticPill: fields['Tactic Pill']
        });
      }
    }

    // Extract Tactics with full content
    const tacticSections = content.split(/(?=## Tactic \d+:)/g).filter(s => s.startsWith('## Tactic'));

    for (const section of tacticSections) {
      // Header: the title comes from the heading line; Phase, Short Label and
      // Subtitle are read by label, so their order and spacing do not matter.
      const titleMatch = section.match(/^## Tactic (\d+):[ \t]*(.*)$/m);
      if (!titleMatch) continue;
      const headerFields = readFields(section.split(/\n###\s/)[0], ['Phase', 'Short Label', 'Subtitle']);

      const tactic = {
        number: parseInt(titleMatch[1]),
        title: titleMatch[2].trim(),
        phase: headerFields['Phase'],
        shortLabel: headerFields['Short Label'],
        subtitle: headerFields['Subtitle'],
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
          // A step is "N. **Title**" (or "**N. Title**"), optionally followed by a
          // note on the same line, e.g.
          //   3. **Track the booking path.** *(contractor task, $800)*
          // The trailing note must not stop the step from being recognised.
          const stepMatches = part.matchAll(/(?:^|\n)[ \t]*(?:\d+\.\s+\*\*(.+?)\*\*|\*\*\d+\.\s+(.+?)\*\*)([^\n]*)(?:\n|$)([\s\S]*?)(?=\n[ \t]*(?:\d+\.\s|\*\*\d+\.\s)|$)/g);

          // Collect first step title as breakdown description
          let firstStepTitle = '';

          for (const step of stepMatches) {
            const boldTitle = (step[1] || step[2]).trim();
            const titleNote = stripMarkdown(step[3] || '');
            const stepTitle = titleNote ? `${boldTitle} ${titleNote}` : boldTitle;
            const bullets = step[4].trim().split('\n')
              .filter(line => isListItem(line))
              .map(line => line.replace(/^\s*-\s*/, '').trim());

            if (!firstStepTitle) {
              firstStepTitle = stepTitle;
            }

            tactic.implementationSteps.push({
              number: stepNum++,
              partLabel: partTitle,
              title: stepTitle,
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

      // Extract Success Metrics table (more forgiving regex)
      // Pattern: ### Success Metrics, then header row, then separator row, then data rows
      const metricsMatch = section.match(/### Success Metrics[\r\n]+\|[^\n]+\|[\r\n]+\|[-|\s]+\|[\r\n]+([\s\S]*?)(?=[\r\n]+### |$)/);
      if (metricsMatch) {
        const rows = metricsMatch[1].trim().split(/[\r\n]+/).filter(r => r.startsWith('|'));
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
          .filter(line => isListItem(line))
          .map(line => line.replace(/^-\s*/, '').trim());
      }

      // Extract Resources (more forgiving regex)
      const resourcesMatch = section.match(/### Resources[\r\n]+([\s\S]*?)(?=[\r\n]+---|\n## |$)/);
      if (resourcesMatch) {
        const resourceLines = resourcesMatch[1].trim().split('\n')
          .filter(line => isListItem(line));

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
    const weekMatchesIter = content.matchAll(/### Week (\d+):\s*(.+?)[\r\n]+\*\*Actions:\*\*[\r\n]+([\s\S]*?)\*\*Checklist:\*\*[\r\n]+([\s\S]*?)(?=\n### Week \d+|\n## |$)/g);
    for (const match of weekMatchesIter) {
      const actions = match[3].trim().split(/[\r\n]+/)
        .filter(line => isListItem(line))
        .map(line => line.replace(/^-\s*/, '').trim());

      const checklist = match[4].trim().split(/[\r\n]+/)
        .filter(line => isListItem(line))
        .map(line => line.replace(/^\s*-\s*(?:\[.\]\s*)?/, '').replace(/\s*→ links to:.*$/, '').trim());

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
      const gbpMatch = content.match(/(?:^|\n)## (?:GBP )?Quick Wins[ \t]*\n+([\s\S]*?)(?=\n## |$)/);
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

function renderDashboard(template, data) {
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
    '{{CLIENT_NAME}}': escapeHtml(data.clientName),
    '{{CLIENT_SLUG}}': data.slug,
    '{{PAGE_SUBTITLE}}': escapeHtml(stripMarkdown(data.goal).slice(0, 100) + '...'),
    '{{GOAL_TEXT}}': richText(data.goal),
    '{{WM_SUBLINE}}': richText(data.welcomeMessage || data.goal.slice(0, 150)),
    '{{STRATEGIC_POSITIONING}}': richText(data.strategicPositioning),
    '{{ASSESSMENT_DATE}}': formatDateLong(data.onboardingCallDate),
    '{{COHORT_START_DATE}}': formatDateLong(data.onboardingCallDate),
    '{{ONBOARDING_CALL_DATE}}': formatDateLong(data.onboardingCallDate),
    '{{COACH_EMAIL}}': escapeHtml(data.coachEmail),
    '{{MONTH_1_NAME}}': plainText(data.roadmap.monthNames[0]),
    '{{MONTH_2_NAME}}': plainText(data.roadmap.monthNames[1]),
    '{{MONTH_3_NAME}}': plainText(data.roadmap.monthNames[2])
  };

  // Calculate total tasks
  let totalTasks = 0;
  data.roadmap.weeks.forEach(w => {
    totalTasks += w.checklist.length;
  });
  placeholders['{{TOTAL_TASKS}}'] = totalTasks.toString();

  // Which tactic each roadmap week and checklist item belongs to
  const tacticMap = mapRoadmapToTactics(data);

  // Objectives (a 4th is filled when the plan has 4 tactics)
  const slotCount = Math.max(3, Math.min(data.tactics.length, 4));
  for (let i = 0; i < slotCount; i++) {
    const obj = data.objectives[i] || { title: '', description: '', tacticPill: '' };
    placeholders[`{{OBJECTIVE_${i + 1}_TITLE}}`] = plainText(obj.title);
    placeholders[`{{OBJECTIVE_${i + 1}_DESC}}`] = inlineMarkdown(obj.description);
    placeholders[`{{OBJECTIVE_${i + 1}_TACTIC_PILL}}`] = plainText(obj.tacticPill);
  }

  // Tactics
  for (let i = 0; i < slotCount; i++) {
    const tactic = data.tactics[i] || { title: '', shortLabel: '', phase: '', subtitle: '' };
    placeholders[`{{TACTIC_${i + 1}_TITLE}}`] = plainText(tactic.title);
    placeholders[`{{TACTIC_${i + 1}_NAV_LABEL}}`] = plainText(tactic.shortLabel);
    placeholders[`{{TACTIC_${i + 1}_PHASE}}`] = plainText(tactic.phase);
    placeholders[`{{TACTIC_${i + 1}_SUBTITLE}}`] = inlineMarkdown(tactic.subtitle);

    // Checklist items attributed to this tactic (see mapRoadmapToTactics)
    placeholders[`{{TACTIC_${i + 1}_TOTAL}}`] = (tacticMap.checksByTactic[i + 1] || []).length.toString();
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

  // Handle IF:PROJECTIONS. The projections block in the template holds one
  // sample client's figures and the plan format has no fields to replace
  // them, so it is always left out here. A plan with "Has Projections: yes"
  // gets a warning from the validator; projections are added by hand.
  html = html.replace(/<!-- IF:PROJECTIONS -->[\s\S]*?<!-- ENDIF:PROJECTIONS -->/g, '');
  // No projection figures either: the scenarios object stays empty
  html = html.replace(/\/\* \{\{SCENARIOS\}\} \*\//, '');

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
    html = html.replace(/\{\{TACTIC_4_BREAKDOWN_ITEMS\}\}/g, '');
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
    html = html.split(`{{TACTIC_${n}_HEARD}}`).join(richText(tactic.whatHeard));
    html = html.split(`{{TACTIC_${n}_WHAT_IS}}`).join(richText(tactic.whatIs));
    html = html.split(`{{TACTIC_${n}_MATTERS}}`).join(richText(tactic.whyMatters));

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

    // "What This Breaks Into": one card per Part in the plan, however many
    // there are. An odd last card spans the full width of the two-column grid.
    const breakdownItems = tactic.breakdowns.map((breakdown, idx) => {
      const fullWidth = tactic.breakdowns.length % 2 === 1 && idx === tactic.breakdowns.length - 1;
      return `<div class="tactic-breakdown-item${fullWidth ? ' full-width' : ''}">
              <div class="tactic-breakdown-title" data-editable-key="t${n}-breakdown-${idx + 1}-title">${plainText(breakdown.title)}</div>
              <div class="tactic-breakdown-desc" data-editable-key="t${n}-breakdown-${idx + 1}-desc">${plainText(breakdown.description)}</div>
            </div>`;
    }).join('\n            ');
    html = html.split(`{{TACTIC_${n}_BREAKDOWN_ITEMS}}`).join(breakdownItems);

    // Older copies of the template have a fixed number of breakdown slots
    for (let m = 1; m <= 4; m++) {
      const breakdown = tactic.breakdowns[m - 1] || { title: '', description: '' };
      html = html.split(`{{T${n}_BREAKDOWN_${m}_TITLE}}`).join(plainText(breakdown.title));
      html = html.split(`{{T${n}_BREAKDOWN_${m}_DESC}}`).join(plainText(breakdown.description));
    }

    // Time commitment placeholders (derived from step count)
    const timeCommitment = estimateTimeCommitment(tactic);
    html = html.split(`{{TACTIC_${n}_TIME_VALUE}}`).join(timeCommitment.value);
    html = html.split(`{{TACTIC_${n}_TIME_CONTEXT}}`).join(timeCommitment.context);
  }

  // The template has a fixed number of breakdown cards per tactic. When a
  // tactic has fewer Parts than cards, drop the empty cards instead of
  // leaving blank boxes on the Overview tab.
  html = html.replace(
    /[ \t]*<div class="tactic-breakdown-item[^"]*">\s*<div class="tactic-breakdown-title"[^>]*><\/div>\s*<div class="tactic-breakdown-desc"[^>]*><\/div>\s*<\/div>\n?/g,
    ''
  );

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
  html = html.split('{{WEEK_1_SHORT_TITLE}}').join(plainText(week1?.title || 'Get Started'));
  html = html.split('{{WEEK_1_HEADLINE}}').join(plainText(week1?.actions[0] ? week1.actions[0].replace(/→ links to:.*$/, '') : 'Begin your 90-day journey'));
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
    const hasQuickWinsPage = !!(data.hasGbpQuickWins && data.gbpQuickWinsContent);
    const monthWeeksHtml = monthWeeks.map(w => generateWeekCardHtml(w, { hasQuickWinsPage })).join('\n');
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

  // ─────────────────────────────────────────────────────────────────────────
  // ASSESSMENT PAGE
  // Filled from the client's assessment record (data.assessment) when there
  // is one. Without it the page shows neutral placeholders.
  // ─────────────────────────────────────────────────────────────────────────
  const assessmentFields = buildAssessmentFields(data.assessment);
  for (const [name, value] of Object.entries(assessmentFields)) {
    html = html.split(`{{${name}}}`).join(value);
  }
  html = html.split('{{PROJECTIONS_NOTE}}').join('');
  html = html.split('{{PRINT_SUMMARY_STATS}}').join('');

  // ─────────────────────────────────────────────────────────────────────────
  // BUILD JAVASCRIPT ARRAYS
  // ─────────────────────────────────────────────────────────────────────────
  const allCheckIds = [];
  const weekChecks = {};
  const monthChecks = { 1: [], 2: [], 3: [] };
  const tacticChecks = tacticMap.checksByTactic;

  data.roadmap.weeks.forEach(week => {
    weekChecks[week.number] = [];
    const month = Math.ceil(week.number / 4);

    week.checklist.forEach((_, idx) => {
      const id = `week-${week.number}-check-${idx + 1}`;
      allCheckIds.push(id);
      weekChecks[week.number].push(id);
      monthChecks[month].push(id);
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
    // Template reads WEEK_TACTICS[week].num and .name
    const tacticNum = tacticMap.primaryByWeek[w.number];
    const tactic = data.tactics[tacticNum - 1];
    weekTactics[w.number] = { num: tacticNum, name: tactic?.shortLabel || tactic?.title || 'Tactic' };
  });

  // Template iterates PHASES and reads .num, .weeks (array) and .name
  const phasesObj = phases.map((phase, idx) => ({
    num: idx + 1,
    weeks: [1, 2, 3, 4].map(n => idx * 4 + n),
    name: phase.name
  }));

  // Replace JS configuration placeholders
  // Template format: const WEEK_TITLES = { /* {{WEEK_TITLES}} */ };
  //                  const PHASES = [ /* {{PHASES}} */ ];
  // Must replace the entire { placeholder } or [ placeholder ] block
  html = html.replace(/\{\s*\/\* \{\{WEEK_TITLES\}\} \*\/\s*\}/, JSON.stringify(weekTitles));
  html = html.replace(/\{\s*\/\* \{\{WEEK_TACTICS\}\} \*\/\s*\}/, JSON.stringify(weekTactics));
  html = html.replace(/\[\s*\/\* \{\{PHASES\}\} \*\/\s*\]/, JSON.stringify(phasesObj));

  // ─────────────────────────────────────────────────────────────────────────
  // POST-PROCESSING REPORT
  // Record anything the template still expected, then strip it so raw
  // {{PLACEHOLDER}} text never reaches a client page. Callers decide what to
  // do with the report (see renderDashboard).
  // ─────────────────────────────────────────────────────────────────────────
  const unfilledPlaceholders = [...new Set(html.match(/\{\{[A-Z_0-9]+\}\}/g) || [])];
  if (unfilledPlaceholders.length > 0) {
    console.warn(`[plan-generator] WARNING: ${unfilledPlaceholders.length} unfilled placeholder types:`, unfilledPlaceholders.slice(0, 15).join(', '));
  }
  html = html.replace(/\{\{[A-Z_0-9]+\}\}/g, '');

  return { html, unfilledPlaceholders };
}

/**
 * Backwards-compatible wrapper: returns only the HTML string.
 */
function processTemplate(template, data) {
  return renderDashboard(template, data).html;
}

// ═══════════════════════════════════════════════════════════════════════════
// ASSESSMENT PAGE CONTENT
// Turns a client's assessment record (the assessment_data JSON stored in
// Supabase, the same data the assessment-only page shows) into the HTML for
// the Assessment page placeholders.
// ═══════════════════════════════════════════════════════════════════════════

const ASSESSMENT_CATEGORIES = [
  { key: 'website_technical', title: 'Website & Technical', iconClass: 'website', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' },
  { key: 'reviews_reputation', title: 'Reviews & Reputation', iconClass: 'reviews', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
  { key: 'booking_conversion', title: 'Online Booking & Conversion', iconClass: 'booking', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
  { key: 'social_media', title: 'Social Media & Content', iconClass: 'social', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>' },
  { key: 'guest_experience', title: 'Digital Guest Experience', iconClass: 'experience', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
  { key: 'local_visibility', title: 'Local Visibility', iconClass: 'local', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' }
];

const FINDING_ICONS = {
  positive: '<svg class="finding-icon positive" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
  negative: '<svg class="finding-icon negative" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>'
};

function gradeClass(grade) {
  const letter = String(grade || '').trim().charAt(0).toLowerCase();
  return 'abcdf'.includes(letter) && letter ? `grade-${letter}` : '';
}

// True when the record has real assessment content, not an empty object
function hasAssessmentContent(assessment) {
  return !!(assessment && assessment.overall && assessment.categories && Object.keys(assessment.categories).length > 0);
}

function buildAssessmentFields(assessment) {
  const fields = {};

  if (!hasAssessmentContent(assessment)) {
    fields.OVERALL_SCORE = '--';
    fields.OVERALL_GRADE = '--';
    fields.ASSESSMENT_SUMMARY = 'Assessment data will be populated when available.';
    ['EXECUTIVE_HEADLINE', 'KEY_STRENGTHS', 'CRITICAL_GAPS', 'BOTTOM_LINE', 'QUICK_WINS_CARDS', 'PRIORITY_RECOMMENDATIONS', 'CATEGORY_CARDS']
      .forEach(name => { fields[name] = ''; });
    for (let n = 1; n <= 6; n++) {
      fields[`CATEGORY_${n}_SCORE`] = '--';
      fields[`CATEGORY_${n}_GRADE`] = '--';
      fields[`CATEGORY_${n}_GRADE_CLASS`] = '';
    }
    return fields;
  }

  const text = value => escapeHtml(value == null ? '' : String(value));
  const summary = assessment.executive_summary || {};
  const overall = assessment.overall || {};

  fields.OVERALL_SCORE = text(overall.score != null ? Math.round(Number(overall.score)) : '--');
  fields.OVERALL_GRADE = text(overall.grade || '--');
  fields.ASSESSMENT_SUMMARY = text(overall.summary || summary.headline || '');

  ASSESSMENT_CATEGORIES.forEach((category, i) => {
    const cat = assessment.categories[category.key] || {};
    fields[`CATEGORY_${i + 1}_SCORE`] = text(cat.score != null ? Math.round(Number(cat.score)) : '--');
    fields[`CATEGORY_${i + 1}_GRADE`] = text(cat.grade || '--');
    fields[`CATEGORY_${i + 1}_GRADE_CLASS`] = gradeClass(cat.grade);
  });

  fields.EXECUTIVE_HEADLINE = text(summary.headline);
  fields.KEY_STRENGTHS = (summary.key_strengths || [])
    .map((item, i) => `<li data-editable-key="strength-${i + 1}">${text(item)}</li>`).join('\n            ');
  fields.CRITICAL_GAPS = (summary.critical_gaps || [])
    .map((item, i) => `<li data-editable-key="gap-${i + 1}">${text(item)}</li>`).join('\n            ');
  fields.BOTTOM_LINE = `<span data-editable-key="assessment-bottom-line">${text(summary.bottom_line)}</span>`;

  fields.QUICK_WINS_CARDS = (assessment.quick_wins || []).slice(0, 6).map((win, i) => `<div class="quick-win-item">
          <div class="quick-win-number">${i + 1}</div>
          <div class="quick-win-content">
            <div class="quick-win-task" data-editable-key="assessment-qw-${i + 1}-label">${text(win.task)}</div>
            <div class="quick-win-impact" data-editable-key="assessment-qw-${i + 1}-impact">${text(win.impact)}</div>
          </div>
          <div class="quick-win-time">${text(win.time_estimate)}</div>
        </div>`).join('\n        ');

  fields.PRIORITY_RECOMMENDATIONS = (assessment.priority_recommendations || []).slice(0, 4).map((rec, i) => {
    const tags = [
      `<span class="priority-item-tag">${text(rec.category || 'General')}</span>`,
      rec.time_estimate ? `<span class="priority-item-tag time">${text(rec.time_estimate)}</span>` : '',
      rec.impact ? `<span class="priority-item-tag impact-${text(String(rec.impact).toLowerCase())}">${text(rec.impact)} Impact</span>` : ''
    ].filter(Boolean).join('\n              ');
    return `<div class="priority-item">
          <div class="priority-item-number">${i + 1}</div>
          <div class="priority-item-content">
            <h4 data-editable-key="priority-${i + 1}-text">${text(rec.text || rec.title)}</h4>
            <div class="priority-item-meta">
              ${tags}
            </div>
            ${rec.expected_result ? `<p class="priority-item-result" data-editable-key="priority-${i + 1}-result">${text(rec.expected_result)}</p>` : ''}
          </div>
        </div>`;
  }).join('\n        ');

  fields.CATEGORY_CARDS = ASSESSMENT_CATEGORIES.filter(category => assessment.categories[category.key]).map(category => {
    const cat = assessment.categories[category.key];
    const metrics = (cat.metrics || []).slice(0, 4).map(metric => {
      const status = ['good', 'warning', 'critical'].includes(metric.status) ? metric.status : 'good';
      return `<div class="metric-item">
                <div class="metric-label">${text(metric.label)}</div>
                <div class="metric-value"><span class="metric-status ${status}"></span>${text(metric.value)}</div>
              </div>`;
    }).join('\n              ');
    const findings = (cat.findings || []).slice(0, 4).map((finding, i) => `<div class="finding-item">
                ${finding.type === 'positive' ? FINDING_ICONS.positive : FINDING_ICONS.negative}
                <span data-editable-key="cat-${category.key}-finding-${i + 1}">${text(finding.text)}</span>
              </div>`).join('\n              ');

    return `<div class="category-card">
          <div class="category-header" onclick="this.parentElement.classList.toggle('open')">
            <div class="category-icon ${category.iconClass}">
              ${category.icon}
            </div>
            <div class="category-title-wrap">
              <h3 class="category-title">${text(category.title)}</h3>
              <span class="category-grade ${gradeClass(cat.grade)}">${text(cat.grade || 'N/A')}</span>
            </div>
            <svg class="category-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="category-body">
            <p class="category-summary" data-editable-key="cat-${category.key}-summary">${text(cat.summary)}</p>
            ${metrics ? `<div class="category-metrics">
              ${metrics}
            </div>` : ''}
            ${findings ? `<div class="category-findings">
              <h4>Key Findings</h4>
              ${findings}
            </div>` : ''}
          </div>
        </div>`;
  }).join('\n        ');

  return fields;
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
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tidy common formatting variations so they parse the same as the standard
 * format. Every change is confined to its own line, so line numbers in the
 * result match the uploaded file.
 */
function normalisePlanMd(content) {
  const FIELD_LABELS = 'Phase|Short Label|Subtitle|Title|Description|Tactic Pill|Track Pill|Client Slug|Grant Budget|Target Milestone|Has GBP Quick Wins|Has Projections|Price Point|Launch Target|Has Bookability Checklist|Month [123] Name';
  return String(content || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+$/gm, '')
    // "## Tactic #1 - Title", "## TACTIC 1 – Title" -> "## Tactic 1: Title"
    .replace(/^##[ \t]*(tactic|track)[ \t]*#?[ \t]*(\d+)[ \t]*[:\-–—][ \t]*/gim,
      (m, word, num) => `## ${word[0].toUpperCase()}${word.slice(1).toLowerCase()} ${num}: `)
    // "### Week 3 - Title" -> "### Week 3: Title"
    .replace(/^###[ \t]*week[ \t]*#?[ \t]*(\d+)[ \t]*[:\-–—][ \t]*/gim, '### Week $1: ')
    // "#### Part a - Title" -> "#### Part A: Title"
    .replace(/^####[ \t]*part[ \t]*([a-z])[ \t]*[:\-–—][ \t]*/gim, (m, letter) => `#### Part ${letter.toUpperCase()}: `)
    // "### Objective #2:" -> "### Objective 2"
    .replace(/^###[ \t]*objective[ \t]*#?[ \t]*(\d+)[ \t]*:?[ \t]*$/gim, '### Objective $1')
    // "Actions:", "**Actions**:", "#### Actions" -> "**Actions:**"
    .replace(/^[ \t]*(?:#{3,5}[ \t]*)?(?:\*\*|__)?[ \t]*(actions|checklist)[ \t]*:?[ \t]*(?:\*\*|__)?[ \t]*:?$/gim,
      (m, word) => `**${word[0].toUpperCase()}${word.slice(1).toLowerCase()}:**`)
    // "**Phase:** Foundation" -> "Phase: Foundation"
    .replace(new RegExp(`^[ \\t]*\\*\\*(${FIELD_LABELS}):?\\*\\*:?[ \\t]*`, 'gm'), '$1: ')
    // "* item", "• item", "+ item" -> "- item"
    .replace(/^([ \t]*)[*•+][ \t]+/gm, '$1- ')
    // "- [] item" -> "- [ ] item"
    .replace(/^([ \t]*-[ \t]*)\[\]/gm, '$1[ ]')
    // "-> links to", "→ link to:" -> "→ links to:"
    .replace(/(?:->|=>|–>|—>|→)[ \t]*links?[ \t]+to[ \t]*:?[ \t]*/gi, '→ links to: ');
}

/**
 * Read "Label: value" fields from a block of text. A value may continue on
 * the following lines until the next label, a blank line or a rule.
 * Missing fields come back as empty strings.
 */
function readFields(block, labels) {
  const fields = {};
  labels.forEach(label => { fields[label] = ''; });
  let current = null;
  for (const line of block.split('\n')) {
    const match = line.match(/^[ \t]*([A-Za-z0-9 ]+?):[ \t]*(.*)$/);
    if (match && labels.includes(match[1])) {
      current = match[1];
      fields[current] = match[2].trim();
    } else if (current && line.trim() && !/^-{3,}$/.test(line.trim()) && !/^#/.test(line.trim())) {
      fields[current] = `${fields[current]} ${line.trim()}`.trim();
    } else {
      current = null;
    }
  }
  return fields;
}

// A Markdown list item: a dash followed by a space and some text.
// A horizontal rule ("---") is not a list item.
function isListItem(line) {
  return /^\s*-\s+\S/.test(line);
}

function formatDateLong(dateStr) {
  const date = new Date(dateStr);
  // A date-only string is midnight UTC. Format it in UTC so the day shown
  // is the day entered, whatever timezone the server runs in.
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
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

/**
 * Work out which tactic each roadmap week and checklist item belongs to.
 *
 * Plans interleave tactics across the 12 weeks, so fixed four-week blocks
 * are wrong for most of them. The plan itself says which tactic an action
 * belongs to through its "→ links to: Tactic N / Step M" note, so:
 *
 *   - a week's primary tactic is the one most of its actions link to
 *     (a week with no links keeps the previous week's tactic);
 *   - a checklist item takes the tactic of the action in the matching
 *     position in that week's action list, or the week's primary tactic
 *     when that action has no link.
 *
 * If that leaves any tactic with no checklist items at all, the plan does
 * not carry enough links to map it, and equal blocks of weeks are used
 * instead so every tactic shows progress.
 */
function mapRoadmapToTactics(data) {
  const tacticCount = Math.max(3, Math.min(data.tactics.length, 4));
  const blockSize = 12 / tacticCount;
  const blockTactic = weekNum => Math.min(tacticCount, Math.ceil(weekNum / blockSize));
  const empty = () => Object.fromEntries(Array.from({ length: tacticCount }, (_, i) => [i + 1, []]));

  const primaryByWeek = {};
  let checksByTactic = empty();
  let previous = null;

  data.roadmap.weeks.forEach(week => {
    const links = week.actions.map(action => {
      const m = action.match(/→ links to: Tactic (\d+) \/ Step \d+/);
      const num = m ? Number(m[1]) : null;
      return num && num <= tacticCount ? num : null;
    });
    const counts = {};
    links.filter(Boolean).forEach(num => { counts[num] = (counts[num] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
    // A week with no links keeps the last linked week's tactic; before any
    // links have been seen it uses its block.
    const primary = top ? Number(top[0]) : (previous || blockTactic(week.number));
    primaryByWeek[week.number] = primary;
    if (top) previous = primary;

    week.checklist.forEach((_, i) => {
      const actionIndex = links.length ? Math.min(links.length - 1, Math.floor(i * links.length / week.checklist.length)) : -1;
      const tactic = (actionIndex >= 0 && links[actionIndex]) || primary;
      checksByTactic[tactic].push(`week-${week.number}-check-${i + 1}`);
    });
  });

  if (Object.values(checksByTactic).some(ids => ids.length === 0)) {
    checksByTactic = empty();
    data.roadmap.weeks.forEach(week => {
      primaryByWeek[week.number] = blockTactic(week.number);
      week.checklist.forEach((_, i) => checksByTactic[blockTactic(week.number)].push(`week-${week.number}-check-${i + 1}`));
    });
  }

  return { primaryByWeek, checksByTactic };
}

// Plain text for headings, labels and titles: Markdown markers removed, HTML escaped.
function plainText(text) {
  return escapeHtml(stripMarkdown(String(text || '')));
}

/**
 * Inline Markdown to safe HTML: **bold**, *italic*, `code` and [links](https://...).
 * Everything is HTML-escaped first, so plan text can never inject markup.
 */
function inlineMarkdown(text) {
  let html = escapeHtml(String(text || '').replace(/\s*\n\s*/g, ' ').trim());
  html = html.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g,
    (m, label, url) => `<a href="${url}" target="_blank" rel="noopener">${label}</a>`);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[\s(>])\*(?!\s)([^*]+?)\*(?=[\s).,;:!?<]|$)/g, '$1<em>$2</em>');
  // Drop any unpaired bold markers rather than showing them
  return html.replace(/\*\*/g, '');
}

/**
 * A block of plan prose to safe HTML for use inside a single <p>: paragraphs
 * are separated by line breaks, blockquote markers are removed, and inline
 * Markdown is rendered.
 */
function richText(text) {
  return String(text || '')
    .split(/\n[ \t]*\n/)
    .map(paragraph => paragraph
      .split('\n')
      .map(line => line.replace(/^[ \t]*>[ \t]?/, '').trim())
      // Table rows cannot be shown inside a paragraph, so they are left out
      .filter(line => line && !line.startsWith('|'))
      // A line that is only a bold label gets its own line
      .map(line => (/^\*\*[^*]+\*\*$/.test(line) ? `${inlineMarkdown(line)}<br>` : inlineMarkdown(line)))
      .join(' ')
      .replace(/<br> /g, '<br>')
      .replace(/<br>$/, ''))
    .filter(Boolean)
    .join('<br><br>');
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

// ═══════════════════════════════════════════════════════════════════════════
// HTML GENERATORS
// ═══════════════════════════════════════════════════════════════════════════

const PART_CHEVRON_SVG = '<svg class="tactic-part-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg>';

function generateImplementationStepsHtml(steps, tacticNum) {
  if (!steps || steps.length === 0) return '<p>Implementation steps will be added.</p>';

  // Group consecutive steps by the Part they belong to
  const parts = [];
  for (const step of steps) {
    const last = parts[parts.length - 1];
    if (last && last.label === (step.partLabel || '')) {
      last.steps.push(step);
    } else {
      parts.push({ label: step.partLabel || '', steps: [step] });
    }
  }

  let bulletNum = 1;
  let html = '<div class="tactic-parts-list">\n';

  parts.forEach((part, partIdx) => {
    const letter = String.fromCharCode(65 + partIdx);
    const tag = part.label ? `Part ${letter}` : 'Steps';
    const title = part.label || 'Implementation Steps';
    const count = part.steps.length;

    html += `  <div class="tactic-part${partIdx === 0 ? ' open' : ''}">\n`;
    html += `    <button class="tactic-part-header" onclick="toggleTacticPart(this)">\n`;
    html += `      <span class="tactic-part-tag">${tag}</span>\n`;
    html += `      <span class="tactic-part-title">${escapeHtml(title)}</span>\n`;
    html += `      <span class="tactic-part-meta">${count} ${count === 1 ? 'step' : 'steps'}</span>\n`;
    html += `      ${PART_CHEVRON_SVG}\n`;
    html += `    </button>\n`;
    html += `    <div class="tactic-part-body">\n`;
    html += `      <ol class="tactic-steps-list">\n`;

    for (const step of part.steps) {
      html += `        <li class="tactic-step-item" id="step-t${tacticNum}-${step.number}">\n`;
      html += `          <span class="tactic-step-num">${step.number}</span>\n`;
      html += `          <div class="tactic-step-content">\n`;
      html += `            <div class="tactic-step-title" data-editable-key="tactic-${tacticNum}-step-${step.number}-title">${plainText(step.title)}</div>\n`;
      if (step.bullets && step.bullets.length > 0) {
        html += `            <ul class="tactic-step-bullets">\n`;
        for (const bullet of step.bullets) {
          html += `              <li data-editable-key="t${tacticNum}-bullet-${bulletNum}">${inlineMarkdown(bullet)}</li>\n`;
          bulletNum++;
        }
        html += `            </ul>\n`;
      }
      html += `          </div>\n`;
      html += `        </li>\n`;
    }

    html += `      </ol>\n`;
    html += `    </div>\n`;
    html += `  </div>\n`;
  });

  html += '</div>';
  return html;
}

function generateMetricsRowsHtml(metrics) {
  if (!metrics || metrics.length === 0) return '<tr><td colspan="4">Metrics will be added.</td></tr>';

  return metrics.map(m =>
    `<tr>
      <td>${inlineMarkdown(m.metric)}</td>
      <td>${inlineMarkdown(m.day30)}</td>
      <td>${inlineMarkdown(m.day60)}</td>
      <td>${inlineMarkdown(m.day90)}</td>
    </tr>`
  ).join('\n');
}

function generateTipsHtml(tips, tacticNum) {
  if (!tips || tips.length === 0) return '<li>Tips will be added.</li>';

  return tips.map((tip, idx) =>
    `<li data-editable-key="t${tacticNum}-tip-${idx + 1}">${inlineMarkdown(tip)}</li>`
  ).join('\n');
}

function generateResourcesHtml(resources, tacticNum) {
  if (!resources || resources.length === 0) return '<li>Resources will be added.</li>';

  return resources.map((r, idx) =>
    `<li><a href="${escapeHtml(r.url)}" data-editable-link="t${tacticNum}-resource-${idx + 1}" target="_blank">${plainText(r.title)}</a>${r.description ? ': ' + inlineMarkdown(r.description) : ''}</li>`
  ).join('\n');
}

function generateWeekCardHtml(week, { hasQuickWinsPage = false } = {}) {
  const checklistCount = week.checklist.length;

  let actionsHtml = '';
  for (let i = 0; i < week.actions.length; i++) {
    const action = week.actions[i];
    const linkMatch = action.match(/→ links to: Tactic (\d+) \/ Step (\d+)/);
    let actionText = action.replace(/\s*→ links to:.*$/, '').trim();
    let howtoBtn = '';
    if (linkMatch) {
      howtoBtn = ` <button class="howto-link" onclick="howToLink('tactic${linkMatch[1]}','step-t${linkMatch[1]}-${linkMatch[2]}')">how to</button>`;
    } else if (hasQuickWinsPage && /→ links to: (?:GBP )?Quick Wins\s*$/i.test(action)) {
      // "→ links to: GBP Quick Wins" opens the Quick Wins page
      howtoBtn = ` <button class="howto-link" onclick="navigate('gbp')">how to</button>`;
    }
    actionsHtml += `<li class="week-task-item"><div class="week-task-dot"></div><span class="week-task-text" data-editable-key="week-${week.number}-action-${i + 1}">${inlineMarkdown(actionText)}</span>${howtoBtn}</li>\n`;
  }

  let checklistHtml = '';
  const checkboxSvg = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5,6 4.5,9 10.5,3"/></svg>';
  const noteSvg = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 2.5H3a.5.5 0 00-.5.5v14a.5.5 0 00.5.5h10a.5.5 0 00.5-.5V3a.5.5 0 00-.5-.5zM3 0h10a3 3 0 013 3v14a3 3 0 01-3 3H3a3 3 0 01-3-3V3a3 3 0 013-3zm2 5h6v2H5V5zm0 4h6v2H5V9z"/></svg>';
  for (let i = 0; i < week.checklist.length; i++) {
    const item = week.checklist[i];
    const checkId = `week-${week.number}-check-${i + 1}`;
    const noteId = `note-${checkId}`;
    checklistHtml += `<div class="check-item">
  <div class="check-row">
    <input type="checkbox" class="check-input" id="${checkId}" data-key="${checkId}" onchange="onCheck(this)">
    <label class="check-box" for="${checkId}">${checkboxSvg}</label>
    <label class="check-label" for="${checkId}" data-editable-key="${checkId}-label">${inlineMarkdown(item)}</label>
    <button class="note-toggle-btn" onclick="toggleNote('${checkId}')" title="Add note">${noteSvg}</button>
  </div>
  <div class="note-area" id="note-area-${checkId}">
    <textarea class="note-textarea" id="${noteId}" placeholder="Add a note…" oninput="saveNote('${checkId}',this.value)"></textarea>
  </div>
</div>\n`;
  }

  return `<div class="week-card" id="wc-${week.number}" data-week="${week.number}">
  <div class="week-card-header" onclick="toggleWeek(${week.number})">
    <div class="week-num">W${week.number}</div>
    <div class="week-title" data-editable-key="week-${week.number}-title">${plainText(week.title)}</div>
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

  const checkboxSvg = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const noteSvg = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 2.5H3C2.17157 2.5 1.5 3.17157 1.5 4V12C1.5 12.8284 2.17157 13.5 3 13.5H13C13.8284 13.5 14.5 12.8284 14.5 12V4C14.5 3.17157 13.8284 2.5 13 2.5Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 5.5H11.5M4.5 8H9.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  let html = '';
  let globalQwIndex = 1;
  const sections = content.split(/### /);

  for (const section of sections) {
    if (!section.trim()) continue;

    const lines = section.split('\n');
    const title = lines[0].trim();
    const items = lines.slice(1).filter(l => isListItem(l));

    if (items.length === 0) continue;

    html += `<div class="section-label">${plainText(title)}</div>\n`;
    html += `<div class="card" style="padding:0;margin-bottom:24px">\n`;
    html += `  <div class="card-body">\n`;
    html += `    <div class="check-list" style="gap:16px">\n`;

    for (const item of items) {
      const text = item.replace(/^-\s*/, '').trim();
      const qwId = `qw_${globalQwIndex}`;

      // Parse bold title if present
      const boldMatch = text.match(/^\*\*(.+?)\*\*\.?\s*(.*)/);
      let labelContent;
      if (boldMatch) {
        labelContent = `<strong>${plainText(boldMatch[1].replace(/[.:\s]+$/, ''))}.</strong> ${inlineMarkdown(boldMatch[2])}`;
      } else {
        labelContent = inlineMarkdown(text);
      }

      html += `      <div class="check-item">\n`;
      html += `        <div class="check-row">\n`;
      html += `          <input type="checkbox" class="check-input" id="${qwId}" onchange="onCheck(this)">\n`;
      html += `          <label class="check-box" for="${qwId}">${checkboxSvg}</label>\n`;
      html += `          <label class="check-label" for="${qwId}" data-editable-key="${qwId}-label">${labelContent}</label>\n`;
      html += `          <button class="note-toggle-btn" onclick="toggleNote('${qwId}')">${noteSvg}</button>\n`;
      html += `        </div>\n`;
      html += `        <div class="note-area" id="note-area-${qwId}">\n`;
      html += `          <textarea class="note-textarea" id="note-${qwId}" placeholder="Add a note…" oninput="saveNote('${qwId}',this.value)"></textarea>\n`;
      html += `        </div>\n`;
      html += `      </div>\n`;

      globalQwIndex++;
    }

    html += `    </div>\n`;
    html += `  </div>\n`;
    html += `</div>\n`;
  }

  return html;
}


// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT VALIDATION
// Structural checks on a generated dashboard. Returns a list of problems;
// an empty list means the page is internally consistent.
// ═══════════════════════════════════════════════════════════════════════════

function validateDashboardHtml(html) {
  const problems = [];
  const add = (code, message) => problems.push({ code, message });

  const placeholders = [...new Set(html.match(/\{\{[A-Z_0-9]+\}\}/g) || [])];
  if (placeholders.length) add('placeholder', `Unfilled placeholders: ${placeholders.join(', ')}`);

  const markers = [...new Set(html.match(/<!--\s*\/?(?:IF|ENDIF):[A-Z_0-9]+\s*-->/g) || [])];
  if (markers.length) add('if-marker', `Unresolved conditional markers: ${markers.join(', ')}`);

  if (!/^\s*<!DOCTYPE html>/i.test(html)) add('header', 'Page does not start with <!DOCTYPE html> (template header comment not removed?)');
  if (!/<body[^>]*\sdata-client-slug="[a-z0-9-]+"/.test(html)) add('slug', 'Missing data-client-slug on <body>');
  if (!html.includes('cdn.jsdelivr.net/npm/@supabase/supabase-js@2')) add('supabase-sdk', 'Supabase SDK script is missing');
  for (const script of ['/shared/supabase-client.js', '/shared/auth.js', '/shared/progress.js']) {
    if (!html.includes(`src="${script}"`)) add('shared-script', `Missing shared script ${script}`);
  }

  // Checklist checkboxes vs the JS arrays
  const domChecks = [...html.matchAll(/<input[^>]*class="check-input"[^>]*id="(week-\d+-check-\d+)"[^>]*data-key="([^"]+)"/g)];
  const domIds = domChecks.map(m => m[1]);
  domChecks.forEach(m => { if (m[1] !== m[2]) add('data-key', `Checkbox ${m[1]} has mismatched data-key ${m[2]}`); });

  const readJs = name => {
    const m = html.match(new RegExp(`const ${name}\\s*=\\s*([\\[{][\\s\\S]*?[\\]}]);`));
    if (!m) { add('js-array', `${name} not found`); return null; }
    try { return JSON.parse(m[1]); } catch (e) { add('js-array', `${name} is not valid JSON`); return null; }
  };
  const allIds = readJs('ALL_CHECK_IDS');
  const weekChecks = readJs('WEEK_CHECKS');
  const monthChecks = readJs('MONTH_CHECKS');
  const tacticChecks = readJs('TACTIC_CHECKS');
  const sameSet = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
  if (allIds && !sameSet(allIds, domIds)) add('js-array', `ALL_CHECK_IDS (${allIds.length}) does not match checkboxes on the page (${domIds.length})`);
  for (const [name, obj] of [['WEEK_CHECKS', weekChecks], ['MONTH_CHECKS', monthChecks], ['TACTIC_CHECKS', tacticChecks]]) {
    if (obj && allIds && !sameSet(Object.values(obj).flat(), allIds)) add('js-array', `${name} does not cover the same IDs as ALL_CHECK_IDS`);
  }

  // Every checklist item needs its note area
  for (const id of domIds) {
    if (!html.includes(`id="note-area-${id}"`)) add('note-area', `Checklist item ${id} has no note area`);
  }

  // Week cards 1..12 with data-week
  const weeks = [...html.matchAll(/<div class="week-card" id="wc-(\d+)" data-week="(\d+)"/g)].map(m => Number(m[2]));
  if (weeks.length !== 12 || weeks.some((w, i) => w !== i + 1)) add('weeks', `Expected week cards 1-12, found: ${weeks.join(',') || 'none'}`);

  // "how to" links must point at a step that exists
  for (const m of html.matchAll(/howToLink\('tactic(\d)','(step-t\d-\d+)'\)/g)) {
    if (!html.includes(`id="${m[2]}"`)) add('howto', `"how to" link points at ${m[2]}, which does not exist`);
  }

  // Step structure
  if (/class="step-item"|class="step-num"/.test(html)) add('steps', 'Legacy .step-item / .step-num markup found');
  const partsLists = (html.match(/class="tactic-parts-list"/g) || []).length;
  if (partsLists < 3) add('steps', `Expected a .tactic-parts-list per tactic, found ${partsLists}`);

  // Editable keys must be unique
  const seen = new Set();
  const dupes = new Set();
  for (const m of html.matchAll(/data-editable-(?:key|link)="([^"]+)"/g)) {
    if (seen.has(m[1])) dupes.add(m[1]);
    seen.add(m[1]);
  }
  if (dupes.size) add('editable-key', `Duplicate editable keys: ${[...dupes].slice(0, 10).join(', ')}`);

  // JS config shapes the template code depends on
  const phases = html.match(/const PHASES\s*=\s*([\s\S]*?);\n/);
  if (phases && !phases[1].trim().startsWith('[')) add('js-config', 'PHASES must be an array');

  return problems;
}

export {
  mapRoadmapToTactics,
  buildAssessmentFields,
  hasAssessmentContent,
  normalisePlanMd,
  readFields,
  parsePlanMd,
  renderDashboard,
  processTemplate,
  generatePlanJson,
  validateDashboardHtml,
  generateImplementationStepsHtml,
  generateWeekCardHtml,
  generateQuickWinsHtml,
  stripMarkdown,
  escapeHtml,
  plainText,
  inlineMarkdown,
  richText
};
