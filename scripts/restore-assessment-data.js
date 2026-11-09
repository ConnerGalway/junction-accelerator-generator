#!/usr/bin/env node
/**
 * Restore Assessment Data Script
 *
 * This script restores assessment data from extracted JSON files into regenerated dashboards.
 * It replaces the placeholder values with actual assessment content.
 *
 * Usage:
 *   node scripts/restore-assessment-data.js <client-slug> <assessment-json-path>
 */

const fs = require('fs');
const path = require('path');

const BASE_PATH = path.join(__dirname, '..');
const CLIENTS_PATH = path.join(BASE_PATH, 'clients');

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getGradeClass(grade) {
  if (!grade) return '';
  const letter = grade.charAt(0).toUpperCase();
  if (letter === 'A') return 'grade-a';
  if (letter === 'B') return 'grade-b';
  if (letter === 'C') return 'grade-c';
  if (letter === 'D') return 'grade-d';
  if (letter === 'F') return 'grade-f';
  return '';
}

function escapeRegexReplacement(str) {
  // Escape $ to prevent regex backreference interpretation
  return str.replace(/\$/g, '$$$$');
}

function generateStrengthsHtml(strengths) {
  if (!strengths || !strengths.length) return '';
  return escapeRegexReplacement(strengths.map(s => `<li>${escapeHtml(s)}</li>`).join('\n            '));
}

function generateGapsHtml(gaps) {
  if (!gaps || !gaps.length) return '';
  return escapeRegexReplacement(gaps.map(g => `<li>${escapeHtml(g)}</li>`).join('\n            '));
}

function generateQuickWinsCardsHtml(quickWins) {
  if (!quickWins || !quickWins.length) return '';
  return quickWins.map((qw, i) => `
        <div class="quick-win-item">
          <div class="quick-win-number">${i + 1}</div>
          <div class="quick-win-content">
            <div class="quick-win-task" data-editable-key="assessment-qw-${i + 1}-label">${escapeHtml(qw.task)}</div>
            <div class="quick-win-impact">${escapeHtml(qw.impact)}</div>
          </div>
          <div class="quick-win-time">${escapeHtml(qw.time_estimate)}</div>
        </div>`).join('\n');
}

function generatePriorityRecommendationsHtml(priorities) {
  if (!priorities || !priorities.length) return '';
  // Take top 4 priorities
  return priorities.slice(0, 4).map((p, i) => {
    // Title can be 'title' or 'text' field
    const title = p.title || p.text || 'Priority recommendation';
    // Truncate long titles
    const displayTitle = title.length > 100 ? title.substring(0, 100) + '...' : title;
    return `
        <div class="priority-item">
          <div class="priority-item-number">${i + 1}</div>
          <div class="priority-item-content">
            <h4>${escapeHtml(displayTitle)}</h4>
            <div class="priority-item-meta">
              <span class="priority-item-tag">${escapeHtml(p.category || 'Priority')}</span>
              <span class="priority-item-tag">${escapeHtml(p.time_estimate || p.timeframe || '')}</span>
            </div>
            <p class="priority-item-result">${escapeHtml(p.expected_result || p.description || '')}</p>
          </div>
        </div>`;
  }).join('\n');
}

