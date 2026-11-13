/**
 * Tests for shared/coach-access.js: the one place a coach's dashboard access
 * row is written. Uses a small in-memory stand-in for the Supabase client that
 * enforces the real table's rule that cohort_start_date is required.
 */

import { ensureCoachAccess, revokeCoachAccess, canAssignCoach } from '../shared/coach-access.js';

function fakeSupabase(initialRows = [], { failInsert = false } = {}) {
  const rows = initialRows.map((row, index) => ({ id: `id-${index + 1}`, active: true, ...row }));
  return {
    rows,
    from() {
      return {
        select() {
          return {
            eq: async (column, value) => ({ data: rows.filter(row => row[column] === value), error: null })
          };
        },
        insert: async (row) => {
          if (failInsert) return { error: { message: 'insert blocked' } };
          if (!row.cohort_start_date) return { error: { message: 'null value in column "cohort_start_date"' } };
          rows.push({ id: `id-${rows.length + 1}`, ...row });
          return { error: null };
        },
        update(changes) {
          return {
            eq: async (column, value) => {
              rows.filter(row => row[column] === value).forEach(row => Object.assign(row, changes));
              return { error: null };
            }
          };
        }
      };
    }
  };
}

const SLUG = 'test-lodge';
const clientRow = { email: 'owner@test-lodge.example', client_slug: SLUG, role: 'client', cohort_start_date: '2026-11-03', dashboard_state: 'full' };

describe('ensureCoachAccess', () => {
  test('creates a coach row when the coach is only named in the label', async () => {
    const db = fakeSupabase([{ ...clientRow, coach_email: 'coach@example.com' }]);
    const result = await ensureCoachAccess(db, { coachEmail: 'Coach@Example.com', slug: SLUG });

    expect(result).toEqual({ ok: true, action: 'created' });
    const coach = db.rows.find(row => row.role === 'coach');
    expect(coach).toMatchObject({
      email: 'coach@example.com',
      client_slug: SLUG,
      active: true,
      cohort_start_date: '2026-11-03',
      dashboard_state: 'full'
    });
  });

  test('uses the given start date, and today when the client has no rows yet', async () => {
    const withDate = fakeSupabase([]);
    await ensureCoachAccess(withDate, { coachEmail: 'coach@example.com', slug: SLUG, startDate: '2026-12-01' });
    expect(withDate.rows[0].cohort_start_date).toBe('2026-12-01');

    const withoutDate = fakeSupabase([]);
    const result = await ensureCoachAccess(withoutDate, { coachEmail: 'coach@example.com', slug: SLUG });
    expect(result.ok).toBe(true);
    expect(withoutDate.rows[0].cohort_start_date).toBe(new Date().toISOString().split('T')[0]);
  });

  test('does not create a second row when the coach already has one', async () => {
    const db = fakeSupabase([clientRow, { email: 'coach@example.com', client_slug: SLUG, role: 'coach', cohort_start_date: '2026-11-03' }]);
    const result = await ensureCoachAccess(db, { coachEmail: 'coach@example.com', slug: SLUG });

    expect(result).toEqual({ ok: true, action: 'unchanged' });
    expect(db.rows).toHaveLength(2);
  });

  test('reactivates an inactive coach row and updates its start date', async () => {
    const db = fakeSupabase([{ email: 'coach@example.com', client_slug: SLUG, role: 'coach', active: false, cohort_start_date: '2026-11-03' }]);
    const result = await ensureCoachAccess(db, { coachEmail: 'coach@example.com', slug: SLUG, startDate: '2026-11-10' });

    expect(result).toEqual({ ok: true, action: 'updated' });
    expect(db.rows[0]).toMatchObject({ active: true, cohort_start_date: '2026-11-10' });
    expect(db.rows).toHaveLength(1);
  });

  test('turns the same person\'s client row into a coach row but leaves admin rows alone', async () => {
    const asClient = fakeSupabase([{ ...clientRow, email: 'coach@example.com' }]);
    await ensureCoachAccess(asClient, { coachEmail: 'coach@example.com', slug: SLUG });
    expect(asClient.rows).toHaveLength(1);
    expect(asClient.rows[0].role).toBe('coach');

    const asAdmin = fakeSupabase([{ ...clientRow, email: 'coach@example.com', role: 'admin' }]);
    const result = await ensureCoachAccess(asAdmin, { coachEmail: 'coach@example.com', slug: SLUG });
    expect(result.action).toBe('unchanged');
    expect(asAdmin.rows[0].role).toBe('admin');
  });

  test('reports a failed insert instead of hiding it', async () => {
    const db = fakeSupabase([clientRow], { failInsert: true });
    const result = await ensureCoachAccess(db, { coachEmail: 'coach@example.com', slug: SLUG });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('insert blocked');
  });

  test('rejects a missing coach email or client', async () => {
    const db = fakeSupabase([]);
    expect((await ensureCoachAccess(db, { coachEmail: '', slug: SLUG })).ok).toBe(false);
    expect((await ensureCoachAccess(db, { coachEmail: 'coach@example.com', slug: '' })).ok).toBe(false);
  });
});

