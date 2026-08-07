#!/usr/bin/env node
/**
 * validate-client.js
 *
 * Read-only validation of generated client pages against the quality
 * checklist in CLAUDE.md. Makes NO changes to any file.
 *
 * Usage:
 *   node scripts/validate-client.js <slug> [slug ...]   Validate specific clients
 *   node scripts/validate-client.js --all               Validate every client
 *   node scripts/validate-client.js --all --strict      Warnings also fail (exit 1)
 *
 * Exit codes: 0 = no errors, 1 = errors found (or warnings in --strict mode)
 *
 * Severity levels:
 *   ERROR = broken or incomplete generation (unresolved placeholders,
 *           dangling IDs, malformed plan.json)
 *   WARN  = drift from the current standard (older template vintages that
 *           predate Supabase progress attributes, missing plan.json, etc.)
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const CLIENTS_DIR = path.join(REPO_ROOT, 'clients');
const DEEP_LINK_BASE = 'https://accelerator.elearningu.com';

// ── Helpers ──────────────────────────────────────────────────────────────

function extractQuotedStrings(source) {
  const out = [];
  const re = /['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(source)) !== null) out.push(m[1]);
  return out;
}

/** Extract the body of `const NAME = [...]` or `const NAME = {...}` */
function extractJsBlock(html, name) {
  const re = new RegExp(`const\\s+${name}\\s*=\\s*(\\[[\\s\\S]*?\\]|\\{[\\s\\S]*?\\});`);
  const m = html.match(re);
  return m ? m[1] : null;
}

function lineOf(html, index) {
  return html.slice(0, index).split('\n').length;
}

// ── Individual checks ────────────────────────────────────────────────────

function checkPlaceholders(html, report) {
  // Strip HTML comments first: the template's header doc block legitimately
  // mentions {{UPPER_SNAKE_CASE}} inside a comment. IF markers are checked
  // separately in checkIfMarkers.
  const stripped = html.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '));
  const re = /\{\{[A-Z][A-Z0-9_]*\}\}/g;
  let m;
  const found = new Set();
  while ((m = re.exec(stripped)) !== null) {
    found.add(`${m[0]} (line ${lineOf(stripped, m.index)})`);
  }
  for (const f of found) report.error(`Unresolved placeholder: ${f}`);
}

function checkIfMarkers(html, report) {
  const re = /<!--\s*\/?IF:[A-Z_]+\s*-->/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    report.error(`Unresolved conditional marker: ${m[0].trim()} (line ${lineOf(html, m.index)})`);
  }
}

function checkClientSlug(html, slug, report) {
  const m = html.match(/<body[^>]*data-client-slug="([^"]*)"/);
  if (!m) {
    report.error('Missing data-client-slug attribute on <body>');
  } else if (m[1] !== slug) {
    report.error(`data-client-slug is "${m[1]}" but directory is "${slug}"`);
  }
}

function checkSharedScripts(html, isDashboard, report) {
  // progress.js only applies to dashboard pages (roadmap checkboxes).
  // Assessment-only pages have no progress to track.
  const required = ['/shared/supabase-client.js', '/shared/auth.js'];
  if (isDashboard) required.push('/shared/progress.js');
  for (const src of required) {
    if (!html.includes(`src="${src}"`)) {
      report.error(`Missing required shared script: ${src}`);
    }
  }
  if (!/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/.test(html)) {
    report.error('Missing Supabase JS SDK <script> in <head>');
  }
}

