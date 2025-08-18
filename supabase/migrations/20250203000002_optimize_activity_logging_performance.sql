-- Performance Optimization Migration for User Activity Logging
-- This migration addresses critical performance bottlenecks identified in the activity logging system

-- ============================================================================
-- PHASE 1: DATABASE INDEX OPTIMIZATIONS
-- ============================================================================

-- Drop existing less efficient indexes if they exist
DROP INDEX IF EXISTS idx_user_activity_logs_user_created_at;
DROP INDEX IF EXISTS idx_user_activity_logs_created_at;

-- Add optimized composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date_action 
  ON user_activity_logs(user_id, ((created_at AT TIME ZONE 'UTC')::date), action_type);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_date 
  ON user_activity_logs(entity_type, ((created_at AT TIME ZONE 'UTC')::date)) 
  WHERE entity_type IS NOT NULL;

-- Optimized index for recent activity queries (most common use case)
CREATE INDEX IF NOT EXISTS idx_activity_logs_recent 
  ON user_activity_logs(created_at DESC, user_id, action_type);

-- Partial index for active sessions only
CREATE INDEX IF NOT EXISTS idx_sessions_active 
  ON user_sessions(user_id, login_time DESC) 
  WHERE is_active = true;

-- Index for user activity summary queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_recent 
  ON user_activity_logs(user_id, created_at DESC);

-- ============================================================================
-- PHASE 2: OPTIMIZED ANALYTICS FUNCTIONS
-- ============================================================================

