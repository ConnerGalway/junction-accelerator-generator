-- ============================================================================
-- RLS READ-ONLY AUDIT
-- ============================================================================
-- Purpose: Verify Row-Level Security status on all tables before making any
-- changes. Every query in this file is READ-ONLY. Nothing is modified.
--
-- How to run:
--   1. Open the Supabase Dashboard -> SQL Editor
--   2. Paste and run each section below (or the whole file)
--   3. Compare results against the expectations documented per section
--
-- Context: Netlify Functions use the SERVICE ROLE key and bypass RLS
-- entirely, so RLS only governs BROWSER access via the anon key. The
-- browser code performs these queries today:
--   - shared/auth.js     -> SELECT on user_plans (4 call sites)
--   - shared/progress.js -> SELECT + UPSERT on progress (3 call sites)
-- Any RLS change must keep those working for authenticated users.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 1. Which tables have RLS enabled?
-- ────────────────────────────────────────────────────────────────────────────
-- EXPECTATION: every table in this list should show rls_enabled = true.
-- Any row with rls_enabled = false is readable/writable by ANY authenticated
-- user (and possibly anon), because the anon key is public in
-- shared/supabase-client.js.

SELECT
  c.relname                                   AS table_name,
  c.relrowsecurity                            AS rls_enabled,
  c.relforcerowsecurity                       AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relrowsecurity ASC, c.relname;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. What policies exist, per table?
-- ────────────────────────────────────────────────────────────────────────────
-- EXPECTATION (from supabase/SETUP.md, which documents but does not apply):
--   user_plans:          admin read all / coach read assigned / admin write /
--                        coach write own
--   client_assessments:  scoped by user_plans membership
--   progress:            user can read/write own rows
--   score_history:       admins write, coaches/clients read own
--   assessment_audit:    admin read/write, coaches read own clients
--
-- Empty result for a table that HAS rls_enabled = true means DENY ALL:
-- browser access to that table is fully broken (check whether the app
-- actually uses it from the browser before celebrating).

SELECT
  tablename,
  policyname,
  cmd            AS applies_to,
  roles,
  qual           AS using_expression,
  with_check     AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ────────────────────────────────────────────────────────────────────────────
-- 3. DANGER LIST: tables with RLS disabled
-- ────────────────────────────────────────────────────────────────────────────
-- Any table returned here is exposed to every holder of the public anon key.

SELECT c.relname AS exposed_table
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
ORDER BY c.relname;


-- ────────────────────────────────────────────────────────────────────────────
-- 4. LOCKOUT LIST: tables with RLS enabled but ZERO policies
-- ────────────────────────────────────────────────────────────────────────────
-- These deny all browser access. If user_plans or progress appears here,
-- login/role checks or progress saving is already broken for clients.

SELECT c.relname AS locked_out_table
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname
  )
ORDER BY c.relname;


-- ────────────────────────────────────────────────────────────────────────────
-- 5. Table-level grants to anon / authenticated
-- ────────────────────────────────────────────────────────────────────────────
-- RLS is a second gate; the first gate is SQL GRANTs. Supabase grants broad
-- access to anon/authenticated by default. This shows what those roles can
-- attempt (RLS then filters rows, but only if enabled).

SELECT
  table_name,
  grantee,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;


-- ────────────────────────────────────────────────────────────────────────────
-- 6. Critical-table spot check
-- ────────────────────────────────────────────────────────────────────────────
-- One row per table the application depends on, with RLS status and policy
-- count side by side. This is the executive summary.

SELECT
  t.relname                                    AS table_name,
  t.relrowsecurity                             AS rls_enabled,
  COALESCE(p.policy_count, 0)                  AS policy_count,
  CASE
    WHEN NOT t.relrowsecurity THEN 'EXPOSED: any authenticated user can access'
    WHEN COALESCE(p.policy_count, 0) = 0 THEN 'LOCKED OUT: browser access denied'
    ELSE 'OK: verify policies match app queries'
  END                                          AS verdict
FROM pg_class t
JOIN pg_namespace n ON n.oid = t.relnamespace
LEFT JOIN (
  SELECT tablename, COUNT(*) AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON p.tablename = t.relname
WHERE n.nspname = 'public'
  AND t.relkind = 'r'
  AND t.relname IN (
    'user_plans',
    'client_assessments',
    'progress',
    'score_history',
    'assessment_audit',
    'social_media_cache',
    'email_stats'
  )
ORDER BY t.relname;
