-- Migration: Fix user_plans write policies for admin/PSM
-- Issue: Admins and PSMs cannot update project cohort_start_date and coach_email
-- Solution: Create/update policy to allow admin and PSM roles to update any user_plans row

-- Drop existing admin write policy if it exists (to recreate with better version)
DROP POLICY IF EXISTS "user_plans_admin_write" ON user_plans;
DROP POLICY IF EXISTS "user_plans_admin_psm_write" ON user_plans;

-- Create new policy that allows both admin AND psm to update any user_plans row
-- This checks if the current user has an admin or psm role with a wildcard client_slug
CREATE POLICY "user_plans_admin_psm_write" ON user_plans
FOR UPDATE TO authenticated
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

-- Also ensure coaches can update projects they're assigned to
DROP POLICY IF EXISTS "user_plans_coach_write" ON user_plans;

CREATE POLICY "user_plans_coach_write" ON user_plans
FOR UPDATE TO authenticated
USING (
  -- Coach can update rows where they are the assigned coach
  coach_email = auth.jwt() ->> 'email'
  OR
  -- Or where they have a coach role for this specific client
  EXISTS (
    SELECT 1 FROM user_plans up
    WHERE up.email = auth.jwt() ->> 'email'
      AND up.role = 'coach'
      AND up.client_slug = user_plans.client_slug
      AND up.active = true
  )
)
WITH CHECK (
  coach_email = auth.jwt() ->> 'email'
  OR
  EXISTS (
    SELECT 1 FROM user_plans up
    WHERE up.email = auth.jwt() ->> 'email'
      AND up.role = 'coach'
      AND up.client_slug = user_plans.client_slug
      AND up.active = true
  )
);

-- Verify the policies were created
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'user_plans'
ORDER BY policyname;
