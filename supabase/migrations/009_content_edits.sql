-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Content Edits
-- Version: 009
-- Description: Adds table for Admin/PSM/Coach text content edits on assessments
--              and accelerator plans. Edits are stored separately and applied
--              dynamically on page load.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Content Edits Table
-- Stores text edits made by Admin/PSM/Coach users
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to the client dashboard
  client_slug TEXT NOT NULL,

  -- Content identifier (e.g., "strategy-goal", "tactic1-overview-what-we-heard")
  content_key TEXT NOT NULL,

  -- The edited text value
  edited_value TEXT NOT NULL,

  -- Original value at time of first edit (for audit/revert)
  original_value TEXT,

  -- Who made this edit
  edited_by TEXT NOT NULL,

  -- Timestamps
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Only one edit per content key per client
  UNIQUE(client_slug, content_key)
);

-- Index for querying edits by client
CREATE INDEX IF NOT EXISTS idx_content_edits_slug
  ON content_edits(client_slug);

-- Index for querying by editor
CREATE INDEX IF NOT EXISTS idx_content_edits_editor
  ON content_edits(edited_by);

-- Index for querying recent edits
CREATE INDEX IF NOT EXISTS idx_content_edits_date
  ON content_edits(edited_at DESC);

COMMENT ON TABLE content_edits IS
  'Stores text content edits made by Admin/PSM/Coach users on dashboards';

COMMENT ON COLUMN content_edits.content_key IS
  'Unique identifier for the content element, e.g., "strategy-goal", "tactic1-step-3-description"';

COMMENT ON COLUMN content_edits.original_value IS
  'The original value at time of first edit, preserved for potential revert';

COMMENT ON COLUMN content_edits.edited_by IS
  'Email of the user who made this edit';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS Policies
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE content_edits ENABLE ROW LEVEL SECURITY;

-- Policy: Admins/PSMs can read/write all content_edits records
CREATE POLICY admin_psm_all_content_edits ON content_edits
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

-- Policy: Coaches can read/write content_edits for their assigned clients
CREATE POLICY coach_all_content_edits ON content_edits
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role = 'coach'
        AND up.client_slug = content_edits.client_slug
        AND up.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role = 'coach'
        AND up.client_slug = content_edits.client_slug
        AND up.active = true
    )
  );

-- Policy: Clients can read content_edits for their own dashboard
CREATE POLICY client_read_content_edits ON content_edits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role = 'client'
        AND up.client_slug = content_edits.client_slug
        AND up.active = true
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Grants for Service Role
-- ─────────────────────────────────────────────────────────────────────────────

-- Service role needs full access for backend functions
GRANT ALL ON content_edits TO service_role;
