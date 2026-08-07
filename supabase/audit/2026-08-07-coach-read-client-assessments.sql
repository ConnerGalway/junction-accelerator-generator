-- Applied to production (project weyugmllkettrshtrmug) on 2026-08-07.
--
-- Context: my-clients/index.html queries client_assessments from the browser
-- with `created_by = currentUser.email` for non-admin/psm users, but the table
-- previously had only the assessments_admin_all policy. Coaches therefore
-- silently received empty assessment lists.
--
-- This policy lets any active user (per user_plans) read assessments they
-- created. Delete/regenerate remain admin/psm-only via assessments_admin_all,
-- matching the UI gating in my-clients/index.html.

CREATE POLICY coach_read_own_assessments ON public.client_assessments
  FOR SELECT TO authenticated
  USING (
    created_by = (auth.jwt() ->> 'email')
    AND EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = (auth.jwt() ->> 'email')
        AND up.active = true
    )
  );

-- Also applied 2026-08-07: deactivated the test fixture rows that pointed at
-- the deleted clients/test, clients/test2, clients/test3 directories.
-- Reversible with: UPDATE user_plans SET active = true WHERE client_slug IN ('test','test2','test3');

UPDATE user_plans
SET active = false
WHERE client_slug IN ('test', 'test2', 'test3');
