/**
 * Plan validator: checks an uploaded plan.md before anything is generated.
 *
 * Returns every problem with its line number and the specific change needed,
 * so a plan is either accepted whole or rejected with a to-do list. Nothing
 * is ever silently dropped.
 *
 * Used by:
 *   - netlify/functions/create-project.js and create-experience-project.js
 *     (authoritative check before committing)
 *   - admin/create-project and admin/create-experience (instant check in the
 *     browser when a file is chosen)
 *   - tests/plan-validator.test.js
 *
 * The checks read the Markdown structure directly, independently of the
 * parser, then compare their counts with what the parser actually read. Any
 * difference is reported as an error.
 */

import { normalisePlanMd, parsePlanMd, readFields } from './plan-generator.js';
import { parseExperiencePlanMd } from './experience-generator.js';

const DIALECTS = {
  accelerator: {
    label: 'accelerator',
    unit: 'Tactic',
    units: 'tactics',
    other: 'Track',
    pill: 'Tactic Pill',
    roadmap: '90-Day Roadmap',
    minUnits: 3,
    maxUnits: 4,
    parse: parsePlanMd
  },
  experience: {
    label: 'experience',
    unit: 'Track',
    units: 'tracks',
    other: 'Tactic',
    pill: 'Track Pill',
    roadmap: 'Launch Roadmap',
    minUnits: 3,
    maxUnits: 3,
    parse: parseExperiencePlanMd
  }
};

const UNIT_SECTIONS = [
  { title: 'What We Heard From You', near: /heard/i },
  { title: 'What This Is', near: /what (this|it) is|overview/i },
  { title: 'Why It Matters', near: /matter/i },
  { title: 'Implementation Steps', near: /\bsteps?\b|implementation/i },
  { title: 'Success Metrics', near: /metric|kpi|measur/i },
  { title: 'Tips', near: /\btips?\b/i },
  { title: 'Resources', near: /resource|links/i }
];

const isRule = line => /^-{3,}$/.test(line.trim());
const isListItem = line => /^\s*-\s+\S/.test(line);
const STEP_OK = /^\s{0,1}(?:(\d+)\.\s+\*\*.+?\*\*|\*\*(\d+)\.\s+.+?\*\*)/;
const STEP_CANDIDATE = /^\s{0,1}(?:\*\*)?\d+[.)]\s*\S/;

