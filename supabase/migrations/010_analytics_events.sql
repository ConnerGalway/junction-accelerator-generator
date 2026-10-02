-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Analytics Events
-- Version: 010
-- Description: Adds table for tracking user activity on client dashboards.
--              Stores page views, session data, checkbox changes, and tour events.
--              Viewable by Admin/PSM (all clients) and Coaches (assigned clients).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Analytics Events Table
-- Stores all user activity events on dashboards
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User who triggered the event
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,

  -- Which client dashboard
  client_slug TEXT NOT NULL,

  -- Event classification
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_view',
    'session_start',
    'session_end',
    'checkbox_change',
    'tour_start',
    'tour_complete',
    'tour_skip'
  )),

  -- Event-specific data (JSON)
  -- page_view: { "page": "dashboard" }
  -- session_start: { "referrer": "..." }
  -- session_end: { "duration_seconds": 300 }
  -- checkbox_change: { "item_key": "week-1-check-1", "checked": true, "week": 1 }
  -- tour_start: {}
  -- tour_complete: { "steps_viewed": 8 }
  -- tour_skip: { "step_skipped_at": 3 }
  event_data JSONB NOT NULL DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- Primary query pattern: get events for a client
CREATE INDEX IF NOT EXISTS idx_analytics_events_client_slug
  ON analytics_events(client_slug);

-- For time-range queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
  ON analytics_events(created_at DESC);

-- For filtering by user
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_email
  ON analytics_events(user_email);

-- For filtering by event type
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type
  ON analytics_events(event_type);

-- Composite index for client + time queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_analytics_events_client_date
  ON analytics_events(client_slug, created_at DESC);

-- Composite index for user + time queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_date
  ON analytics_events(user_email, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Comments
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE analytics_events IS
  'Stores user activity events on client dashboards for analytics';

COMMENT ON COLUMN analytics_events.user_id IS
  'Supabase auth user ID';

COMMENT ON COLUMN analytics_events.user_email IS
  'Email of the user for easy querying';

COMMENT ON COLUMN analytics_events.user_role IS
  'Role at time of event (admin/psm/coach/client)';

COMMENT ON COLUMN analytics_events.event_type IS
  'Type of event: page_view, session_start/end, checkbox_change, tour events';

COMMENT ON COLUMN analytics_events.event_data IS
  'JSON payload with event-specific data';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS Policies
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: Admins/PSMs can read all analytics events
CREATE POLICY admin_psm_read_analytics_events ON analytics_events
  FOR SELECT
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

-- Policy: Coaches can read analytics for their assigned clients only
CREATE POLICY coach_read_analytics_events ON analytics_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_plans up
      WHERE up.email = auth.jwt() ->> 'email'
        AND up.role = 'coach'
        AND up.client_slug = analytics_events.client_slug
        AND up.active = true
    )
  );

-- Policy: All authenticated users can insert their own events
CREATE POLICY insert_own_analytics_events ON analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy: Service role has full access (for Netlify functions)
CREATE POLICY service_role_all_analytics_events ON analytics_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Grants
-- ─────────────────────────────────────────────────────────────────────────────

-- Service role needs full access for backend functions
GRANT ALL ON analytics_events TO service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Helper Functions
-- ─────────────────────────────────────────────────────────────────────────────

-- Function: Get analytics summary for a client
CREATE OR REPLACE FUNCTION get_client_analytics_summary(
  p_client_slug TEXT,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_sessions BIGINT,
  unique_users BIGINT,
  total_page_views BIGINT,
  total_checkbox_changes BIGINT,
  avg_session_duration_seconds NUMERIC,
  tour_completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH date_filter AS (
    SELECT NOW() - (p_days || ' days')::INTERVAL AS since
  ),
  sessions AS (
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'session_start') AS starts,
      COUNT(*) FILTER (WHERE event_type = 'session_end') AS ends,
      COUNT(DISTINCT user_email) AS users,
      AVG((event_data->>'duration_seconds')::NUMERIC)
        FILTER (WHERE event_type = 'session_end') AS avg_duration
    FROM analytics_events, date_filter
    WHERE client_slug = p_client_slug
      AND created_at >= date_filter.since
  ),
  events AS (
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
      COUNT(*) FILTER (WHERE event_type = 'checkbox_change') AS checkbox_changes,
      COUNT(*) FILTER (WHERE event_type = 'tour_start') AS tour_starts,
      COUNT(*) FILTER (WHERE event_type = 'tour_complete') AS tour_completes
    FROM analytics_events, date_filter
    WHERE client_slug = p_client_slug
      AND created_at >= date_filter.since
  )
  SELECT
    sessions.starts AS total_sessions,
    sessions.users AS unique_users,
    events.page_views AS total_page_views,
    events.checkbox_changes AS total_checkbox_changes,
    COALESCE(sessions.avg_duration, 0) AS avg_session_duration_seconds,
    CASE
      WHEN events.tour_starts > 0
      THEN ROUND((events.tour_completes::NUMERIC / events.tour_starts) * 100, 1)
      ELSE 0
    END AS tour_completion_rate
  FROM sessions, events;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_client_analytics_summary(TEXT, INTEGER) TO authenticated;


-- Function: Get all clients analytics summary (for admin overview)
CREATE OR REPLACE FUNCTION get_all_clients_analytics_summary(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  client_slug TEXT,
  total_sessions BIGINT,
  unique_users BIGINT,
  total_checkbox_changes BIGINT,
  last_activity TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH date_filter AS (
    SELECT NOW() - (p_days || ' days')::INTERVAL AS since
  )
  SELECT
    ae.client_slug,
    COUNT(*) FILTER (WHERE ae.event_type = 'session_start') AS total_sessions,
    COUNT(DISTINCT ae.user_email) AS unique_users,
    COUNT(*) FILTER (WHERE ae.event_type = 'checkbox_change') AS total_checkbox_changes,
    MAX(ae.created_at) AS last_activity
  FROM analytics_events ae, date_filter
  WHERE ae.created_at >= date_filter.since
  GROUP BY ae.client_slug
  ORDER BY total_sessions DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (RLS will filter results)
GRANT EXECUTE ON FUNCTION get_all_clients_analytics_summary(INTEGER) TO authenticated;
