/*
  # Add assignment fields for interventions and actions

  1. Changes
    - Add lead_id to interventions table
    - Add lead_id and supporting_staff to actions table
    - Update RLS policies for assignments

  2. Notes
    - lead_id references auth.users
    - supporting_staff is an array of user IDs
*/

-- Add lead_id to interventions
ALTER TABLE interventions
ADD COLUMN lead_id uuid REFERENCES auth.users(id);

-- Add lead_id and supporting_staff to actions
ALTER TABLE actions
ADD COLUMN lead_id uuid REFERENCES auth.users(id),
ADD COLUMN supporting_staff uuid[] DEFAULT '{}';

-- Update RLS policies for interventions
CREATE POLICY "Users can view interventions they lead"
  ON interventions
  FOR SELECT
  TO authenticated
  USING (
    lead_id = auth.uid()
  );

CREATE POLICY "Users can update interventions they lead"
  ON interventions
  FOR UPDATE
  TO authenticated
  USING (
    lead_id = auth.uid()
  );

-- Update RLS policies for actions
CREATE POLICY "Users can view actions they lead or support"
  ON actions
  FOR SELECT
  TO authenticated
  USING (
    lead_id = auth.uid() OR
    auth.uid() = ANY(supporting_staff)
  );

CREATE POLICY "Users can update actions they lead"
  ON actions
  FOR UPDATE
  TO authenticated
  USING (
    lead_id = auth.uid()
  );