-- Replace the inefficient get_most_active_users function
CREATE OR REPLACE FUNCTION get_most_active_users_optimized(
  days integer DEFAULT 30, 
  limit_count integer DEFAULT 10
)
RETURNS TABLE (
  user_id uuid,
  name text,
  email text,
  activity_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH recent_activities AS (
    SELECT 
      ual.user_id,
      COUNT(*) as activity_count
    FROM user_activity_logs ual
    WHERE ual.created_at >= (CURRENT_TIMESTAMP - INTERVAL '1 day' * days)
      AND ual.created_at >= NOW() - INTERVAL '90 days' -- Use partial index
    GROUP BY ual.user_id
    HAVING COUNT(*) > 0 -- Filter out users with no activity
  )
  SELECT 
    ra.user_id,
    COALESCE(p.name, au.raw_user_meta_data->>'name', 'Unknown') as name,
    COALESCE(au.email, 'Unknown') as email,
    ra.activity_count
  FROM recent_activities ra
  LEFT JOIN profiles p ON ra.user_id = p.id
  LEFT JOIN auth.users au ON ra.user_id = au.id
  ORDER BY ra.activity_count DESC
  LIMIT limit_count;
END;
$$;

-- Optimized user engagement metrics function
CREATE OR REPLACE FUNCTION get_user_engagement_metrics_optimized(days integer DEFAULT 30)
RETURNS TABLE (
  total_users bigint,
  active_users bigint,
  average_activities_per_user numeric,
  retention_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_user_count bigint;
  active_user_count bigint;
  avg_activities numeric;
  retention numeric;
  cutoff_date timestamptz;
BEGIN
  -- Calculate cutoff date once
  cutoff_date := CURRENT_TIMESTAMP - INTERVAL '1 day' * days;
  
  -- Get total users from auth.users (more reliable than user_activity_summary)
  SELECT COUNT(*) INTO total_user_count
  FROM auth.users
  WHERE created_at <= cutoff_date;
  
  -- Get active users with optimized query
  SELECT COUNT(DISTINCT ual.user_id) INTO active_user_count
  FROM user_activity_logs ual
  WHERE ual.created_at >= cutoff_date
    AND ual.created_at >= NOW() - INTERVAL '90 days'; -- Use partial index
  
  -- Calculate average activities per active user (more meaningful metric)
  SELECT COALESCE(AVG(activity_count), 0) INTO avg_activities
  FROM (
    SELECT COUNT(*) as activity_count
    FROM user_activity_logs ual
    WHERE ual.created_at >= cutoff_date
      AND ual.created_at >= NOW() - INTERVAL '90 days'
    GROUP BY ual.user_id
  ) user_activities;
  
  -- Calculate retention rate
  retention := CASE 
    WHEN total_user_count > 0 THEN 
      (active_user_count::numeric / total_user_count::numeric) * 100
    ELSE 0
  END;
  
  RETURN QUERY
  SELECT 
    total_user_count,
    active_user_count,
    avg_activities,
    retention;
END;
$$;

-- Optimized activity trends function with better performance
CREATE OR REPLACE FUNCTION get_activity_trends_optimized(days integer DEFAULT 30)
RETURNS TABLE (
  activity_date date,
  activity_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ((ual.created_at AT TIME ZONE 'UTC')::date) as activity_date,
    COUNT(*) as activity_count
  FROM user_activity_logs ual
  WHERE ual.created_at >= (CURRENT_TIMESTAMP - INTERVAL '1 day' * days)
    AND ual.created_at >= NOW() - INTERVAL '90 days' -- Use partial index
  GROUP BY ((ual.created_at AT TIME ZONE 'UTC')::date)
  ORDER BY activity_date DESC;
END;
$$;

-- Optimized feature usage stats with entity type filtering
CREATE OR REPLACE FUNCTION get_feature_usage_stats_optimized(days integer DEFAULT 30)
RETURNS TABLE (
  entity_type text,
  action_type text,
  usage_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ual.entity_type::text, 'system') as entity_type,
    ual.action_type::text,
    COUNT(*) as usage_count
  FROM user_activity_logs ual
  WHERE ual.created_at >= (CURRENT_TIMESTAMP - INTERVAL '1 day' * days)
    AND ual.created_at >= NOW() - INTERVAL '90 days' -- Use partial index
  GROUP BY COALESCE(ual.entity_type::text, 'system'), ual.action_type::text
  HAVING COUNT(*) >= 5 -- Filter out noise
  ORDER BY usage_count DESC
  LIMIT 50; -- Prevent excessive results
END;
$$;

-- ============================================================================
-- PHASE 3: PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- Create a materialized view for daily activity summaries (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_activity_summary AS
SELECT 
  ((created_at AT TIME ZONE 'UTC')::date) as activity_date,
  user_id,
  action_type,
  entity_type,
  COUNT(*) as activity_count,
  MIN(created_at) as first_activity,
  MAX(created_at) as last_activity
FROM user_activity_logs
GROUP BY ((created_at AT TIME ZONE 'UTC')::date), user_id, action_type, entity_type;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_daily_activity_summary_date_user 
  ON daily_activity_summary(activity_date DESC, user_id);

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_daily_activity_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW daily_activity_summary;
END;
$$;

-- ============================================================================
-- PHASE 4: CLEANUP AND ARCHIVING
-- ============================================================================

-- Function to archive old activity logs (run monthly)
CREATE OR REPLACE FUNCTION archive_old_activity_logs(archive_days integer DEFAULT 365)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archived_count integer;
BEGIN
  -- Create archive table if it doesn't exist
  CREATE TABLE IF NOT EXISTS user_activity_logs_archive (
    LIKE user_activity_logs INCLUDING ALL
  );
  
  -- Move old records to archive
  WITH archived_records AS (
    DELETE FROM user_activity_logs
    WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL '1 day' * archive_days)
    RETURNING *
  )
  INSERT INTO user_activity_logs_archive
  SELECT * FROM archived_records;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  -- Update statistics
  ANALYZE user_activity_logs;
  ANALYZE user_activity_logs_archive;
  
  RETURN archived_count;
END;
$$;

-- ============================================================================
-- PHASE 5: GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions for optimized functions
GRANT EXECUTE ON FUNCTION get_most_active_users_optimized(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_engagement_metrics_optimized(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_trends_optimized(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_feature_usage_stats_optimized(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_daily_activity_summary() TO authenticated;

-- Grant permissions for admin functions
GRANT EXECUTE ON FUNCTION archive_old_activity_logs(integer) TO service_role;

-- Grant select on materialized view
GRANT SELECT ON daily_activity_summary TO authenticated;

-- ============================================================================
-- PHASE 6: PERFORMANCE MONITORING
-- ============================================================================

-- Create a simple performance monitoring table
CREATE TABLE IF NOT EXISTS activity_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_date 
  ON activity_performance_metrics(metric_name, measured_at DESC);

-- Function to log performance metrics
CREATE OR REPLACE FUNCTION log_performance_metric(
  p_metric_name TEXT,
  p_metric_value NUMERIC,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO activity_performance_metrics (metric_name, metric_value, metadata)
  VALUES (p_metric_name, p_metric_value, p_metadata);
END;
$$;

GRANT EXECUTE ON FUNCTION log_performance_metric(TEXT, NUMERIC, JSONB) TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log the completion of this migration
SELECT log_performance_metric(
  'migration_completed',
  1,
  ('{"migration": "20250203000002_optimize_activity_logging_performance", "timestamp": "' || NOW() || '"}')::jsonb
);