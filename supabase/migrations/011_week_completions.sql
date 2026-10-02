-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 011: Week Completions Tracking
-- Purpose: Track when clients complete 100% of tasks in a week, to enable
--          PSM notifications without sending duplicate emails.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Table to track notified week completions
CREATE TABLE IF NOT EXISTS week_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_slug TEXT NOT NULL,
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 12),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  psm_email TEXT,

  -- Prevent duplicate entries for same user/client/week
  CONSTRAINT week_completions_unique UNIQUE (user_id, client_slug, week)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_week_completions_client ON week_completions(client_slug);
CREATE INDEX IF NOT EXISTS idx_week_completions_user ON week_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_week_completions_date ON week_completions(completed_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE week_completions ENABLE ROW LEVEL SECURITY;

-- Admin/PSM: can read all completions
CREATE POLICY admin_psm_read_completions ON week_completions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_plans up
    WHERE up.email = auth.jwt() ->> 'email'
      AND up.role IN ('admin', 'psm')
      AND up.client_slug = '*'
      AND up.active = true
  ));

-- Coach: can read completions for their assigned clients
CREATE POLICY coach_read_completions ON week_completions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_plans up
    WHERE up.email = auth.jwt() ->> 'email'
      AND up.role = 'coach'
      AND up.client_slug = week_completions.client_slug
      AND up.active = true
  ));

-- Users can read their own completions
CREATE POLICY user_read_own_completions ON week_completions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own completions
CREATE POLICY user_insert_own_completions ON week_completions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Service role: full access (for Netlify functions)
CREATE POLICY service_role_completions ON week_completions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMENT
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE week_completions IS 'Tracks when clients complete 100% of tasks in a week. Used to trigger PSM notifications and prevent duplicate emails.';
COMMENT ON COLUMN week_completions.notified_at IS 'Timestamp when the PSM was notified. NULL if notification not yet sent.';
COMMENT ON COLUMN week_completions.psm_email IS 'Email address of the PSM who was notified.';
