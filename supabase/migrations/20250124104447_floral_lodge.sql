/*
  # Create Intervention Management Schema

  1. New Types
    - project_status: Enum for tracking project status
    - task_status: Enum for tracking task status

  2. New Tables
    - clusters: Top-level grouping of pathways
    - pathways: Groups of interventions within a cluster
    - interventions: Specific intervention projects
    - actions: Concrete steps within an intervention
    - tasks: Individual tasks within an action

  3. Security
    - RLS enabled on all tables
    - Policies for authenticated users
*/

-- First drop existing tables if they exist (in correct order)
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS actions CASCADE;
DROP TABLE IF EXISTS interventions CASCADE;
DROP TABLE IF EXISTS pathways CASCADE;
DROP TABLE IF EXISTS clusters CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS project_status CASCADE;

-- Create custom types
CREATE TYPE project_status AS ENUM ('not_started', 'in_progress', 'at_risk', 'completed');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'delayed');

-- Create clusters table
CREATE TABLE clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status project_status NOT NULL DEFAULT 'not_started',
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pathways table
CREATE TABLE pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid REFERENCES clusters(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  status project_status NOT NULL DEFAULT 'not_started',
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create interventions table
CREATE TABLE interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_id uuid REFERENCES pathways(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  status project_status NOT NULL DEFAULT 'not_started',
  start_date date,
  end_date date,
  budget numeric,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_dates CHECK (start_date <= end_date)
);

-- Create actions table
CREATE TABLE actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES interventions(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  status project_status NOT NULL DEFAULT 'not_started',
  start_date date,
  end_date date,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_dates CHECK (start_date <= end_date)
);

-- Create tasks table
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid REFERENCES actions(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES auth.users(id),
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Clusters policies
CREATE POLICY "Users can view their clusters"
  ON clusters
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create clusters"
  ON clusters
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their clusters"
  ON clusters
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Pathways policies
CREATE POLICY "Users can view pathways in their clusters"
  ON pathways
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clusters
      WHERE clusters.id = pathways.cluster_id
      AND clusters.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create pathways in their clusters"
  ON pathways
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clusters
      WHERE clusters.id = cluster_id
      AND clusters.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their pathways"
  ON pathways
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Interventions policies
CREATE POLICY "Users can view interventions in their pathways"
  ON interventions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pathways
      WHERE pathways.id = interventions.pathway_id
      AND pathways.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create interventions in their pathways"
  ON interventions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pathways
      WHERE pathways.id = pathway_id
      AND pathways.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their interventions"
  ON interventions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Actions policies
CREATE POLICY "Users can view actions in their interventions"
  ON actions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interventions
      WHERE interventions.id = actions.intervention_id
      AND interventions.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create actions in their interventions"
  ON actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interventions
      WHERE interventions.id = intervention_id
      AND interventions.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their actions"
  ON actions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Tasks policies
CREATE POLICY "Users can view tasks of their actions"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = tasks.action_id
      AND actions.created_by = auth.uid()
    )
    OR
    tasks.assigned_to = auth.uid()
  );

CREATE POLICY "Users can create tasks in their actions"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = action_id
      AND actions.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks they're assigned to"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = tasks.action_id
      AND actions.created_by = auth.uid()
    )
    OR
    tasks.assigned_to = auth.uid()
  );