function generateCategoryCardsHtml(categories) {
  if (!categories) return '';

  const categoryMapping = {
    'website_technical': { name: 'Website & Technical', iconClass: 'website' },
    'reviews_reputation': { name: 'Reviews & Reputation', iconClass: 'reviews' },
    'booking_conversion': { name: 'Online Booking & Conversion', iconClass: 'booking' },
    'social_media': { name: 'Social Media & Content', iconClass: 'social' },
    'guest_experience': { name: 'Digital Guest Experience', iconClass: 'experience' },
    'local_visibility': { name: 'Local Visibility', iconClass: 'local' }
  };

  const categoryIcons = {
    'website': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    'reviews': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    'booking': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    'social': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>',
    'experience': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    'local': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>'
  };

  // Handle both array and object formats
  const categoryEntries = Array.isArray(categories)
    ? categories.map((cat, i) => [Object.keys(categoryMapping)[i] || `cat_${i}`, cat])
    : Object.entries(categories);

  return categoryEntries.map(([key, cat]) => {
    const mapping = categoryMapping[key] || { name: key, iconClass: 'website' };
    const icon = categoryIcons[mapping.iconClass] || categoryIcons['website'];
    const gradeClass = getGradeClass(cat.grade);

    // Generate metrics from breakdown if available
    let metricsHtml = '';
    if (cat.breakdown) {
      const metrics = Object.entries(cat.breakdown).slice(0, 4).map(([k, v]) => {
        const label = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const value = v.value !== undefined ? (typeof v.value === 'boolean' ? (v.value ? 'Yes' : 'No') : v.value) : v.score;
        return `<div class="category-metric"><span class="metric-label">${escapeHtml(label)}</span><span class="metric-value">${escapeHtml(String(value))}</span></div>`;
      });
      metricsHtml = metrics.join('\n              ');
    }

    // Generate findings from breakdown grades
    let findingsHtml = '';
    if (cat.breakdown) {
      const findings = Object.entries(cat.breakdown)
        .filter(([k, v]) => v.grade && (v.grade === 'F' || v.grade === 'D'))
        .slice(0, 3)
        .map(([k, v]) => {
          const label = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          return `<li>${escapeHtml(label)}: needs improvement (${v.grade})</li>`;
        });
      findingsHtml = findings.join('\n                ');
    }

    // Use summary if available, otherwise generate one
    const summary = cat.summary || `Score: ${cat.score}/100 (${cat.grade})`;

    return `
        <div class="category-card">
          <div class="category-header" onclick="this.parentElement.classList.toggle('open')">
            <div class="category-icon ${mapping.iconClass}">
              ${icon}
            </div>
            <div class="category-title-wrap">
              <h3 class="category-title">${escapeHtml(mapping.name)}</h3>
              <span class="category-grade ${gradeClass}">${escapeHtml(cat.grade)}</span>
            </div>
            <svg class="category-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="category-body">
            <p class="category-summary">${escapeHtml(summary)}</p>
            <div class="category-metrics">
              ${metricsHtml}
            </div>
            ${findingsHtml ? `<div class="category-findings">
              <h4>Key Findings</h4>
              <ul>
                ${findingsHtml}
              </ul>
            </div>` : ''}
          </div>
        </div>`;
  }).join('\n');
}

