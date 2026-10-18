-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: WYSIWYG Content Edits Enhancement
-- Version: 016
-- Description: Extends content_edits table for rich media support and adds
--              version history for content changes.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend content_edits Table for Media Support
-- ─────────────────────────────────────────────────────────────────────────────

-- Add media_type column to distinguish between text, image, and embed content
ALTER TABLE content_edits
  ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'text';

-- Add media_config for storing additional media metadata (dimensions, sources, etc.)
ALTER TABLE content_edits
  ADD COLUMN IF NOT EXISTS media_config JSONB;

-- Add constraint for valid media types
ALTER TABLE content_edits
  DROP CONSTRAINT IF EXISTS content_edits_media_type_check;

ALTER TABLE content_edits
  ADD CONSTRAINT content_edits_media_type_check
  CHECK (media_type IN ('text', 'image', 'embed', 'link'));

COMMENT ON COLUMN content_edits.media_type IS
  'Type of content: text (default), image, embed (video/iframe), or link';

COMMENT ON COLUMN content_edits.media_config IS
  'JSON config for media content, e.g., { "width": 800, "height": 600, "alt": "...", "embedType": "youtube" }';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Content Edit Versions Table
-- Stores version history for all content changes per client
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_edit_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to the client dashboard
  client_slug TEXT NOT NULL,

  -- Version number (auto-incremented per client)
  version_number INTEGER NOT NULL,

  -- Snapshot of all edits at this version
  -- Array of { content_key, edited_value, media_type, media_config }
  edits JSONB NOT NULL,

  -- Change summary (optional)
  change_summary TEXT,

  -- Who created this version
  created_by TEXT NOT NULL,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Only one version per number per client
  UNIQUE(client_slug, version_number)
);

-- Index for querying versions by client
CREATE INDEX IF NOT EXISTS idx_content_edit_versions_slug
  ON content_edit_versions(client_slug, version_number DESC);

-- Index for querying by creator
CREATE INDEX IF NOT EXISTS idx_content_edit_versions_creator
  ON content_edit_versions(created_by);

COMMENT ON TABLE content_edit_versions IS
  'Version history for content edits, enabling restore to previous states';

COMMENT ON COLUMN content_edit_versions.edits IS
  'JSON array of all edited content at this version snapshot';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS Policies for content_edit_versions
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE content_edit_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins/PSMs can read/write all versions
CREATE POLICY admin_psm_all_content_edit_versions ON content_edit_versions
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

-- Policy: Coaches can read/write versions for their assigned clients
CREATE POLICY coach_all_content_edit_versions ON content_edit_versions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role = 'coach'
        AND up.client_slug = content_edit_versions.client_slug
        AND up.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role = 'coach'
        AND up.client_slug = content_edit_versions.client_slug
        AND up.active = true
    )
  );

-- Policy: Clients can read versions for their own dashboard (for transparency)
CREATE POLICY client_read_content_edit_versions ON content_edit_versions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role = 'client'
        AND up.client_slug = content_edit_versions.client_slug
        AND up.active = true
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Helper Function: Get Next Version Number
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_next_content_version(p_client_slug TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version
  FROM content_edit_versions
  WHERE client_slug = p_client_slug;

  RETURN v_next_version;
END;
$$;

COMMENT ON FUNCTION get_next_content_version IS
  'Returns the next version number for a client''s content edit history';


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Grants for Service Role
-- ─────────────────────────────────────────────────────────────────────────────

-- Service role needs full access for backend functions
GRANT ALL ON content_edit_versions TO service_role;
GRANT EXECUTE ON FUNCTION get_next_content_version TO service_role;
GRANT EXECUTE ON FUNCTION get_next_content_version TO authenticated;