function checkChecklistArrays(html, report) {
  const allIdsBlock = extractJsBlock(html, 'ALL_CHECK_IDS');
  if (!allIdsBlock) return { isDashboard: false, allIds: [] };

  const allIds = extractQuotedStrings(allIdsBlock);
  if (allIds.length === 0) {
    report.error('ALL_CHECK_IDS is present but empty');
  }

  // 1. Every id in ALL_CHECK_IDS must exist as an element id or data-key
  //    (newer template vintages key checkboxes by data-key)
  for (const id of allIds) {
    if (!html.includes(`id="${id}"`) && !html.includes(`data-key="${id}"`)) {
      report.error(`ALL_CHECK_IDS contains "${id}" but no element with that id or data-key exists`);
    }
  }

  // 2. Every roadmap checkbox in the page must be in ALL_CHECK_IDS
  const domIds = new Set();
  const cbRe = /type="checkbox"[^>]*\bid="(rw\d+_d\d+|gbp_\d+)"/g;
  let m;
  while ((m = cbRe.exec(html)) !== null) domIds.add(m[1]);
  // also match id before type
  const cbRe2 = /\bid="(rw\d+_d\d+|gbp_\d+)"[^>]*type="checkbox"/g;
  while ((m = cbRe2.exec(html)) !== null) domIds.add(m[1]);

  const allIdsSet = new Set(allIds);
  for (const id of domIds) {
    if (!allIdsSet.has(id)) {
      report.error(`Checkbox id="${id}" exists in the page but is missing from ALL_CHECK_IDS`);
    }
  }

  // 3. WEEK_CHECKS / TACTIC_CHECKS / MONTH_CHECKS must only reference known ids
  for (const name of ['WEEK_CHECKS', 'TACTIC_CHECKS']) {
    const block = extractJsBlock(html, name);
    if (!block) {
      report.error(`Missing ${name} object (required alongside ALL_CHECK_IDS)`);
      continue;
    }
    for (const id of extractQuotedStrings(block)) {
      if (!allIdsSet.has(id)) {
        report.error(`${name} references "${id}" which is not in ALL_CHECK_IDS`);
      }
    }
  }

  return { isDashboard: true, allIds };
}

function checkHowToLinks(html, report) {
  const re = /howToLink\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g;
  let m;
  let count = 0;
  const missing = new Set();
  while ((m = re.exec(html)) !== null) {
    count++;
    const [, pageName, stepId] = m;
    // First arg is a page name resolved via data-page (or an element id in
    // some vintages); second arg must be a real element id.
    if (!html.includes(`data-page="${pageName}"`) && !html.includes(`id="${pageName}"`)) {
      missing.add(pageName);
    }
    if (!html.includes(`id="${stepId}"`)) missing.add(stepId);
  }
  for (const id of missing) {
    report.error(`"how to" link targets "${id}" but no element with that id or data-page exists`);
  }
  return count;
}

function checkEmDashes(html, report) {
  const re = /\u2014/g;
  let m;
  const lines = new Set();
  while ((m = re.exec(html)) !== null) {
    lines.add(lineOf(html, m.index));
    if (lines.size >= 10) break;
  }
  if (lines.size > 0) {
    report.warn(`Em dashes found in HTML (style rule violation), lines: ${[...lines].join(', ')}${lines.size >= 10 ? ', ...' : ''}`);
  }
}

function checkSupabaseProgressMarkup(html, isDashboard, report) {
  if (!isDashboard) return;
  if (!/data-week="\d+"/.test(html)) {
    report.warn('No data-week attributes found: Supabase progress.js cannot map checkboxes to weeks (older template vintage)');
  }
  if (!/data-key="week-\d+-(action|check)-\d+"/.test(html)) {
    report.warn('No data-key attributes found on checkboxes: Supabase progress sync will not persist (older template vintage)');
  }
  if (!/id="week-\d+"/.test(html)) {
    report.warn('No id="week-N" sections found: email deep links (#week-N) will not scroll to the week');
  }
}

function checkPlanJson(clientDir, slug, isDashboard, report) {
  const planPath = path.join(clientDir, 'plan.json');
  if (!fs.existsSync(planPath)) {
    if (isDashboard) {
      report.warn('plan.json is missing: weekly Monday/Friday emails cannot be sent for this client');
    }
    return;
  }

  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  } catch (e) {
    report.error(`plan.json is not valid JSON: ${e.message}`);
    return;
  }

  for (const field of ['client_name', 'client_slug', 'goal', 'coach_email', 'weeks']) {
    if (plan[field] === undefined || plan[field] === null || plan[field] === '') {
      report.error(`plan.json missing required field: "${field}"`);
    }
  }

  if (plan.client_slug && plan.client_slug !== slug) {
    report.error(`plan.json client_slug is "${plan.client_slug}" but directory is "${slug}"`);
  }

  if (!Array.isArray(plan.weeks)) return;

  if (plan.weeks.length !== 12) {
    report.error(`plan.json must have exactly 12 weeks, found ${plan.weeks.length}`);
  }

  plan.weeks.forEach((w, i) => {
    const label = `plan.json weeks[${i}]`;
    if (w.week !== i + 1) {
      report.error(`${label}: week number is ${w.week}, expected ${i + 1}`);
    }
    const expectedMonth = Math.ceil((i + 1) / 4);
    if (w.month !== expectedMonth) {
      report.error(`${label}: month is ${w.month}, expected ${expectedMonth}`);
    }
    const expectedLink = `${DEEP_LINK_BASE}/${slug}/#week-${i + 1}`;
    if (w.deep_link !== expectedLink) {
      report.error(`${label}: deep_link is "${w.deep_link}", expected "${expectedLink}"`);
    }
    for (const listName of ['actions', 'checklist']) {
      const list = w[listName];
      if (!Array.isArray(list) || list.length === 0) {
        report.error(`${label}: "${listName}" must be a non-empty array`);
        continue;
      }
      list.forEach((item, j) => {
        if (typeof item !== 'string') {
          report.error(`${label}.${listName}[${j}]: not a string`);
          return;
        }
        if (/\*\*|\]\(|^[-*]\s/.test(item)) {
          report.error(`${label}.${listName}[${j}]: contains markdown ("${item.slice(0, 60)}...")`);
        }
        if (/\u2014/.test(item)) {
          report.error(`${label}.${listName}[${j}]: contains an em dash ("${item.slice(0, 60)}")`);
        }
      });
    }
    if (typeof w.title === 'string' && /\u2014/.test(w.title)) {
      report.error(`${label}: title contains an em dash ("${w.title}")`);
    }
  });
}

