-- Migration: Migrate assessment_date to cohort_start_date (now represents onboarding call date)
-- Background: We are consolidating "Cohort Start Date" and "Assessment Date" into a single
-- "Onboarding Call Date" field. For existing clients, their assessment_date becomes their
-- onboarding call date.
--
-- This migration updates user_plans.cohort_start_date to use the assessment_date from
-- client_assessments for all existing clients where cohort_start_date is NULL or where
-- we want to use the assessment date as the canonical onboarding date.

-- Update cohort_start_date for all user_plans entries that have a matching assessment
-- Only update where cohort_start_date is currently NULL (to avoid overwriting explicit values)
UPDATE user_plans up
SET cohort_start_date = ca.assessment_date::date
FROM client_assessments ca
WHERE up.client_slug = ca.client_slug
  AND up.cohort_start_date IS NULL
  AND ca.assessment_date IS NOT NULL;

-- Log the migration result
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM user_plans up
  JOIN client_assessments ca ON up.client_slug = ca.client_slug
  WHERE up.cohort_start_date = ca.assessment_date::date;

  RAISE NOTICE 'Migration complete: Updated % user_plans entries with assessment dates as onboarding call dates', updated_count;
END $$;

-- Add a comment to clarify the column's new meaning
COMMENT ON COLUMN user_plans.cohort_start_date IS
  'Onboarding call date - Day 0 for milestone calculations. Previously called cohort_start_date.';
