/*
  # Update intervention policies

  1. Changes
    - Update RLS policies for interventions to allow both creators and leads to perform updates
    - Add policies for intervention-related tables to ensure consistent access

  2. Security
    - Maintains proper access control while expanding update permissions
    - Ensures data integrity through proper policy checks
*/

-- Drop existing update policy for interventions
DROP POLICY IF EXISTS "Users can update their interventions" ON interventions;

-- Create new update policy for interventions
CREATE POLICY "Users can update interventions"
  ON interventions
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() = lead_id
  );

-- Update related tables' policies to maintain consistency

-- Update intervention_objectives policy
DROP POLICY IF EXISTS "Users can update their objectives" ON intervention_objectives;
CREATE POLICY "Users can update objectives"
  ON intervention_objectives
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interventions i
      WHERE i.id = intervention_id
      AND (
        i.created_by = auth.uid()
        OR i.lead_id = auth.uid()
      )
    )
  );

-- Update intervention_resources policy
DROP POLICY IF EXISTS "Users can update their resources" ON intervention_resources;
CREATE POLICY "Users can update resources"
  ON intervention_resources
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interventions i
      WHERE i.id = intervention_id
      AND (
        i.created_by = auth.uid()
        OR i.lead_id = auth.uid()
      )
    )
  );

-- Update intervention_success_criteria policy
DROP POLICY IF EXISTS "Users can update their success criteria" ON intervention_success_criteria;
CREATE POLICY "Users can update success criteria"
  ON intervention_success_criteria
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interventions i
      WHERE i.id = intervention_id
      AND (
        i.created_by = auth.uid()
        OR i.lead_id = auth.uid()
      )
    )
  );

-- Update intervention_documents policy
DROP POLICY IF EXISTS "Users can update intervention documents" ON intervention_documents;
CREATE POLICY "Users can update intervention documents"
  ON intervention_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interventions i
      WHERE i.id = intervention_id
      AND (
        i.created_by = auth.uid()
        OR i.lead_id = auth.uid()
      )
    )
  );