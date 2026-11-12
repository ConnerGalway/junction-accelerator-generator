/**
 * Experience dashboard generator: turns an Experience Design plan.md
 * (PLAN_FORMAT_EXPERIENCE.md) into a dashboard (index.html) and plan.json.
 *
 * Used by:
 *   - netlify/functions/create-experience-project.js
 *   - tests/experience-generator.test.js
 *
 * Experience plans have the same shape as accelerator plans with different
 * names ("Track" for "Tactic", "Launch Roadmap" for "90-Day Roadmap"), so
 * the Markdown is parsed by the accelerator parser in shared/plan-generator.js
 * after those names are normalised. Only the experience-specific sections
 * (The Experience, Price Point, Launch Target, Bookability Checklist) are
 * parsed here. The HTML is rendered here because the experience template
 * uses different markup from the accelerator template.
 *
 * This module is pure: no network, no filesystem, no environment variables.
 */

import { parsePlanMd as parseAcceleratorPlanMd, normalisePlanMd, escapeHtml, stripMarkdown, plainText, inlineMarkdown, richText } from './plan-generator.js';

const CHECK_SVG = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5,6 4.5,9 10.5,3"/></svg>';
const NOTE_SVG = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>';
const CHEVRON_SVG = '<svg class="section-block-chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>';
const WEEK_CHEVRON_SVG = '<svg class="week-chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>';

// ═══════════════════════════════════════════════════════════════════════════
// PLAN.MD PARSER (Experience format)
// ═══════════════════════════════════════════════════════════════════════════

