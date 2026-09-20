// auth.js runs on every protected page load.
// It exposes window.__authReady — a promise that resolves with { email, role }
// once the user is verified. Pages await this before doing their own data work.
//
// Roles:
//   admin  → access to all projects, can manage users
//   psm    → access to all clients (read-only), can view dashboard
//   coach  → access to assigned projects only
//   client → access to their own project only
//
// Page contexts handled:
//   data-page="my-clients"  → verify admin/psm/coach; redirect clients to their plan
//   data-page="admin-*"     → verify admin/psm only; redirect others to my-clients
//   data-client-slug="..."  → verify access to that specific client plan
//   /elevated/[slug]/       → elevated learner dashboard (assessment-only)

window.__authReady = (async function () {
  try {

  // ------------------------------------------------------------------
  // 0. Allow public access to demo/sample dashboards (no login required)
  // ------------------------------------------------------------------
  const publicSlugs = ['sample-demo', 'sample-experience'];
  const currentSlug = document.body.getAttribute('data-client-slug');

  if (currentSlug && publicSlugs.includes(currentSlug)) {
    // Allow public access - return guest role
    return { email: 'guest@demo', role: 'guest' };
  }

  // ------------------------------------------------------------------
  // 1. Check for an active session — redirect to /login if none exists
  // ------------------------------------------------------------------
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.replace('/login');
    return new Promise(() => {}); // redirect in flight — never resolve
  }

  const userEmail   = session.user.email;
  const clientSlug  = document.body.getAttribute('data-client-slug');
  const clientType  = document.body.getAttribute('data-client-type'); // 'elevated' for masterclass learners
  const page        = document.body.getAttribute('data-page');
  const isElevated  = clientType === 'elevated' || window.location.pathname.startsWith('/elevated/');

  // ==================================================================
  // MY-CLIENTS PAGE
  // Verify the user is admin, psm, or coach. Redirect clients to their plan.
  // ==================================================================
  if (page === 'my-clients') {

    const { data: rows, error: queryError } = await supabaseClient
      .from('user_plans')
      .select('role, client_slug, dashboard_state')
      .eq('email', userEmail)
      .eq('active', true);

    if (queryError) {
      console.error('user_plans query error:', queryError);
      window.location.replace('/login?error=db_error');
      return new Promise(() => {});
    }

    if (!rows || rows.length === 0) {
      window.location.replace('/login');
      return new Promise(() => {});
    }

    const adminRow  = rows.find(r => r.role === 'admin');
    const psmRow    = rows.find(r => r.role === 'psm');
    const coachRow  = rows.find(r => r.role === 'coach');
    const clientRow = rows.find(r => r.role === 'client');

    if (!adminRow && !psmRow && !coachRow) {
      // Pure client — send them to their own plan
      if (clientRow) {
        // Validate slug format before redirect to prevent path traversal
        const slug = clientRow.client_slug;
        if (/^[a-z0-9-]+$/.test(slug)) {
          // Redirect to appropriate dashboard based on type
          const dashboardPath =
            clientRow.dashboard_state === 'elevated'   ? '/elevated/' :
            clientRow.dashboard_state === 'experience' ? '/experience/' :
            '/clients/';
          window.location.replace(dashboardPath + slug + '/');
        } else {
          window.location.replace('/login?error=invalid_project');
        }
      } else {
        window.location.replace('/login');
      }
      return new Promise(() => {});
    }

    // Return highest priority role
    const role = adminRow ? 'admin' : (psmRow ? 'psm' : 'coach');
    return { email: userEmail, role: role };
  }

  // ==================================================================
  // ADMIN PAGES (data-page starts with "admin-")
  // Verify the user is admin or psm. Redirect others to my-clients.
  // ==================================================================
  if (page && page.startsWith('admin-')) {

    const { data: rows } = await supabaseClient
      .from('user_plans')
      .select('role, client_slug')
      .eq('email', userEmail)
      .eq('active', true);

    if (!rows || rows.length === 0) {
      window.location.replace('/login');
      return new Promise(() => {});
    }

    const adminRow = rows.find(r => r.role === 'admin');
    const psmRow   = rows.find(r => r.role === 'psm');

    if (!adminRow && !psmRow) {
      // Not admin/psm — redirect to dashboard
      window.location.replace('/my-clients/');
      return new Promise(() => {});
    }

    const role = adminRow ? 'admin' : 'psm';
    return { email: userEmail, role: role };
  }

  // ==================================================================
  // CLIENT PLAN PAGE
  // Verify the user has access to this specific client slug.
  // ==================================================================
  if (clientSlug) {

    // ------------------------------------------------------------------
    // 2. Look up the user's row in user_plans for this specific client
    //    Also fetch cohort_start_date to override the hardcoded HTML value
    // ------------------------------------------------------------------
    const { data: rows } = await supabaseClient
      .from('user_plans')
      .select('role, active, cohort_start_date')
      .eq('email', userEmail)
      .eq('client_slug', clientSlug)
      .eq('active', true);

    let matchedRole = null;
    let cohortStartDate = null;

    if (rows && rows.length > 0) {
      matchedRole = rows[0].role;
      cohortStartDate = rows[0].cohort_start_date;
    }

    // ------------------------------------------------------------------
    // 3. If no direct match, check for a wildcard row (client_slug = '*')
    //    Admins and PSMs can access any client page via the '*' row
    // ------------------------------------------------------------------
    if (!matchedRole) {
      const { data: wildcardRows } = await supabaseClient
        .from('user_plans')
        .select('role, active')
        .eq('email', userEmail)
        .eq('client_slug', '*')
        .eq('active', true);

      if (wildcardRows && wildcardRows.length > 0) {
        const role = wildcardRows[0].role;
        if (role === 'admin' || role === 'psm') {
          matchedRole = role;
        }
      }
    }

    // ------------------------------------------------------------------
    // 4. If still no match, this user has no access to this page
    // ------------------------------------------------------------------
    if (!matchedRole) {
      window.location.replace('/login');
      return new Promise(() => {});
    }

    // ------------------------------------------------------------------
    // 4b. Fetch cohort_start_date from database and update body attribute
    //     This ensures the dashboard uses the live date, not hardcoded HTML
    // ------------------------------------------------------------------
    if (!cohortStartDate) {
      // Admins/PSMs using wildcard access won't have cohort date yet - fetch it
      const { data: clientRows } = await supabaseClient
        .from('user_plans')
        .select('cohort_start_date')
        .eq('client_slug', clientSlug)
        .eq('active', true)
        .not('cohort_start_date', 'is', null)
        .limit(1);

      if (clientRows && clientRows.length > 0) {
        cohortStartDate = clientRows[0].cohort_start_date;
      }
    }

    // Update the body attribute with the live date from database
    if (cohortStartDate) {
      document.body.setAttribute('data-cohort-start', cohortStartDate);
      // Dispatch event so dashboard JS can recalculate if already initialized
      window.dispatchEvent(new CustomEvent('cohortDateUpdated', {
        detail: { cohortStart: cohortStartDate }
      }));
    }

    // ------------------------------------------------------------------
    // 5. Coaches, PSMs, and admins get read-only mode by default, with
    //    a toggle to switch to edit mode for testing/demo purposes.
    //    Skip this for elevated learners (assessment-only, nothing to edit).
    //    Toggle appears in the sidebar, above "Replay welcome tour".
    // ------------------------------------------------------------------
    if (!isElevated && (matchedRole === 'coach' || matchedRole === 'psm' || matchedRole === 'admin')) {
      // Check if user previously enabled edit mode this session
      const editModeKey = `edit_mode_${clientSlug}`;
      const savedEditMode = sessionStorage.getItem(editModeKey) === 'true';

      if (!savedEditMode) {
        document.body.setAttribute('data-readonly', 'true');
      }

      // Create toggle button for sidebar (styled like other sidebar footer buttons)
      const toggleBtn = document.createElement('button');
      toggleBtn.id = 'readonly-toggle';
      toggleBtn.className = 'sidebar-expanded__collapse';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'sidebar-expanded__collapse-icon';
      iconSpan.textContent = savedEditMode ? '✎' : '👁';

      const textSpan = document.createElement('span');
      textSpan.id = 'readonly-toggle-text';
      textSpan.textContent = savedEditMode ? 'Edit mode on' : 'View-only mode';

      toggleBtn.appendChild(iconSpan);
      toggleBtn.appendChild(textSpan);

      toggleBtn.onclick = () => {
        const isCurrentlyReadonly = document.body.getAttribute('data-readonly') === 'true';

        if (isCurrentlyReadonly) {
          // Switch to edit mode
          document.body.removeAttribute('data-readonly');
          sessionStorage.setItem(editModeKey, 'true');
          iconSpan.textContent = '✎';
          textSpan.textContent = 'Edit mode on';
        } else {
          // Switch to view mode
          document.body.setAttribute('data-readonly', 'true');
          sessionStorage.removeItem(editModeKey);
          iconSpan.textContent = '👁';
          textSpan.textContent = 'View-only mode';
        }

        // Dispatch event for progress.js to react
        window.dispatchEvent(new CustomEvent('readonlyModeChanged', {
          detail: { readonly: !isCurrentlyReadonly }
        }));
      };

      // Insert into sidebar footer, above "Replay welcome tour" button
      const insertToggleIntoSidebar = () => {
        const replayTourBtn = document.getElementById('replayTour');
        if (replayTourBtn && replayTourBtn.parentNode) {
          replayTourBtn.parentNode.insertBefore(toggleBtn, replayTourBtn);
        }
      };

      // Try immediately, or wait for DOM
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertToggleIntoSidebar);
      } else {
        insertToggleIntoSidebar();
      }
    }

    return { email: userEmail, role: matchedRole };
  }

  // Unknown page context — allow through
  return { email: userEmail, role: null };

  } catch (err) {
    console.error('Auth initialization failed:', err);
    // Redirect to login on any auth error
    window.location.replace('/login?error=auth_failed');
    return new Promise(() => {}); // never resolve
  }
})();
