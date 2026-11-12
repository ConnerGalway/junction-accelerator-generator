#!/usr/bin/env node
/**
 * Dashboard Regeneration Script
 *
 * Regenerates a client dashboard from its plan.md using the shared generator
 * (shared/plan-generator.js), the same code the Add Plan upload uses.
 *
 * By default this writes a PREVIEW copy outside the repo and does not touch
 * the live page. Pass --write to overwrite clients/[slug]/index.html.
 *
 * WARNING: --write replaces the whole page, including assessment content and
 * any hand edits made to the HTML. Check `git diff` before committing.
 *
 * Usage:
 *   node scripts/regenerate-dashboards.js <client-slug>           (preview)
 *   node scripts/regenerate-dashboards.js <client-slug> --write   (overwrite)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE_PATH = path.join(__dirname, '..');
const CLIENTS_PATH = path.join(BASE_PATH, 'clients');
const TEMPLATE_PATH = path.join(BASE_PATH, 'template', 'accelerator-template.html');

function regenerateClient(slug, generator, { write }) {
  const { parsePlanMd, renderDashboard, validateDashboardHtml } = generator;
  console.log(`\nProcessing ${slug}...`);

  const clientPath = path.join(CLIENTS_PATH, slug);
  const planPath = path.join(clientPath, 'plan.md');
  const htmlPath = path.join(clientPath, 'index.html');

  if (!fs.existsSync(planPath)) {
    console.log(`  ERROR: No plan.md found at ${planPath}`);
    return false;
  }

  const planMd = fs.readFileSync(planPath, 'utf8');
  const planData = parsePlanMd(planMd);
  if (planData.error) {
    console.log(`  ERROR: Failed to parse plan.md: ${planData.error}`);
    return false;
  }
  console.log(`  Parsed: ${planData.tactics.length} tactics, ${planData.roadmap.weeks.length} weeks`);

  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

  // Derive client name from slug
  const clientName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // Carry over the onboarding date and coach email from the current page if available
  let onboardingCallDate = new Date().toISOString().split('T')[0];
  let coachEmail = 'coach@elearningu.com';

  if (fs.existsSync(htmlPath)) {
    const existingHtml = fs.readFileSync(htmlPath, 'utf8');
    const dateMatch = existingHtml.match(/data-cohort-start="([^"]+)"/);
    if (dateMatch && dateMatch[1]) {
      onboardingCallDate = dateMatch[1];
    }
    const emailMatch = existingHtml.match(/Coach Email[^>]*>([^<]+@[^<]+)</i);
    if (emailMatch) {
      coachEmail = emailMatch[1].trim();
    }
  }

  const { html, unfilledPlaceholders } = renderDashboard(template, {
    clientName,
    slug,
    coachEmail,
    onboardingCallDate,
    ...planData
  });

  const problems = validateDashboardHtml(html);
  if (unfilledPlaceholders.length > 0) {
    console.log(`  WARNING: template placeholders with no data: ${unfilledPlaceholders.join(', ')}`);
  }
  if (problems.length > 0) {
    console.log(`  ${problems.length} structural problem(s):`);
    problems.forEach(p => console.log(`    - [${p.code}] ${p.message}`));
  } else {
    console.log('  Structure check passed');
  }

  let outPath = htmlPath;
  if (!write) {
    const previewDir = path.join(os.tmpdir(), 'accelerator-preview', slug);
    fs.mkdirSync(previewDir, { recursive: true });
    outPath = path.join(previewDir, 'index.html');
  }
  fs.writeFileSync(outPath, html);
  console.log(`  Wrote ${outPath} (${html.length} bytes)${write ? '' : ' [preview only, live page untouched]'}`);

  return problems.length === 0;
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const slugs = args.filter(a => !a.startsWith('--'));

  if (slugs.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/regenerate-dashboards.js <client-slug>           (preview)');
    console.log('  node scripts/regenerate-dashboards.js <client-slug> --write   (overwrite live page)');
    process.exit(1);
  }

  // The generator is an ES module shared with the Netlify function.
  const generator = await import('../shared/plan-generator.js');

  let ok = true;
  for (const slug of slugs) {
    if (!regenerateClient(slug, generator, { write })) ok = false;
  }
  if (!ok) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
