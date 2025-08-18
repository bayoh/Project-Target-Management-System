-- Create function to get most active users
CREATE OR REPLACE FUNCTION get_most_active_users(days integer DEFAULT 30, limit_count integer DEFAULT 10)
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
  SELECT 
    uas.user_id,
    uas.name,
    uas.email,
    COUNT(ual.id) as activity_count
  FROM user_activity_summary uas
  LEFT JOIN user_activity_logs ual ON uas.user_id = ual.user_id
    AND ual.timestamp >= (CURRENT_TIMESTAMP - INTERVAL '1 day' * days)
  GROUP BY uas.user_id, uas.name, uas.email
  ORDER BY activity_count DESC
  LIMIT limit_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_most_active_users(integer, integer) TO authenticated;

-- Create function to get user engagement metrics
CREATE OR REPLACE FUNCTION get_user_engagement_metrics(days integer DEFAULT 30)
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
BEGIN
  -- Get total users
  SELECT COUNT(*) INTO total_user_count
  FROM user_activity_summary;
  
  -- Get active users (users with activity in the last 7 days)
  SELECT COUNT(DISTINCT uas.user_id) INTO active_user_count
  FROM user_activity_summary uas
  WHERE uas.last_activity >= (CURRENT_TIMESTAMP - INTERVAL '7 days');
  
  -- Get average activities per user
  SELECT COALESCE(AVG(activity_count), 0) INTO avg_activities
  FROM (
    SELECT COUNT(ual.id) as activity_count
    FROM user_activity_summary uas
    LEFT JOIN user_activity_logs ual ON uas.user_id = ual.user_id
      AND ual.timestamp >= (CURRENT_TIMESTAMP - INTERVAL '1 day' * days)
    GROUP BY uas.user_id
  ) user_activities;
  
  -- Calculate retention rate (users active in period / total users)
  SELECT CASE 
    WHEN total_user_count > 0 THEN 
      (COUNT(DISTINCT ual.user_id)::numeric / total_user_count::numeric) * 100
    ELSE 0
  END INTO retention
  FROM user_activity_logs ual
  WHERE ual.timestamp >= (CURRENT_TIMESTAMP - INTERVAL '1 day' * days);
  
  RETURN QUERY
  SELECT 
    total_user_count,
    active_user_count,
    avg_activities,
    retention;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_engagement_metrics(integer) TO authenticated;

-- Create function to get activity trends by day
CREATE OR REPLACE FUNCTION get_activity_trends(days integer DEFAULT 30)
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
    DATE(ual.timestamp) as activity_date,
    COUNT(ual.id) as activity_count
  FROM user_activity_logs ual
  WHERE ual.timestamp >= (CURRENT_TIMESTAMP - INTERVAL '1 day' * days)
  GROUP BY DATE(ual.timestamp)
  ORDER BY activity_date;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_activity_trends(integer) TO authenticated;

-- Create function to get feature usage statistics
CREATE OR REPLACE FUNCTION get_feature_usage_stats(days integer DEFAULT 30)
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
    COALESCE(ual.entity_type, 'unknown') as entity_type,
    ual.action_type,
    COUNT(ual.id) as usage_count
  FROM user_activity_logs ual
  WHERE ual.timestamp >= (CURRENT_TIMESTAMP - INTERVAL '1 day' * days)
  GROUP BY COALESCE(ual.entity_type, 'unknown'), ual.action_type
  ORDER BY usage_count DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_feature_usage_stats(integer) TO authenticated;

-- Create function to get inactive users
CREATE OR REPLACE FUNCTION get_inactive_users(inactive_days integer DEFAULT 14)
RETURNS TABLE (
  user_id uuid,
  name text,
  email text,
  last_activity timestamp with time zone,
  days_inactive integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uas.user_id,
    uas.name,
    uas.email,
    uas.last_activity,
    CASE 
      WHEN uas.last_activity IS NULL THEN 999999
      ELSE EXTRACT(DAY FROM (CURRENT_TIMESTAMP - uas.last_activity))::integer
    END as days_inactive
  FROM user_activity_summary uas
  WHERE 
    uas.last_activity IS NULL 
    OR uas.last_activity < (CURRENT_TIMESTAMP - INTERVAL '1 day' * inactive_days)
  ORDER BY days_inactive DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_inactive_users(integer) TO authenticated;