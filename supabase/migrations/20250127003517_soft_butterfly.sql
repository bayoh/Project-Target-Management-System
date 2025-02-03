/*
  # Action Tracking System Schema

  1. New Tables
    - action_achievements: Track completed milestones and accomplishments
    - action_issues: Track problems and blockers
    - action_needs: Track resource and support requirements
    - action_targets: Track measurable goals and progress
  
  2. Security
    - Enable RLS on all tables
    - Create policies for proper access control
    
  3. Changes
    - Add new tracking tables with relationships to actions
    - Add comprehensive audit fields
*/

-- Create action_achievements table
CREATE TABLE action_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid REFERENCES actions(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  date_achieved date NOT NULL,
  evidence_url text,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create action_issues table
CREATE TABLE action_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid REFERENCES actions(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  status text NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  date_identified date NOT NULL,
  date_resolved date,
  is_blocker boolean DEFAULT false,
  resolution_steps text,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create action_needs table
CREATE TABLE action_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid REFERENCES actions(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  date_identified date NOT NULL,
  date_fulfilled date,
  resource_requirements text NOT NULL,
  budget_impact numeric,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create action_targets table
CREATE TABLE action_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid REFERENCES actions(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  metric text NOT NULL,
  baseline_value numeric NOT NULL,
  target_value numeric NOT NULL,
  current_value numeric NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE action_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_targets ENABLE ROW LEVEL SECURITY;

-- Create policies for action_achievements
CREATE POLICY "Users can view achievements of their actions"
  ON action_achievements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = action_achievements.action_id
      AND (
        actions.created_by = auth.uid()
        OR actions.lead_id = auth.uid()
        OR auth.uid() = ANY(actions.supporting_staff)
      )
    )
  );

CREATE POLICY "Users can create achievements for their actions"
  ON action_achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = action_id
      AND (
        actions.created_by = auth.uid()
        OR actions.lead_id = auth.uid()
      )
    )
  );

-- Create policies for action_issues
CREATE POLICY "Users can view issues of their actions"
  ON action_issues
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = action_issues.action_id
      AND (
        actions.created_by = auth.uid()
        OR actions.lead_id = auth.uid()
        OR auth.uid() = ANY(actions.supporting_staff)
      )
    )
  );

CREATE POLICY "Users can create issues for their actions"
  ON action_issues
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = action_id
      AND (
        actions.created_by = auth.uid()
        OR actions.lead_id = auth.uid()
        OR auth.uid() = ANY(actions.supporting_staff)
      )
    )
  );

CREATE POLICY "Users can update issues of their actions"
  ON action_issues
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = action_issues.action_id
      AND (
        actions.created_by = auth.uid()
        OR actions.lead_id = auth.uid()
      )
    )
  );

-- Create policies for action_needs
CREATE POLICY "Users can view needs of their actions"
  ON action_needs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = action_needs.action_id
      AND (
        actions.created_by = auth.uid()
        OR actions.lead_id = auth.uid()
        OR auth.uid() = ANY(actions.supporting_staff)
      )
    )
  );

CREATE POLICY "Users can create needs for their actions"
  ON action_needs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = action_id
      AND (
        actions.created_by = auth.uid()
        OR actions.lead_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update needs of their actions"
  ON action_needs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = action_needs.action_id
      AND (
        actions.created_by = auth.uid()
        OR actions.lead_id = auth.uid()
      )
    )
  );

-- Create policies for action_targets
CREATE POLICY "Users can view targets of their actions"
  ON action_targets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = action_targets.action_id
      AND (
        actions.created_by = auth.uid()
        OR actions.lead_id = auth.uid()
        OR auth.uid() = ANY(actions.supporting_staff)
      )
    )
  );

CREATE POLICY "Users can create targets for their actions"
  ON action_targets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = action_id
      AND (
        actions.created_by = auth.uid()
        OR actions.lead_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update targets of their actions"
  ON action_targets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = action_targets.action_id
      AND (
        actions.created_by = auth.uid()
        OR actions.lead_id = auth.uid()
      )
    )
  );

-- Add indexes for better query performance
CREATE INDEX idx_action_achievements_action_id ON action_achievements(action_id);
CREATE INDEX idx_action_issues_action_id ON action_issues(action_id);
CREATE INDEX idx_action_needs_action_id ON action_needs(action_id);
CREATE INDEX idx_action_targets_action_id ON action_targets(action_id);