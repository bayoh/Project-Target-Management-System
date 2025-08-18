-- Performance Optimization: Dashboard Aggregation Functions
-- Migration: Create optimized functions for dashboard statistics

-- Function to get dashboard statistics efficiently
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  clusters_total bigint,
  pathways_total bigint,
  interventions_total bigint,
  interventions_on_track bigint,
  interventions_at_risk bigint,
  interventions_completed bigint,
  actions_total bigint,
  actions_on_track bigint,
  actions_at_risk bigint,
  actions_completed bigint,
  actions_not_started bigint,
  tasks_total bigint,
  tasks_pending bigint,
  tasks_in_progress bigint,
  tasks_completed bigint,
  tasks_delayed bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM clusters)::bigint,
    (SELECT COUNT(*) FROM pathways)::bigint,
    (SELECT COUNT(*) FROM interventions)::bigint,
    (SELECT COUNT(*) FROM interventions WHERE status = 'in_progress')::bigint,
    (SELECT COUNT(*) FROM interventions WHERE status = 'at_risk')::bigint,
    (SELECT COUNT(*) FROM interventions WHERE status = 'completed')::bigint,
    (SELECT COUNT(*) FROM actions)::bigint,
    (SELECT COUNT(*) FROM actions WHERE status = 'in_progress')::bigint,
    (SELECT COUNT(*) FROM actions WHERE status = 'at_risk')::bigint,
    (SELECT COUNT(*) FROM actions WHERE status = 'completed')::bigint,
    (SELECT COUNT(*) FROM actions WHERE status = 'not_started')::bigint,
    (SELECT COUNT(*) FROM tasks)::bigint,
    (SELECT COUNT(*) FROM tasks WHERE status = 'pending')::bigint,
    (SELECT COUNT(*) FROM tasks WHERE status = 'in_progress')::bigint,
    (SELECT COUNT(*) FROM tasks WHERE status = 'completed')::bigint,
    (SELECT COUNT(*) FROM tasks WHERE status = 'delayed')::bigint;
END;
$$;

