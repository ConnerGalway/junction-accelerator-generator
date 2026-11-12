/**
 * Tests for shared/plan-generator.js, the accelerator dashboard generator
 * behind the "Add Plan" upload.
 *
 * Every real accelerator plan in clients/ is run through the generator
 * against the current template. If a template change adds a placeholder the
 * generator does not fill, or the generator emits markup the dashboard JS
 * cannot use, these tests fail before anything reaches a client.
 */

const fs = require('fs');
const path = require('path');

const {
  parsePlanMd,
  renderDashboard,
  processTemplate,
  generatePlanJson,
  validateDashboardHtml
} = require('../shared/plan-generator.js');

const ROOT = path.join(__dirname, '..');
const CLIENTS = path.join(ROOT, 'clients');
const TEMPLATE = fs.readFileSync(path.join(ROOT, 'template', 'accelerator-template.html'), 'utf8');

const readPlan = slug => fs.readFileSync(path.join(CLIENTS, slug, 'plan.md'), 'utf8');

// All accelerator plans in the repo (experience plans use "## Track N:")
const ACCELERATOR_SLUGS = fs.readdirSync(CLIENTS).filter(slug => {
  const planPath = path.join(CLIENTS, slug, 'plan.md');
  return fs.existsSync(planPath) && /^## Tactic \d+:/m.test(fs.readFileSync(planPath, 'utf8'));
});

function generate(slug) {
  const plan = parsePlanMd(readPlan(slug));
  const result = renderDashboard(TEMPLATE, {
    clientName: 'Test Client',
    slug,
    coachEmail: 'coach@example.com',
    onboardingCallDate: '2026-01-15',
    ...plan
  });
  return { plan, ...result };
}

