-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Experience Dashboard Support
-- Version: 007
-- Description: Adds support for "experience" dashboard type and provides a secure
--              function for clients to set their launch start date.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Update dashboard_state column comment
-- Documents "experience" as the third valid value alongside NULL and "elevated"
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON COLUMN user_plans.dashboard_state IS
  'Dashboard state for client users: NULL=standard accelerator, elevated=assessment-only Masterclass dashboard, experience=experience design dashboard';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Function: set_launch_start_date
-- Allows authenticated users to set the cohort_start_date for a client project.
-- - Clients can only set it once (cannot change after initial set)
-- - Admins and PSMs can set or change it at any time
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_launch_start_date(
  p_client_slug TEXT,
  p_start_date DATE
)
RETURNS JSONB AS $$
DECLARE
  v_caller_email TEXT;
  v_is_staff BOOLEAN := false;
  v_has_access BOOLEAN := false;
  v_current_date DATE;
  v_rows_updated INTEGER;
BEGIN
  -- Get caller email from JWT
  v_caller_email := auth.jwt() ->> 'email';

  IF v_caller_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Check if caller is admin or PSM (staff with wildcard access)
  SELECT EXISTS (
    SELECT 1 FROM user_plans up
    WHERE up.email = v_caller_email
      AND up.role IN ('admin', 'psm')
      AND up.client_slug = '*'
      AND up.active = true
  ) INTO v_is_staff;

  -- Check if caller has access to this specific client
  IF NOT v_is_staff THEN
    SELECT EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = v_caller_email
        AND up.client_slug = p_client_slug
        AND up.active = true
    ) INTO v_has_access;

    IF NOT v_has_access THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Access denied: no permission for this client'
      );
    END IF;
  END IF;

  -- Get current cohort_start_date for this client
  SELECT cohort_start_date INTO v_current_date
  FROM user_plans
  WHERE client_slug = p_client_slug
    AND active = true
  LIMIT 1;

  -- Check if date is already set and caller is not staff
  IF v_current_date IS NOT NULL AND NOT v_is_staff THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Launch date already set. Contact support to change it.',
      'current_date', v_current_date::TEXT
    );
  END IF;

  -- Validate date is not in the past (unless staff)
  IF p_start_date < CURRENT_DATE AND NOT v_is_staff THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Launch date cannot be in the past'
    );
  END IF;

  -- Update cohort_start_date on all user_plans rows for this client
  UPDATE user_plans
  SET cohort_start_date = p_start_date
  WHERE client_slug = p_client_slug
    AND active = true;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active user plans found for this client'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'client_slug', p_client_slug,
    'launch_date', p_start_date::TEXT,
    'rows_updated', v_rows_updated
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_launch_start_date(TEXT, DATE) IS
  'Sets the launch start date (cohort_start_date) for an experience project. Clients can only set once; staff can update any time.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Permissions
-- ─────────────────────────────────────────────────────────────────────────────

-- Revoke default public access
REVOKE ALL ON FUNCTION set_launch_start_date(TEXT, DATE) FROM PUBLIC;

-- Grant to authenticated users (function handles authorization internally)
GRANT EXECUTE ON FUNCTION set_launch_start_date(TEXT, DATE) TO authenticated;

-- Grant to service role for backend operations
GRANT EXECUTE ON FUNCTION set_launch_start_date(TEXT, DATE) TO service_role;
