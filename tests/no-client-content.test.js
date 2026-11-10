/**
 * Guard: no client's content may be pre-loaded into a future dashboard.
 *
 * A dashboard must contain only (a) what came from the uploaded plan and the
 * client's own assessment and (b) neutral program wording from the template.
 * These tests fail if a template, or a page generated from a template, ever
 * carries another client's name, wording, figures, links, images or email.
 *
 * How it works:
 *   - tests/fixtures/neutral-plan.md and neutral-experience-plan.md are plans
 *     in which every piece of content carries the marker "Zzq". Anything on a
 *     page generated from them that does not carry the marker came from the
 *     template itself.
 *   - Client names are read from the clients/ and elevated/ folders, and
 *     client wording from every real plan.md, plan.json and assessment record
 *     in the repo, so the guard covers new clients automatically.
 */

const fs = require('fs');
const path = require('path');

const { parsePlanMd, renderDashboard, validateDashboardHtml } = require('../shared/plan-generator.js');
const { parseExperiencePlanMd, renderExperienceDashboard, validateExperienceHtml } = require('../shared/experience-generator.js');
const { validatePlan } = require('../shared/plan-validator.js');

const ROOT = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

const TEMPLATES = ['accelerator-template.html', 'experience-template.html', 'assessment-only-template.html', 'elevated-learner-template.html'];
// The part of a template that reaches a page: everything after the header comment
const templateBody = name => {
  const source = read('template', name);
  return source.slice(source.indexOf('<!DOCTYPE'));
};

const NEUTRAL = read('tests', 'fixtures', 'neutral-plan.md');
const NEUTRAL_EXPERIENCE = read('tests', 'fixtures', 'neutral-experience-plan.md');

// A four-tactic version of the neutral plan, to exercise the Tactic 4 blocks
const NEUTRAL_FOUR = (() => {
  const start = NEUTRAL.indexOf('## Tactic 3:');
  const end = NEUTRAL.indexOf('## Objectives');
  const tactic4 = NEUTRAL.slice(start, end)
    .replace('## Tactic 3:', '## Tactic 4:')
    .replace(/tactic 3/g, 'tactic 4').replace(/Tactic 3 Title/, 'Tactic 4 Title')
    .replace(/Phase 3/, 'Phase 4').replace(/Label 3/, 'Label 4')
    .replace(/A3 \|/, 'A4 |').replace(/B3 \|/, 'B4 |').replace(/zzq-3-/g, 'zzq-4-');
  return (NEUTRAL.slice(0, end) + tactic4 + NEUTRAL.slice(end))
    .replace('### Objective 3\nTitle: Zzq objective 3 title\nDescription: Zzq objective 3 description.\nTactic Pill: Tactic 3 · Weeks 9-12\n',
      '### Objective 3\nTitle: Zzq objective 3 title\nDescription: Zzq objective 3 description.\nTactic Pill: Tactic 3 · Weeks 9-12\n\n### Objective 4\nTitle: Zzq objective 4 title\nDescription: Zzq objective 4 description.\nTactic Pill: Tactic 4 · Weeks 1-12\n');
})();

const COACH = 'zzq-coach@example.com';
const acceleratorPage = md => renderDashboard(read('template', 'accelerator-template.html'), {
  clientName: 'Zzq Client', slug: 'zzq-client', coachEmail: COACH, onboardingCallDate: '2026-01-15', ...parsePlanMd(md)
}).html;
const experiencePage = md => renderExperienceDashboard(read('template', 'experience-template.html'), {
  clientName: 'Zzq Client', slug: 'zzq-client', coachEmail: COACH, ...parseExperiencePlanMd(md)
}).html;

// ── Client identifiers and wording, gathered from the repo ─────────────────
const NOT_CLIENTS = new Set(['sample-demo', 'sample-experience', 'junction']);
const clientSlugs = ['clients', 'elevated']
  .flatMap(dir => fs.readdirSync(path.join(ROOT, dir)).filter(name => fs.statSync(path.join(ROOT, dir, name)).isDirectory()))
  .filter(slug => !NOT_CLIENTS.has(slug));

