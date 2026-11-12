/**
 * Keeps the plan format files and the upload check in step.
 *
 * PLAN_FORMAT.md and PLAN_FORMAT_EXPERIENCE.md are what plan writers (and the
 * Claude Project that drafts plans) follow. Each contains a skeleton. These
 * tests fill that skeleton with sample text and run it through the same check
 * and generator an upload uses. If someone changes the format file or the
 * check so that they disagree, a test fails.
 */

const fs = require('fs');
const path = require('path');

const { validatePlan, formatIssue } = require('../shared/plan-validator.js');
const { parsePlanMd, renderDashboard, validateDashboardHtml } = require('../shared/plan-generator.js');
const { parseExperiencePlanMd, renderExperienceDashboard, validateExperienceHtml } = require('../shared/experience-generator.js');

const ROOT = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(ROOT, name), 'utf8');

// The fenced block under "## Skeleton"
function skeleton(doc) {
  const section = doc.slice(doc.indexOf('## Skeleton'));
  const match = section.match(/```markdown\n([\s\S]*?)\n```/);
  if (!match) throw new Error('No skeleton block found');
  return match[1];
}

// Replace every [bracketed placeholder] with sample text. Checklist boxes
// "[ ]" and Markdown links "[text](url)" are left alone.
const fill = text => text.replace(/\[(?! \])[^\]\n]+\](?!\()/g, 'Sample text');

let warnSpy;
beforeAll(() => { warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
afterAll(() => { warnSpy.mockRestore(); });

describe.each([
  ['PLAN_FORMAT.md', 'accelerator'],
  ['PLAN_FORMAT_EXPERIENCE.md', 'experience']
])('%s', (file, type) => {
  const doc = read(file);
  const raw = skeleton(doc);
  const plan = fill(raw);

  test('the skeleton, once filled in, passes the upload check with no errors or warnings', () => {
    const report = validatePlan(plan, { type });
    expect(report.errors.map(formatIssue)).toEqual([]);
    expect(report.warnings.map(formatIssue)).toEqual([]);
    expect(report.summary.weeks).toBe(12);
    expect(report.summary.howToLinks).toBeGreaterThan(8);
  });

  test('the skeleton as written, with its placeholders, is rejected', () => {
    const report = validatePlan(raw, { type });
    expect(report.ok).toBe(false);
    expect(report.errors.some(e => /placeholder text from the plan template/.test(e.message))).toBe(true);
  });

  test('the filled-in skeleton generates a complete, valid dashboard', () => {
    if (type === 'accelerator') {
      const { html, unfilledPlaceholders } = renderDashboard(read('template/accelerator-template.html'), {
        clientName: 'Sample Client', slug: 'sample-client', coachEmail: 'coach@example.com', onboardingCallDate: '2026-01-15', ...parsePlanMd(plan)
      });
      expect(unfilledPlaceholders).toEqual([]);
      expect(validateDashboardHtml(html)).toEqual([]);
      expect(html).toContain('id="qw_1"');
      expect(html).toContain("onclick=\"navigate('gbp')\">how to</button>");
    } else {
      const { html, unfilledPlaceholders } = renderExperienceDashboard(read('template/experience-template.html'), {
        clientName: 'Sample Client', slug: 'sample-client', coachEmail: 'coach@example.com', ...parseExperiencePlanMd(plan)
      });
      expect(unfilledPlaceholders).toEqual([]);
      expect(validateExperienceHtml(html)).toEqual([]);
      expect(html).toContain('id="bookability_5"');
      expect(html).toContain("navigate('bookability')");
    }
  });

  test('the skeleton has no em dashes and no annotation arrows that could be copied into a plan', () => {
    expect(raw).not.toContain('—');
    expect(raw).not.toContain('←');
  });

  test('every heading the check requires is named in the rules', () => {
    ['### What We Heard From You', '### What This Is', '### Why It Matters', '### Implementation Steps', '### Success Metrics', '### Tips', '### Resources',
      '**Actions:**', '**Checklist:**', '→ links to:'].forEach(required => expect(doc).toContain(required));
  });
});

describe('CLAUDE_PROJECT_INSTRUCTIONS.md', () => {
  const doc = read('CLAUDE_PROJECT_INSTRUCTIONS.md');

  test('points at the format files and at nothing that no longer exists', () => {
    expect(doc).toContain('PLAN_FORMAT.md');
    expect(doc).toContain('PLAN_FORMAT_EXPERIENCE.md');
    expect(doc).not.toContain('PLAN_TEMPLATE.md');
  });

  test('its step example is accepted by the upload check', () => {
    const example = doc.match(/#### Part A: Setup\n[\s\S]*?(?=\n```)/)[0];
    const base = fill(skeleton(read('PLAN_FORMAT.md')));
    // Swap Tactic 2's steps for the example and repoint its links at steps that exist
    const start = base.indexOf('## Tactic 2:');
    const stepsStart = base.indexOf('### Implementation Steps', start);
    const stepsEnd = base.indexOf('### Success Metrics', stepsStart);
    const plan = (base.slice(0, stepsStart) + '### Implementation Steps\n\n' + example + '\n\n' + base.slice(stepsEnd))
      .replace(/→ links to: Tactic 2 \/ Step 4/g, '→ links to: Tactic 2 / Step 3');
    const report = validatePlan(plan, { type: 'accelerator' });
    expect(report.errors.map(formatIssue)).toEqual([]);
    expect(parsePlanMd(plan).tactics[1].implementationSteps.map(s => s.title))
      .toEqual(['Create the account', 'Link Google Analytics', 'Set up conversion tracking']);
  });

  test('does not allow things the upload cannot use', () => {
    expect(doc).toMatch(/Do not write `Has Projections:`/);
    expect(doc).toMatch(/table in the Goal is not shown/);
    expect(doc).not.toMatch(/may end with a scenario table/);
  });

  test('has no em dashes', () => {
    expect(doc).not.toContain('—');
  });
});