// ── Runner ───────────────────────────────────────────────────────────────

function makeReport() {
  const errors = [];
  const warnings = [];
  return {
    errors,
    warnings,
    error: (msg) => errors.push(msg),
    warn: (msg) => warnings.push(msg),
  };
}

function validateClient(slug) {
  const clientDir = path.join(CLIENTS_DIR, slug);
  const htmlPath = path.join(clientDir, 'index.html');
  const report = makeReport();

  if (!fs.existsSync(htmlPath)) {
    if (fs.existsSync(path.join(clientDir, 'plan.md'))) {
      report.warn('index.html not found (plan.md exists: page not yet generated)');
    } else {
      report.error('index.html not found and no plan.md present');
    }
    return { slug, type: 'not-generated', howToCount: 0, checkCount: 0, ...report };
  }

  const html = fs.readFileSync(htmlPath, 'utf8');

  const { isDashboard, allIds } = checkChecklistArrays(html, report);
  checkPlaceholders(html, report);
  checkIfMarkers(html, report);
  checkClientSlug(html, slug, report);
  checkSharedScripts(html, isDashboard, report);
  const howToCount = checkHowToLinks(html, report);
  checkEmDashes(html, report);
  checkSupabaseProgressMarkup(html, isDashboard, report);
  checkPlanJson(clientDir, slug, isDashboard, report);

  return {
    slug,
    type: isDashboard ? 'dashboard' : 'assessment-only',
    howToCount,
    checkCount: allIds.length,
    ...report,
  };
}

function main() {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const all = args.includes('--all');
  const slugs = all
    ? fs.readdirSync(CLIENTS_DIR).filter((d) =>
        fs.statSync(path.join(CLIENTS_DIR, d)).isDirectory())
    : args.filter((a) => !a.startsWith('--'));

  if (slugs.length === 0) {
    console.log('Usage: node scripts/validate-client.js <slug> [slug ...] | --all [--strict]');
    process.exit(0);
  }

  let totalErrors = 0;
  let totalWarnings = 0;
  const summary = [];

  for (const slug of slugs) {
    const r = validateClient(slug);
    totalErrors += r.errors.length;
    totalWarnings += r.warnings.length;
    summary.push(r);

    const status = r.errors.length > 0 ? 'FAIL' : r.warnings.length > 0 ? 'WARN' : 'PASS';
    console.log(`\n[${status}] ${slug} (${r.type}, ${r.checkCount} checklist items, ${r.howToCount} how-to links)`);
    for (const e of r.errors) console.log(`  ERROR: ${e}`);
    for (const w of r.warnings) console.log(`  warn:  ${w}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  for (const r of summary) {
    const status = r.errors.length > 0 ? 'FAIL' : r.warnings.length > 0 ? 'WARN' : 'PASS';
    console.log(`  ${status.padEnd(5)} ${r.slug.padEnd(30)} ${r.errors.length} errors, ${r.warnings.length} warnings`);
  }
  console.log(`\nTotal: ${summary.length} clients, ${totalErrors} errors, ${totalWarnings} warnings`);

  if (totalErrors > 0 || (strict && totalWarnings > 0)) process.exit(1);
}

main();
