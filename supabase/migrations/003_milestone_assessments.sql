-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Milestone Assessments
-- Version: 003
-- Description: Adds table for tracking 30/60/90 day milestone assessments with
--              comparison data against the initial assessment.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Milestone Assessments Table
-- Stores each milestone assessment (initial, 30-day, 60-day, 90-day)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS milestone_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to client
  client_slug TEXT NOT NULL,

  -- Milestone type: initial, 30-day, 60-day, 90-day
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('initial', '30-day', '60-day', '90-day')),

  -- When this milestone was due (calculated from cohort_start_date)
  due_date DATE NOT NULL,

  -- When assessment was actually generated
  generated_at TIMESTAMPTZ,

  -- Status: pending, scheduled, generating, completed, failed
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'generating', 'completed', 'failed')),

  -- Link to the assessment_audit record for this milestone
  assessment_audit_id UUID REFERENCES assessment_audit(id),

  -- Snapshot of scores at this milestone
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  overall_grade TEXT,
  category_scores JSONB,

  -- Comparison deltas (vs initial - null for initial milestone)
  score_delta INTEGER,
  category_deltas JSONB,

  -- Full assessment data (same structure as client_assessments.assessment_data)
  assessment_data JSONB,

  -- Email notification tracking
  notification_sent_at TIMESTAMPTZ,
  notification_recipients JSONB,

  -- Error tracking
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique milestone per client
  CONSTRAINT unique_client_milestone UNIQUE (client_slug, milestone_type)
);

-- Index for querying milestones by client
CREATE INDEX IF NOT EXISTS idx_milestone_assessments_slug
  ON milestone_assessments(client_slug);

-- Index for querying by status (for scheduler to find pending milestones)
CREATE INDEX IF NOT EXISTS idx_milestone_assessments_status
  ON milestone_assessments(status);

-- Index for finding due milestones
CREATE INDEX IF NOT EXISTS idx_milestone_assessments_due
  ON milestone_assessments(due_date)
  WHERE status = 'pending';

-- Index for querying by milestone type
CREATE INDEX IF NOT EXISTS idx_milestone_assessments_type
  ON milestone_assessments(milestone_type);

COMMENT ON TABLE milestone_assessments IS
  'Tracks milestone assessments (initial, 30-day, 60-day, 90-day) with comparison data';

COMMENT ON COLUMN milestone_assessments.score_delta IS
  'Overall score change from initial assessment (positive = improvement)';

COMMENT ON COLUMN milestone_assessments.category_deltas IS
  'JSON object with per-category score changes from initial assessment';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Update Timestamp Trigger
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_milestone_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER milestone_assessments_updated
  BEFORE UPDATE ON milestone_assessments
  FOR EACH ROW EXECUTE FUNCTION update_milestone_timestamp();


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Add cohort_start_date to user_plans (if not exists)
-- This tracks Day 0 for milestone calculations
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_plans' AND column_name = 'cohort_start_date'
  ) THEN
    ALTER TABLE user_plans ADD COLUMN cohort_start_date DATE;
    COMMENT ON COLUMN user_plans.cohort_start_date IS
      'Day 0 for milestone calculations - set when plan.md is added';
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS Policies
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE milestone_assessments ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and PSMs can read/write all milestone records
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
  );

-- Policy: Coaches can read milestone records for their assigned clients
CREATE POLICY coach_read_milestone_assessments ON milestone_assessments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role = 'coach'
        AND up.client_slug = milestone_assessments.client_slug
        AND up.active = true
    )
  );

-- Policy: Clients can read their own milestone records
CREATE POLICY client_read_milestone_assessments ON milestone_assessments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role = 'client'
        AND up.client_slug = milestone_assessments.client_slug
        AND up.active = true
    )
  );

-- Policy: Service role can do everything (for Netlify/Edge functions)
CREATE POLICY service_role_all_milestone_assessments ON milestone_assessments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Helper Functions
-- ─────────────────────────────────────────────────────────────────────────────

-- Get all milestones for a client
CREATE OR REPLACE FUNCTION get_client_milestones(p_client_slug TEXT)
RETURNS TABLE (
  milestone_type TEXT,
  status TEXT,
  due_date DATE,
  generated_at TIMESTAMPTZ,
  overall_score INTEGER,
  overall_grade TEXT,
  score_delta INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ma.milestone_type,
    ma.status,
    ma.due_date,
    ma.generated_at,
    ma.overall_score,
    ma.overall_grade,
    ma.score_delta
  FROM milestone_assessments ma
  WHERE ma.client_slug = p_client_slug
  ORDER BY
    CASE ma.milestone_type
      WHEN 'initial' THEN 1
      WHEN '30-day' THEN 2
      WHEN '60-day' THEN 3
      WHEN '90-day' THEN 4
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get pending milestones that are due today or earlier
CREATE OR REPLACE FUNCTION get_due_milestones()
RETURNS TABLE (
  client_slug TEXT,
  milestone_type TEXT,
  due_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ma.client_slug,
    ma.milestone_type,
    ma.due_date
  FROM milestone_assessments ma
  WHERE ma.status = 'pending'
    AND ma.due_date <= CURRENT_DATE
  ORDER BY ma.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate category deltas between two assessments
CREATE OR REPLACE FUNCTION calculate_milestone_deltas(
  p_current_scores JSONB,
  p_initial_scores JSONB
)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  category TEXT;
  current_score INTEGER;
  initial_score INTEGER;
BEGIN
  FOR category IN SELECT jsonb_object_keys(p_current_scores)
  LOOP
    current_score := (p_current_scores->category->>'score')::INTEGER;
    initial_score := COALESCE((p_initial_scores->category->>'score')::INTEGER, 0);

    result := result || jsonb_build_object(
      category,
      jsonb_build_object(
        'current', current_score,
        'initial', initial_score,
        'delta', current_score - initial_score,
        'improved', current_score > initial_score
      )
    );
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Grant Permissions
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT ON milestone_assessments TO authenticated;
GRANT ALL ON milestone_assessments TO service_role;
GRANT EXECUTE ON FUNCTION get_client_milestones(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_due_milestones() TO service_role;
GRANT EXECUTE ON FUNCTION calculate_milestone_deltas(JSONB, JSONB) TO service_role;
