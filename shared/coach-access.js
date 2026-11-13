// Coach dashboard access.
//
// A coach can open a client dashboard only when user_plans holds an active row
// with email = the coach and client_slug = the client (see shared/auth.js).
// The coach_email column on the other rows is a display label and grants
// nothing on its own.
//
// Every server-side path that assigns a coach calls ensureCoachAccess (and
// revokeCoachAccess for the coach being replaced) so the
// row is written one way and a failure is always reported. It must run with
// the service role client: the table has no insert policy for staff, and no
// unique constraint to upsert against, so it looks the row up first and then
// inserts or updates it.

const STAFF_ROLES = ['admin', 'psm', 'coach'];

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Make sure a coach has an active user_plans row for a client.
 *
 * @param {object} supabaseAdmin  Supabase client created with the service role key
 * @param {object} options
 * @param {string} options.coachEmail  The coach's login email
 * @param {string} options.slug        Client slug
 * @param {string} [options.startDate] Onboarding call date (YYYY-MM-DD). When given,
 *                                     it is also written to an existing coach row.
 * @param {string} [options.dashboardState] Dashboard type to record on the row, for
 *                                     example 'experience'. Defaults to the client's existing value.
 * @returns {Promise<{ok: boolean, action?: string, error?: string}>}
 */
async function ensureCoachAccess(supabaseAdmin, { coachEmail, slug, startDate, dashboardState } = {}) {
  const email = (coachEmail || '').trim().toLowerCase();
  if (!email || !slug) {
    return { ok: false, error: 'A coach email and a client are both required.' };
  }

  const { data: rows, error: readError } = await supabaseAdmin
    .from('user_plans')
    .select('id, email, role, active, cohort_start_date, dashboard_state')
    .eq('client_slug', slug);

  if (readError) {
    return { ok: false, error: `Could not read existing access: ${readError.message}` };
  }

  const existing = rows || [];
  const own = existing.filter(row => (row.email || '').toLowerCase() === email);
  const ownRow = own.find(row => row.role === 'coach')
    || own.find(row => row.role === 'admin' || row.role === 'psm')
    || own[0];

  if (ownRow) {
    const changes = {};
    if (!ownRow.active) changes.active = true;
    // A client row for the same person becomes a coach row. Admin and PSM rows keep their role.
    if (ownRow.role === 'client') changes.role = 'coach';
    if (startDate && ownRow.cohort_start_date !== startDate) changes.cohort_start_date = startDate;
    if (dashboardState && ownRow.dashboard_state !== dashboardState) changes.dashboard_state = dashboardState;

    if (Object.keys(changes).length === 0) {
      return { ok: true, action: 'unchanged' };
    }

    const { error: updateError } = await supabaseAdmin
      .from('user_plans')
      .update(changes)
      .eq('id', ownRow.id);

    if (updateError) {
      return { ok: false, error: `Could not update the coach's access: ${updateError.message}` };
    }
    return { ok: true, action: 'updated' };
  }

  // cohort_start_date is required by the table. Use the date given, then the
  // client's existing date, then today (the same fallback invite-client uses).
  const reference = existing.find(row => row.cohort_start_date) || existing[0];
  const { error: insertError } = await supabaseAdmin
    .from('user_plans')
    .insert({
      email,
      client_slug: slug,
      role: 'coach',
      active: true,
      cohort_start_date: startDate || reference?.cohort_start_date || todayIso(),
      coach_email: email,
      dashboard_state: dashboardState || reference?.dashboard_state || null
    });

  if (insertError) {
    return { ok: false, error: `Could not create the coach's access: ${insertError.message}` };
  }
  return { ok: true, action: 'created' };
}

/**
 * Remove a previous coach's dashboard access to a client by deactivating
 * their coach row. Only rows with role = 'coach' are touched, so an admin,
 * PSM or client with the same email keeps their access. The row is kept, not
 * deleted, so assigning the same coach again simply reactivates it.
 *
 * @param {object} supabaseAdmin  Supabase client created with the service role key
 * @param {object} options
 * @param {string} options.coachEmail  The previous coach's email
 * @param {string} options.slug        Client slug
 * @returns {Promise<{ok: boolean, revoked?: number, error?: string}>}
 */
async function revokeCoachAccess(supabaseAdmin, { coachEmail, slug } = {}) {
  const email = (coachEmail || '').trim().toLowerCase();
  if (!email || !slug) {
    return { ok: false, error: 'A coach email and a client are both required.' };
  }

  const { data: rows, error: readError } = await supabaseAdmin
    .from('user_plans')
    .select('id, email, role, active, cohort_start_date, dashboard_state')
    .eq('client_slug', slug);

  if (readError) {
    return { ok: false, error: `Could not read existing access: ${readError.message}` };
  }

  const targets = (rows || []).filter(row =>
    row.role === 'coach' && row.active && (row.email || '').toLowerCase() === email
  );

  for (const row of targets) {
    const { error: updateError } = await supabaseAdmin
      .from('user_plans')
      .update({ active: false })
      .eq('id', row.id);

    if (updateError) {
      return { ok: false, error: `Could not remove the previous coach's access: ${updateError.message}` };
    }
  }

  return { ok: true, revoked: targets.length };
}

/**
 * Whether a signed-in user may assign a coach to a client: staff with access
 * to every client, or staff with their own active row for this client.
 *
 * @param {Array<{role: string, client_slug: string}>} callerRows  The caller's active user_plans rows
 * @param {string} slug
 */
function canAssignCoach(callerRows, slug) {
  return (callerRows || []).some(row =>
    STAFF_ROLES.includes(row.role) && (row.client_slug === '*' || row.client_slug === slug)
  );
}

export { ensureCoachAccess, revokeCoachAccess, canAssignCoach };