function parseExperiencePlanMd(content) {
  try {
    const text = normalisePlanMd(content);

    if (!/^## Track \d+:/m.test(text)) {
      return { error: 'Missing "## Track N:" sections. Experience plans use "## Track 1:", "## Track 2:" and "## Track 3:".' };
    }

    // ── Experience-only sections ───────────────────────────────────────────
    const meta = (text.match(/## Meta\n([\s\S]*?)(?=\n## )/) || [])[1] || '';
    const metaValue = label => {
      const m = meta.match(new RegExp(`^${label}:\\s*(.+)$`, 'm'));
      return m ? m[1].trim() : null;
    };
    const pricePoint = metaValue('Price Point');
    const launchTarget = metaValue('Launch Target');
    const hasBookabilityChecklist = (metaValue('Has Bookability Checklist') || '').toLowerCase() === 'yes';

    const experienceMatch = text.match(/## The Experience\n+([\s\S]*?)(?=\n---|\n## |$)/);
    const experienceSentence = experienceMatch ? experienceMatch[1].trim() : '';

    // Bookability Checklist: "### Title" followed by a description
    const bookabilityItems = [];
    const bookabilityMatch = text.match(/\n## Bookability Checklist\n([\s\S]*?)(?=\n## |$)/);
    if (bookabilityMatch) {
      for (const block of bookabilityMatch[1].split(/\n(?=### )/)) {
        const m = block.match(/^\s*### (.+)\n([\s\S]*)$/);
        if (!m) continue;
        const description = m[2].split('\n').map(l => l.trim()).filter(l => l && !/^-{3,}$/.test(l)).join(' ');
        bookabilityItems.push({ title: m[1].trim(), description });
      }
    }

    // ── Shared structure: parse with the accelerator parser ────────────────
    let normalised = text;
    if (bookabilityMatch) normalised = normalised.replace(bookabilityMatch[0], '\n');
    normalised = normalised
      .replace(/^## Track (\d+):/gm, '## Tactic $1:')
      .replace(/^Track Pill:/gm, 'Tactic Pill:')
      .replace(/^## Launch Roadmap\s*$/m, '## 90-Day Roadmap')
      .replace(/→ links to: Track (\d+)/g, '→ links to: Tactic $1');

    const base = parseAcceleratorPlanMd(normalised);
    if (base.error) {
      return { error: base.error.replace(/tactics/g, 'tracks').replace(/Tactic/g, 'Track') };
    }

    return {
      meta: base.meta,
      goal: base.goal,
      experienceSentence,
      strategicPositioning: base.strategicPositioning,
      welcomeMessage: base.welcomeMessage,
      objectives: base.objectives,
      tactics: base.tactics.slice(0, 3),
      roadmap: base.roadmap,
      hasBookabilityChecklist,
      bookabilityItems,
      pricePoint,
      launchTarget
    };
  } catch (err) {
    return { error: `Parse error: ${err.message}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HTML GENERATORS (experience template markup)
// ═══════════════════════════════════════════════════════════════════════════

function paragraphsHtml(text) {
  return (text || '')
    .split(/\n\s*\n/)
    .map(p => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .map(p => `<p>${inlineMarkdown(p.replace(/^>\s?/, ''))}</p>`)
    .join('\n            ');
}

function stepsHtml(steps, trackNum) {
  const parts = [];
  for (const step of steps || []) {
    const last = parts[parts.length - 1];
    if (last && last.label === (step.partLabel || '')) last.steps.push(step);
    else parts.push({ label: step.partLabel || '', steps: [step] });
  }

  let bulletNum = 1;
  return parts.map((part, idx) => {
    const badge = part.label ? `<span class="section-block-badge">Part ${String.fromCharCode(65 + idx)}</span>` : '';
    const title = part.label || 'Implementation Steps';
    const items = part.steps.map(step => {
      const bullets = (step.bullets || [])
        .map(b => `<li data-editable-key="t${trackNum}-bullet-${bulletNum++}">${inlineMarkdown(b)}</li>`)
        .join('');
      return `            <li class="step-item" id="step-t${trackNum}-${step.number}"><div class="step-num">${step.number}</div><div class="step-content"><h4 data-editable-key="tactic-${trackNum}-step-${step.number}-title">${plainText(step.title)}</h4>${bullets ? `<ul>${bullets}</ul>` : ''}</div></li>`;
    }).join('\n');

    return `<div class="section-block open">
        <div class="section-block-header" onclick="toggleSection(this)">
          ${badge}
          <span class="section-block-title">${escapeHtml(title)}</span>
          ${CHEVRON_SVG}
        </div>
        <div class="section-block-body">
          <ol class="steps-list">
${items}
          </ol>
        </div>
      </div>`;
  }).join('\n      ');
}

function metricsRowsHtml(metrics) {
  return (metrics || [])
    .map(m => `              <tr><td>${inlineMarkdown(m.metric)}</td><td>${inlineMarkdown(m.day30)}</td><td>${inlineMarkdown(m.day60)}</td><td>${inlineMarkdown(m.day90)}</td></tr>`)
    .join('\n');
}

function tipsHtml(tips, trackNum) {
  return (tips || [])
    .map((tip, i) => `        <div class="tip-item"><div class="tip-icon">💡</div><div class="tip-text" data-editable-key="t${trackNum}-tip-${i + 1}">${inlineMarkdown(tip)}</div></div>`)
    .join('\n');
}

function resourcesHtml(resources, trackNum) {
  return (resources || [])
    .map((r, i) => `        <div class="resource-item">🔗 <a href="${escapeHtml(r.url)}" data-editable-link="t${trackNum}-resource-${i + 1}" target="_blank">${plainText(r.title)}</a>${r.description ? ': ' + inlineMarkdown(r.description) : ''}</div>`)
    .join('\n');
}

function checkId(weekNum, index) {
  return `rw${weekNum}_d${index}`;
}

function checkItemHtml({ id, dataKey, labelHtml, editableKey, extraAttr = '', placeholder = 'Add a note for this task…' }) {
  return `                <div class="check-item"${extraAttr}>
                  <div class="check-row"><input type="checkbox" class="check-input" id="${id}" data-key="${dataKey}" onchange="onCheck(this)"><label class="check-box" for="${id}">${CHECK_SVG}</label><label class="check-label" for="${id}" data-editable-key="${editableKey}">${labelHtml}</label><button class="note-toggle-btn" onclick="toggleNote('${id}')" title="Add note">${NOTE_SVG}</button></div>
                  <div class="note-area" id="note-area-${id}"><textarea class="note-textarea" id="note-${id}" placeholder="${placeholder}" oninput="saveNote('${id}',this.value)"></textarea></div>
                </div>`;
}

function weekCardHtml(week, { hasBookabilityPage = false } = {}) {
  const n = week.number;

  // The onboarding tour points at #w1-howto-example and #w1-note-example.
  // Put them on the first "how to" action (or the first action) and the
  // first checklist item of Week 1.
  const parsedActions = week.actions.map(raw => {
    const link = raw.match(/→ links to: Tactic (\d+) \/ Step (\d+)/);
    // "→ links to: Bookability Checklist" opens that page
    const page = !link && hasBookabilityPage && /→ links to: Bookability Checklist\s*$/i.test(raw) ? 'bookability' : null;
    return { text: raw.replace(/\s*→ links to:.*$/, '').trim(), link, page };
  });
  const firstHowTo = parsedActions.findIndex(a => a.link);
  const tourActionIndex = firstHowTo === -1 ? 0 : firstHowTo;

  const actions = parsedActions.map((a, i) => {
    const idAttr = n === 1 && i === tourActionIndex ? ' id="w1-howto-example"' : '';
    const howTo = a.link
      ? `<button class="howto-link" onclick="howToLink('tactic${a.link[1]}','step-t${a.link[1]}-${a.link[2]}')" title="See how to complete this step">how to</button>`
      : (a.page ? `<button class="howto-link" onclick="navigate('${a.page}')" title="See how to complete this step">how to</button>` : '');
    return `                <li class="week-task-item"${idAttr}><div class="week-task-dot"></div><span class="week-task-text" data-editable-key="week-${n}-action-${i + 1}">${inlineMarkdown(a.text)}</span>${howTo}</li>`;
  }).join('\n');

  const checklist = week.checklist.map((item, i) => {
    const id = checkId(n, i + 1);
    return checkItemHtml({
      id,
      dataKey: `week-${n}-check-${i + 1}`,
      labelHtml: inlineMarkdown(item),
      editableKey: `week-${n}-check-${i + 1}-label`,
      extraAttr: n === 1 && i === 0 ? ' id="w1-note-example"' : ''
    });
  }).join('\n');

  return `      <!-- Week ${n} -->
      <div class="week-card" id="wc-${n}" data-week="${n}">
        <div class="week-card-header" onclick="toggleWeek(${n})">
          <div class="week-num">W${n}</div>
          <div class="week-title" data-editable-key="week-${n}-title">${plainText(week.title)}</div>
          <div class="week-progress-pill" id="wp-${n}">0 / ${week.checklist.length}</div>
          ${WEEK_CHEVRON_SVG}
        </div>
        <div class="week-card-body">
          <div class="week-cols">
            <div>
              <div class="week-col-label">This Week's Actions</div>
              <ul class="week-tasks-list">
${actions}
              </ul>
            </div>
            <div>
              <div class="week-col-label">Completion Checklist</div>
              <div class="check-list">
${checklist}
              </div>
            </div>
          </div>
          <div class="week-note-section">
            <div class="week-note-label">📝 Week Notes</div>
            <textarea class="note-textarea" id="note-week-${n}" placeholder="Add general notes for this week…" oninput="saveNote('week_${n}',this.value)" style="width:100%"></textarea>
          </div>
        </div>
      </div>`;
}

function bookabilityItemsHtml(items) {
  return (items || []).map((item, i) => {
    const n = i + 1;
    const title = plainText(item.title.replace(/[.\s]+$/, ''));
    return checkItemHtml({
      id: `bookability_${n}`,
      dataKey: `bookability-${n}`,
      labelHtml: `<strong>${title}.</strong> ${inlineMarkdown(item.description)}`,
      editableKey: `bookability_${n}-label`,
      placeholder: 'Add a note…'
    });
  }).join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE PROCESSOR
// ═══════════════════════════════════════════════════════════════════════════

const MATERIALS = ['QUESTIONNAIRE', 'SESSION1', 'SESSION2', 'CALCULATOR'];

function monthOf(weekNum) {
  return Math.min(3, Math.ceil(weekNum / 4));
}

function renderExperienceDashboard(template, data) {
  let html = template;

  // Remove the template header comment (documentation for maintainers)
  html = html.replace(/^<!--[\s\S]*?-->\s*(?=<!DOCTYPE)/m, '');

  const fill = (name, value) => { html = html.split(`{{${name}}}`).join(value == null ? '' : String(value)); };

  // ── Checklist IDs ────────────────────────────────────────────────────────
  const weekChecks = {};
  const monthChecks = { 1: [], 2: [], 3: [] };
  const tacticChecks = { 1: [], 2: [], 3: [] };
  const roadmapIds = [];
  data.roadmap.weeks.forEach(week => {
    weekChecks[week.number] = week.checklist.map((_, i) => checkId(week.number, i + 1));
    roadmapIds.push(...weekChecks[week.number]);
    // Month N and Track N both cover weeks 4N-3 to 4N
    monthChecks[monthOf(week.number)].push(...weekChecks[week.number]);
    tacticChecks[monthOf(week.number)].push(...weekChecks[week.number]);
  });

  const includeBookability = data.hasBookabilityChecklist && (data.bookabilityItems || []).length > 0;
  const bookabilityIds = includeBookability ? data.bookabilityItems.map((_, i) => `bookability_${i + 1}`) : [];
  // ALL_CHECK_IDS drives the progress ring and restores saved state, so it
  // includes the bookability items when that page is present.
  const allCheckIds = [...roadmapIds, ...bookabilityIds];

  // ── Simple placeholders ──────────────────────────────────────────────────
  const goal = data.goal || '';
  fill('CLIENT_NAME', escapeHtml(data.clientName));
  fill('CLIENT_SLUG', data.slug);
  fill('PAGE_SUBTITLE', plainText(goal.length > 100 ? goal.slice(0, 100) + '...' : goal));
  fill('GOAL_TEXT', richText(goal));
  fill('WM_SUBLINE', richText(data.welcomeMessage || goal.slice(0, 150)));
  fill('STRATEGIC_POSITIONING', richText(data.strategicPositioning));
  fill('EXPERIENCE_SENTENCE', richText(data.experienceSentence));
  fill('COACH_EMAIL', escapeHtml(data.coachEmail));
  // The operator picks their own start date in the dashboard
  fill('COHORT_START_DATE', 'To be set');
  fill('TOTAL_TASKS', allCheckIds.length);

  for (let i = 0; i < 3; i++) {
    const n = i + 1;
    const objective = data.objectives[i] || {};
    fill(`OBJECTIVE_${n}_TITLE`, escapeHtml(objective.title));
    fill(`OBJECTIVE_${n}_DESC`, inlineMarkdown(objective.description));
    fill(`OBJECTIVE_${n}_TACTIC_PILL`, escapeHtml(objective.tacticPill));

    const track = data.tactics[i] || {};
    fill(`TACTIC_${n}_TITLE`, escapeHtml(track.title));
    fill(`TACTIC_${n}_NAV_LABEL`, escapeHtml(track.shortLabel));
    fill(`TACTIC_${n}_PHASE`, escapeHtml(track.phase));
    fill(`TACTIC_${n}_SUBTITLE`, inlineMarkdown(track.subtitle));
    fill(`TACTIC_${n}_TOTAL`, tacticChecks[n].length);

    fill(`TACTIC_${n}_HEARD`, paragraphsHtml(track.whatHeard));
    fill(`TACTIC_${n}_WHAT_IS`, paragraphsHtml(track.whatIs));
    fill(`TACTIC_${n}_MATTERS`, paragraphsHtml(track.whyMatters));
    fill(`TACTIC_${n}_IMPLEMENTATION_STEPS`, stepsHtml(track.implementationSteps, n));
    fill(`TACTIC_${n}_METRICS_ROWS`, metricsRowsHtml(track.successMetrics));
    fill(`TACTIC_${n}_TIPS`, tipsHtml(track.tips, n));
    fill(`TACTIC_${n}_RESOURCES`, resourcesHtml(track.resources, n));

    fill(`MONTH_${n}_NAME`, escapeHtml(data.roadmap.monthNames[i]));
    fill(`MONTH_${n}_TOTAL`, monthChecks[n].length);
    fill(`MONTH_${n}_WEEKS`, data.roadmap.weeks.filter(w => monthOf(w.number) === n).map(w => weekCardHtml(w, { hasBookabilityPage: includeBookability })).join('\n\n'));
  }

  // ── Guide and Materials: not available at first generation ───────────────
  fill('GUIDE_URL', data.guideUrl || '#');
  fill('GUIDE_STATUS', data.guideUrl ? 'ready' : 'coming');
  fill('GUIDE_BUTTON_TEXT', data.guideUrl ? 'Open Guide' : 'Coming Soon');
  for (const material of MATERIALS) {
    fill(`MATERIAL_${material}_URL`, '#');
    fill(`MATERIAL_${material}_STATUS`, 'coming');
    fill(`MATERIAL_${material}_BUTTON_TEXT`, 'Coming Soon');
  }

  // ── Conditional blocks ───────────────────────────────────────────────────
  const conditional = (name, include) => {
    if (include) {
      html = html.replace(new RegExp(`<!-- /?IF:${name} -->\\n?`, 'g'), '');
    } else {
      html = html.replace(new RegExp(`<!-- IF:${name} -->[\\s\\S]*?<!-- /IF:${name} -->\\n?`, 'g'), '');
    }
  };

  conditional('PRICE_POINT', !!data.pricePoint);
  fill('PRICE_POINT', escapeHtml(data.pricePoint));

  conditional('LAUNCH_TARGET', !!data.launchTarget);
  const [launchTitle, ...launchRest] = (data.launchTarget || '').split('·').map(s => s.trim());
  fill('LAUNCH_TARGET_TITLE', escapeHtml(launchTitle));
  fill('LAUNCH_TARGET_DESC', escapeHtml(launchRest.join(' · ')));

  conditional('BOOKABILITY_CHECKLIST', includeBookability);
  fill('BOOKABILITY_ITEMS', bookabilityItemsHtml(data.bookabilityItems));
  if (!includeBookability) {
    // Remove the sidebar link to a page that no longer exists
    html = html.replace(/[ \t]*<div class="nav-item"[^>]*onclick="navigate\('bookability'\)"[^>]*>[\s\S]*?<\/div>\n?/, '');
  }

  // ── JavaScript arrays ────────────────────────────────────────────────────
  const replaceJs = (name, open, close, value) => {
    const pattern = new RegExp(`const ${name}\\s*=\\s*\\${open}[\\s\\S]*?\\${close};`);
    if (!pattern.test(html)) throw new Error(`Template is missing the ${name} declaration`);
    html = html.replace(pattern, () => `const ${name} = ${JSON.stringify(value)};`);
  };
  replaceJs('ALL_CHECK_IDS', '[', ']', allCheckIds);
  replaceJs('WEEK_CHECKS', '{', '}', weekChecks);
  replaceJs('MONTH_CHECKS', '{', '}', monthChecks);
  replaceJs('TACTIC_CHECKS', '{', '}', tacticChecks);

  const phaseLabels = { 1: data.tactics[0]?.phase || '', 2: data.tactics[1]?.phase || '', 3: data.tactics[2]?.phase || '' };
  html = html.replace(/\/\* \{\{TACTIC_PHASE_LABELS\}\} \*\/ \{[^}]*\}/, () => JSON.stringify(phaseLabels));

  // ── Report anything the template still expected ──────────────────────────
  const unfilledPlaceholders = [...new Set(html.match(/\{\{[A-Z_0-9]+\}\}/g) || [])];
  if (unfilledPlaceholders.length > 0) {
    console.warn(`[experience-generator] WARNING: ${unfilledPlaceholders.length} unfilled placeholder types:`, unfilledPlaceholders.slice(0, 15).join(', '));
  }
  html = html.replace(/\{\{[A-Z_0-9]+\}\}/g, '');

  return { html, unfilledPlaceholders };
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAN.JSON GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

function generateExperiencePlanJson(clientName, slug, coachEmail, planData) {
  const plain = text => stripMarkdown(text).replace(/\s*→ links to:.*$/, '').trim();
  return {
    client_name: clientName,
    client_slug: slug,
    goal: planData.goal,
    coach_email: coachEmail,
    weeks: planData.roadmap.weeks.map(week => ({
      week: week.number,
      month: monthOf(week.number),
      title: `Week ${week.number}: ${week.title}`,
      actions: week.actions.map(plain),
      checklist: week.checklist.map(plain),
      deep_link: `https://accelerator.elearningu.com/${slug}/#week-${week.number}`
    }))
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

function validateExperienceHtml(html) {
  const problems = [];
  const add = (code, message) => problems.push({ code, message });

  const placeholders = [...new Set(html.match(/\{\{[A-Z_0-9]+\}\}/g) || [])];
  if (placeholders.length) add('placeholder', `Unfilled placeholders: ${placeholders.join(', ')}`);

  const markers = [...new Set(html.match(/<!--\s*\/?(?:IF|ENDIF):[A-Z_0-9]+\s*-->/g) || [])];
  if (markers.length) add('if-marker', `Unresolved conditional markers: ${markers.join(', ')}`);

  if (!/^\s*<!DOCTYPE html>/i.test(html)) add('header', 'Page does not start with <!DOCTYPE html>');
  if (!/<body[^>]*data-client-slug="[a-z0-9-]+"/.test(html)) add('slug', 'Missing data-client-slug on <body>');
  if (!/<body[^>]*data-cohort-start=""/.test(html)) add('cohort-start', 'data-cohort-start must be empty');
  if (!html.includes('cdn.jsdelivr.net/npm/@supabase/supabase-js@2')) add('supabase-sdk', 'Supabase SDK script is missing');
  for (const script of ['/shared/supabase-client.js', '/shared/auth.js', '/shared/progress.js']) {
    if (!html.includes(`src="${script}"`)) add('shared-script', `Missing shared script ${script}`);
  }
  if (/id="page-assessment"/.test(html)) add('assessment', 'Experience dashboards must not have an Assessment page');

  const readJs = name => {
    const m = html.match(new RegExp(`const ${name}\\s*=\\s*([\\[{][\\s\\S]*?[\\]}]);`));
    if (!m) { add('js-array', `${name} not found`); return null; }
    try { return JSON.parse(m[1]); } catch (e) { add('js-array', `${name} is not valid JSON`); return null; }
  };
  const allIds = readJs('ALL_CHECK_IDS') || [];
  const weekChecks = readJs('WEEK_CHECKS') || {};
  const monthChecks = readJs('MONTH_CHECKS') || {};
  const tacticChecks = readJs('TACTIC_CHECKS') || {};

  const roadmapDom = [...html.matchAll(/<input[^>]*id="(rw\d+_d\d+)"[^>]*data-key="(week-\d+-check-\d+)"/g)].map(m => m[1]);
  const bookabilityDom = [...html.matchAll(/<input[^>]*id="(bookability_\d+)"/g)].map(m => m[1]);
  const sameSet = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
  if (!sameSet(allIds, [...roadmapDom, ...bookabilityDom])) add('js-array', `ALL_CHECK_IDS (${allIds.length}) does not match checkboxes on the page (${roadmapDom.length + bookabilityDom.length})`);
  for (const [name, obj] of [['WEEK_CHECKS', weekChecks], ['MONTH_CHECKS', monthChecks], ['TACTIC_CHECKS', tacticChecks]]) {
    if (!sameSet(Object.values(obj).flat(), roadmapDom)) add('js-array', `${name} does not cover the roadmap checkboxes`);
  }
  if (allIds.some(id => /^gs\d/.test(id))) add('js-array', 'Guide checkboxes (gs1-gs5) must not be in ALL_CHECK_IDS');

  for (const id of [...roadmapDom, ...bookabilityDom]) {
    if (!html.includes(`id="note-area-${id}"`)) add('note-area', `Checklist item ${id} has no note area`);
  }

  const weeks = [...html.matchAll(/<div class="week-card" id="wc-(\d+)" data-week="(\d+)"/g)].map(m => Number(m[2]));
  if (weeks.length !== 12 || weeks.some((w, i) => w !== i + 1)) add('weeks', `Expected week cards 1-12, found: ${weeks.join(',') || 'none'}`);

  for (const m of html.matchAll(/howToLink\('tactic(\d)','(step-t\d-\d+)'\)/g)) {
    if (!html.includes(`id="${m[2]}"`)) add('howto', `"how to" link points at ${m[2]}, which does not exist`);
  }
  if (/→ links to:/.test(html)) add('howto', 'A "→ links to:" annotation was left in the page text');

  for (const id of ['w1-howto-example', 'w1-note-example']) {
    if (!html.includes(`id="${id}"`)) add('tour', `Onboarding tour target #${id} is missing`);
  }
  for (let n = 1; n <= 5; n++) {
    if (!new RegExp(`id="gs${n}"`).test(html)) add('guide', `Guide checkbox gs${n} is missing`);
  }

  const seen = new Set();
  const dupes = new Set();
  for (const m of html.matchAll(/data-editable-(?:key|link)="([^"]+)"/g)) {
    if (seen.has(m[1])) dupes.add(m[1]);
    seen.add(m[1]);
  }
  if (dupes.size) add('editable-key', `Duplicate editable keys: ${[...dupes].slice(0, 10).join(', ')}`);

  return problems;
}

export {
  parseExperiencePlanMd,
  renderExperienceDashboard,
  generateExperiencePlanJson,
  validateExperienceHtml
};
