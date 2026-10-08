-- Migration: Fix user_plans read policy to include PSM role
-- Issue: PSM users cannot read user_plans to list coaches in the coach assignment dropdown
-- Root cause: Self-referencing policies cause infinite recursion in PostgreSQL RLS
-- Solution: Use SECURITY DEFINER function (like auth_is_admin) to bypass RLS during the check

-- Create a SECURITY DEFINER function that checks for admin OR psm role
-- SECURITY DEFINER runs with creator privileges, bypassing RLS to avoid recursion
CREATE OR REPLACE FUNCTION auth_is_admin_or_psm()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_plans
    WHERE email      = (auth.jwt() ->> 'email')
      AND role       IN ('admin', 'psm')
      AND client_slug = '*'
      AND active     = true
  );
$$;

-- Create policy for PSM/admin to read all user_plans (for coach dropdown, user management, etc.)
-- This does NOT replace user_plans_admin_sees_all - that policy remains for backwards compatibility
CREATE POLICY "user_plans_admin_psm_sees_all" ON user_plans
FOR SELECT TO authenticated
USING (auth_is_admin_or_psm());

-- NOTE: Do NOT create self-referencing policies like this (causes infinite recursion):
-- CREATE POLICY "bad_example" ON user_plans FOR SELECT USING (
--   EXISTS (SELECT 1 FROM user_plans WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
-- );
-- Always use SECURITY DEFINER functions for self-referential checks.

-- Verify the policy was created
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'user_plans'
ORDER BY policyname;
