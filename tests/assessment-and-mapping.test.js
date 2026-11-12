/**
 * Tests for the parts of the accelerator generator that depend on data
 * beyond the plan text:
 *   - the Assessment page, filled from the client's assessment record
 *   - which tactic each roadmap week and checklist item belongs to
 *   - the "What This Breaks Into" cards
 *   - the projections block
 *
 * Real assessment records are read from the assessment-only pages in
 * clients/, which embed the same JSON that is stored in Supabase.
 */

const fs = require('fs');
const path = require('path');

const {
  parsePlanMd,
  renderDashboard,
  validateDashboardHtml,
  buildAssessmentFields,
  hasAssessmentContent,
  mapRoadmapToTactics
} = require('../shared/plan-generator.js');
const { validatePlan } = require('../shared/plan-validator.js');

const ROOT = path.join(__dirname, '..');
const CLIENTS = path.join(ROOT, 'clients');
const TEMPLATE = fs.readFileSync(path.join(ROOT, 'template', 'accelerator-template.html'), 'utf8');
const readPlan = slug => fs.readFileSync(path.join(CLIENTS, slug, 'plan.md'), 'utf8');

const ACCELERATOR_SLUGS = fs.readdirSync(CLIENTS).filter(slug => {
  const p = path.join(CLIENTS, slug, 'plan.md');
  return fs.existsSync(p) && /^## Tactic \d+:/m.test(fs.readFileSync(p, 'utf8'));
});

// Assessment records embedded in existing assessment-only pages
const ASSESSMENTS = fs.readdirSync(CLIENTS).map(slug => {
  const p = path.join(CLIENTS, slug, 'index.html');
  if (!fs.existsSync(p)) return null;
  const m = fs.readFileSync(p, 'utf8').match(/window\.ASSESSMENT_DATA = (\{[\s\S]*?\});<\/script>/);
  if (!m) return null;
  try { return { slug, data: JSON.parse(m[1]) }; } catch (e) { return null; }
}).filter(Boolean);

function render(planSlug, extra = {}) {
  const plan = parsePlanMd(readPlan(planSlug));
  return {
    plan,
    ...renderDashboard(TEMPLATE, {
      clientName: 'Test Client',
      slug: planSlug,
      coachEmail: 'coach@example.com',
      onboardingCallDate: '2026-01-15',
      ...plan,
      ...extra
    })
  };
}

const escapeHtml = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const assessmentSection = html => html.slice(html.indexOf('<section id="page-assessment"'), html.indexOf('</section>', html.indexOf('<section id="page-assessment"')));

let warnSpy;
beforeAll(() => { warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
afterAll(() => { warnSpy.mockRestore(); });

describe('Assessment page', () => {
  test('there are real assessment records to test against', () => {
    expect(ASSESSMENTS.length).toBeGreaterThanOrEqual(10);
  });

  describe.each(ASSESSMENTS)('with the $slug assessment', ({ data }) => {
    let section;
    let out;
    beforeAll(() => {
      out = render('sasquatch-inn', { assessment: data });
      section = assessmentSection(out.html);
    });

    test('the record is recognised as having content', () => {
      expect(hasAssessmentContent(data)).toBe(true);
    });

    test('the page is valid with nothing left unfilled', () => {
      expect(out.unfilledPlaceholders).toEqual([]);
      expect(validateDashboardHtml(out.html)).toEqual([]);
    });

    test('shows the overall score and all six category scores', () => {
      expect(section).toContain(`<span id="overallScore">${Math.round(data.overall.score)}</span>`);
      expect(section).toContain(`id="overallGrade">${data.overall.grade}</div>`);
      expect(section).not.toContain('>--<');
      expect(section).not.toContain('Assessment data will be populated');
      expect((section.match(/class="grade-breakdown-letter grade-[abcdf]"/g) || []).length).toBe(6);
    });

    test('shows the executive summary', () => {
      const summary = data.executive_summary;
      expect(section).toContain(escapeHtml(summary.headline));
      expect((section.match(/data-editable-key="strength-\d+"/g) || []).length).toBe(summary.key_strengths.length);
      expect((section.match(/data-editable-key="gap-\d+"/g) || []).length).toBe(summary.critical_gaps.length);
      expect(section).toContain(escapeHtml(summary.bottom_line));
    });

    test('shows quick wins, priority recommendations and six category cards', () => {
      expect((section.match(/class="quick-win-item"/g) || []).length).toBe(Math.min(6, data.quick_wins.length));
      expect((section.match(/class="priority-item"/g) || []).length).toBe(Math.min(4, data.priority_recommendations.length));
      expect((section.match(/class="category-card"/g) || []).length).toBe(6);
      const firstFinding = data.categories.website_technical.findings[0];
      if (firstFinding) expect(section).toContain(escapeHtml(firstFinding.text));
    });
  });

  test('assessment text is escaped', () => {
    const data = JSON.parse(JSON.stringify(ASSESSMENTS[0].data));
    data.executive_summary.headline = '<img src=x onerror=alert(1)> & more';
    const fields = buildAssessmentFields(data);
    expect(fields.EXECUTIVE_HEADLINE).toBe('&lt;img src=x onerror=alert(1)&gt; &amp; more');
  });

  test('without an assessment the page shows neutral placeholders and is still valid', () => {
    const out = render('sasquatch-inn');
    const section = assessmentSection(out.html);
    expect(section).toContain('Assessment data will be populated when available.');
    expect(section).toContain('<span id="overallScore">--</span>');
    expect(validateDashboardHtml(out.html)).toEqual([]);
  });

  test('an empty assessment record is treated as no assessment', () => {
    expect(hasAssessmentContent({})).toBe(false);
    expect(hasAssessmentContent(null)).toBe(false);
    expect(buildAssessmentFields({}).OVERALL_SCORE).toBe('--');
  });

  test('the upload function loads the assessment and refuses to blank a linked one', () => {
    const source = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'create-project.js'), 'utf8');
    expect(source).toContain(".from('client_assessments')");
    expect(source).toMatch(/isAddingPlanToAssessment && !assessment/);
    expect(source.indexOf('isAddingPlanToAssessment && !assessment')).toBeLessThan(source.indexOf('await commitToGitHub('));
  });
});

