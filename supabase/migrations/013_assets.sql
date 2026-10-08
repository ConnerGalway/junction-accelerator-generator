-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 013: Asset Library
-- Creates tables for managing images, videos, and other media assets
-- ═══════════════════════════════════════════════════════════════════════════

-- ASSETS TABLE
-- Central repository for all media assets
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Storage reference
  storage_path TEXT NOT NULL UNIQUE,
  storage_bucket TEXT NOT NULL DEFAULT 'assets',

  -- Asset metadata
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,

  -- Image-specific metadata
  width INTEGER,
  height INTEGER,

  -- Organization
  tags TEXT[] DEFAULT '{}',
  category TEXT, -- 'social-media', 'seo', 'email', 'ads', 'website', 'general'
  client_slug TEXT, -- NULL for shared library assets

  -- AI generation tracking
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_prompt TEXT,
  ai_model TEXT,

  -- Audit
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_assets_client ON assets(client_slug);
CREATE INDEX idx_assets_tags ON assets USING GIN(tags);
CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_uploaded_by ON assets(uploaded_by);
CREATE INDEX idx_assets_created ON assets(created_at DESC);
CREATE INDEX idx_assets_mime_type ON assets(mime_type);

-- Full-text search on filename
CREATE INDEX idx_assets_filename_search ON assets USING GIN(to_tsvector('english', filename));

-- ═══════════════════════════════════════════════════════════════════════════
-- CHART DATA TABLE
-- Stores data for embedded charts (separate from document for easier updates)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE chart_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES editor_documents(id) ON DELETE CASCADE,

  -- Chart identification (matches node ID in TipTap document)
  chart_key TEXT NOT NULL,

  -- Chart configuration
  chart_type TEXT NOT NULL CHECK (chart_type IN (
    'bar', 'line', 'pie', 'doughnut', 'area',
    'funnel', 'gauge', 'radar', 'scatter', 'treemap'
  )),
  chart_config JSONB NOT NULL, -- ECharts options
  data_source JSONB NOT NULL, -- Raw data

  -- Title and description
  title TEXT,
  description TEXT,

  -- Audit
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(document_id, chart_key)
);

-- Indexes
CREATE INDEX idx_chart_data_doc ON chart_data(document_id);
CREATE INDEX idx_chart_data_type ON chart_data(chart_type);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_data ENABLE ROW LEVEL SECURITY;

-- Assets: All coaches can see all assets (shared library)
CREATE POLICY editors_view_all_assets ON assets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role IN ('admin', 'psm', 'coach')
        AND up.active = true
    )
  );

-- Assets: Editors can upload assets
CREATE POLICY editors_create_assets ON assets
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role IN ('admin', 'psm', 'coach')
        AND up.active = true
    )
    AND uploaded_by = auth.jwt() ->> 'email'
  );

-- Assets: Only uploaders or admins can delete
CREATE POLICY delete_own_assets ON assets
  FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.jwt() ->> 'email'
    OR EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role = 'admin'
        AND up.client_slug = '*'
        AND up.active = true
    )
  );

-- Chart data: Follow document permissions
CREATE POLICY admin_psm_all_charts ON chart_data
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role IN ('admin', 'psm')
        AND up.client_slug = '*'
        AND up.active = true
    )
  );

CREATE POLICY coach_charts ON chart_data
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM editor_documents ed
      JOIN user_plans up ON up.client_slug = ed.client_slug
      WHERE ed.id = chart_data.document_id
        AND up.email = auth.jwt() ->> 'email'
        AND up.role = 'coach'
        AND up.active = true
    )
  );

-- Grant service role full access
GRANT ALL ON assets TO service_role;
GRANT ALL ON chart_data TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKET SETUP (run manually in Supabase Dashboard)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create bucket named 'assets' with:
--    - Public: Yes (for CDN delivery)
--    - File size limit: 10MB
--    - Allowed MIME types: image/*, video/*, application/pdf
--
-- 3. Create storage policies:
--    - SELECT: Allow authenticated users to view all files
--    - INSERT: Allow authenticated users with editor role
--    - DELETE: Allow file owner or admin
