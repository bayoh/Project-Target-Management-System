-- Create implementing_partners table
CREATE TABLE implementing_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create associated_projects table
CREATE TABLE associated_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new columns to actions table
ALTER TABLE actions
ADD COLUMN budget numeric,
ADD COLUMN implementing_partner_id uuid REFERENCES implementing_partners(id),
ADD COLUMN associated_project_id uuid REFERENCES associated_projects(id);

-- Enable RLS
ALTER TABLE implementing_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE associated_projects ENABLE ROW LEVEL SECURITY;

-- Create policies for implementing_partners
CREATE POLICY "Users can view implementing partners"
  ON implementing_partners
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create implementing partners"
  ON implementing_partners
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Create policies for associated_projects
CREATE POLICY "Users can view associated projects"
  ON associated_projects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create associated projects"
  ON associated_projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Add indexes
CREATE INDEX idx_actions_implementing_partner ON actions(implementing_partner_id);
CREATE INDEX idx_actions_associated_project ON actions(associated_project_id);