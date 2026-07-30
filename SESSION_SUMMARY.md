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
- Assessment generation with real data

### Quality Overhaul Applied (July 29, 2026)

**Major changes to make assessments tourism-industry focused:**

1. **Model upgraded**: `claude-haiku-4-5` → `claude-sonnet-4-5` (better at complex instructions)
2. **Tokens increased**: 8,000 → 12,000 (more comprehensive output)

3. **New Sections Added:**
   - **Executive Summary**: Headline, key strengths (3), critical gaps (3), bottom line
   - **Quick Wins**: 5 tasks fixable this week with time estimates
   - **Tourism Context**: Visitor profile, discovery journey, seasonal considerations, trip integration, competitive landscape

4. **Category Changes:**
   - Replaced "AI Search Readiness" → "Visitor Discovery & Trip Integration"
   - Added new "Digital Guest Experience" category
   - Renamed "Social Media Health" → "Social Media & Visual Content"
   - Renamed "Email Marketing" → "Email & Guest Communication"

5. **Data Quality Improvements:**
   - All metrics now include benchmarks (e.g., "85/100 - tourism average: 65")
   - All recommendations now include time estimates (e.g., "2-3 hours")
   - Priority recommendations include expected results
   - Tourism consultant persona in prompt
   - Specific references to business name, location, features required

6. **PDF Download Feature:**
   - "Download PDF" button in assessment hero section
   - Beautiful print-optimized styles for high-quality PDF output
   - Print header with eLearningU branding
   - Print footer with coach email credit and eLearningU.com attribution
   - Confidentiality disclaimer
   - Page breaks at logical sections (categories, priority recommendations)
   - Two-column layout for category cards in print
   - All colors and backgrounds preserved in print

7. **Client Dashboard Redesign (v3):**
   - Split into two sections: **Assessments** and **Accelerator Projects**
   - **Assessments section features:**
     - Shows all assessments from `client_assessments` table
     - Card displays: business name, website, grade badge, status, date
     - "Has Plan" badge for assessments that have implementation plans
     - **View** button to open assessment dashboard
     - **Add Plan** button (only for completed assessments without plans)
     - **Actions menu** with Regenerate and Delete options
     - Status badges: Completed, Processing, Pending, Failed
   - **Accelerator Projects section:**
     - Shows projects with implementation plans from `user_plans`
     - Progress tracking (Week X of 12, percentage complete)
   - **Linked workflow:**
     - "Add Plan" button passes `?from=client-slug` to create-project page
     - Create-project page pre-fills client name and slug when `from` param present
     - Locks name/slug fields to prevent mismatches
     - Shows info banner "Linked to assessment for [Business Name]"
     - Submit button changes to "Add Implementation Plan"

## Next Steps

1. **Test the full workflow**
   - Generate an assessment
   - Click "Add Plan" on the assessment card
   - Verify form pre-fills correctly
   - Upload a plan.md and create the project
   - Verify both assessment and project appear correctly

2. **Polish items**
   - Test mobile responsiveness
   - Add re-assessment functionality (regenerate uses existing slug)
   - Error recovery for failed assessments
   - Consider: delete GitHub files when deleting assessment

## Key Technical Decisions

| Decision | Reason |
|----------|--------|
| Background function | Regular functions timeout at 60s; SEOptimer + Claude takes longer |
| Frontend polling | Background functions return 202 immediately; poll Supabase for status |
| `claude-sonnet-4-5` model | Better at following complex tourism-focused prompt with structured output |
| SEOptimer required | User specified it must be part of every assessment |
| 12,000 max_tokens | Ensures comprehensive output with all 8 categories fully populated |

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