describe('experience projects', () => {
  test('the first row for an experience project is created with its dashboard type and a start date', async () => {
    const db = fakeSupabase([]);
    const result = await ensureCoachAccess(db, { coachEmail: 'coach@example.com', slug: SLUG, dashboardState: 'experience' });

    expect(result).toEqual({ ok: true, action: 'created' });
    expect(db.rows[0]).toMatchObject({ role: 'coach', dashboard_state: 'experience' });
    expect(db.rows[0].cohort_start_date).toBeTruthy();
  });

  test('an existing row is switched to the experience dashboard type', async () => {
    const db = fakeSupabase([{ email: 'coach@example.com', client_slug: SLUG, role: 'coach', cohort_start_date: '2026-11-03', dashboard_state: null }]);
    await ensureCoachAccess(db, { coachEmail: 'coach@example.com', slug: SLUG, dashboardState: 'experience' });

    expect(db.rows[0].dashboard_state).toBe('experience');
    expect(db.rows[0].cohort_start_date).toBe('2026-11-03');
  });
});

describe('revokeCoachAccess', () => {
  const coachRow = email => ({ email, client_slug: SLUG, role: 'coach', cohort_start_date: '2026-11-03' });

  test('deactivates the previous coach and leaves everyone else alone', async () => {
    const db = fakeSupabase([clientRow, coachRow('old@example.com'), coachRow('new@example.com')]);
    const result = await revokeCoachAccess(db, { coachEmail: 'Old@Example.com', slug: SLUG });

    expect(result).toEqual({ ok: true, revoked: 1 });
    expect(db.rows.find(row => row.email === 'old@example.com').active).toBe(false);
    expect(db.rows.find(row => row.email === 'new@example.com').active).toBe(true);
    expect(db.rows.find(row => row.role === 'client').active).toBe(true);
  });

  test('never touches an admin, PSM or client row with the same email', async () => {
    const db = fakeSupabase([
      { ...clientRow, email: 'old@example.com', role: 'admin' },
      { ...clientRow, email: 'old@example.com', role: 'client' }
    ]);
    const result = await revokeCoachAccess(db, { coachEmail: 'old@example.com', slug: SLUG });

    expect(result).toEqual({ ok: true, revoked: 0 });
    expect(db.rows.every(row => row.active)).toBe(true);
  });

  test('does not affect the same coach on another client', async () => {
    const db = fakeSupabase([coachRow('old@example.com'), { ...coachRow('old@example.com'), client_slug: 'another-client' }]);
    await revokeCoachAccess(db, { coachEmail: 'old@example.com', slug: SLUG });

    expect(db.rows.find(row => row.client_slug === 'another-client').active).toBe(true);
  });

  test('assigning the coach again reactivates the same row', async () => {
    const db = fakeSupabase([coachRow('old@example.com')]);
    await revokeCoachAccess(db, { coachEmail: 'old@example.com', slug: SLUG });
    const result = await ensureCoachAccess(db, { coachEmail: 'old@example.com', slug: SLUG });

    expect(result.action).toBe('updated');
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].active).toBe(true);
  });
});

describe('canAssignCoach', () => {
  test('allows staff with access to every client', () => {
    expect(canAssignCoach([{ role: 'admin', client_slug: '*' }], SLUG)).toBe(true);
    expect(canAssignCoach([{ role: 'psm', client_slug: '*' }], SLUG)).toBe(true);
  });

  test('allows a coach assigned to this client only', () => {
    expect(canAssignCoach([{ role: 'coach', client_slug: SLUG }], SLUG)).toBe(true);
    expect(canAssignCoach([{ role: 'coach', client_slug: 'another-client' }], SLUG)).toBe(false);
  });

  test('refuses clients and users with no rows', () => {
    expect(canAssignCoach([{ role: 'client', client_slug: SLUG }], SLUG)).toBe(false);
    expect(canAssignCoach([], SLUG)).toBe(false);
    expect(canAssignCoach(null, SLUG)).toBe(false);
  });
});

describe('callers use the shared helper', () => {
  const fs = require('fs');
  const path = require('path');
  const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

  test('no function upserts into user_plans against a constraint the table does not have', () => {
    for (const file of ['netlify/functions/create-project.js', 'netlify/functions/create-experience-project.js', 'netlify/functions/generate-assessment-background.js']) {
      const source = read(file);
      expect(source).toContain('ensureCoachAccess(');
      expect(source).not.toContain("onConflict: 'email,client_slug,role'");
    }
  });

  test('My Clients grants coach access through the server, not a browser insert', () => {
    const page = read('my-clients/index.html');
    expect(page).toContain('/.netlify/functions/grant-coach-access');
    expect(page).not.toMatch(/from\('user_plans'\)\s*\.insert\(/);
  });

  test('Edit Project and Change Coach both remove the previous coach', () => {
    const page = read('my-clients/index.html');
    expect(page).toContain('revokePreviousCoachAccess(originalCoachEmail, newCoachEmail, editTargetSlug)');
    expect(page).toContain('revokePreviousCoachAccess(changeCoachOriginalEmail, newCoachEmail, changeCoachTargetSlug)');
  });

  test('no upload function writes a coach row without the helper', () => {
    for (const file of ['netlify/functions/create-project.js', 'netlify/functions/create-experience-project.js', 'netlify/functions/generate-assessment-background.js']) {
      expect(read(file)).not.toMatch(/role: 'coach',/);
    }
  });
});
