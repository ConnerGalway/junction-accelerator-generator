-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Milestone Manual Trigger Tracking
-- Version: 017
-- Description: Adds columns to track manual triggering of milestone assessments
--              and ensures PSM email notification configuration.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add manual trigger tracking columns
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE milestone_assessments
ADD COLUMN IF NOT EXISTS triggered_by TEXT,
ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMPTZ;

COMMENT ON COLUMN milestone_assessments.triggered_by IS
  'Email of admin/PSM who manually triggered this assessment (null if auto-triggered)';

COMMENT ON COLUMN milestone_assessments.triggered_at IS
  'Timestamp when manual trigger was initiated';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add index for finding milestones that need email notification
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_milestone_assessments_needs_notification
  ON milestone_assessments(status, notification_sent_at)
  WHERE status = 'completed' AND notification_sent_at IS NULL;

COMMENT ON INDEX idx_milestone_assessments_needs_notification IS
  'Optimizes queries for finding completed milestones awaiting email notification';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Ensure PSM user exists for email notifications
-- This is a data check, not a structural migration
-- ─────────────────────────────────────────────────────────────────────────────

-- Note: The PSM (brooke@wearejunction.com) should be added via the admin UI
-- or directly in user_plans with:
--   email: brooke@wearejunction.com
--   role: psm
--   client_slug: *
--   active: true

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Helper function to get due milestones with client info
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_due_milestones_with_details()
RETURNS TABLE (
  id UUID,
  client_slug TEXT,
  milestone_type TEXT,
  due_date DATE,
  business_name TEXT,
  coach_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ma.id,
    ma.client_slug,
    ma.milestone_type,
    ma.due_date,
    ca.business_name,
    up.coach_email
  FROM milestone_assessments ma
  LEFT JOIN client_assessments ca ON ca.client_slug = ma.client_slug
  LEFT JOIN user_plans up ON up.client_slug = ma.client_slug AND up.role = 'client' AND up.active = true
  WHERE ma.status = 'pending'
    AND ma.due_date <= CURRENT_DATE
  ORDER BY ma.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_due_milestones_with_details() TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Helper function to get milestones needing notification
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_milestones_needing_notification()
RETURNS TABLE (
  id UUID,
  client_slug TEXT,
  milestone_type TEXT,
  overall_score INTEGER,
  overall_grade TEXT,
  score_delta INTEGER,
  category_deltas JSONB,
  business_name TEXT,
  coach_email TEXT,
  notification_recipients JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ma.id,
    ma.client_slug,
    ma.milestone_type,
    ma.overall_score,
    ma.overall_grade,
    ma.score_delta,
    ma.category_deltas,
    ca.business_name,
    up.coach_email,
    ma.notification_recipients
  FROM milestone_assessments ma
  LEFT JOIN client_assessments ca ON ca.client_slug = ma.client_slug
  LEFT JOIN user_plans up ON up.client_slug = ma.client_slug AND up.role = 'client' AND up.active = true
  WHERE ma.status = 'completed'
    AND ma.notification_sent_at IS NULL
  ORDER BY ma.generated_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_milestones_needing_notification() TO service_role;
