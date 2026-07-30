# Assessment Generator - Session Summary
**Date:** July 29, 2026

## What We Built

An **Assessment Generator** for the Junction Accelerator that:
- Allows admin/psm users to generate digital marketing assessments for client businesses
- Integrates with **SEOptimer API** for technical SEO analysis
- Uses **Claude AI** to generate comprehensive 8-category assessments
- Creates client dashboards with assessment data populated

## Files Created/Modified

### New Files
- `/admin/generate-assessment/index.html` - Admin form page
- `/netlify/functions/generate-assessment-background.js` - Background function (15 min timeout)
- `/template/assessment-only-template.html` - Client dashboard template
- `/supabase/SETUP.md` - Database schema documentation

### Modified Files
- `/my-clients/index.html` - Added "Generate Assessment" button
- `/netlify.toml` - Added function timeout configuration
- `/package.json` - Added `@anthropic-ai/sdk` dependency
- `/_redirects` - Added routing for new pages

## Environment Variables Required (Netlify)

```
SEOPTIMER_API_KEY     - From https://www.seoptimer.com/api-settings
ANTHROPIC_API_KEY     - From https://platform.claude.com/settings/workspaces/default/keys
SUPABASE_URL          - Already configured
SUPABASE_SERVICE_ROLE_KEY - Already configured
GITHUB_TOKEN          - Already configured
GITHUB_OWNER          - Already configured
GITHUB_REPO           - Already configured
```

## Database Setup Required

Run this SQL in Supabase SQL Editor (documented in `/supabase/SETUP.md`):

```sql
CREATE TABLE client_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_slug TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  location TEXT,
  social_instagram TEXT,
  social_facebook TEXT,
  social_tiktok TEXT,
  social_youtube TEXT,
  social_pinterest TEXT,
  social_twitter TEXT,
  social_linkedin TEXT,
  assessment_data JSONB NOT NULL DEFAULT '{}',
  seoptimer_raw JSONB,
  overall_score INTEGER,
  overall_grade TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  assessment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reassessment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL
);

-- Add RLS policies (see SETUP.md for full policies)
ALTER TABLE client_assessments ENABLE ROW LEVEL SECURITY;
```

## Current Status

### Working
- SEOptimer API integration (creates reports, polls for results)
- Background function with 15-minute timeout
- Frontend polling for completion status
- Progress indicator UI

### Issue to Resolve
**Claude AI response not being parsed correctly**

The assessment is generating but returning default/placeholder data instead of real analysis.

**Diagnosis:**
- Claude's response may not be pure JSON (text before/after)
- Parsing regex may not be matching correctly

**Fix applied (needs testing):**
- Simplified prompt to demand JSON-only output
- Added `_debug_raw_response` field to capture what Claude returns
- Check Supabase `client_assessments.assessment_data` for debug info

## Next Steps to Complete

1. **Test the latest changes**
   - Hard refresh the generate-assessment page
   - Create a new assessment with a fresh slug
   - Check if real data appears

2. **If still showing defaults, check Supabase**
   - Query `client_assessments` table
   - Look at `assessment_data` column for the test slug
   - Check for `_debug_raw_response` field to see what Claude returned

3. **Potential fixes if JSON parsing still fails**
   - Try `claude-sonnet-4-5` model (better at following instructions but slower)
   - Add explicit JSON mode if Claude API supports it
   - Pre-process response to strip markdown/text before parsing

4. **Polish items**
   - Test mobile responsiveness
   - Add re-assessment functionality
   - Error recovery for failed assessments

## Key Technical Decisions

| Decision | Reason |
|----------|--------|
| Background function | Regular functions timeout at 60s; SEOptimer + Claude takes longer |
| Frontend polling | Background functions return 202 immediately; poll Supabase for status |
| `claude-haiku-4-5` model | Faster than Sonnet; needed to fit in timeout window |
| SEOptimer required | User specified it must be part of every assessment |

## Useful Commands

```bash
# Check function logs (only for non-background functions)
# Netlify Dashboard → Logs → Functions

# Test function directly
curl https://accelerator.elearningu.com/.netlify/functions/generate-assessment-background?test=1

# Check Supabase for assessment data
# Go to Supabase Dashboard → Table Editor → client_assessments
```

## Contact Points

- SEOptimer API docs: https://www.seoptimer.com/seo-api/
- Claude API docs: https://platform.claude.com/docs
- Netlify background functions: https://docs.netlify.com/functions/background-functions/