function validatePlan(rawContent, options = {}) {
  const type = options.type === 'experience' ? 'experience' : 'accelerator';
  const d = DIALECTS[type];
  const errors = [];
  const warnings = [];
  let howToLinks = 0;
  const err = (line, message, fix) => errors.push({ severity: 'error', line: line || null, message, fix: fix || '' });
  const warn = (line, message, fix) => warnings.push({ severity: 'warning', line: line || null, message, fix: fix || '' });
  const finish = (summary = {}) => {
    const byLine = (a, b) => (a.line || 0) - (b.line || 0);
    errors.sort(byLine);
    warnings.sort(byLine);
    return { ok: errors.length === 0, type, errors, warnings, summary };
  };

  const text = normalisePlanMd(rawContent);
  if (!text.trim()) {
    err(null, 'The file is empty.', 'Upload the plan as a Markdown (.md) file.');
    return finish();
  }

  const lines = text.split('\n');
  const lineNo = index => index + 1;

  // ── Wrong plan type ──────────────────────────────────────────────────────
  const hasOwnUnits = new RegExp(`^## ${d.unit} \\d+:`, 'm').test(text);
  const otherUnit = lines.findIndex(l => new RegExp(`^## ${d.other} \\d+:`).test(l));
  if (!hasOwnUnits && otherUnit !== -1) {
    err(lineNo(otherUnit),
      `This looks like ${type === 'accelerator' ? 'an Experience Design' : 'an accelerator'} plan: it uses "## ${d.other} N:" headings.`,
      type === 'accelerator'
        ? 'Upload it from the Create Experience page instead, or rename the headings to "## Tactic N:".'
        : 'Upload it from the Add Plan page instead, or rename the headings to "## Track N:".');
    return finish();
  }

  const placeholderLine = lines.findIndex(l => /\{\{[A-Z_0-9]+\}\}/.test(l));
  if (placeholderLine !== -1) {
    err(lineNo(placeholderLine), 'The plan contains a template placeholder such as {{NAME}}.', 'Replace it with the real text.');
  }
  const bracketLines = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => /\[(Client Name|client-slug|Step Title|Section Name|Week Title|Tip text|Link text|Metric name|Full Tactic Title|Short title|Action bullet|Checklist item)[^\]]*\]/i.test(l));
  bracketLines.slice(0, 5).forEach(({ i }) => err(lineNo(i), 'This line still has placeholder text from the plan template in [square brackets].', 'Replace it with the real content.'));

  // ── Outline: level-2 sections ────────────────────────────────────────────
  const h2 = [];
  lines.forEach((line, i) => {
    const m = line.match(/^## (?!#)\s*(.+?)\s*#*$/);
    if (m) h2.push({ title: m[1].trim(), start: i });
  });
  h2.forEach((sec, i) => { sec.end = i + 1 < h2.length ? h2[i + 1].start : lines.length; });
  const body = sec => lines.slice(sec.start + 1, sec.end);
  const hasContent = sec => body(sec).some(l => l.trim() && !isRule(l));
  const findSection = regex => h2.find(sec => regex.test(sec.title));
  const findLoose = name => lines.findIndex(l => new RegExp(`^\\s*(?:#{1,6}\\s*|\\*\\*)?${name}\\s*(?:\\*\\*)?:?\\s*$`, 'i').test(l) && !/^## (?!#)/.test(l));

  const requireSection = (name, regex, what, severity = 'error') => {
    const report = severity === 'error' ? err : warn;
    const sec = findSection(regex);
    if (!sec) {
      const loose = findLoose(name);
      if (loose !== -1) {
        report(lineNo(loose), `"${name}" is not written as a level-2 heading.`, `Change line ${lineNo(loose)} to "## ${name}".`);
      } else {
        report(null, `Missing "## ${name}" section.`, `Add a "## ${name}" heading followed by ${what}.`);
      }
      return null;
    }
    if (!hasContent(sec)) {
      report(lineNo(sec.start), `"## ${name}" has no text under it.`, `Add ${what} under the heading.`);
    }
    return sec;
  };

  // ── Top-level sections ───────────────────────────────────────────────────
  const goalSec = requireSection('Goal', /^Goal$/i, "one paragraph describing the client's 90-day goal");
  if (goalSec) {
    const tableLine = body(goalSec).findIndex(l => l.trim().startsWith('|'));
    if (tableLine !== -1) {
      warn(lineNo(goalSec.start + 1 + tableLine), 'The table in the Goal section is not shown on the dashboard.', 'The goal appears as paragraphs only. Put any figures the client must see into the goal text itself.');
    }
  }
  if (type === 'experience') {
    requireSection('The Experience', /^The Experience$/i, 'the one-sentence description of the experience');
  }
  requireSection('Strategic Positioning', /^Strategic Positioning$/i, 'the positioning paragraph');
  requireSection('Welcome Message', /^Welcome Message$/i, '1-2 sentences of encouragement for the welcome screen', 'warning');

  const metaSec = findSection(/^Meta$/i);
  const meta = metaSec ? readFields(body(metaSec).join('\n'), ['Client Slug', 'Has GBP Quick Wins', 'Has Projections', 'Has Bookability Checklist', 'Price Point', 'Launch Target', 'Grant Budget', 'Target Milestone']) : {};
  if (!metaSec) {
    warn(null, 'Missing "## Meta" section.', 'Add "## Meta" with a "Client Slug:" line under the title.');
  } else if (options.slug && meta['Client Slug'] && meta['Client Slug'] !== options.slug) {
    warn(lineNo(metaSec.start), `"Client Slug: ${meta['Client Slug']}" does not match the project slug "${options.slug}".`, 'The project slug from the form is used. Update the plan if it is wrong.');
  }

  // ── Tactics / Tracks ─────────────────────────────────────────────────────
  const unitRegex = new RegExp(`^${d.unit} (\\d+):\\s*(.*)$`);
  const units = h2.filter(sec => unitRegex.test(sec.title)).map(sec => {
    const m = sec.title.match(unitRegex);
    return { ...sec, number: Number(m[1]), title: m[2].trim(), steps: 0 };
  });

  lines.forEach((line, i) => {
    if (new RegExp(`^#{1,6}\\s*${d.unit}\\b`, 'i').test(line) && !new RegExp(`^## ${d.unit} \\d+: `).test(line) && !new RegExp(`^## ${d.unit} \\d+:$`).test(line)) {
      err(lineNo(i), `This heading is not recognised as a ${d.unit.toLowerCase()}: "${line.trim()}".`, `Write it as "## ${d.unit} 1: Title" (two hashes, a number, then a colon).`);
    }
  });

  if (units.length < d.minUnits) {
    err(null, `Found ${units.length} ${d.units}, need ${d.minUnits === d.maxUnits ? d.minUnits : `${d.minUnits} or ${d.maxUnits}`}.`, `Each one starts with a heading like "## ${d.unit} 1: Title".`);
  } else if (units.length > d.maxUnits) {
    err(lineNo(units[d.maxUnits].start), `Found ${units.length} ${d.units}, but a dashboard supports at most ${d.maxUnits}.`, `Merge or remove ${d.units} so there are ${d.maxUnits} or fewer.`);
  }
  units.forEach((unit, i) => {
    if (unit.number !== i + 1) {
      err(lineNo(unit.start), `${d.unit} headings must be numbered 1, 2, 3 in order. Found "${d.unit} ${unit.number}" in position ${i + 1}.`, `Change line ${lineNo(unit.start)} to "## ${d.unit} ${i + 1}: ...".`);
    }
  });

  units.forEach(unit => {
    const name = `${d.unit} ${unit.number}`;
    const at = lineNo(unit.start);
    if (!unit.title) err(at, `${name} has no title.`, `Add the title after the colon: "## ${name}: Title".`);

    // Header fields
    const firstH3 = lines.findIndex((l, i) => i > unit.start && i < unit.end && /^###\s/.test(l));
    const headerEnd = firstH3 === -1 ? unit.end : firstH3;
    const header = readFields(lines.slice(unit.start + 1, headerEnd).join('\n'), ['Phase', 'Short Label', 'Subtitle']);
    const fieldHelp = {
      'Phase': 'a phase name such as Foundation',
      'Short Label': '2-4 words for the sidebar',
      'Subtitle': 'one sentence for the page header'
    };
    Object.keys(fieldHelp).forEach(field => {
      if (!header[field]) {
        err(at, `${name} is missing its "${field}:" line.`, `Add "${field}: ..." (${fieldHelp[field]}) directly under the heading on line ${at}.`);
      }
    });
    if (header['Short Label'] && header['Short Label'].length > 28) {
      warn(at, `${name}: the Short Label "${header['Short Label']}" is long for the sidebar.`, 'Shorten it to 2-4 words.');
    }

    // Level-3 subsections
    const subs = [];
    for (let i = unit.start + 1; i < unit.end; i++) {
      const m = lines[i].match(/^(#{3,6})\s+(.+?)\s*#*$/);
      if (m && m[1].length === 3) subs.push({ title: m[2].trim(), start: i });
    }
    subs.forEach((sub, i) => { sub.end = i + 1 < subs.length ? subs[i + 1].start : unit.end; });
    const subBody = sub => lines.slice(sub.start + 1, sub.end).map((l, k) => ({ text: l, index: sub.start + 1 + k }));

    const found = {};
    UNIT_SECTIONS.forEach(({ title, near }) => {
      const exact = subs.find(sub => sub.title.toLowerCase() === title.toLowerCase());
      if (exact) {
        found[title] = exact;
        if (!subBody(exact).some(l => l.text.trim() && !isRule(l.text))) {
          err(lineNo(exact.start), `${name}: "### ${title}" has nothing under it.`, 'Add the content for this section.');
        }
        return;
      }
      // A heading that is close, at any level
      let nearIndex = -1;
      for (let i = unit.start + 1; i < unit.end; i++) {
        const m = lines[i].match(/^(?:#{1,6}\s+|\*\*)(.+?)(?:\*\*)?:?\s*$/);
        if (m && near.test(m[1]) && !/^####\s*Part\b/i.test(lines[i]) && !/^\s*\*\*\d/.test(lines[i])) { nearIndex = i; break; }
      }
      if (nearIndex !== -1) {
        err(lineNo(nearIndex), `${name}: the heading "${lines[nearIndex].trim()}" is not recognised.`, `Change line ${lineNo(nearIndex)} to "### ${title}".`);
      } else {
        err(at, `${name} is missing its "### ${title}" section.`, `Add a "### ${title}" heading with its content inside ${name}.`);
      }
    });

    // Implementation Steps
    const stepsSec = found['Implementation Steps'];
    if (stepsSec) {
      const rows = subBody(stepsSec);
      const parts = [];
      let expected = 1;
      let numberingReported = false;
      let lastStep = null;
      const looseStepLines = [];
      rows.forEach(({ text: l, index }) => {
        if (/^####\s*Part [A-Z]: /.test(l) || /^####\s*Part [A-Z]:$/.test(l)) {
          parts.push({ line: lineNo(index), steps: 0, title: l.replace(/^####\s*Part [A-Z]:\s*/, '').trim() });
          if (!parts[parts.length - 1].title) err(lineNo(index), `${name}: this Part has no title.`, 'Add a title after the colon: "#### Part A: Title".');
          return;
        }
        if (/^#{1,6}\s*part\b/i.test(l)) {
          err(lineNo(index), `${name}: this Part heading is not recognised: "${l.trim()}".`, 'Write it as "#### Part A: Title" (four hashes, a capital letter, then a colon).');
          return;
        }
        const ok = l.match(STEP_OK);
        if (ok) {
          const num = Number(ok[1] || ok[2]);
          if (lastStep && lastStep.bullets === 0) warn(lastStep.line, `${name}: Step ${lastStep.num} has no bullet points under it.`, 'Add the instructions as "- " bullets, or leave it if the title says it all.');
          lastStep = { num, line: lineNo(index), bullets: 0 };
          unit.steps += 1;
          if (parts.length) parts[parts.length - 1].steps += 1;
          if (num !== expected && !numberingReported) {
            err(lineNo(index), `${name}: step numbering must run 1, 2, 3 across all Parts without restarting. Expected ${expected}, found ${num}.`, `Renumber from line ${lineNo(index)} so the steps continue in sequence. "how to" links rely on these numbers.`);
            numberingReported = true;
          }
          expected = num + 1;
          return;
        }
        if (STEP_CANDIDATE.test(l)) {
          const num = Number(l.match(/(\d+)[.)]/)[1]);
          err(lineNo(index), `${name}: this step is not recognised: "${l.trim().slice(0, 60)}".`, `Write it as "${num}. **Step title**" with the title in bold, then put the details underneath as "- " bullets.`);
          // Still count it, so one mistake does not set off numbering and
          // "how to" link errors for every step after it.
          lastStep = { num, line: lineNo(index), bullets: 1 };
          unit.steps += 1;
          if (parts.length) parts[parts.length - 1].steps += 1;
          expected = num + 1;
          return;
        }
        if (isListItem(l) && lastStep) { lastStep.bullets += 1; return; }
        // Anything else under a step that is not a bullet is not shown
        if (lastStep && l.trim() && !isRule(l) && !/^#/.test(l.trim()) && !/^\|/.test(l.trim())) {
          looseStepLines.push(lineNo(index));
        }
      });
      if (lastStep && lastStep.bullets === 0) warn(lastStep.line, `${name}: Step ${lastStep.num} has no bullet points under it.`, 'Add the instructions as "- " bullets, or leave it if the title says it all.');

      if (looseStepLines.length) {
        warn(looseStepLines[0], `${name}: ${looseStepLines.length} line${looseStepLines.length === 1 ? '' : 's'} under the steps ${looseStepLines.length === 1 ? 'is' : 'are'} not written as a bullet, so ${looseStepLines.length === 1 ? 'it' : 'they'} will not appear on the dashboard${looseStepLines.length > 1 ? ` (first on line ${looseStepLines[0]})` : ''}.`, 'Start each line of step detail with "- ".');
      }

      if (unit.steps === 0) {
        err(lineNo(stepsSec.start), `${name}: no implementation steps were found.`, 'Write each step as "1. **Step title**" followed by "- " bullets.');
      }
      if (parts.length === 0) {
        err(lineNo(stepsSec.start), `${name}: the steps are not grouped into Parts.`, 'Add headings such as "#### Part A: Setup" above each group of steps.');
      }
      parts.filter(part => part.steps === 0).forEach(part => err(part.line, `${name}: this Part has no steps under it.`, 'Add at least one step, or remove the Part heading.'));
    }

    // Success Metrics
    const metricsSec = found['Success Metrics'];
    unit.metricRows = 0;
    if (metricsSec) {
      const tableRows = subBody(metricsSec).filter(l => l.text.trim().startsWith('|'));
      const dataRows = tableRows.filter(l => !/^\|[\s|:-]+\|?$/.test(l.text.trim())).slice(1);
      if (tableRows.length < 2 || !/^\|[\s|:-]+\|?$/.test((tableRows[1] || { text: '' }).text.trim())) {
        err(lineNo(metricsSec.start), `${name}: Success Metrics needs a table with a header row and a "|---|" separator row.`, 'Start the table with "| Metric | 30 Days | 60 Days | 90 Days |" and "|--------|---------|---------|---------|".');
      } else if (dataRows.length === 0) {
        err(lineNo(metricsSec.start), `${name}: the Success Metrics table has no rows.`, 'Add at least one row: "| Metric name | target | target | target |".');
      }
      dataRows.forEach(row => {
        const cells = row.text.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length < 4) {
          err(lineNo(row.index), `${name}: this metrics row has ${cells.length} filled column${cells.length === 1 ? '' : 's'} and needs 4.`, 'Fill all four columns: "| Metric | 30 Days | 60 Days | 90 Days |". Write "n/a" where there is no target.');
        } else {
          unit.metricRows += 1;
        }
      });
    }

    // Tips
    const tipsSec = found['Tips'];
    unit.tips = tipsSec ? subBody(tipsSec).filter(l => isListItem(l.text)).length : 0;
    if (tipsSec && unit.tips === 0) {
      err(lineNo(tipsSec.start), `${name}: no tips were found.`, 'Write each tip on its own line starting with "- ".');
    }

    // Resources
    const resSec = found['Resources'];
    unit.resources = 0;
    if (resSec) {
      const items = subBody(resSec).filter(l => isListItem(l.text));
      if (items.length === 0) {
        err(lineNo(resSec.start), `${name}: no resources were found.`, 'Add at least one link: "- [Link text](https://example.com)".');
      }
      items.forEach(item => {
        const link = item.text.match(/\[(.+?)\]\((.+?)\)/);
        if (!link) {
          err(lineNo(item.index), `${name}: this resource is not a link.`, 'Write it as "- [Link text](https://example.com)".');
        } else if (!/^(https?:\/\/|mailto:)/i.test(link[2].trim())) {
          err(lineNo(item.index), `${name}: the link address "${link[2].trim().slice(0, 50)}" is not a full web address.`, 'Start it with "https://".');
        } else {
          unit.resources += 1;
        }
      });
    }
  });

  // ── Objectives ───────────────────────────────────────────────────────────
  const objectivesSec = requireSection('Objectives', /^Objectives$/i, `one "### Objective N" block per ${d.unit.toLowerCase()}`);
  if (objectivesSec) {
    const blocks = [];
    for (let i = objectivesSec.start + 1; i < objectivesSec.end; i++) {
      const m = lines[i].match(/^### Objective (\d+)$/);
      if (m) blocks.push({ number: Number(m[1]), start: i });
      else if (/^#{1,6}\s*objective\b/i.test(lines[i])) err(lineNo(i), `This objective heading is not recognised: "${lines[i].trim()}".`, 'Write it as "### Objective 1" on its own line.');
    }
    blocks.forEach((block, i) => { block.end = i + 1 < blocks.length ? blocks[i + 1].start : objectivesSec.end; });
    if (units.length && blocks.length !== units.length) {
      err(lineNo(objectivesSec.start), `Found ${blocks.length} objective${blocks.length === 1 ? '' : 's'} for ${units.length} ${d.units}.`, `Add one "### Objective N" block for each ${d.unit.toLowerCase()}.`);
    }
    blocks.forEach(block => {
      const fields = readFields(lines.slice(block.start + 1, block.end).join('\n'), ['Title', 'Description', 'Tactic Pill', 'Track Pill']);
      if (!fields['Title']) err(lineNo(block.start), `Objective ${block.number} is missing its "Title:" line.`, 'Add "Title: ..." under the heading.');
      if (!fields['Description']) err(lineNo(block.start), `Objective ${block.number} is missing its "Description:" line.`, 'Add "Description: ..." (1-2 sentences) under the heading.');
      if (!fields['Tactic Pill'] && !fields['Track Pill']) {
        err(lineNo(block.start), `Objective ${block.number} is missing its "${d.pill}:" line.`, `Add "${d.pill}: ${d.unit} ${block.number} · Weeks 1-4" under the heading.`);
      }
    });
  }

  // An action can also link to the plan's optional page
  const optionalPage = type === 'accelerator'
    ? { name: 'GBP Quick Wins', flag: 'Has GBP Quick Wins', pattern: /^(GBP )?Quick Wins$/i, included: (meta['Has GBP Quick Wins'] || '').toLowerCase() === 'yes' && !!findSection(/^(GBP )?Quick Wins$/i) }
    : { name: 'Bookability Checklist', flag: 'Has Bookability Checklist', pattern: /^Bookability Checklist$/i, included: (meta['Has Bookability Checklist'] || '').toLowerCase() === 'yes' && !!findSection(/^Bookability Checklist$/i) };

  // ── Roadmap ──────────────────────────────────────────────────────────────
  [1, 2, 3].forEach(n => {
    if (!new RegExp(`^Month ${n} Name:\\s*\\S`, 'm').test(text)) {
      warn(null, `Missing "Month ${n} Name:" line in the roadmap.`, `Add "Month ${n} Name: ..." under the roadmap heading, or the month will be labelled "Month ${n}".`);
    }
  });

  const weeks = [];
  lines.forEach((line, i) => {
    const m = line.match(/^### Week (\d+):\s*(.*)$/);
    if (m) {
      weeks.push({ number: Number(m[1]), title: m[2].trim(), start: i });
    } else if (/^#{1,6}\s*week\s*#?\d+/i.test(line)) {
      const num = Number(line.match(/week\s*#?(\d+)/i)[1]);
      err(lineNo(i), `This week heading is not recognised: "${line.trim().slice(0, 60)}".`, `Write it as "### Week ${num}: Title" (three hashes, the number, then a colon).`);
      // Still treat it as the start of that week, so one mistake does not
      // set off errors for the weeks around it.
      weeks.push({ number: num, title: line.trim(), start: i });
    }
  });
  weeks.forEach((week, i) => {
    const nextWeek = i + 1 < weeks.length ? weeks[i + 1].start : lines.length;
    const nextH2 = h2.find(sec => sec.start > week.start);
    week.end = Math.min(nextWeek, nextH2 ? nextH2.start : lines.length);
  });

  const weekNumbers = weeks.map(w => w.number);
  const missingWeeks = Array.from({ length: 12 }, (_, i) => i + 1).filter(n => !weekNumbers.includes(n));
  if (missingWeeks.length) {
    err(null, `The roadmap needs Weeks 1 to 12. Missing: Week ${missingWeeks.join(', Week ')}.`, 'Add a "### Week N: Title" block for each missing week.');
  }
  weeks.forEach((week, i) => {
    if (week.number > 12) err(lineNo(week.start), `Week ${week.number} is beyond the 12-week roadmap.`, 'Fold its content into Weeks 1 to 12.');
    if (weekNumbers.indexOf(week.number) !== i) err(lineNo(week.start), `Week ${week.number} appears more than once.`, 'Renumber or merge the duplicate week.');
    else if (i > 0 && week.number < weeks[i - 1].number) err(lineNo(week.start), `Week ${week.number} is out of order.`, 'List the weeks in order from 1 to 12.');
    if (!week.title) err(lineNo(week.start), `Week ${week.number} has no title.`, 'Add a title after the colon: "### Week 1: Title".');

    const actionsAt = lines.findIndex((l, k) => k > week.start && k < week.end && l === '**Actions:**');
    const checklistAt = lines.findIndex((l, k) => k > week.start && k < week.end && l === '**Checklist:**');
    week.actions = 0;
    week.checklist = 0;
    if (actionsAt === -1) {
      err(lineNo(week.start), `Week ${week.number} has no "**Actions:**" line.`, 'Add "**Actions:**" on its own line, followed by "- " bullets.');
    }
    if (checklistAt === -1) {
      err(lineNo(week.start), `Week ${week.number} has no "**Checklist:**" line.`, 'Add "**Checklist:**" on its own line, followed by "- [ ] " items.');
    }
    if (actionsAt !== -1 && checklistAt !== -1 && checklistAt < actionsAt) {
      err(lineNo(checklistAt), `Week ${week.number}: "**Checklist:**" comes before "**Actions:**".`, 'Put the Actions list first, then the Checklist.');
      return;
    }
    if (actionsAt === -1 || checklistAt === -1) return;

    const scan = (from, to, kind) => {
      for (let k = from; k < to; k++) {
        const l = lines[k];
        if (!l.trim() || isRule(l)) continue;
        if (isListItem(l)) {
          week[kind] += 1;
          const annotation = l.match(/→ links to:\s*(.*)$/);
          if (annotation) {
            const target = annotation[1].trim().match(/^(?:Tactic|Track) (\d+) \/ Step (\d+)$/);
            const pageTarget = optionalPage.pattern.test(annotation[1].trim());
            if (pageTarget) {
              if (!optionalPage.included) {
                err(lineNo(k), `Week ${week.number}: this "how to" link points at ${optionalPage.name}, but the plan does not include that page.`, `Set "${optionalPage.flag}: yes" in Meta and add the "## ${optionalPage.name}" section, or remove the "→ links to:" note.`);
              } else if (kind === 'actions') {
                howToLinks += 1;
              }
            } else if (!target) {
              err(lineNo(k), `Week ${week.number}: this "how to" link is not recognised: "→ links to: ${annotation[1].trim()}".`, `Write it as "→ links to: ${d.unit} 1 / Step 3"${optionalPage.included ? ` or "→ links to: ${optionalPage.name}"` : ''}.`);
            } else {
              const unit = units.find(u => u.number === Number(target[1]));
              if (!unit) {
                err(lineNo(k), `Week ${week.number}: this "how to" link points at ${d.unit} ${target[1]}, which does not exist.`, `Use a ${d.unit.toLowerCase()} number from 1 to ${units.length}.`);
              } else if (Number(target[2]) < 1 || Number(target[2]) > unit.steps) {
                err(lineNo(k), `Week ${week.number}: this "how to" link points at Step ${target[2]}, but ${d.unit} ${target[1]} has ${unit.steps} step${unit.steps === 1 ? '' : 's'}.`, 'Point it at an existing step, or remove the "→ links to:" note.');
              } else if (kind === 'actions') {
                howToLinks += 1;
              }
            }
            if (kind === 'checklist') {
              warn(lineNo(k), `Week ${week.number}: a "→ links to:" note on a checklist item is ignored.`, 'Move the note to the matching action bullet.');
            }
          }
        } else {
          warn(lineNo(k), `Week ${week.number}: this line is not a list item, so it will not appear on the dashboard: "${l.trim().slice(0, 50)}".`, 'Start it with "- " or remove it.');
        }
      }
    };
    scan(actionsAt + 1, checklistAt, 'actions');
    scan(checklistAt + 1, week.end, 'checklist');
    if (week.actions === 0) err(lineNo(actionsAt), `Week ${week.number} has no actions.`, 'Add at least one "- " bullet under "**Actions:**".');
    if (week.checklist === 0) err(lineNo(checklistAt), `Week ${week.number} has no checklist items.`, 'Add at least one "- [ ] " item under "**Checklist:**".');
  });

  // ── Optional pages ───────────────────────────────────────────────────────
  if (type === 'accelerator' && (meta['Has Projections'] || '').toLowerCase() === 'yes') {
    warn(metaSec ? lineNo(metaSec.start) : null, 'Meta says "Has Projections: yes", but the upload cannot build the projections section because the plan has no projection figures.', 'The dashboard will be created without projections. Ask for them to be added afterwards if this client needs them.');
  }

  if (type === 'accelerator') {
    const flag = (meta['Has GBP Quick Wins'] || '').toLowerCase() === 'yes';
    const sec = findSection(/^(GBP )?Quick Wins$/i);
    if (flag && !sec) {
      err(metaSec ? lineNo(metaSec.start) : null, 'Meta says "Has GBP Quick Wins: yes" but there is no "## GBP Quick Wins" section.', 'Add the section at the end of the plan, or change the Meta line to "no".');
    } else if (sec && !flag) {
      warn(lineNo(sec.start), 'The "## GBP Quick Wins" section will be left out because Meta does not say "Has GBP Quick Wins: yes".', 'Add "Has GBP Quick Wins: yes" to the Meta section to include the Quick Wins page.');
    } else if (sec && flag) {
      let group = false;
      let items = 0;
      body(sec).forEach((l, k) => {
        if (/^### \S/.test(l)) group = true;
        else if (isListItem(l)) {
          items += 1;
          if (!group) err(lineNo(sec.start + 1 + k), 'This Quick Win is not under a group heading.', 'Add a heading such as "### On the Google Business Profile" above the first item.');
        }
      });
      if (items === 0) err(lineNo(sec.start), 'The "## GBP Quick Wins" section has no items.', 'Add items as "- **Action.** Why it matters" under a "### Group" heading.');
    }
  } else {
    const flag = (meta['Has Bookability Checklist'] || '').toLowerCase() === 'yes';
    const sec = findSection(/^Bookability Checklist$/i);
    if (flag && !sec) {
      err(metaSec ? lineNo(metaSec.start) : null, 'Meta says "Has Bookability Checklist: yes" but there is no "## Bookability Checklist" section.', 'Add the section at the end of the plan, or change the Meta line to "no".');
    } else if (sec && !flag) {
      warn(lineNo(sec.start), 'The "## Bookability Checklist" section will be left out because Meta does not say "Has Bookability Checklist: yes".', 'Add "Has Bookability Checklist: yes" to the Meta section to include the page.');
    } else if (sec && flag) {
      const items = body(sec).map((l, k) => ({ l, k })).filter(({ l }) => /^### \S/.test(l));
      if (items.length === 0) err(lineNo(sec.start), 'The "## Bookability Checklist" section has no items.', 'Write each item as a "### Item title" heading followed by one sentence.');
      items.forEach(({ k }, i) => {
        const end = i + 1 < items.length ? items[i + 1].k : body(sec).length;
        if (!body(sec).slice(k + 1, end).some(l => l.trim() && !isRule(l))) {
          err(lineNo(sec.start + 1 + k), 'This Bookability item has no description.', 'Add one sentence under the heading explaining why it matters.');
        }
      });
    }
  }

  // ── Style ────────────────────────────────────────────────────────────────
  const metaRange = metaSec ? [metaSec.start, metaSec.end] : [-1, -1];
  const emDashLines = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l, i }) => l.includes('—') && i !== 0 && !(i >= metaRange[0] && i < metaRange[1]) && !/^#/.test(l));
  if (emDashLines.length) {
    warn(lineNo(emDashLines[0].i), `Em dashes (—) appear on ${emDashLines.length} line${emDashLines.length === 1 ? '' : 's'}${emDashLines.length > 1 ? `, first on line ${lineNo(emDashLines[0].i)}` : ''}.`, 'The style guide avoids em dashes. Use a colon, a comma or a new sentence.');
  }

  // Markers left for someone to resolve appear on the dashboard exactly as written
  const confirmLines = lines.map((l, i) => ({ l, i })).filter(({ l }) => /\[CONFIRM\b/i.test(l));
  if (confirmLines.length) {
    warn(lineNo(confirmLines[0].i), `${confirmLines.length} [CONFIRM ...] marker${confirmLines.length === 1 ? '' : 's'} will appear on the dashboard exactly as written${confirmLines.length > 1 ? `, first on line ${lineNo(confirmLines[0].i)}` : ''}.`, 'Replace each one with the confirmed detail, or leave it if the client is meant to fill it in.');
  }

  // ── Safety net: compare with what the parser actually read ──────────────
  const summary = {
    [d.units]: units.length,
    steps: units.reduce((sum, u) => sum + u.steps, 0),
    weeks: weeks.length,
    checklistItems: weeks.reduce((sum, w) => sum + (w.checklist || 0), 0),
    howToLinks
  };

  if (errors.length === 0) {
    const parsed = d.parse(text);
    if (parsed.error) {
      err(null, `The plan could not be read: ${parsed.error}.`, 'Check the plan against the plan format.');
    } else {
      const mismatch = (what, written, read, line) => {
        if (written !== read) err(line, `${what}: ${written} written in the plan but ${read} read by the generator.`, 'Check the formatting of this section against the plan format. Nothing was uploaded.');
      };
      mismatch(`Number of ${d.units}`, units.length, parsed.tactics.length, null);
      units.forEach((unit, i) => {
        const p = parsed.tactics[i];
        if (!p) return;
        const name = `${d.unit} ${unit.number}`;
        mismatch(`${name} steps`, unit.steps, p.implementationSteps.length, lineNo(unit.start));
        mismatch(`${name} metrics rows`, unit.metricRows, p.successMetrics.length, lineNo(unit.start));
        mismatch(`${name} tips`, unit.tips, p.tips.length, lineNo(unit.start));
        mismatch(`${name} resources`, unit.resources, p.resources.length, lineNo(unit.start));
      });
      mismatch('Objectives', units.length, parsed.objectives.length, null);
      mismatch('Weeks', 12, parsed.roadmap.weeks.length, null);
      weeks.forEach(week => {
        const p = parsed.roadmap.weeks.find(w => w.number === week.number);
        if (!p) return;
        mismatch(`Week ${week.number} actions`, week.actions, p.actions.length, lineNo(week.start));
        mismatch(`Week ${week.number} checklist items`, week.checklist, p.checklist.length, lineNo(week.start));
      });
    }
  }

  return finish(summary);
}

/**
 * One line per issue, for plain-text displays and logs.
 */
function formatIssue(issue) {
  const where = issue.line ? `Line ${issue.line}: ` : '';
  return `${where}${issue.message}${issue.fix ? ` Fix: ${issue.fix}` : ''}`;
}

/**
 * A short plain-text summary suitable for an error message.
 */
function formatReport(report, limit = 8) {
  const count = report.errors.length;
  if (count === 0) return 'The plan passed all checks.';
  const head = `The plan needs ${count} change${count === 1 ? '' : 's'} before it can be uploaded:`;
  const shown = report.errors.slice(0, limit).map(issue => `• ${formatIssue(issue)}`);
  const more = count > limit ? [`• ...and ${count - limit} more.`] : [];
  return [head, ...shown, ...more].join('\n');
}

export { validatePlan, formatIssue, formatReport };
