-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Scoring Audit Tables
-- Version: 001
-- Description: Adds tables for deterministic scoring audit trail, social media
--              caching, and score history tracking.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Assessment Audit Table
-- Stores the complete calculation breakdown for every assessment
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assessment_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to the assessment
  client_slug TEXT NOT NULL,

  -- Scoring engine metadata
  scoring_engine_version TEXT NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Raw inputs used for scoring (JSONB for flexibility)
  inputs_seoptimer JSONB,
  inputs_google_places JSONB,
  inputs_website_analysis JSONB,
  inputs_sociavault JSONB,

  -- Calculated scores
  scores_breakdown JSONB NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  overall_grade TEXT NOT NULL,

  -- Data quality indicators
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('high', 'medium', 'low')),
  missing_data_flags TEXT[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying audits by client
CREATE INDEX IF NOT EXISTS idx_assessment_audit_slug
  ON assessment_audit(client_slug);

-- Index for querying by date range
CREATE INDEX IF NOT EXISTS idx_assessment_audit_date
  ON assessment_audit(calculated_at DESC);

-- Index for querying by scoring engine version (useful for migrations)
CREATE INDEX IF NOT EXISTS idx_assessment_audit_version
  ON assessment_audit(scoring_engine_version);

COMMENT ON TABLE assessment_audit IS
  'Stores complete audit trail for every assessment score calculation';

COMMENT ON COLUMN assessment_audit.scores_breakdown IS
  'Full breakdown of category and sub-metric scores with calculation details';

COMMENT ON COLUMN assessment_audit.confidence_level IS
  'Overall confidence in scores: high (all data available), medium (some missing), low (critical data missing)';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Social Media Cache Table
-- Caches SociaVault API responses to avoid rate limiting and improve speed
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_media_cache (
  -- Using client_slug as primary key for simple lookups
  client_slug TEXT PRIMARY KEY,

  -- Cached payload from SociaVault
  payload JSONB NOT NULL,

  -- Cache metadata
  fetched_at TIMESTAMPTZ NOT NULL,
  source_api TEXT DEFAULT 'sociavault',
  source_version TEXT,

  -- Expiration timestamp (calculated by application as fetched_at + 24 hours)
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index for finding expired cache entries
CREATE INDEX IF NOT EXISTS idx_social_media_cache_expires
  ON social_media_cache(expires_at);

COMMENT ON TABLE social_media_cache IS
  'Caches social media API responses for 24 hours to reduce API calls';

COMMENT ON COLUMN social_media_cache.payload IS
  'Full SociaVault API response including all platform data';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Score History Table
-- Tracks score changes over time for progress monitoring
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to client
  client_slug TEXT NOT NULL,

  -- When this score was recorded
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Scores
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  overall_grade TEXT NOT NULL,
  category_scores JSONB NOT NULL,

  -- What triggered this record
  trigger TEXT CHECK (trigger IN ('initial', 'reassessment', 'scheduled', 'manual')),

  -- Optional link to the audit record that generated this
  assessment_audit_id UUID REFERENCES assessment_audit(id)
);

-- Index for querying history by client
CREATE INDEX IF NOT EXISTS idx_score_history_slug
  ON score_history(client_slug);

-- Index for querying by date
CREATE INDEX IF NOT EXISTS idx_score_history_date
  ON score_history(recorded_at DESC);

-- Composite index for efficient client + date queries
CREATE INDEX IF NOT EXISTS idx_score_history_slug_date
  ON score_history(client_slug, recorded_at DESC);

COMMENT ON TABLE score_history IS
  'Tracks score changes over time for measuring client improvement';

COMMENT ON COLUMN score_history.category_scores IS
  'JSON object with score for each category at time of recording';

COMMENT ON COLUMN score_history.trigger IS
  'What caused this score to be recorded: initial assessment, reassessment, scheduled check, or manual entry';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS Policies
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all new tables
ALTER TABLE assessment_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_history ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read/write all assessment_audit records
CREATE POLICY admin_all_assessment_audit ON assessment_audit
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
  );

-- Policy: Coaches can read audit records for their assigned clients
CREATE POLICY coach_read_assessment_audit ON assessment_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role = 'coach'
        AND up.client_slug = assessment_audit.client_slug
        AND up.active = true
    )
  );

-- Policy: Admins can manage social_media_cache
CREATE POLICY admin_all_social_media_cache ON social_media_cache
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
  );

-- Policy: Admins can read/write all score_history
CREATE POLICY admin_all_score_history ON score_history
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
  );

-- Policy: Coaches can read score_history for their clients
CREATE POLICY coach_read_score_history ON score_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role = 'coach'
        AND up.client_slug = score_history.client_slug
        AND up.active = true
    )
  );

-- Policy: Clients can read their own score_history
CREATE POLICY client_read_score_history ON score_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role = 'client'
        AND up.client_slug = score_history.client_slug
        AND up.active = true
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Helper Functions
-- ─────────────────────────────────────────────────────────────────────────────

-- Function to clean up expired social media cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_social_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM social_media_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_social_cache IS
  'Removes expired entries from social_media_cache. Can be called via pg_cron or manually.';


-- Function to get latest scores for a client
CREATE OR REPLACE FUNCTION get_latest_scores(p_client_slug TEXT)
RETURNS TABLE (
  overall_score INTEGER,
  overall_grade TEXT,
  category_scores JSONB,
  recorded_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sh.overall_score,
    sh.overall_grade,
    sh.category_scores,
    sh.recorded_at
  FROM score_history sh
  WHERE sh.client_slug = p_client_slug
  ORDER BY sh.recorded_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_latest_scores IS
  'Returns the most recent score record for a given client';


-- Function to get score trend for a client
CREATE OR REPLACE FUNCTION get_score_trend(p_client_slug TEXT, p_months INTEGER DEFAULT 3)
RETURNS TABLE (
  recorded_at TIMESTAMPTZ,
  overall_score INTEGER,
  overall_grade TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sh.recorded_at,
    sh.overall_score,
    sh.overall_grade
  FROM score_history sh
  WHERE sh.client_slug = p_client_slug
    AND sh.recorded_at >= NOW() - (p_months || ' months')::INTERVAL
  ORDER BY sh.recorded_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_score_trend IS
  'Returns score history for a client over specified months for trend analysis';


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Grants for Service Role
-- ─────────────────────────────────────────────────────────────────────────────

-- Service role needs full access for backend functions
GRANT ALL ON assessment_audit TO service_role;
GRANT ALL ON social_media_cache TO service_role;
GRANT ALL ON score_history TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION cleanup_expired_social_cache TO service_role;
GRANT EXECUTE ON FUNCTION get_latest_scores TO authenticated;
GRANT EXECUTE ON FUNCTION get_score_trend TO authenticated;
