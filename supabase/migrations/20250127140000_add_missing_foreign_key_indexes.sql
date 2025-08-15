-- Performance optimization: Add missing indexes on foreign key constraints
-- This migration addresses the unindexed_foreign_keys performance issues identified

-- High Priority Indexes - Most frequently used foreign keys

-- Actions table indexes (largest table at 848kB)
CREATE INDEX IF NOT EXISTS idx_actions_created_by 
  ON actions(created_by);

-- Action-related tables indexes
CREATE INDEX IF NOT EXISTS idx_action_achievements_action_id 
  ON action_achievements(action_id);
CREATE INDEX IF NOT EXISTS idx_action_achievements_created_by 
  ON action_achievements(created_by);

CREATE INDEX IF NOT EXISTS idx_action_issues_action_id 
  ON action_issues(action_id);
CREATE INDEX IF NOT EXISTS idx_action_issues_created_by 
  ON action_issues(created_by);

CREATE INDEX IF NOT EXISTS idx_action_comments_action_id 
  ON action_comments(action_id);
CREATE INDEX IF NOT EXISTS idx_action_comments_created_by 
  ON action_comments(created_by);

CREATE INDEX IF NOT EXISTS idx_action_targets_action_id 
  ON action_targets(action_id);
CREATE INDEX IF NOT EXISTS idx_action_targets_created_by 
  ON action_targets(created_by);

CREATE INDEX IF NOT EXISTS idx_action_needs_action_id 
  ON action_needs(action_id);
CREATE INDEX IF NOT EXISTS idx_action_needs_created_by 
  ON action_needs(created_by);

-- Interventions table indexes (224kB)
CREATE INDEX IF NOT EXISTS idx_interventions_created_by 
  ON interventions(created_by);
CREATE INDEX IF NOT EXISTS idx_interventions_pathway_id 
  ON interventions(pathway_id);

-- Intervention-related tables
CREATE INDEX IF NOT EXISTS idx_intervention_resources_intervention_id 
  ON intervention_resources(intervention_id);
CREATE INDEX IF NOT EXISTS idx_intervention_resources_created_by 
  ON intervention_resources(created_by);

CREATE INDEX IF NOT EXISTS idx_intervention_comments_intervention_id 
  ON intervention_comments(intervention_id);
CREATE INDEX IF NOT EXISTS idx_intervention_comments_created_by 
  ON intervention_comments(created_by);

CREATE INDEX IF NOT EXISTS idx_intervention_documents_intervention_id 
  ON intervention_documents(intervention_id);
CREATE INDEX IF NOT EXISTS idx_intervention_documents_created_by 
  ON intervention_documents(created_by);

-- Tasks table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to 
  ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by 
  ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_action_id 
  ON tasks(action_id);

-- Medium Priority Indexes

-- Pathways and clusters
CREATE INDEX IF NOT EXISTS idx_pathways_created_by 
  ON pathways(created_by);
CREATE INDEX IF NOT EXISTS idx_pathways_cluster_id 
  ON pathways(cluster_id);

CREATE INDEX IF NOT EXISTS idx_clusters_created_by 
  ON clusters(created_by);

-- Help system
CREATE INDEX IF NOT EXISTS idx_help_content_section_id 
  ON help_content(section_id);

-- Target history
CREATE INDEX IF NOT EXISTS idx_target_history_target_id 
  ON target_history(target_id);
CREATE INDEX IF NOT EXISTS idx_target_history_changed_by 
  ON target_history(changed_by);

-- Partners and projects
CREATE INDEX IF NOT EXISTS idx_implementing_partners_created_by 
  ON implementing_partners(created_by);
CREATE INDEX IF NOT EXISTS idx_associated_projects_created_by 
  ON associated_projects(created_by);

-- Composite Indexes for Common Query Patterns

-- Date-based queries with foreign keys
CREATE INDEX IF NOT EXISTS idx_actions_created_by_created_at 
  ON actions(created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_action_achievements_action_created_at 
  ON action_achievements(action_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_action_issues_action_created_at 
  ON action_issues(action_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interventions_pathway_created_at 
  ON interventions(pathway_id, created_at DESC);

-- Status-based filtering
CREATE INDEX IF NOT EXISTS idx_actions_status_created_by 
  ON actions(status, created_by) WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interventions_status_pathway 
  ON interventions(status, pathway_id) WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_status_assigned 
  ON tasks(status, assigned_to) WHERE status IS NOT NULL;

-- User activity optimization
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_created_at 
  ON user_activity_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_created_at 
  ON user_sessions(user_id, created_at DESC);

-- Audit logs optimization
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record_created_at 
  ON audit_logs(table_name, record_id, created_at DESC);

-- Comments:
-- Removed CONCURRENTLY as it cannot be used in migration transactions
-- IF NOT EXISTS prevents errors if indexes already exist
-- Composite indexes are ordered by selectivity (most selective first)
-- Status indexes use partial indexes with WHERE clauses for better performance