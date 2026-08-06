-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Add Google Place ID Column
-- Version: 002
-- Description: Adds google_place_id column to client_assessments table for more
--              reliable Google Places API lookups.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add google_place_id column to client_assessments
ALTER TABLE client_assessments
ADD COLUMN IF NOT EXISTS google_place_id TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN client_assessments.google_place_id IS
  'Optional Google Place ID (ChIJ...) for direct lookup. More reliable than search.';

-- Create index for potential lookups by place_id
CREATE INDEX IF NOT EXISTS idx_client_assessments_place_id
  ON client_assessments(google_place_id)
  WHERE google_place_id IS NOT NULL;