// "lifty-life-vacation-rentals" -> "lifty life vacation rentals", plus the
// distinctive first two words ("lifty life") for longer names
const clientNames = [...new Set(clientSlugs.flatMap(slug => {
  const words = slug.split('-');
  const names = [slug, words.join(' ')];
  if (words.length > 2) names.push(words.slice(0, 2).join(' '));
  return names;
}))].filter(name => !['the klondike', 'tourism oxford', 'tourism sarnia'].includes(name) || true);

const wordsOf = text => (text.toLowerCase().match(/[a-z0-9$%'’]+/g) || []);
const SHINGLE = 5;
const shinglesOf = text => {
  const words = wordsOf(text);
  const out = new Set();
  for (let i = 0; i + SHINGLE <= words.length; i++) out.add(words.slice(i, i + SHINGLE).join(' '));
  return out;
};

const collectStrings = (value, out) => {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach(v => collectStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach(v => collectStrings(v, out));
  return out;
};

const clientShingles = new Map();
for (const slug of fs.readdirSync(path.join(ROOT, 'clients'))) {
  if (NOT_CLIENTS.has(slug)) continue;
  for (const file of ['plan.md', 'plan.json']) {
    const p = path.join(ROOT, 'clients', slug, file);
    if (fs.existsSync(p)) shinglesOf(fs.readFileSync(p, 'utf8')).forEach(s => { if (!clientShingles.has(s)) clientShingles.set(s, `${slug}/${file}`); });
  }
  const page = path.join(ROOT, 'clients', slug, 'index.html');
  if (fs.existsSync(page)) {
    const m = fs.readFileSync(page, 'utf8').match(/window\.ASSESSMENT_DATA = (\{[\s\S]*?\});<\/script>/);
    if (m) {
      try {
        collectStrings(JSON.parse(m[1]), []).forEach(text => shinglesOf(text).forEach(s => { if (!clientShingles.has(s)) clientShingles.set(s, `${slug}/assessment`); }));
      } catch (e) { /* not valid JSON: nothing to compare */ }
    }
  }
}

// Wording that belongs to the plan format or the program, which client plans
// naturally repeat. Add to this list only for genuinely generic phrases.
const GENERIC_PHRASES = new Set([
  'what we heard from you',
  'success metrics metric 30 days',
  'metrics metric 30 days 60',
  '30 days 60 days 90',
  'days 60 days 90 days',
  'metric 30 days 60 days',
  'in front of the people'
]);

const visibleText = html => html
  .replace(/data:[a-z/+;0-9-]+,[A-Za-z0-9+/=]+/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"');

const sharedWithClients = text => [...shinglesOf(visibleText(text))]
  .filter(s => clientShingles.has(s) && !GENERIC_PHRASES.has(s))
  .map(s => `"${s}" (also in ${clientShingles.get(s)})`);

// For a generated page: drop every piece of text that carries the plan
// marker, so only what the template contributed is compared.
const templateContribution = html => html
  .replace(/data:[a-z/+;0-9-]+,[A-Za-z0-9+/=]+/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .split(/<[^>]+>/)
  .filter(piece => !/zzq/i.test(piece))
  .join(' \n ');

let warnSpy;
beforeAll(() => { warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
afterAll(() => { warnSpy.mockRestore(); });

describe('test fixtures', () => {
  test('the neutral plans are valid plans', () => {
    expect(validatePlan(NEUTRAL, { type: 'accelerator' }).errors).toEqual([]);
    expect(validatePlan(NEUTRAL_FOUR, { type: 'accelerator' }).errors).toEqual([]);
    expect(validatePlan(NEUTRAL_EXPERIENCE, { type: 'experience' }).errors).toEqual([]);
    expect(parsePlanMd(NEUTRAL_FOUR).tactics).toHaveLength(4);
  });

  test('there is real client material to compare against', () => {
    expect(clientSlugs.length).toBeGreaterThan(20);
    expect(clientShingles.size).toBeGreaterThan(50000);
    expect(clientNames).toEqual(expect.arrayContaining(['lifty life', 'red cariboo', 'sasquatch inn', 'ravens rest']));
  });
});

describe.each(TEMPLATES)('template/%s', name => {
  const body = templateBody(name);
  const lower = body.toLowerCase();

  test('names no client', () => {
    expect(clientNames.filter(client => lower.includes(client))).toEqual([]);
  });

  test("shares no wording with any client's plan or assessment", () => {
    expect(sharedWithClients(body)).toEqual([]);
  });

  test('contains no money amounts, email addresses or client image folders', () => {
    expect(body.match(/\$\d[\d,]*/g) || []).toEqual([]);
    expect(body.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi) || []).toEqual([]);
    expect(body.match(/\/assets\/[\w-]+-mockups\//g) || []).toEqual([]);
  });
});

describe.each([
  ['accelerator dashboard (3 tactics)', () => acceleratorPage(NEUTRAL), validateDashboardHtml],
  ['accelerator dashboard (4 tactics)', () => acceleratorPage(NEUTRAL_FOUR), validateDashboardHtml],
  ['experience dashboard', () => experiencePage(NEUTRAL_EXPERIENCE), validateExperienceHtml]
])('a %s generated from the neutral plan', (label, build, validate) => {
  let html;
  let lower;
  beforeAll(() => { html = build(); lower = html.toLowerCase(); });

  test('is a valid page', () => {
    expect(validate(html)).toEqual([]);
  });

  test('names no client', () => {
    expect(clientNames.filter(client => lower.includes(client))).toEqual([]);
  });

  test("shares no wording with any client's plan or assessment", () => {
    expect(sharedWithClients(templateContribution(html))).toEqual([]);
  });

  test('has no money amounts', () => {
    expect(visibleText(html.replace(/<script[\s\S]*?<\/script>/g, ' ')).match(/\$\d[\d,]*/g) || []).toEqual([]);
    const scripts = (html.match(/<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/g) || []).join('\n').replace(/data:[a-z/+;0-9-]+,[A-Za-z0-9+/=]+/g, '');
    expect(scripts.match(/['"`]\$\d[\d,]*/g) || []).toEqual([]);
  });

  test('has no email address other than the coach from the upload', () => {
    const emails = [...new Set(html.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi) || [])];
    expect(emails.filter(email => email !== COACH)).toEqual([]);
  });

  test('links and images point only at the plan, the program assets and shared libraries', () => {
    const allowed = /^(#|data:|mailto:|\/shared\/|\/assets\/(elearningu|junction|logo|favicon)[\w.-]*$|https:\/\/example\.com\/zzq-|https:\/\/fonts\.(googleapis|gstatic)\.com|https:\/\/cdn\.jsdelivr\.net\/)/;
    const urls = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map(m => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    expect([...new Set(urls.filter(url => !allowed.test(url)))]).toEqual([]);
  });

  test('carries no projection figures', () => {
    expect(html).not.toContain('class="projections-section"');
    if (html.includes('const SCENARIOS')) {
      expect(html).toMatch(/const SCENARIOS = \{\s*\};/);
    }
  });

  test("the plan's own content is what fills the page", () => {
    expect((html.match(/Zzq/g) || []).length).toBeGreaterThan(150);
  });
});

describe('dashboard progress messages', () => {
  test('describe progress only, and the text shown before the script runs matches the first message', () => {
    const html = acceleratorPage(NEUTRAL);
    const block = html.match(/const PROGRESS_HEADLINES = \[[\s\S]*?\n\];/)[0];
    // Nothing about what a particular plan contains
    expect(block).not.toMatch(/tracking|campaign|site improvements|measurement|converting|contractor|budget/i);
    const first = block.match(/\{ max: 10, headline: '((?:[^'\\]|\\.)*)', subcopy: '((?:[^'\\]|\\.)*)' \}/);
    const unescape = text => text.replace(/\\'/g, "'");
    expect(html).toContain(`id="dash-headline">${unescape(first[1])}</h2>`);
    expect(html).toMatch(new RegExp(`id="dash-subcopy"[^>]*>${unescape(first[2]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</p>`));
  });
});

describe('accelerator Assessment page without an assessment record', () => {
  test('shows only neutral placeholders, never findings', () => {
    const html = acceleratorPage(NEUTRAL);
    const start = html.indexOf('<section id="page-assessment"');
    const section = html.slice(start, html.indexOf('</section>', start));
    expect(section).toContain('Assessment data will be populated when available.');
    expect(section).not.toMatch(/class="(category-card|quick-win-item|priority-item|finding-item)"/);
    expect(section).not.toMatch(/data-editable-key="(strength|gap)-\d+"/);
  });
});
