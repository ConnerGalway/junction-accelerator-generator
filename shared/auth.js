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
// Two page contexts are handled:
//   data-page="my-clients"  → verify admin/psm/coach; redirect clients to their plan
//   data-client-slug="..."  → verify access to that specific client plan

window.__authReady = (async function () {

  // ------------------------------------------------------------------
  // 1. Check for an active session — redirect to /login if none exists
  // ------------------------------------------------------------------
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.replace('/login');
    return new Promise(() => {}); // redirect in flight — never resolve
  }

  const userEmail  = session.user.email;
  const clientSlug = document.body.getAttribute('data-client-slug');
  const page       = document.body.getAttribute('data-page');

  // ==================================================================
  // MY-CLIENTS PAGE
  // Verify the user is admin, psm, or coach. Redirect clients to their plan.
  // ==================================================================
  if (page === 'my-clients') {

    const { data: rows } = await supabaseClient
      .from('user_plans')
      .select('role, client_slug')
      .eq('email', userEmail)
      .eq('active', true);

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
        window.location.replace('/' + clientRow.client_slug + '/');
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
  // CLIENT PLAN PAGE
  // Verify the user has access to this specific client slug.
  // ==================================================================
  if (clientSlug) {

    // ------------------------------------------------------------------
    // 2. Look up the user's row in user_plans for this specific client
    // ------------------------------------------------------------------
    const { data: rows } = await supabaseClient
      .from('user_plans')
      .select('role, active')
      .eq('email', userEmail)
      .eq('client_slug', clientSlug)
      .eq('active', true);

    let matchedRole = null;

    if (rows && rows.length > 0) {
      matchedRole = rows[0].role;
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
    // 5. Coaches, PSMs, and admins get read-only mode — disable all
    //    interactions and show a banner at the top of the page
    // ------------------------------------------------------------------
    if (matchedRole === 'coach' || matchedRole === 'psm' || matchedRole === 'admin') {
      document.body.setAttribute('data-readonly', 'true');

      const banner = document.createElement('div');
      banner.id = 'readonly-banner';
      banner.style.cssText = [
        'position: fixed',
        'top: 0',
        'left: 0',
        'right: 0',
        'z-index: 9999',
        'background: #11154b',
        'color: #ffffff',
        'text-align: center',
        'padding: 10px 16px',
        'font-family: sans-serif',
        'font-size: 14px',
        'letter-spacing: 0.01em'
      ].join(';');
      banner.textContent = 'You are viewing this plan in read-only mode.';

      document.body.prepend(banner);
    }

    return { email: userEmail, role: matchedRole };
  }

  // Unknown page context — allow through
  return { email: userEmail, role: null };

})();
