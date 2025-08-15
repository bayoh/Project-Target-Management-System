/*
  # Target History Tracking Implementation

  1. New Table
    - target_history: Track changes to targets
      - id (uuid, primary key)
      - target_id (uuid, references action_targets)
      - previous_baseline_value (numeric)
      - new_baseline_value (numeric)
      - previous_current_value (numeric)
      - new_current_value (numeric)
      - previous_target_value (numeric)
      - new_target_value (numeric)
      - previous_women_target (numeric)
      - new_women_target (numeric)
      - previous_women_current (numeric)
      - new_women_current (numeric)
      - previous_youth_target (numeric)
      - new_youth_target (numeric)
      - previous_youth_current (numeric)
      - new_youth_current (numeric)
      - changed_by (uuid, references auth.users)
      - changed_at (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for proper access control
*/

-- Create target_history table
CREATE TABLE target_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid REFERENCES action_targets(id) ON DELETE CASCADE NOT NULL,
  previous_baseline_value numeric,
  new_baseline_value numeric,
  previous_current_value numeric,
  new_current_value numeric,
  previous_target_value numeric,
  new_target_value numeric,
  previous_women_target numeric,
  new_women_target numeric,
  previous_women_current numeric,
  new_women_current numeric,
  previous_youth_target numeric,
  new_youth_target numeric,
  previous_youth_current numeric,
  new_youth_current numeric,
  changed_by uuid REFERENCES auth.users(id) NOT NULL,
  changed_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE target_history ENABLE ROW LEVEL SECURITY;

-- Create policies for target_history
CREATE POLICY "Users can view target history of their actions"
  ON target_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM action_targets t
      JOIN actions a ON t.action_id = a.id
      WHERE t.id = target_id
      AND (a.created_by = auth.uid() OR a.lead_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert target history for their actions"
  ON target_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM action_targets t
      JOIN actions a ON t.action_id = a.id
      WHERE t.id = target_id
      AND (a.created_by = auth.uid() OR a.lead_id = auth.uid())
    )
    AND changed_by = auth.uid()
  );

-- Create trigger function to automatically record target changes
CREATE OR REPLACE FUNCTION record_target_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO target_history (
    target_id,
    new_baseline_value,
    previous_baseline_value,
    new_current_value,
    previous_current_value,
    new_target_value,
    previous_target_value,
    previous_women_target,
    new_women_target,
    previous_women_current,
    new_women_current,
    previous_youth_target,
    new_youth_target,
    previous_youth_current,
    new_youth_current,
    changed_by
  ) VALUES (
    OLD.id,
    OLD.baseline_value,
    NEW.baseline_value,
    OLD.current_value,
    NEW.current_value,
    OLD.target_value,
    NEW.target_value,
    OLD.women_target,
    NEW.women_target,
    OLD.women_current,
    NEW.women_current,
    OLD.youth_target,
    NEW.youth_target,
    OLD.youth_current,
    NEW.youth_current,
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to record changes
CREATE TRIGGER record_target_changes_trigger
  AFTER UPDATE ON action_targets
  FOR EACH ROW
  WHEN (
    OLD.women_target IS DISTINCT FROM NEW.women_target OR
    OLD.women_current IS DISTINCT FROM NEW.women_current OR
    OLD.youth_target IS DISTINCT FROM NEW.youth_target OR
    OLD.youth_current IS DISTINCT FROM NEW.youth_current OR
    OLD.target_value IS DISTINCT FROM NEW.target_value OR
    OLD.current_value IS DISTINCT FROM NEW.current_value OR
    OLD.baseline_value IS DISTINCT FROM NEW.baseline_value
  )
  EXECUTE FUNCTION record_target_changes();

-- Add indexes for better query performance
CREATE INDEX idx_target_history_target_id ON target_history(target_id);
CREATE INDEX idx_target_history_changed_at ON target_history(changed_at);