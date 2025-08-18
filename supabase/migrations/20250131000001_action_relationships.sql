-- Remove existing foreign key constraints
ALTER TABLE actions
DROP CONSTRAINT IF EXISTS actions_implementing_partner_id_fkey,
DROP CONSTRAINT IF EXISTS actions_associated_project_id_fkey;

-- Remove the single reference columns
ALTER TABLE actions
DROP COLUMN IF EXISTS implementing_partner_id,
DROP COLUMN IF EXISTS associated_project_id;

-- Create junction table for implementing partners
CREATE TABLE action_implementing_partners (
  action_id uuid REFERENCES actions(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES implementing_partners(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  PRIMARY KEY (action_id, partner_id)
);

-- Create junction table for associated projects
CREATE TABLE action_associated_projects (
  action_id uuid REFERENCES actions(id) ON DELETE CASCADE,
  project_id uuid REFERENCES associated_projects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  PRIMARY KEY (action_id, project_id)
);

-- Enable RLS on new tables
ALTER TABLE action_implementing_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_associated_projects ENABLE ROW LEVEL SECURITY;

-- Create policies for junction tables
CREATE POLICY "Users can view action partners in their clusters"
  ON action_implementing_partners
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actions
      JOIN interventions ON interventions.id = actions.intervention_id
      JOIN pathways ON pathways.id = interventions.pathway_id
      JOIN clusters ON clusters.id = pathways.cluster_id
      WHERE actions.id = action_implementing_partners.action_id
      AND clusters.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage action partners in their clusters"
  ON action_implementing_partners
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actions
      JOIN interventions ON interventions.id = actions.intervention_id
      JOIN pathways ON pathways.id = interventions.pathway_id
      JOIN clusters ON clusters.id = pathways.cluster_id
      WHERE actions.id = action_implementing_partners.action_id
      AND clusters.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view action projects in their clusters"
  ON action_associated_projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actions
      JOIN interventions ON interventions.id = actions.intervention_id
      JOIN pathways ON pathways.id = interventions.pathway_id
      JOIN clusters ON clusters.id = pathways.cluster_id
      WHERE actions.id = action_associated_projects.action_id
      AND clusters.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage action projects in their clusters"
  ON action_associated_projects
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actions
      JOIN interventions ON interventions.id = actions.intervention_id
      JOIN pathways ON pathways.id = interventions.pathway_id
      JOIN clusters ON clusters.id = pathways.cluster_id
      WHERE actions.id = action_associated_projects.action_id
      AND clusters.created_by = auth.uid()
    )
  );