// Count "N. **Title**" lines inside each tactic's Implementation Steps
function countPlanSteps(md) {
  return md
    .split(/(?=^## )/m)
    .filter(section => /^## Tactic \d+:/.test(section))
    .map(section => {
      const steps = section.split('### Implementation Steps')[1] || '';
      return (steps.split('### Success Metrics')[0].match(/^\s*(?:\d+\.\s+\*\*|\*\*\d+\.\s)/gm) || []).length;
    });
}

let warnSpy;
beforeAll(() => { warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
afterAll(() => { warnSpy.mockRestore(); });

describe('real client plans', () => {
  test('there are accelerator plans to test against', () => {
    expect(ACCELERATOR_SLUGS.length).toBeGreaterThanOrEqual(5);
    // The two plans that originally produced broken dashboards
    expect(ACCELERATOR_SLUGS).toEqual(expect.arrayContaining(['sasquatch-inn', 'harrison-beach-hotel']));
  });

  describe.each(ACCELERATOR_SLUGS)('%s', slug => {
    let out;
    let md;
    beforeAll(() => {
      md = readPlan(slug);
      out = generate(slug);
    });

    test('parses without error', () => {
      expect(out.plan.error).toBeUndefined();
      expect(out.plan.roadmap.weeks).toHaveLength(12);
      expect(out.plan.tactics.length).toBe((md.match(/^## Tactic \d+:/gm) || []).length);
      expect(out.plan.objectives.length).toBe(out.plan.tactics.length);
    });

    test('keeps every implementation step in the plan', () => {
      expect(out.plan.tactics.map(t => t.implementationSteps.length)).toEqual(countPlanSteps(md));
    });

    test('every tactic section has content', () => {
      for (const tactic of out.plan.tactics) {
        expect(tactic.whatHeard).not.toBe('');
        expect(tactic.whatIs).not.toBe('');
        expect(tactic.whyMatters).not.toBe('');
        expect(tactic.successMetrics.length).toBeGreaterThan(0);
        expect(tactic.tips.length).toBeGreaterThan(0);
        expect(tactic.resources.length).toBeGreaterThan(0);
        expect(tactic.breakdowns.length).toBeGreaterThan(0);
      }
    });

    test('every week has actions and a checklist', () => {
      for (const week of out.plan.roadmap.weeks) {
        expect(week.actions.length).toBeGreaterThan(0);
        expect(week.checklist.length).toBeGreaterThan(0);
      }
    });

    test('does not turn a horizontal rule into a checklist item or action', () => {
      for (const week of out.plan.roadmap.weeks) {
        for (const text of [...week.actions, ...week.checklist]) {
          expect(text).not.toMatch(/^-+$/);
        }
      }
      expect(out.html).not.toContain('label">---</label>');
    });

    test('fills every placeholder in the template', () => {
      expect(out.unfilledPlaceholders).toEqual([]);
    });

    test('produces a structurally valid dashboard', () => {
      expect(validateDashboardHtml(out.html)).toEqual([]);
    });

    test('has no placeholder filler text', () => {
      expect(out.html).not.toMatch(/(Implementation steps|Metrics|Tips|Resources) will be added/);
    });

    test('has no empty breakdown cards', () => {
      expect(out.html).not.toMatch(/<div class="tactic-breakdown-title"[^>]*><\/div>/);
    });
  });
});

describe('dashboard markup', () => {
  let html;
  beforeAll(() => { html = generate('sasquatch-inn').html; });

  test('implementation steps use the collapsible parts structure', () => {
    expect(html).toContain('<div class="tactic-parts-list">');
    expect(html).toContain('<button class="tactic-part-header" onclick="toggleTacticPart(this)">');
    expect(html).toContain('<li class="tactic-step-item" id="step-t1-1">');
    expect(html).toContain('<span class="tactic-step-num">1</span>');
    expect(html).not.toContain('class="step-item"');
    expect(html).not.toContain('class="step-num"');
  });

  test('only the first part of each tactic is open', () => {
    const open = (html.match(/<div class="tactic-part open">/g) || []).length;
    const lists = (html.match(/<div class="tactic-parts-list">/g) || []).length;
    expect(open).toBe(lists);
  });

  test('checklist items have a checkbox, note toggle and note area', () => {
    expect(html).toContain('<input type="checkbox" class="check-input" id="week-1-check-1" data-key="week-1-check-1" onchange="onCheck(this)">');
    expect(html).toContain('data-editable-key="week-1-check-1-label"');
    expect(html).toContain('id="note-area-week-1-check-1"');
    expect(html).toContain("saveNote('week_1',this.value)");
  });

  test('quick wins page uses qw_N checkboxes', () => {
    expect(html).toContain('id="qw_1"');
    expect(html).toContain('data-editable-key="qw_1-label"');
    expect(html).toContain('id="note-area-qw_1"');
  });

  test('JS config objects have the shape the dashboard script reads', () => {
    const phases = JSON.parse(html.match(/const PHASES = (\[[\s\S]*?\]);\n/)[1]);
    expect(phases).toHaveLength(3);
    expect(phases[0]).toEqual({ num: 1, weeks: [1, 2, 3, 4], name: expect.any(String) });
    expect(phases[2].weeks).toEqual([9, 10, 11, 12]);

    const weekTactics = JSON.parse(html.match(/const WEEK_TACTICS = (\{[\s\S]*?\});\n/)[1]);
    expect(Object.keys(weekTactics)).toHaveLength(12);
    expect(weekTactics[1]).toEqual({ num: 1, name: expect.any(String) });
    expect(weekTactics[1].name).not.toBe('');
  });

  test('removes the template header comment and keeps required scripts', () => {
    expect(html.trimStart().startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('data-client-slug="sasquatch-inn"');
  });

  test('processTemplate returns the same HTML as renderDashboard', () => {
    const plan = parsePlanMd(readPlan('sasquatch-inn'));
    const data = { clientName: 'Test Client', slug: 'sasquatch-inn', coachEmail: 'coach@example.com', onboardingCallDate: '2026-01-15', ...plan };
    expect(processTemplate(TEMPLATE, data)).toBe(renderDashboard(TEMPLATE, data).html);
  });
});

describe('four-tactic plans', () => {
  const fourTactic = ACCELERATOR_SLUGS.filter(slug => /^## Tactic 4:/m.test(readPlan(slug)));

  test('the repo has a four-tactic plan to test against', () => {
    expect(fourTactic.length).toBeGreaterThan(0);
  });

  test.each(fourTactic)('%s fills the Tactic 4 navigation, title and objective', slug => {
    const { plan, html } = generate(slug);
    expect(plan.tactics).toHaveLength(4);
    expect(html).toContain(plan.tactics[3].shortLabel.replace(/&/g, '&amp;'));
    expect(html).toContain('id="step-t4-1"');
  });
});

describe('parser', () => {
  test('keeps steps whose title line has a trailing note', () => {
    const md = readPlan('sasquatch-inn').replace(
      /^1\. \*\*(.+?)\*\*$/m,
      (line, title) => `1. **${title}** *(contractor task, $800 to $1,200)*`
    );
    const before = parsePlanMd(readPlan('sasquatch-inn'));
    const after = parsePlanMd(md);
    expect(after.tactics[0].implementationSteps.length).toBe(before.tactics[0].implementationSteps.length);
    expect(after.tactics[0].implementationSteps[0].title).toContain('(contractor task, $800 to $1,200)');
    expect(after.tactics[0].implementationSteps[0].bullets).toEqual(before.tactics[0].implementationSteps[0].bullets);
  });

  test('rejects a plan with no Goal section', () => {
    const md = readPlan('sasquatch-inn').replace('## Goal', '## Aim');
    expect(parsePlanMd(md).error).toMatch(/Goal/);
  });

  test('rejects a plan with fewer than three tactics', () => {
    const md = readPlan('sasquatch-inn').replace('## Tactic 3:', '## Strategy 3:');
    expect(parsePlanMd(md).error).toMatch(/3 tactics/);
  });

  test('rejects a plan with fewer than twelve weeks', () => {
    const md = readPlan('sasquatch-inn').replace('### Week 12:', '### Wk 12:');
    expect(parsePlanMd(md).error).toMatch(/expected 12/);
  });
});

describe('plan.json', () => {
  test('has twelve plain-text weeks with deep links', () => {
    const plan = parsePlanMd(readPlan('sasquatch-inn'));
    const json = generatePlanJson('Sasquatch Inn', 'sasquatch-inn', 'coach@example.com', plan);
    expect(json.client_slug).toBe('sasquatch-inn');
    expect(json.coach_email).toBe('coach@example.com');
    expect(json.goal).toBe(plan.goal);
    expect(json.weeks).toHaveLength(12);
    json.weeks.forEach((week, i) => {
      expect(week.week).toBe(i + 1);
      expect(week.month).toBe(Math.ceil((i + 1) / 4));
      expect(week.title).toMatch(new RegExp(`^Week ${i + 1}: `));
      expect(week.deep_link).toBe(`https://accelerator.elearningu.com/sasquatch-inn/#week-${i + 1}`);
      [...week.actions, ...week.checklist].forEach(text => expect(text).not.toMatch(/\*\*/));
    });
  });
});

describe('single source of truth', () => {
  // The upload function and the local script must import the shared module,
  // not carry their own copy of the parser or renderer.
  test.each([
    'netlify/functions/create-project.js',
    'scripts/regenerate-dashboards.js'
  ])('%s does not define its own generator', file => {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    expect(source).toContain('shared/plan-generator.js');
    expect(source).not.toMatch(/function (parsePlanMd|processTemplate|renderDashboard|generateWeekCardHtml)\b/);
  });
});
