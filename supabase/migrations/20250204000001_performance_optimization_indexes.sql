-- Performance Optimization: Add Critical Database Indexes
-- Migration: Create indexes for frequently queried columns and combinations

-- Clusters table indexes
CREATE INDEX IF NOT EXISTS idx_clusters_name ON clusters(name);
CREATE INDEX IF NOT EXISTS idx_clusters_created_at ON clusters(created_at DESC);

-- Pathways table indexes
CREATE INDEX IF NOT EXISTS idx_pathways_cluster_id ON pathways(cluster_id);
CREATE INDEX IF NOT EXISTS idx_pathways_name ON pathways(name);
CREATE INDEX IF NOT EXISTS idx_pathways_cluster_name ON pathways(cluster_id, name);

-- Interventions table indexes
CREATE INDEX IF NOT EXISTS idx_interventions_pathway_id ON interventions(pathway_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_lead_id ON interventions(lead_id);
CREATE INDEX IF NOT EXISTS idx_interventions_pathway_status ON interventions(pathway_id, status);
CREATE INDEX IF NOT EXISTS idx_interventions_created_at ON interventions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interventions_updated_at ON interventions(updated_at DESC);

-- Actions table indexes
CREATE INDEX IF NOT EXISTS idx_actions_intervention_id ON actions(intervention_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_lead_id ON actions(lead_id);
CREATE INDEX IF NOT EXISTS idx_actions_intervention_status ON actions(intervention_id, status);
CREATE INDEX IF NOT EXISTS idx_actions_created_at ON actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_actions_updated_at ON actions(updated_at DESC);

-- Tasks table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_action_id ON tasks(action_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_action_status ON tasks(action_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Action achievements indexes
CREATE INDEX IF NOT EXISTS idx_action_achievements_action_id ON action_achievements(action_id);
CREATE INDEX IF NOT EXISTS idx_action_achievements_date_achieved ON action_achievements(date_achieved DESC);

-- Action issues indexes
CREATE INDEX IF NOT EXISTS idx_action_issues_action_id ON action_issues(action_id);
CREATE INDEX IF NOT EXISTS idx_action_issues_status ON action_issues(status);
CREATE INDEX IF NOT EXISTS idx_action_issues_severity ON action_issues(severity);
CREATE INDEX IF NOT EXISTS idx_action_issues_date_identified ON action_issues(date_identified DESC);

-- Action needs indexes
CREATE INDEX IF NOT EXISTS idx_action_needs_action_id ON action_needs(action_id);
CREATE INDEX IF NOT EXISTS idx_action_needs_date_identified ON action_needs(date_identified DESC);

-- Action targets indexes
CREATE INDEX IF NOT EXISTS idx_action_targets_action_id ON action_targets(action_id);
CREATE INDEX IF NOT EXISTS idx_action_targets_category ON action_targets(category);
CREATE INDEX IF NOT EXISTS idx_action_targets_target_date ON action_targets(target_date);
CREATE INDEX IF NOT EXISTS idx_action_targets_last_updated ON action_targets(last_updated DESC);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON profiles(role, status);

-- Composite indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_interventions_pathway_lead_status ON interventions(pathway_id, lead_id, status);
CREATE INDEX IF NOT EXISTS idx_actions_intervention_lead_status ON actions(intervention_id, lead_id, status);

-- Partial indexes for active records only
CREATE INDEX IF NOT EXISTS idx_interventions_active_status ON interventions(status) WHERE status IN ('in_progress', 'at_risk');
CREATE INDEX IF NOT EXISTS idx_actions_active_status ON actions(status) WHERE status IN ('in_progress', 'at_risk', 'not_started');
CREATE INDEX IF NOT EXISTS idx_tasks_pending_status ON tasks(status) WHERE status IN ('pending', 'in_progress');

-- Add comments for documentation
COMMENT ON INDEX idx_interventions_pathway_status IS 'Optimizes pathway-based intervention filtering by status';
COMMENT ON INDEX idx_actions_intervention_status IS 'Optimizes action queries filtered by intervention and status';
COMMENT ON INDEX idx_interventions_active_status IS 'Partial index for active interventions only';
COMMENT ON INDEX idx_actions_active_status IS 'Partial index for non-completed actions only';