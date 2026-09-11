-- Migration: Fix milestone_assessments UPDATE policies
-- Issue: Coaches cannot update milestone due dates when changing cohort_start_date
-- Solution: Add UPDATE policy for coaches on milestone_assessments

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Fix admin_psm policy to include explicit WITH CHECK
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop and recreate the admin_psm policy with explicit WITH CHECK
DROP POLICY IF EXISTS admin_psm_all_milestone_assessments ON milestone_assessments;

CREATE POLICY admin_psm_all_milestone_assessments ON milestone_assessments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role IN ('admin', 'psm')
        AND up.client_slug = '*'
        AND up.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role IN ('admin', 'psm')
        AND up.client_slug = '*'
        AND up.active = true
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add UPDATE policy for coaches
-- Coaches can update milestone records for clients they are assigned to
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS coach_update_milestone_assessments ON milestone_assessments;

CREATE POLICY coach_update_milestone_assessments ON milestone_assessments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role = 'coach'
        AND up.client_slug = milestone_assessments.client_slug
        AND up.active = true
    )
    OR
    -- Also allow if they are the assigned coach for this client
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.client_slug = milestone_assessments.client_slug
        AND up.coach_email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role = 'coach'
        AND up.client_slug = milestone_assessments.client_slug
        AND up.active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.client_slug = milestone_assessments.client_slug
        AND up.coach_email = auth.jwt() ->> 'email'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Verify policies
-- ─────────────────────────────────────────────────────────────────────────────

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'milestone_assessments'
ORDER BY policyname;