-- Function to get cluster progress with pathways
CREATE OR REPLACE FUNCTION get_cluster_progress()
RETURNS TABLE (
  cluster_id integer,
  cluster_name text,
  pathway_id text,
  pathway_name text,
  total_interventions bigint,
  completed_interventions bigint,
  at_risk_interventions bigint,
  progress_percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as cluster_id,
    c.name as cluster_name,
    p.id as pathway_id,
    p.name as pathway_name,
    COUNT(i.id) as total_interventions,
    COUNT(i.id) FILTER (WHERE i.status = 'completed') as completed_interventions,
    COUNT(i.id) FILTER (WHERE i.status = 'at_risk') as at_risk_interventions,
    CASE 
      WHEN COUNT(i.id) > 0 THEN 
        ROUND((COUNT(i.id) FILTER (WHERE i.status = 'completed')::numeric / COUNT(i.id)::numeric) * 100, 2)
      ELSE 0
    END as progress_percentage
  FROM clusters c
  LEFT JOIN pathways p ON c.id = p.cluster_id
  LEFT JOIN interventions i ON p.id = i.pathway_id
  GROUP BY c.id, c.name, p.id, p.name
  ORDER BY c.name, p.name;
END;
$$;

-- Function to get intervention dashboard stats with filters
CREATE OR REPLACE FUNCTION get_intervention_stats(
  cluster_filter integer DEFAULT NULL,
  pathway_filter text DEFAULT NULL,
  lead_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  total bigint,
  completed bigint,
  in_progress bigint,
  at_risk bigint,
  not_started bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total,
    COUNT(*) FILTER (WHERE i.status = 'completed')::bigint as completed,
    COUNT(*) FILTER (WHERE i.status = 'in_progress')::bigint as in_progress,
    COUNT(*) FILTER (WHERE i.status = 'at_risk')::bigint as at_risk,
    COUNT(*) FILTER (WHERE i.status = 'not_started')::bigint as not_started
  FROM interventions i
  LEFT JOIN pathways p ON i.pathway_id = p.id
  WHERE 
    (cluster_filter IS NULL OR p.cluster_id = cluster_filter)
    AND (pathway_filter IS NULL OR i.pathway_id = pathway_filter)
    AND (lead_filter IS NULL OR i.lead_id = lead_filter);
END;
$$;

-- Function to get action dashboard stats with filters
CREATE OR REPLACE FUNCTION get_action_stats(
  intervention_filter text DEFAULT NULL,
  lead_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  total bigint,
  completed bigint,
  in_progress bigint,
  at_risk bigint,
  not_started bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total,
    COUNT(*) FILTER (WHERE a.status = 'completed')::bigint as completed,
    COUNT(*) FILTER (WHERE a.status = 'in_progress')::bigint as in_progress,
    COUNT(*) FILTER (WHERE a.status = 'at_risk')::bigint as at_risk,
    COUNT(*) FILTER (WHERE a.status = 'not_started')::bigint as not_started
  FROM actions a
  WHERE 
    (intervention_filter IS NULL OR a.intervention_id = intervention_filter)
    AND (lead_filter IS NULL OR a.lead_id = lead_filter);
END;
$$;

-- Function to get recent activities efficiently
CREATE OR REPLACE FUNCTION get_recent_activities(limit_count integer DEFAULT 10)
RETURNS TABLE (
  activity_type text,
  entity_name text,
  user_name text,
  timestamp timestamptz,
  entity_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  (
    SELECT 
      'intervention_created'::text as activity_type,
      i.name as entity_name,
      p.full_name as user_name,
      i.created_at as timestamp,
      'intervention'::text as entity_type
    FROM interventions i
    LEFT JOIN profiles p ON i.created_by = p.id
    ORDER BY i.created_at DESC
    LIMIT limit_count / 3
  )
  UNION ALL
  (
    SELECT 
      'action_created'::text as activity_type,
      a.name as entity_name,
      p.full_name as user_name,
      a.created_at as timestamp,
      'action'::text as entity_type
    FROM actions a
    LEFT JOIN profiles p ON a.created_by = p.id
    ORDER BY a.created_at DESC
    LIMIT limit_count / 3
  )
  UNION ALL
  (
    SELECT 
      'task_created'::text as activity_type,
      t.title as entity_name,
      p.full_name as user_name,
      t.created_at as timestamp,
      'task'::text as entity_type
    FROM tasks t
    LEFT JOIN profiles p ON t.assigned_to = p.id
    ORDER BY t.created_at DESC
    LIMIT limit_count / 3
  )
  ORDER BY timestamp DESC
  LIMIT limit_count;
END;
$$;

-- Function to get target statistics
CREATE OR REPLACE FUNCTION get_target_stats()
RETURNS TABLE (
  total_targets bigint,
  completed_targets bigint,
  at_risk_targets bigint,
  in_progress_targets bigint,
  average_progress numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_targets,
    COUNT(*) FILTER (WHERE target_value > 0 AND current_value >= target_value)::bigint as completed_targets,
    COUNT(*) FILTER (WHERE target_value > 0 AND (current_value::numeric / target_value::numeric) < 0.5)::bigint as at_risk_targets,
    COUNT(*) FILTER (WHERE target_value > 0 AND (current_value::numeric / target_value::numeric) >= 0.5 AND current_value < target_value)::bigint as in_progress_targets,
    COALESCE(AVG(
      CASE 
        WHEN target_value > 0 THEN 
          LEAST((current_value::numeric / target_value::numeric) * 100, 100)
        ELSE 0
      END
    ), 0) as average_progress
  FROM action_targets
  WHERE target_value > 0;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_cluster_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION get_intervention_stats(integer, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_action_stats(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_activities(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_target_stats() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_dashboard_stats() IS 'Efficiently retrieves all dashboard statistics in a single call';
COMMENT ON FUNCTION get_cluster_progress() IS 'Returns cluster and pathway progress with intervention counts';
COMMENT ON FUNCTION get_intervention_stats(integer, text, uuid) IS 'Returns intervention statistics with optional filters';
COMMENT ON FUNCTION get_action_stats(text, uuid) IS 'Returns action statistics with optional filters';
COMMENT ON FUNCTION get_recent_activities(integer) IS 'Returns recent activities across all entity types';
COMMENT ON FUNCTION get_target_stats() IS 'Returns target completion and progress statistics';