-- Update status terminology from 'In Progress' to 'On Track' and 'At Risk' to 'Off Track'
-- This migration updates enum types and existing data

-- First, update the project_status enum
ALTER TYPE project_status RENAME VALUE 'in_progress' TO 'on_track';
ALTER TYPE project_status RENAME VALUE 'at_risk' TO 'off_track';

-- Update the action_status enum
ALTER TYPE action_status RENAME VALUE 'in_progress' TO 'on_track';
ALTER TYPE action_status RENAME VALUE 'at_risk' TO 'off_track';

-- Update the task_status enum (only has in_progress, no at_risk)
ALTER TYPE task_status RENAME VALUE 'in_progress' TO 'on_track';

-- Update existing records in projects table
UPDATE projects 
SET status = 'on_track' 
WHERE status = 'in_progress';

UPDATE projects 
SET status = 'off_track' 
WHERE status = 'at_risk';

-- Update existing records in interventions table
UPDATE interventions 
SET status = 'on_track' 
WHERE status = 'in_progress';

UPDATE interventions 
SET status = 'off_track' 
WHERE status = 'at_risk';

-- Update existing records in actions table
UPDATE actions 
SET status = 'on_track' 
WHERE status = 'in_progress';

UPDATE actions 
SET status = 'off_track' 
WHERE status = 'at_risk';

-- Update existing records in tasks table
UPDATE tasks 
SET status = 'on_track' 
WHERE status = 'in_progress';

-- Update existing records in issues table (if it uses these statuses)
UPDATE issues 
SET status = 'on_track' 
WHERE status = 'in_progress';

-- Update dashboard optimization functions to use new status values
CREATE OR REPLACE FUNCTION get_dashboard_summary()
RETURNS TABLE (
  total_projects bigint,
  active_projects bigint,
  total_interventions bigint,
  interventions_on_track bigint,
  interventions_off_track bigint,
  total_actions bigint,
  actions_on_track bigint,
  actions_off_track bigint,
  total_tasks bigint,
  tasks_on_track bigint,
  tasks_completed bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM projects)::bigint,
    (SELECT COUNT(*) FROM projects WHERE status != 'completed')::bigint,
    (SELECT COUNT(*) FROM interventions)::bigint,
    (SELECT COUNT(*) FROM interventions WHERE status = 'on_track')::bigint,
    (SELECT COUNT(*) FROM interventions WHERE status = 'off_track')::bigint,
    (SELECT COUNT(*) FROM actions)::bigint,
    (SELECT COUNT(*) FROM actions WHERE status = 'on_track')::bigint,
    (SELECT COUNT(*) FROM actions WHERE status = 'off_track')::bigint,
    (SELECT COUNT(*) FROM tasks)::bigint,
    (SELECT COUNT(*) FROM tasks WHERE status = 'on_track')::bigint,
    (SELECT COUNT(*) FROM tasks WHERE status = 'completed')::bigint;
END;
$$ LANGUAGE plpgsql;

-- Update pathway summary function
CREATE OR REPLACE FUNCTION get_pathway_summary(pathway_id_param uuid)
RETURNS TABLE (
  pathway_id uuid,
  pathway_name text,
  total_interventions bigint,
  on_track bigint,
  off_track bigint,
  completed bigint,
  not_started bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as pathway_id,
    p.name as pathway_name,
    COUNT(i.id)::bigint as total_interventions,
    COUNT(*) FILTER (WHERE i.status = 'on_track')::bigint as on_track,
    COUNT(*) FILTER (WHERE i.status = 'off_track')::bigint as off_track,
    COUNT(*) FILTER (WHERE i.status = 'completed')::bigint as completed,
    COUNT(*) FILTER (WHERE i.status = 'not_started')::bigint as not_started
  FROM pathways p
  LEFT JOIN interventions i ON p.id = i.pathway_id
  WHERE p.id = pathway_id_param
  GROUP BY p.id, p.name;
END;
$$ LANGUAGE plpgsql;

-- Update action summary function
CREATE OR REPLACE FUNCTION get_action_summary(intervention_id_param uuid)
RETURNS TABLE (
  intervention_id uuid,
  total_actions bigint,
  on_track bigint,
  off_track bigint,
  completed bigint,
  not_started bigint,
  blocked bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    intervention_id_param,
    COUNT(a.id)::bigint as total_actions,
    COUNT(*) FILTER (WHERE a.status = 'on_track')::bigint as on_track,
    COUNT(*) FILTER (WHERE a.status = 'off_track')::bigint as off_track,
    COUNT(*) FILTER (WHERE a.status = 'completed')::bigint as completed,
    COUNT(*) FILTER (WHERE a.status = 'not_started')::bigint as not_started,
    COUNT(*) FILTER (WHERE a.status = 'blocked')::bigint as blocked
  FROM actions a
  WHERE a.intervention_id = intervention_id_param;
END;
$$ LANGUAGE plpgsql;

-- Update high severity trigger to use new status
CREATE OR REPLACE FUNCTION update_action_status_on_high_severity()
RETURNS TRIGGER AS $$
BEGIN
  -- If a high severity issue is created for an action, mark it as off track
  IF NEW.severity = 'high' AND NEW.entity_type = 'action' THEN
    UPDATE actions 
    SET status = 'off_track'::action_status
    WHERE id = NEW.entity_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update performance optimization indexes
DROP INDEX IF EXISTS idx_interventions_active_status;
DROP INDEX IF EXISTS idx_actions_active_status;
DROP INDEX IF EXISTS idx_tasks_pending_status;

CREATE INDEX IF NOT EXISTS idx_interventions_active_status ON interventions(status) WHERE status IN ('on_track', 'off_track');
CREATE INDEX IF NOT EXISTS idx_actions_active_status ON actions(status) WHERE status IN ('on_track', 'off_track', 'not_started');
CREATE INDEX IF NOT EXISTS idx_tasks_pending_status ON tasks(status) WHERE status IN ('pending', 'on_track');

-- Update target tracking functions to use new terminology
CREATE OR REPLACE FUNCTION get_target_dashboard_summary()
RETURNS TABLE (
  total_targets bigint,
  completed_targets bigint,
  off_track_targets bigint,
  on_track_targets bigint,
  not_started_targets bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_targets,
    COUNT(*) FILTER (WHERE current_value >= target_value)::bigint as completed_targets,
    COUNT(*) FILTER (WHERE target_value > 0 AND (current_value::numeric / target_value::numeric) < 0.5)::bigint as off_track_targets,
    COUNT(*) FILTER (WHERE target_value > 0 AND (current_value::numeric / target_value::numeric) >= 0.5 AND current_value < target_value)::bigint as on_track_targets,
    COUNT(*) FILTER (WHERE current_value = 0)::bigint as not_started_targets
  FROM targets;
END;
$$ LANGUAGE plpgsql;