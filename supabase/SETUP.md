# Supabase Setup Guide

This guide covers the Supabase configuration needed for the Junction Accelerator Generator.

## Table of Contents
1. [Creating Password Accounts for Coaches/Admins](#creating-password-accounts)
2. [Row Level Security (RLS) Policies](#rls-policies)

---

## Creating Password Accounts

Coaches and admins can log in with email/password instead of magic links. Here's how to create password accounts.

### Option 1: Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard** > **Authentication** > **Users**
2. Click **Add user** > **Create new user**
3. Enter:
   - **Email**: coach@example.com
   - **Password**: A secure password (share securely with the user)
   - **Auto Confirm User**: Check this box (skips email verification)
4. Click **Create user**

The user can now log in at `/login` by clicking "Sign in with password".

### Option 2: SQL (Bulk Creation)

For creating multiple accounts, use the Supabase SQL Editor:

```sql
-- Create a user with password (using Supabase's auth.users table)
-- Note: This requires the service_role key, run from SQL Editor

SELECT auth.create_user(
  '{
    "email": "coach@example.com",
    "password": "SecurePassword123!",
    "email_confirm": true
  }'::jsonb
);
```

### Option 3: Using Supabase Admin SDK (for automation)

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SERVICE_ROLE_KEY' // NOT the anon key
);

async function createCoachAccount(email, password) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true // Skip email verification
  });

  if (error) throw error;
  return data;
}
```

### Important: Also Add to user_plans Table

After creating the auth user, you must also add an entry in the `user_plans` table:

```sql
INSERT INTO user_plans (email, role, client_slug, active, coach_email)
VALUES
  -- For a coach assigned to specific projects
  ('coach@example.com', 'coach', 'client-slug-1', true, 'coach@example.com'),
  ('coach@example.com', 'coach', 'client-slug-2', true, 'coach@example.com'),

  -- For an admin with wildcard access
  ('admin@example.com', 'admin', '*', true, NULL);
```

Or use the User Management dashboard (`/my-clients/`) to add users to projects.

---

## RLS Policies

These SQL policies need to be applied in the Supabase dashboard to enable proper access control for the User Management dashboard.

### user_plans Table Policies

### 1. Allow admins to read all user_plans

```sql
CREATE POLICY "user_plans_admin_read_all" ON user_plans
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_plans up
    WHERE up.email = auth.jwt() ->> 'email'
      AND up.role = 'admin'
      AND up.client_slug = '*'
      AND up.active = true
  )
);
```

### 2. Allow coaches to read their assigned clients

```sql
CREATE POLICY "user_plans_coach_read_assigned" ON user_plans
FOR SELECT TO authenticated
USING (
  coach_email = auth.jwt() ->> 'email'
  OR email = auth.jwt() ->> 'email'
);
```

### 3. Allow admins to insert/update any user_plans

```sql
CREATE POLICY "user_plans_admin_write" ON user_plans
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_plans up
    WHERE up.email = auth.jwt() ->> 'email'
      AND up.role = 'admin'
      AND up.client_slug = '*'
      AND up.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_plans up
    WHERE up.email = auth.jwt() ->> 'email'
      AND up.role = 'admin'
      AND up.client_slug = '*'
      AND up.active = true
  )
);
```

### 4. Allow coaches to insert/update users for their assigned projects

```sql
CREATE POLICY "user_plans_coach_write" ON user_plans
FOR ALL TO authenticated
USING (
  coach_email = auth.jwt() ->> 'email'
)
WITH CHECK (
  coach_email = auth.jwt() ->> 'email'
  OR EXISTS (
    SELECT 1 FROM user_plans up
    WHERE up.email = auth.jwt() ->> 'email'
      AND up.role = 'coach'
      AND up.client_slug = user_plans.client_slug
      AND up.active = true
  )
);
```

## How to Apply These Policies

1. Go to the Supabase Dashboard
2. Navigate to **Database** > **Policies**
3. Select the `user_plans` table
4. Click **New Policy** for each policy above
5. Choose "Create a policy from scratch"
6. Paste the SQL and save

## Notes

- Policies are additive (OR logic) - if any policy grants access, the user can perform the action
- The wildcard admin entry (`client_slug = '*'`) grants admin access to all projects
- Coaches can only see and modify users assigned to projects they coach
- No DELETE policy is defined - use the `active` flag to soft-delete users instead

---

## client_assessments Table

This table stores assessment data for client businesses.

### Create Table

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
  google_places_raw JSONB,
  website_analysis_raw JSONB,
  overall_score INTEGER,
  overall_grade TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  assessment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reassessment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL
);

CREATE INDEX idx_client_assessments_slug ON client_assessments(client_slug);
CREATE INDEX idx_client_assessments_status ON client_assessments(status);
```

### Modify user_plans Table

```sql
ALTER TABLE user_plans ADD COLUMN IF NOT EXISTS dashboard_state TEXT DEFAULT 'full';
```

### Add website_analysis_raw Column (Migration for existing databases)

```sql
ALTER TABLE client_assessments ADD COLUMN IF NOT EXISTS website_analysis_raw JSONB;
```

### RLS Policies for client_assessments

```sql
-- Enable RLS
ALTER TABLE client_assessments ENABLE ROW LEVEL SECURITY;

-- Admins/PSMs can read and write all assessments
CREATE POLICY "assessments_admin_all" ON client_assessments
FOR ALL TO authenticated
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

-- Coaches can read assessments for their assigned clients
CREATE POLICY "assessments_coach_read" ON client_assessments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_plans up
    WHERE up.email = auth.jwt() ->> 'email'
      AND up.role = 'coach'
      AND up.client_slug = client_assessments.client_slug
      AND up.active = true
  )
);

-- Clients can read their own assessment
CREATE POLICY "assessments_client_read" ON client_assessments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_plans up
    WHERE up.email = auth.jwt() ->> 'email'
      AND up.client_slug = client_assessments.client_slug
      AND up.active = true
  )
);
```