describe('weeks and checklist items mapped to tactics', () => {
  describe.each(ACCELERATOR_SLUGS)('%s', slug => {
    let out;
    let map;
    beforeAll(() => {
      out = render(slug);
      map = mapRoadmapToTactics(out.plan);
    });

    test('every tactic has checklist items and every item belongs to exactly one tactic', () => {
      const allIds = out.plan.roadmap.weeks.flatMap(w => w.checklist.map((_, i) => `week-${w.number}-check-${i + 1}`));
      const mapped = Object.values(map.checksByTactic).flat();
      expect([...mapped].sort()).toEqual([...allIds].sort());
      expect(Object.keys(map.checksByTactic)).toHaveLength(out.plan.tactics.length);
      Object.values(map.checksByTactic).forEach(ids => expect(ids.length).toBeGreaterThan(0));
    });

    test('every week has a primary tactic that exists', () => {
      for (let week = 1; week <= 12; week++) {
        expect(map.primaryByWeek[week]).toBeGreaterThanOrEqual(1);
        expect(map.primaryByWeek[week]).toBeLessThanOrEqual(out.plan.tactics.length);
      }
    });

    test('the page arrays match the mapping', () => {
      const tacticChecks = JSON.parse(out.html.match(/const TACTIC_CHECKS = (\{[\s\S]*?\});/)[1]);
      expect(tacticChecks).toEqual(map.checksByTactic);
      const weekTactics = JSON.parse(out.html.match(/const WEEK_TACTICS = (\{[\s\S]*?\});\n/)[1]);
      for (let week = 1; week <= 12; week++) expect(weekTactics[week].num).toBe(map.primaryByWeek[week]);
    });
  });

  test('a week follows the tactic most of its actions link to', () => {
    const plan = parsePlanMd(readPlan('sasquatch-inn'));
    const week = plan.roadmap.weeks[0];
    const counts = {};
    week.actions.forEach(a => { const m = a.match(/→ links to: Tactic (\d+)/); if (m) counts[m[1]] = (counts[m[1]] || 0) + 1; });
    const top = Number(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]);
    expect(mapRoadmapToTactics(plan).primaryByWeek[1]).toBe(top);
  });

  test('a plan with no "how to" links falls back to equal blocks of weeks', () => {
    const plan = parsePlanMd(readPlan('sasquatch-inn').replace(/\s*→ links to:.*$/gm, ''));
    const map = mapRoadmapToTactics(plan);
    expect([1, 4, 5, 8, 9, 12].map(week => map.primaryByWeek[week])).toEqual([1, 1, 2, 2, 3, 3]);
    expect(map.checksByTactic[1].every(id => /^week-[1-4]-/.test(id))).toBe(true);
    expect(map.checksByTactic[3].every(id => /^week-(9|10|11|12)-/.test(id))).toBe(true);
  });
});

describe('"What This Breaks Into" cards', () => {
  test.each(ACCELERATOR_SLUGS)('%s shows one card per Part in every tactic', slug => {
    const { plan, html } = render(slug);
    plan.tactics.forEach((tactic, i) => {
      const n = i + 1;
      const cards = (html.match(new RegExp(`data-editable-key="t${n}-breakdown-\\d+-title"`, 'g')) || []).length;
      expect(cards).toBe(tactic.breakdowns.length);
      expect(cards).toBeGreaterThan(0);
    });
  });

  test('a tactic with four Parts shows all four', () => {
    const fourParts = ACCELERATOR_SLUGS
      .map(slug => ({ slug, plan: parsePlanMd(readPlan(slug)) }))
      .find(({ plan }) => plan.tactics[0].breakdowns.length === 4);
    expect(fourParts).toBeDefined();
    const { html } = render(fourParts.slug);
    expect(html).toContain('data-editable-key="t1-breakdown-4-title"');
  });
});

describe('projections', () => {
  const md = readPlan('sasquatch-inn').replace('## Meta\n', '## Meta\nHas Projections: yes\n');

  test("the sample client's projection figures never appear", () => {
    const plan = parsePlanMd(md);
    expect(plan.hasProjections).toBe(true);
    const { html } = renderDashboard(TEMPLATE, { clientName: 'Test', slug: 'sasquatch-inn', coachEmail: 'c@example.com', onboardingCallDate: '2026-01-15', ...plan });
    expect(html).not.toContain('class="projections-section"');
    expect(html).not.toContain('$35,000 discretionary spend');
    expect(validateDashboardHtml(html)).toEqual([]);
  });

  test('the validator warns that projections will be left out', () => {
    const report = validatePlan(md, { type: 'accelerator' });
    expect(report.ok).toBe(true);
    expect(report.warnings.some(w => /Has Projections: yes/.test(w.message))).toBe(true);
  });
});