function restoreAssessmentData(clientSlug, assessmentJsonPath) {
  const clientDir = path.join(CLIENTS_PATH, clientSlug);
  const indexPath = path.join(clientDir, 'index.html');

  if (!fs.existsSync(indexPath)) {
    console.error(`Dashboard not found: ${indexPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(assessmentJsonPath)) {
    console.error(`Assessment JSON not found: ${assessmentJsonPath}`);
    process.exit(1);
  }

  console.log(`Restoring assessment data for ${clientSlug}...`);

  // Read the assessment data
  const assessmentJson = fs.readFileSync(assessmentJsonPath, 'utf8');
  const data = JSON.parse(assessmentJson);

  // Read the current dashboard
  let html = fs.readFileSync(indexPath, 'utf8');

  // Fill executive summary
  if (data.executive_summary) {
    const exec = data.executive_summary;

    // Replace headline
    const headlineHtml = escapeRegexReplacement(`<p class="executive-headline" data-editable-key="executive-headline">${escapeHtml(exec.headline)}</p>`);
    html = html.replace(
      /<p class="executive-headline"[^>]*>.*?<\/p>/s,
      headlineHtml
    );

    // Replace key strengths - use more specific pattern
    if (exec.key_strengths) {
      const strengthsHtml = generateStrengthsHtml(exec.key_strengths);
      html = html.replace(
        /(<div class="executive-column strengths">\s*<h4>[\s\S]*?Key Strengths[\s\S]*?<\/h4>\s*<ul>)\s*(<\/ul>)/,
        `$1\n            ${strengthsHtml}\n          $2`
      );
    }

    // Replace critical gaps - use more specific pattern
    if (exec.critical_gaps) {
      const gapsHtml = generateGapsHtml(exec.critical_gaps);
      html = html.replace(
        /(<div class="executive-column gaps">\s*<h4>[\s\S]*?Critical Gaps[\s\S]*?<\/h4>\s*<ul>)\s*(<\/ul>)/,
        `$1\n            ${gapsHtml}\n          $2`
      );
    }

    // Replace bottom line
    if (exec.bottom_line) {
      const bottomLineHtml = escapeRegexReplacement(`<div class="executive-bottom-line">\n        <strong>Bottom Line:</strong> ${escapeHtml(exec.bottom_line)}\n      </div>`);
      html = html.replace(
        /<div class="executive-bottom-line">\s*<strong>Bottom Line:<\/strong>\s*<\/div>/,
        bottomLineHtml
      );
    }
  }

  // Fill assessment summary if present
  if (data.overall_summary || data.assessment_summary) {
    const summary = data.overall_summary || data.assessment_summary;
    html = html.replace(
      /Assessment data will be populated when available\./g,
      escapeHtml(summary)
    );
  }

  // Fill overall score and grade
  if (data.overall && data.overall.score !== undefined) {
    html = html.replace(
      /<div class="grade-circle"[^>]*>--<\/div>/,
      `<div class="grade-circle" id="overallGrade">${data.overall.grade || '--'}</div>`
    );
    html = html.replace(
      /<span id="overallScore">--<\/span>/,
      `<span id="overallScore">${data.overall.score}</span>`
    );
  }

  // Fill category scores - categories is an object, not array
  const categoryMapping = {
    'website_technical': 'Website & Technical',
    'reviews_reputation': 'Reviews & Reputation',
    'booking_conversion': 'Online Booking & Conversion',
    'social_media': 'Social Media & Content',
    'guest_experience': 'Digital Guest Experience',
    'local_visibility': 'Local Visibility'
  };

  if (data.categories && typeof data.categories === 'object') {
    Object.entries(data.categories).forEach(([key, cat]) => {
      const displayName = categoryMapping[key] || key;
      const gradeClass = getGradeClass(cat.grade);

      // Replace score in grade breakdown
      html = html.replace(
        new RegExp(`(<span>${displayName}</span>[\\s\\S]*?<span class="grade-breakdown-number">)--(<\\/span>)`, 'i'),
        `$1${cat.score}$2`
      );

      // Replace grade letter in grade breakdown
      html = html.replace(
        new RegExp(`(<span>${displayName}</span>[\\s\\S]*?<span class="grade-breakdown-letter )">--(<\\/span>)`, 'i'),
        `$1${gradeClass}">${cat.grade}$2`
      );
    });
  }

  // Fill quick wins grid
  if (data.quick_wins) {
    const quickWinsHtml = generateQuickWinsCardsHtml(data.quick_wins);
    html = html.replace(
      /(<div class="quick-wins-grid">\s*)<\/div>/,
      `$1${quickWinsHtml}\n      </div>`
    );
  }

  // Fill priority recommendations
  if (data.priority_recommendations) {
    const priorityHtml = generatePriorityRecommendationsHtml(data.priority_recommendations);
    html = html.replace(
      /(<div class="priority-list"[^>]*>\s*)<\/div>/,
      `$1${priorityHtml}\n      </div>`
    );
  }

  // Fill detailed category analysis
  if (data.categories) {
    const categoryCardsHtml = generateCategoryCardsHtml(data.categories);
    html = html.replace(
      /(<div class="categories-grid">\s*)<\/div>/,
      `$1${categoryCardsHtml}\n      </div>`
    );
  }

  // Write the updated dashboard
  fs.writeFileSync(indexPath, html);
  console.log(`  Updated: ${indexPath}`);
  console.log(`  SUCCESS: Assessment data restored`);
}

// Main execution
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.log('Usage: node scripts/restore-assessment-data.js <client-slug> <assessment-json-path>');
  process.exit(1);
}

const [clientSlug, assessmentJsonPath] = args;
restoreAssessmentData(clientSlug, assessmentJsonPath);
