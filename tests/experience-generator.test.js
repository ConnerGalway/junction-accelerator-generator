/**
 * Tests for shared/experience-generator.js, the generator behind the
 * Experience Design plan upload.
 *
 * The sample plan in clients/sample-experience/plan.md is run through the
 * generator against the current experience template.
 */

const fs = require('fs');
const path = require('path');

const {
  parseExperiencePlanMd,
  renderExperienceDashboard,
  generateExperiencePlanJson,
  validateExperienceHtml
} = require('../shared/experience-generator.js');

const ROOT = path.join(__dirname, '..');
const TEMPLATE = fs.readFileSync(path.join(ROOT, 'template', 'experience-template.html'), 'utf8');
const SAMPLE_MD = fs.readFileSync(path.join(ROOT, 'clients', 'sample-experience', 'plan.md'), 'utf8');

function render(md, overrides = {}) {
  const plan = parseExperiencePlanMd(md);
  const result = renderExperienceDashboard(TEMPLATE, {
    clientName: 'Foothills Quarter Horses',
    slug: 'sample-experience',
    coachEmail: 'coach@example.com',
    ...plan,
    ...overrides
  });
  return { plan, ...result };
}

let warnSpy;
beforeAll(() => { warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
afterAll(() => { warnSpy.mockRestore(); });

describe('experience template', () => {
  test('contains no hard-coded sample content', () => {
    const body = TEMPLATE.slice(TEMPLATE.indexOf('<!DOCTYPE'));
    expect(body).not.toMatch(/class="week-card"/);
    expect(body).not.toMatch(/class="step-item"/);
    expect(body).not.toMatch(/class="tip-item"/);
    expect(body).not.toMatch(/id="bookability_\d+"/);
    expect(body).not.toMatch(/Squarespace|Port Alberni|Tofino/);
  });

  test('counts progress from the DOM', () => {
    expect(TEMPLATE).not.toContain('ids.filter(id => state.checks[id]).length');
  });
});

describe('parser', () => {
  let plan;
  beforeAll(() => { plan = parseExperiencePlanMd(SAMPLE_MD); });

  test('parses the sample plan', () => {
    expect(plan.error).toBeUndefined();
    expect(plan.tactics).toHaveLength(3);
    expect(plan.objectives).toHaveLength(3);
    expect(plan.roadmap.weeks).toHaveLength(12);
  });

  test('keeps every implementation step', () => {
    const expected = SAMPLE_MD
      .split(/(?=^## )/m)
      .filter(section => /^## Track \d+:/.test(section))
      .map(section => ((section.split('### Implementation Steps')[1] || '').split('### Success Metrics')[0].match(/^\s*(?:\d+\.\s+\*\*|\*\*\d+\.\s)/gm) || []).length);
    expect(plan.tactics.map(t => t.implementationSteps.length)).toEqual(expected);
    expect(expected.every(n => n > 0)).toBe(true);
  });

  test('every track section has content', () => {
    for (const track of plan.tactics) {
      expect(track.whatHeard).not.toBe('');
      expect(track.whatIs).not.toBe('');
      expect(track.whyMatters).not.toBe('');
      expect(track.successMetrics.length).toBeGreaterThan(0);
      expect(track.tips.length).toBeGreaterThan(0);
      expect(track.resources.length).toBeGreaterThan(0);
    }
  });

  test('reads the experience-specific fields', () => {
    expect(plan.experienceSentence).toMatch(/^A half-day at the ranch/);
    expect(plan.pricePoint).toBe('$145 per guest');
    expect(plan.launchTarget).toContain('·');
    expect(plan.hasBookabilityChecklist).toBe(true);
    expect(plan.bookabilityItems).toHaveLength((SAMPLE_MD.split('## Bookability Checklist')[1].match(/^### /gm) || []).length);
    expect(plan.bookabilityItems[0]).toEqual({ title: 'Insurance Coverage Confirmed', description: expect.stringMatching(/liability coverage/) });
  });

  test('the bookability section does not leak into Week 12', () => {
    const week12 = plan.roadmap.weeks[11];
    expect(week12.checklist).toHaveLength(3);
    week12.checklist.forEach(item => expect(item).not.toMatch(/^-+$|###/));
  });

  test('accepts a week heading directly followed by Actions', () => {
    const tight = SAMPLE_MD.replace(/(### Week \d+: .+)\n\n(\*\*Actions:\*\*)/g, '$1\n$2');
    expect(parseExperiencePlanMd(tight).roadmap.weeks).toHaveLength(12);
  });

  test('rejects an accelerator plan with a clear message', () => {
    const accelerator = SAMPLE_MD.replace(/^## Track (\d+):/gm, '## Tactic $1:');
    expect(parseExperiencePlanMd(accelerator).error).toMatch(/## Track N:/);
  });

  test('reports missing weeks in track terms', () => {
    const md = SAMPLE_MD.replace('### Week 12:', '### Wk 12:');
    expect(parseExperiencePlanMd(md).error).toMatch(/expected 12/);
    const twoTracks = SAMPLE_MD.replace('## Track 3:', '## Stage 3:');
    expect(parseExperiencePlanMd(twoTracks).error).toMatch(/3 tracks/);
  });
});

describe('generated dashboard', () => {
  let out;
  beforeAll(() => { out = render(SAMPLE_MD); });

  test('fills every placeholder in the template', () => {
    expect(out.unfilledPlaceholders).toEqual([]);
  });

  test('is structurally valid', () => {
    expect(validateExperienceHtml(out.html)).toEqual([]);
  });

  test("shows this operator's content", () => {
    expect(out.html).toContain(out.plan.tactics[0].implementationSteps[0].title);
    expect(out.html).toContain('<div class="week-title" data-editable-key="week-1-title">Know Your Guest</div>');
    expect(out.html).toContain('Insurance Coverage Confirmed');
    expect(out.html).toContain('A half-day at the ranch');
    expect(out.html).toContain('$145 per guest');
  });

  test('maps Track N steps and links to tacticN ids', () => {
    expect(out.html).toContain('<li class="step-item" id="step-t1-1">');
    expect(out.html).toContain("howToLink('tactic1','step-t1-1')");
    expect(out.html).not.toContain('→ links to:');
  });

  test('roadmap checkboxes use rwN_dM ids with week-N-check-M data keys', () => {
    expect(out.html).toContain('<input type="checkbox" class="check-input" id="rw1_d1" data-key="week-1-check-1" onchange="onCheck(this)">');
    expect(out.html).toContain('id="note-area-rw1_d1"');
  });

  test('month totals and checklist arrays follow four-week months', () => {
    const monthChecks = JSON.parse(out.html.match(/const MONTH_CHECKS = (\{[\s\S]*?\});/)[1]);
    const weeks = out.plan.roadmap.weeks;
    [1, 2, 3].forEach(month => {
      const expected = weeks.filter(w => Math.ceil(w.number / 4) === month).reduce((sum, w) => sum + w.checklist.length, 0);
      expect(monthChecks[month]).toHaveLength(expected);
      expect(out.html).toContain(`id="m${month}-prog"><span>0</span> of ${expected} done`);
    });
  });

  test('guide checkboxes are not counted in the checklist arrays', () => {
    const allIds = JSON.parse(out.html.match(/const ALL_CHECK_IDS = (\[[\s\S]*?\]);/)[1]);
    expect(allIds.filter(id => id.startsWith('gs'))).toEqual([]);
    expect(allIds.filter(id => id.startsWith('bookability_'))).toHaveLength(out.plan.bookabilityItems.length);
  });

  test('materials and guide start as coming soon', () => {
    expect(out.html).toContain('class="guide-status-pill coming"');
    expect(out.html).not.toMatch(/class="[^"]*\bavailable\b[^"]*"[^>]*>Coming Soon/);
  });

  test('cohort start date is left empty for the operator to set', () => {
    expect(out.html).toMatch(/<body[^>]*data-cohort-start=""/);
  });

  test('track progress labels use the plan phases', () => {
    const phases = out.plan.tactics.map(t => t.phase);
    expect(out.html).toContain(`const labels = ${JSON.stringify({ 1: phases[0], 2: phases[1], 3: phases[2] })};`);
  });
});

describe('optional blocks', () => {
  test('bookability page and its nav link are removed when the plan has none', () => {
    const md = SAMPLE_MD.replace(/^Has Bookability Checklist:.*$/m, 'Has Bookability Checklist: no');
    const { html } = render(md);
    expect(html).not.toContain('id="page-bookability"');
    expect(html).not.toContain("navigate('bookability')");
    expect(html).not.toMatch(/bookability_\d/);
    expect(validateExperienceHtml(html)).toEqual([]);
  });

  test('price point and launch target blocks are removed when not set', () => {
    const md = SAMPLE_MD.replace(/^Price Point:.*\n/m, '').replace(/^Launch Target:.*\n/m, '');
    const { html, plan } = render(md);
    expect(plan.pricePoint).toBeNull();
    expect(plan.launchTarget).toBeNull();
    expect(html).not.toContain('$145 per guest</div>');
    expect(validateExperienceHtml(html)).toEqual([]);
  });
});

describe('plan.json', () => {
  test('has twelve plain-text weeks with root deep links', () => {
    const plan = parseExperiencePlanMd(SAMPLE_MD);
    const json = generateExperiencePlanJson('Foothills Quarter Horses', 'sample-experience', 'coach@example.com', plan);
    expect(json.goal).toBe(plan.goal);
    expect(json.weeks).toHaveLength(12);
    json.weeks.forEach((week, i) => {
      expect(week.month).toBe(Math.ceil((i + 1) / 4));
      expect(week.deep_link).toBe(`https://accelerator.elearningu.com/sample-experience/#week-${i + 1}`);
      [...week.actions, ...week.checklist].forEach(text => expect(text).not.toMatch(/\*\*|→ links to:/));
    });
  });
});

describe('single source of truth', () => {
  test('the upload function imports the shared generator and writes to clients/', () => {
    const source = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'create-experience-project.js'), 'utf8');
    expect(source).toContain('shared/experience-generator.js');
    expect(source).not.toMatch(/function (parsePlanMd|processTemplate)\b/);
    expect(source).toContain('path: `clients/${slug}/index.html`');
    expect(source).not.toContain('experience/${slug}');
  });
});
