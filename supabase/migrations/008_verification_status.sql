-- Migration: Add verification status columns for pre-publish data validation
-- This supports the verification engine that validates API data (SociaVault,
-- SEOptimer, Google Places) before assessments are published.

-- ============================================================================
-- 1. Add verification_status column to client_assessments
-- ============================================================================
ALTER TABLE client_assessments
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending'
CHECK (verification_status IN (
  'pending',            -- Not yet verified
  'auto_verified',      -- Passed automated checks
  'needs_manual',       -- Discrepancies found, awaiting manual entry
  'manually_verified',  -- User provided correct data
  'skipped'             -- User chose to publish anyway
));

-- Add index for filtering by verification status
CREATE INDEX IF NOT EXISTS idx_client_assessments_verification_status
ON client_assessments(verification_status);

COMMENT ON COLUMN client_assessments.verification_status IS
'Status of pre-publish data verification: pending (not yet checked), auto_verified (passed automated checks), needs_manual (discrepancies found), manually_verified (user corrected data), skipped (published without verification)';

-- ============================================================================
-- 2. Add verification_data column (stores verification results)
-- ============================================================================
ALTER TABLE client_assessments
ADD COLUMN IF NOT EXISTS verification_data JSONB DEFAULT '{}';

COMMENT ON COLUMN client_assessments.verification_data IS
'Results from automated verification checks including discrepancies, warnings, and cross-check results';

-- ============================================================================
-- 3. Add manual_overrides column (stores user-provided corrections)
-- ============================================================================
ALTER TABLE client_assessments
ADD COLUMN IF NOT EXISTS manual_overrides JSONB DEFAULT NULL;

COMMENT ON COLUMN client_assessments.manual_overrides IS
'Manually entered data that overrides API values, with audit trail (verified_by, verified_at)';

-- ============================================================================
-- 4. Add composite index for common query pattern (status + verification)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_client_assessments_status_verification
ON client_assessments(status, verification_status);

-- ============================================================================
-- 5. Update existing assessments to 'auto_verified' status
--    (since they were published before verification was implemented)
-- ============================================================================
UPDATE client_assessments
SET verification_status = 'auto_verified',
    verification_data = jsonb_build_object(
      'note', 'Pre-verification-engine assessment',
      'migrated_at', NOW()
    )
WHERE verification_status = 'pending'
  AND status = 'completed';
