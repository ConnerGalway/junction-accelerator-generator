// Plan report UI: shows the result of checking a plan.md on the upload forms
// (admin/create-project and admin/create-experience).
//
// Usage:
//   const report = await PlanReportUI.check(fileText, 'accelerator', slug);
//   PlanReportUI.render(document.getElementById('planReport'), report);
//
// check() runs the same validator the server uses (shared/plan-validator.js),
// so the list a coach sees when choosing a file matches what the upload would
// reject. If the validator cannot be loaded, check() returns null and the
// server-side check still applies.

(function () {
  const STYLE_ID = 'plan-report-style';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .plan-report { margin: 0 0 24px; font-size: 14px; line-height: 1.5; }
      .plan-report__box { border-radius: 10px; padding: 16px; margin-bottom: 12px; }
      .plan-report__box--error { background: rgba(176,48,48,0.08); border: 1px solid rgba(176,48,48,0.25); }
      .plan-report__box--warning { background: rgba(217,145,0,0.08); border: 1px solid rgba(217,145,0,0.3); }
      .plan-report__box--ok { background: rgba(170,218,182,0.2); border: 1px solid rgba(127,191,142,0.35); color: #2d6a3e; }
      .plan-report__title { font-weight: 700; margin: 0 0 4px; }
      .plan-report__box--error .plan-report__title { color: #b03030; }
      .plan-report__box--warning .plan-report__title { color: #8a5a00; }
      .plan-report__hint { margin: 0 0 10px; color: #555; }
      .plan-report__list { list-style: none; margin: 0; padding: 0; max-height: 360px; overflow: auto; }
      .plan-report__item { padding: 10px 0; border-top: 1px solid rgba(0,0,0,0.08); }
      .plan-report__item:first-child { border-top: 0; }
      .plan-report__line { display: inline-block; font-weight: 700; font-size: 12px; padding: 1px 8px; border-radius: 999px; background: rgba(0,0,0,0.08); margin-right: 8px; white-space: nowrap; }
      .plan-report__fix { display: block; margin-top: 4px; color: #333; }
      .plan-report__fix strong { font-weight: 700; }
      .plan-report__summary { margin: 4px 0 0; }
    `;
    document.head.appendChild(style);
  }

  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function issueList(issues) {
    const list = element('ul', 'plan-report__list');
    issues.forEach(issue => {
      const item = element('li', 'plan-report__item');
      if (issue.line) item.appendChild(element('span', 'plan-report__line', 'Line ' + issue.line));
      item.appendChild(document.createTextNode(issue.message));
      if (issue.fix) {
        const fix = element('span', 'plan-report__fix');
        fix.appendChild(element('strong', null, 'Fix: '));
        fix.appendChild(document.createTextNode(issue.fix));
        item.appendChild(fix);
      }
      list.appendChild(item);
    });
    return list;
  }

  function summaryText(summary) {
    if (!summary) return '';
    const unitKey = 'tactics' in summary ? 'tactics' : 'tracks';
    return [
      summary[unitKey] + ' ' + unitKey,
      summary.steps + ' steps',
      summary.weeks + ' weeks',
      summary.checklistItems + ' checklist items',
      summary.howToLinks + ' "how to" links'
    ].join(' · ');
  }

  async function check(content, type, slug) {
    try {
      const validator = await import('/shared/plan-validator.js');
      return validator.validatePlan(content, { type: type, slug: slug || undefined });
    } catch (err) {
      console.warn('[plan-report] Could not run the plan check in the browser:', err);
      return null;
    }
  }

  function render(container, report) {
    if (!container) return;
    injectStyle();
    container.className = 'plan-report';
    container.textContent = '';
    if (!report) return;

    const errors = report.errors || [];
    const warnings = report.warnings || [];

    if (errors.length > 0) {
      const box = element('div', 'plan-report__box plan-report__box--error');
      box.appendChild(element('p', 'plan-report__title',
        'This plan needs ' + errors.length + ' change' + (errors.length === 1 ? '' : 's') + ' before it can be uploaded'));
      box.appendChild(element('p', 'plan-report__hint', 'Make these changes in the plan.md file, then choose the file again. Nothing has been uploaded.'));
      box.appendChild(issueList(errors));
      container.appendChild(box);
    } else if (report.summary) {
      const box = element('div', 'plan-report__box plan-report__box--ok');
      box.appendChild(element('p', 'plan-report__title', 'Plan check passed'));
      box.appendChild(element('p', 'plan-report__summary', summaryText(report.summary)));
      container.appendChild(box);
    }

    if (warnings.length > 0) {
      const box = element('div', 'plan-report__box plan-report__box--warning');
      box.appendChild(element('p', 'plan-report__title',
        warnings.length + ' thing' + (warnings.length === 1 ? '' : 's') + ' to review (these do not block the upload)'));
      box.appendChild(issueList(warnings));
      container.appendChild(box);
    }
  }

  function clear(container) {
    if (container) container.textContent = '';
  }

  window.PlanReportUI = { check: check, render: render, clear: clear };
})();
