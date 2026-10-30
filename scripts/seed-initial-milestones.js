#!/usr/bin/env node
/**
 * seed-initial-milestones.js
 *
 * One-time script to extract assessment data from existing client HTML files
 * and populate the milestone_assessments table in Supabase.
 *
 * For each client:
 * 1. Reads index.html and extracts ASSESSMENT_DATA object
 * 2. Fetches cohort_start_date from user_plans table
 * 3. Inserts "initial" milestone as completed with extracted data
 * 4. Creates pending records for 30-day, 60-day, 90-day milestones
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-initial-milestones.js
 *
 * Options:
 *   --dry-run     Show what would be done without making changes
 *   --client=slug Only process a specific client
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SPECIFIC_CLIENT = args.find(a => a.startsWith('--client='))?.split('=')[1];

// Clients directory
const CLIENTS_DIR = join(__dirname, '..', 'clients');

// Skip these directories (not real clients)
const SKIP_DIRS = ['sample-demo', 'sample-experience'];

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract ASSESSMENT_DATA object from HTML content
 * Looks for: const ASSESSMENT_DATA = { ... };
 * @param {string} html - HTML file content
 * @returns {Object|null} Parsed assessment data or null
 */
function extractAssessmentData(html) {
  // Pattern to find ASSESSMENT_DATA object
  // Match: const ASSESSMENT_DATA = { ... };
  const patterns = [
    /const\s+ASSESSMENT_DATA\s*=\s*(\{[\s\S]*?\});/,
    /var\s+ASSESSMENT_DATA\s*=\s*(\{[\s\S]*?\});/,
    /window\.ASSESSMENT_DATA\s*=\s*(\{[\s\S]*?\});/
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      try {
        // Use Function constructor to safely parse JS object notation
        const parsed = new Function(`return ${match[1]}`)();
        return parsed;
      } catch (err) {
        console.warn('    Failed to parse ASSESSMENT_DATA:', err.message);
      }
    }
  }

  // Try alternative: look for overall score and grade separately
  const scoreMatch = html.match(/id=["']overallScore["'][^>]*>(\d+)</);
  const gradeMatch = html.match(/id=["']overallGrade["'][^>]*>([A-F][+-]?)</);

  if (scoreMatch && gradeMatch) {
    return {
      overall: {
        score: parseInt(scoreMatch[1], 10),
        grade: gradeMatch[1]
      },
      categories: extractCategoryScores(html)
    };
  }

  return null;
}

/**
 * Extract category scores from grade breakdown section
 * @param {string} html - HTML content
 * @returns {Object} Category scores object
 */
function extractCategoryScores(html) {
  const categories = {};

  // Pattern for grade breakdown items
  const breakdownPattern = /<div class="grade-breakdown-item">[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?<span class="grade-breakdown-number">(\d+)<\/span>[\s\S]*?<span class="grade-breakdown-letter[^"]*">([A-F][+-]?)<\/span>/g;

  let match;
  while ((match = breakdownPattern.exec(html)) !== null) {
    const categoryName = match[1].trim();
    const score = parseInt(match[2], 10);
    const grade = match[3];

    // Convert display name to key
    const key = categoryName
      .toLowerCase()
      .replace(/[&]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');

    categories[key] = { score, grade };
  }

  return categories;
}

/**
 * Calculate due date for a milestone
 * @param {Date} cohortStart - Cohort start date
 * @param {string} milestoneType - 'initial', '30-day', '60-day', '90-day'
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
function calculateDueDate(cohortStart, milestoneType) {
  const daysMap = {
    'initial': 0,
    '30-day': 30,
    '60-day': 60,
    '90-day': 90
  };

  const days = daysMap[milestoneType] || 0;
  const dueDate = new Date(cohortStart);
  dueDate.setDate(dueDate.getDate() + days);

  return dueDate.toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

async function processClient(clientSlug) {
  console.log(`\n Processing: ${clientSlug}`);

  const indexPath = join(CLIENTS_DIR, clientSlug, 'index.html');

  // Check if index.html exists
  if (!existsSync(indexPath)) {
    console.log(`    Skipping: No index.html found`);
    return { skipped: true, reason: 'no-html' };
  }

  // Read HTML
  const html = readFileSync(indexPath, 'utf-8');

  // Check if this is an accelerator dashboard (has assessment section)
  if (!html.includes('page-assessment') && !html.includes('ASSESSMENT_DATA')) {
    console.log(`    Skipping: Not an accelerator dashboard`);
    return { skipped: true, reason: 'not-accelerator' };
  }

  // Extract assessment data
  const assessmentData = extractAssessmentData(html);
  if (!assessmentData) {
    console.log(`    Warning: Could not extract assessment data`);
    return { skipped: true, reason: 'no-data' };
  }

  console.log(`    Found assessment: Score ${assessmentData.overall?.score}, Grade ${assessmentData.overall?.grade}`);

  // Fetch cohort_start_date from user_plans
  const { data: userPlans, error: upError } = await supabase
    .from('user_plans')
    .select('cohort_start_date')
    .eq('client_slug', clientSlug)
    .eq('active', true)
    .not('cohort_start_date', 'is', null)
    .limit(1);

  if (upError) {
    console.log(`    Error fetching user_plans: ${upError.message}`);
    return { skipped: true, reason: 'db-error' };
  }

  const cohortStartDate = userPlans?.[0]?.cohort_start_date;
  if (!cohortStartDate) {
    console.log(`    Warning: No cohort_start_date found, using today`);
  }

  const cohortStart = cohortStartDate ? new Date(cohortStartDate) : new Date();
  console.log(`    Cohort start: ${cohortStart.toISOString().split('T')[0]}`);

  // Check if milestones already exist
  const { data: existing } = await supabase
    .from('milestone_assessments')
    .select('milestone_type')
    .eq('client_slug', clientSlug);

  if (existing && existing.length > 0) {
    console.log(`    Warning: ${existing.length} milestone(s) already exist`);
    if (!args.includes('--force')) {
      console.log(`    Use --force to overwrite existing milestones`);
      return { skipped: true, reason: 'exists' };
    }
  }

  // Prepare milestone records
  const milestones = [
    {
      client_slug: clientSlug,
      milestone_type: 'initial',
      due_date: calculateDueDate(cohortStart, 'initial'),
      status: 'completed',
      generated_at: cohortStart.toISOString(),
      overall_score: assessmentData.overall?.score,
      overall_grade: assessmentData.overall?.grade,
      category_scores: assessmentData.categories || {},
      assessment_data: assessmentData
    },
    {
      client_slug: clientSlug,
      milestone_type: '30-day',
      due_date: calculateDueDate(cohortStart, '30-day'),
      status: 'pending'
    },
    {
      client_slug: clientSlug,
      milestone_type: '60-day',
      due_date: calculateDueDate(cohortStart, '60-day'),
      status: 'pending'
    },
    {
      client_slug: clientSlug,
      milestone_type: '90-day',
      due_date: calculateDueDate(cohortStart, '90-day'),
      status: 'pending'
    }
  ];

  if (DRY_RUN) {
    console.log(`    [DRY RUN] Would insert ${milestones.length} milestones`);
    milestones.forEach(m => {
      console.log(`      - ${m.milestone_type}: ${m.status}, due ${m.due_date}`);
    });
    return { success: true, dryRun: true };
  }

  // Delete existing if --force
  if (existing && existing.length > 0 && args.includes('--force')) {
    const { error: deleteError } = await supabase
      .from('milestone_assessments')
      .delete()
      .eq('client_slug', clientSlug);

    if (deleteError) {
      console.log(`    Error deleting existing: ${deleteError.message}`);
      return { skipped: true, reason: 'delete-error' };
    }
    console.log(`    Deleted ${existing.length} existing milestone(s)`);
  }

  // Insert milestones
  const { error: insertError } = await supabase
    .from('milestone_assessments')
    .insert(milestones);

  if (insertError) {
    console.log(`    Error inserting milestones: ${insertError.message}`);
    return { skipped: true, reason: 'insert-error' };
  }

  console.log(`    Inserted ${milestones.length} milestones`);
  return { success: true };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Seed Initial Milestones');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Supabase URL: ${SUPABASE_URL}`);
  console.log(`  Dry run: ${DRY_RUN}`);
  console.log(`  Specific client: ${SPECIFIC_CLIENT || 'all'}`);

  // Get list of client directories
  let clients;
  if (SPECIFIC_CLIENT) {
    clients = [SPECIFIC_CLIENT];
  } else {
    clients = readdirSync(CLIENTS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .filter(name => !SKIP_DIRS.includes(name))
      .sort();
  }

  console.log(`\n  Found ${clients.length} client(s) to process`);

  const results = {
    success: 0,
    skipped: 0,
    errors: []
  };

  for (const client of clients) {
    try {
      const result = await processClient(client);
      if (result.success) {
        results.success++;
      } else if (result.skipped) {
        results.skipped++;
      }
    } catch (err) {
      console.log(`    Error: ${err.message}`);
      results.errors.push({ client, error: err.message });
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Successful: ${results.success}`);
  console.log(`  Skipped: ${results.skipped}`);
  console.log(`  Errors: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\n  Errors:');
    results.errors.forEach(e => console.log(`    - ${e.client}: ${e.error}`));
  }

  console.log('\n  Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
