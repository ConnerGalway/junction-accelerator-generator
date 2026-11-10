/**
 * Tests for shared/plan-validator.js: the check that runs on every uploaded
 * plan.md before anything is generated.
 *
 * Two promises are tested here:
 *   1. Every real plan in the repo passes with no errors.
 *   2. Each kind of formatting mistake is reported with the right line
 *      number and a specific fix, and harmless variations are accepted.
 */

const fs = require('fs');
const path = require('path');

const { validatePlan, formatIssue, formatReport } = require('../shared/plan-validator.js');
const { parsePlanMd, normalisePlanMd, inlineMarkdown, richText, renderDashboard } = require('../shared/plan-generator.js');
const { parseExperiencePlanMd } = require('../shared/experience-generator.js');

const ROOT = path.join(__dirname, '..');
const CLIENTS = path.join(ROOT, 'clients');
const read = slug => fs.readFileSync(path.join(CLIENTS, slug, 'plan.md'), 'utf8');

const PLANS = fs.readdirSync(CLIENTS)
  .filter(slug => fs.existsSync(path.join(CLIENTS, slug, 'plan.md')))
  .map(slug => ({ slug, type: /^## Track \d+:/m.test(read(slug)) ? 'experience' : 'accelerator' }));

const GOOD = read('sasquatch-inn');
const EXPERIENCE = read('sample-experience');

const lineOf = (md, needle) => md.split('\n').findIndex(l => l.includes(needle)) + 1;
const errorsFor = (md, options = { type: 'accelerator' }) => validatePlan(md, options).errors;
const findError = (md, pattern, options) => errorsFor(md, options).find(e => pattern.test(e.message));

let warnSpy;
beforeAll(() => { warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
afterAll(() => { warnSpy.mockRestore(); });

describe('real plans', () => {
  test.each(PLANS)('$slug ($type) passes with no errors', ({ slug, type }) => {
    const report = validatePlan(read(slug), { type, slug });
    expect(report.errors.map(formatIssue)).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.summary.weeks).toBe(12);
    expect(report.summary.steps).toBeGreaterThan(0);
  });
});

describe('problems are reported with a line number and a fix', () => {
  test('missing Short Label line', () => {
    const md = GOOD.replace(/^(## Tactic 2:.*\n(?:.*\n)*?)Short Label:.*\n/m, '$1');
    const error = findError(md, /Tactic 2 is missing its "Short Label:" line/);
    expect(error).toBeDefined();
    expect(error.line).toBe(lineOf(md, '## Tactic 2:'));
    expect(error.fix).toMatch(/Add "Short Label: \.\.\."/);
  });

  test('misnamed section heading', () => {
    const md = GOOD.replace('### Why It Matters', '### Why This Matters');
    const error = findError(md, /heading "### Why This Matters" is not recognised/);
    expect(error).toBeDefined();
    expect(error.line).toBe(lineOf(md, '### Why This Matters'));
    expect(error.fix).toContain('"### Why It Matters"');
  });

  test('section at the wrong heading level', () => {
    const md = GOOD.replace('### Tips', '#### Tips');
    const error = findError(md, /heading "#### Tips" is not recognised/);
    expect(error).toBeDefined();
    expect(error.fix).toContain('"### Tips"');
  });

  test('step without a bold title', () => {
    const md = GOOD.replace(/^2\. \*\*(.+?)\*\*$/m, (line, title) => `2. ${title}`);
    const error = findError(md, /this step is not recognised/);
    expect(error).toBeDefined();
    expect(md.split('\n')[error.line - 1]).toMatch(/^2\. /);
    expect(error.fix).toContain('**Step title**');
  });

  test('step numbering that restarts in a later Part', () => {
    const lines = GOOD.split('\n');
    const partB = lines.findIndex(l => /^#### Part B:/.test(l));
    const firstStep = lines.findIndex((l, i) => i > partB && /^\d+\. \*\*/.test(l));
    lines[firstStep] = lines[firstStep].replace(/^\d+\./, '1.');
    const error = findError(lines.join('\n'), /step numbering must run 1, 2, 3/);
    expect(error).toBeDefined();
    expect(error.line).toBe(firstStep + 1);
  });

  test('steps not grouped into Parts', () => {
    const md = GOOD.replace(/^#### Part [A-Z]:.*\n/gm, '');
    expect(findError(md, /steps are not grouped into Parts/)).toBeDefined();
  });

  test('metrics row with a missing column', () => {
    const lines = GOOD.split('\n');
    const row = lines.findIndex((l, i) => l.startsWith('|') && !/^\|[\s|:-]+\|?$/.test(l) && /^\|[\s|:-]+\|?$/.test(lines[i - 1]));
    lines[row] = lines[row].split('|').slice(0, 4).join('|') + '|';
    const error = findError(lines.join('\n'), /metrics row has 3 filled columns and needs 4/);
    expect(error).toBeDefined();
    expect(error.line).toBe(row + 1);
  });

  test('resource that is not a link', () => {
    const md = GOOD.replace(/^- \[(.+?)\]\((.+?)\).*$/m, '- $1');
    const error = findError(md, /resource is not a link/);
    expect(error).toBeDefined();
    expect(error.fix).toContain('[Link text](https://example.com)');
  });

  test('missing week', () => {
    const md = GOOD.replace('### Week 7:', '### Semaine 7:');
    expect(findError(md, /Missing: Week 7\./)).toBeDefined();
  });

  test('unrecognised week heading', () => {
    const md = GOOD.replace('### Week 7:', '#### Week 7');
    const error = findError(md, /week heading is not recognised/);
    expect(error).toBeDefined();
    expect(error.line).toBe(lineOf(md, '#### Week 7'));
  });

  test('week without a Checklist', () => {
    const lines = GOOD.split('\n');
    const week3 = lines.findIndex(l => l.startsWith('### Week 3:'));
    const checklist = lines.findIndex((l, i) => i > week3 && l.trim() === '**Checklist:**');
    lines.splice(checklist, 1);
    const error = findError(lines.join('\n'), /Week 3 has no "\*\*Checklist:\*\*" line/);
    expect(error).toBeDefined();
    expect(error.line).toBe(week3 + 1);
  });

  test('"how to" link to a step that does not exist', () => {
    const md = GOOD.replace(/→ links to: Tactic 1 \/ Step \d+/, '→ links to: Tactic 1 / Step 99');
    const error = findError(md, /points at Step 99, but Tactic 1 has \d+ steps/);
    expect(error).toBeDefined();
    expect(error.line).toBe(lineOf(md, 'Step 99'));
  });

  test('malformed "how to" link', () => {
    const md = GOOD.replace(/→ links to: Tactic 1 \/ Step \d+/, '→ links to: the first tactic');
    expect(findError(md, /"how to" link is not recognised/)).toBeDefined();
  });

  test('objective without a Tactic Pill', () => {
    const md = GOOD.replace(/^Tactic Pill:.*\n/m, '');
    const error = findError(md, /Objective 1 is missing its "Tactic Pill:" line/);
    expect(error).toBeDefined();
    expect(error.line).toBe(lineOf(md, '### Objective 1'));
  });

  test('Quick Wins flagged in Meta but no section', () => {
    const md = GOOD.replace(/\n## GBP Quick Wins[\s\S]*$/, '\n').replace(/→ links to: (GBP )?Quick Wins/g, '');
    expect(/^Has GBP Quick Wins: yes/m.test(md)).toBe(true);
    expect(findError(md, /there is no "## GBP Quick Wins" section/)).toBeDefined();
  });

  test('too few tactics', () => {
    const md = GOOD.replace('## Tactic 3:', '## Strategy 3:');
    expect(findError(md, /Found 2 tactics/)).toBeDefined();
  });

  test('placeholder text left from the plan template', () => {
    const md = GOOD.replace(/^1\. \*\*.+?\*\*$/m, '1. **[Step Title]**');
    const error = findError(md, /placeholder text from the plan template/);
    expect(error).toBeDefined();
    expect(error.line).toBe(lineOf(md, '[Step Title]'));
  });

  test('missing Goal section', () => {
    const md = GOOD.replace('## Goal', '## Aim');
    expect(findError(md, /Missing "## Goal" section/)).toBeDefined();
  });

  test('Goal written as bold text instead of a heading', () => {
    const md = GOOD.replace('## Goal', '**Goal**');
    const error = findError(md, /"Goal" is not written as a level-2 heading/);
    expect(error).toBeDefined();
    expect(error.fix).toContain('"## Goal"');
  });

  test('experience plan uploaded as an accelerator plan', () => {
    const errors = errorsFor(EXPERIENCE, { type: 'accelerator' });
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/looks like an Experience Design plan/);
  });

  test('accelerator plan uploaded as an experience plan', () => {
    const errors = errorsFor(GOOD, { type: 'experience' });
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/looks like an accelerator plan/);
  });

  test('empty file', () => {
    expect(errorsFor('   \n')).toEqual([expect.objectContaining({ message: 'The file is empty.' })]);
  });

  test('several problems are all reported at once, in line order', () => {
    const md = GOOD
      .replace('### Why It Matters', '### Why This Matters')
      .replace('### Week 7:', '### Semaine 7:')
      .replace(/^Tactic Pill:.*\n/m, '');
    const errors = errorsFor(md);
    expect(errors.length).toBeGreaterThanOrEqual(3);
    const numbered = errors.filter(e => e.line).map(e => e.line);
    expect(numbered).toEqual([...numbered].sort((a, b) => a - b));
  });
});

describe('experience plans', () => {
  test('Bookability flagged in Meta but no section', () => {
    const md = EXPERIENCE.replace(/\n## Bookability Checklist[\s\S]*$/, '\n');
    expect(findError(md, /there is no "## Bookability Checklist" section/, { type: 'experience' })).toBeDefined();
  });

  test('missing "The Experience" section', () => {
    const md = EXPERIENCE.replace('## The Experience', '## About');
    expect(findError(md, /Missing "## The Experience" section/, { type: 'experience' })).toBeDefined();
  });

  test('messages use Track wording', () => {
    const md = EXPERIENCE.replace(/^Short Label:.*\n/m, '');
    expect(findError(md, /Track 1 is missing its "Short Label:" line/, { type: 'experience' })).toBeDefined();
  });
});

describe('harmless variations are accepted and read the same', () => {
  const baseline = parsePlanMd(GOOD);
  const sameAsBaseline = md => {
    expect(errorsFor(md).map(formatIssue)).toEqual([]);
    const parsed = parsePlanMd(md);
    expect(parsed.tactics.map(t => [t.title, t.phase, t.shortLabel, t.implementationSteps.length, t.tips.length]))
      .toEqual(baseline.tactics.map(t => [t.title, t.phase, t.shortLabel, t.implementationSteps.length, t.tips.length]));
    expect(parsed.objectives).toEqual(baseline.objectives);
    expect(parsed.roadmap.weeks.map(w => [w.title, w.actions.length, w.checklist.length]))
      .toEqual(baseline.roadmap.weeks.map(w => [w.title, w.actions.length, w.checklist.length]));
  };

  test('Windows line endings', () => sameAsBaseline(GOOD.replace(/\n/g, '\r\n')));
  test('"## Tactic #1 - Title" headings', () => sameAsBaseline(GOOD.replace(/^## Tactic (\d+): /gm, '## Tactic #$1 - ')));
  test('"### Week 1 - Title" headings', () => sameAsBaseline(GOOD.replace(/^### Week (\d+): /gm, '### Week $1 - ')));
  test('bold field labels', () => sameAsBaseline(GOOD.replace(/^(Phase|Short Label|Subtitle|Title|Description|Tactic Pill): /gm, '**$1:** ')));
  test('blank lines between header fields', () => sameAsBaseline(GOOD.replace(/^(Phase|Short Label): (.*)$/gm, '$1: $2\n')));
  test('header fields in a different order', () => sameAsBaseline(GOOD.replace(/^(Phase: .*)\n(Short Label: .*)$/gm, '$2\n$1')));
  test('"Actions:" and "Checklist:" without bold', () => sameAsBaseline(GOOD.replace(/^\*\*(Actions|Checklist):\*\*$/gm, '$1:')));
  test('"*" bullets', () => sameAsBaseline(GOOD.replace(/^(\s*)- /gm, '$1* ')));
  test('"- []" checklist boxes', () => sameAsBaseline(GOOD.replace(/^- \[ \] /gm, '- [] ')));
  test('"->" link arrows', () => sameAsBaseline(GOOD.replace(/→ links to:/g, '-> links to:')));
  test('trailing spaces and a byte-order mark', () => sameAsBaseline('\uFEFF' + GOOD.replace(/$/gm, '  ')));

  test('normalising never changes the number of lines', () => {
    const variants = [GOOD, EXPERIENCE, GOOD.replace(/^- /gm, '* '), GOOD.replace(/^## Tactic (\d+): /gm, '## Tactic #$1 - ')];
    variants.forEach(md => expect(normalisePlanMd(md).split('\n')).toHaveLength(md.split('\n').length));
  });

  test('experience plan with "## Track #1 - Title" headings', () => {
    const md = EXPERIENCE.replace(/^## Track (\d+): /gm, '## Track #$1 - ');
    expect(errorsFor(md, { type: 'experience' }).map(formatIssue)).toEqual([]);
    expect(parseExperiencePlanMd(md).tactics).toHaveLength(3);
  });
});

describe('report formatting', () => {
  test('formatReport lists each change with its line and fix', () => {
    const md = GOOD.replace('### Why It Matters', '### Why This Matters');
    const text = formatReport(validatePlan(md, { type: 'accelerator' }));
    expect(text).toMatch(/^The plan needs 1 change before it can be uploaded:/);
    expect(text).toMatch(/• Line \d+: .+ Fix: Change line \d+ to "### Why It Matters"\./);
  });

  test('formatReport on a clean plan', () => {
    expect(formatReport(validatePlan(GOOD, { type: 'accelerator' }))).toBe('The plan passed all checks.');
  });
});

describe('Markdown in plan text', () => {
  test('bold, italic, code and links are rendered', () => {
    expect(inlineMarkdown('Use **bold** and *italic* and `code`')).toBe('Use <strong>bold</strong> and <em>italic</em> and <code>code</code>');
    expect(inlineMarkdown('See [the guide](https://example.com/a?b=1&c=2)'))
      .toBe('See <a href="https://example.com/a?b=1&amp;c=2" target="_blank" rel="noopener">the guide</a>');
  });

  test('HTML in plan text is escaped, never executed', () => {
    expect(inlineMarkdown('<script>alert(1)</script> & **ok**')).toBe('&lt;script&gt;alert(1)&lt;/script&gt; &amp; <strong>ok</strong>');
    expect(inlineMarkdown('[x](javascript:alert(1))')).not.toContain('<a ');
  });

  test('unpaired bold markers are dropped', () => {
    expect(inlineMarkdown('An **unfinished thought')).toBe('An unfinished thought');
  });

  test('richText handles paragraphs and blockquotes', () => {
    expect(richText('First paragraph.\n\n> **Your Strategic Positioning**\n> The statement.'))
      .toBe('First paragraph.<br><br><strong>Your Strategic Positioning</strong><br>The statement.');
  });

  test('no raw Markdown markers reach any generated dashboard', () => {
    const template = fs.readFileSync(path.join(ROOT, 'template', 'accelerator-template.html'), 'utf8');
    PLANS.filter(p => p.type === 'accelerator').forEach(({ slug }) => {
      const { html } = renderDashboard(template, { clientName: 'Test', slug, coachEmail: 'c@example.com', onboardingCallDate: '2026-01-15', ...parsePlanMd(read(slug)) });
      const visible = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '');
      expect(visible.includes('**')).toBe(false);
      expect(visible).not.toMatch(/→ links to:/);
    });
  });
});

describe('upload functions', () => {
  test.each([
    'netlify/functions/create-project.js',
    'netlify/functions/create-experience-project.js'
  ])('%s validates the plan and the generated page before committing', file => {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const validateAt = source.indexOf('validatePlan(planMd');
    const pageCheckAt = source.indexOf('pageProblems');
    const commitAt = source.indexOf('await commitToGitHub(');
    expect(validateAt).toBeGreaterThan(-1);
    expect(pageCheckAt).toBeGreaterThan(validateAt);
    expect(commitAt).toBeGreaterThan(pageCheckAt);
  });
});
