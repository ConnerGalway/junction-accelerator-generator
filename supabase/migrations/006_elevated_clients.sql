-- Migration: Add client_type column for Elevated Learner support
-- This allows distinguishing between full accelerator clients and
-- Elevated Tourism Marketing Masterclass participants (assessment-only)

-- ============================================================================
-- 1. Add client_type column to client_assessments
-- ============================================================================
ALTER TABLE client_assessments
ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'accelerator'
CHECK (client_type IN ('accelerator', 'elevated'));

-- Add index for efficient filtering by client type
CREATE INDEX IF NOT EXISTS idx_client_assessments_type
ON client_assessments(client_type);

-- Add composite index for common query pattern (type + status)
CREATE INDEX IF NOT EXISTS idx_client_assessments_type_status
ON client_assessments(client_type, status);

COMMENT ON COLUMN client_assessments.client_type IS
'Type of client dashboard: accelerator (full 90-day program) or elevated (assessment-only for Masterclass)';

-- ============================================================================
-- 2. Add dashboard_state column to user_plans
--    This tracks which dashboard type a client should see when logging in
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_plans' AND column_name = 'dashboard_state'
  ) THEN
    ALTER TABLE user_plans ADD COLUMN dashboard_state TEXT DEFAULT NULL;
    COMMENT ON COLUMN user_plans.dashboard_state IS
    'Dashboard state for client users: NULL=standard accelerator, elevated=assessment-only Masterclass dashboard';
  END IF;
END $$;
