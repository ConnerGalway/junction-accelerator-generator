-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 012: Editor Documents
-- Creates tables for the visual content editor system
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. EDITOR DOCUMENTS
-- Stores the TipTap JSON document for each client plan
CREATE TABLE editor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_slug TEXT NOT NULL UNIQUE,

  -- TipTap JSON document content
  content JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}',

  -- Document metadata
  title TEXT,
  description TEXT,

  -- State management
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  published_content JSONB, -- Snapshot of content when published

  -- Audit
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_editor_documents_slug ON editor_documents(client_slug);
CREATE INDEX idx_editor_documents_status ON editor_documents(status);
CREATE INDEX idx_editor_documents_updated ON editor_documents(updated_at DESC);

-- 2. DOCUMENT VERSIONS
-- Full version history with rollback capability
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES editor_documents(id) ON DELETE CASCADE,

  -- Version metadata
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL,

  -- Change tracking
  change_summary TEXT,
  changed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(document_id, version_number)
);

-- Indexes
CREATE INDEX idx_document_versions_doc ON document_versions(document_id, version_number DESC);
CREATE INDEX idx_document_versions_date ON document_versions(created_at DESC);

-- 3. EDIT LOCKS
-- Prevents simultaneous editing, with timeout
CREATE TABLE edit_locks (
  client_slug TEXT PRIMARY KEY,

  -- Who holds the lock
  locked_by TEXT NOT NULL,
  locked_by_role TEXT NOT NULL CHECK (locked_by_role IN ('admin', 'psm', 'coach')),

  -- Lock timing
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Lock metadata
  session_id TEXT,
  override_reason TEXT -- If PSM/Admin overrode a coach's lock
);

-- Indexes
CREATE INDEX idx_edit_locks_expires ON edit_locks(expires_at);
CREATE INDEX idx_edit_locks_user ON edit_locks(locked_by);

-- Function to clean up expired locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM edit_locks WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE editor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_locks ENABLE ROW LEVEL SECURITY;

-- Admin/PSM: Full access to all documents
CREATE POLICY admin_psm_all_documents ON editor_documents
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

-- Coaches: Access to assigned clients only
CREATE POLICY coach_documents ON editor_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role = 'coach'
        AND up.client_slug = editor_documents.client_slug
        AND up.active = true
    )
  );

-- Clients: Read-only access to published content only
CREATE POLICY client_read_published ON editor_documents
  FOR SELECT TO authenticated
  USING (
    status = 'published' AND
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role = 'client'
        AND up.client_slug = editor_documents.client_slug
        AND up.active = true
    )
  );

-- Document versions follow the same pattern
CREATE POLICY admin_psm_all_versions ON document_versions
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

CREATE POLICY coach_versions ON document_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM editor_documents ed
      JOIN user_plans up ON up.client_slug = ed.client_slug
      WHERE ed.id = document_versions.document_id
        AND up.email = auth.jwt() ->> 'email'
        AND up.role = 'coach'
        AND up.active = true
    )
  );

-- Edit locks: Only editors can see/manage locks
CREATE POLICY editor_locks ON edit_locks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role IN ('admin', 'psm', 'coach')
        AND (up.client_slug = '*' OR up.client_slug = edit_locks.client_slug)
        AND up.active = true
    )
  );

-- Grant service role full access
GRANT ALL ON editor_documents TO service_role;
GRANT ALL ON document_versions TO service_role;
GRANT ALL ON edit_locks TO service_role;
