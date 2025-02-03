-- Create action_comments table
CREATE TABLE action_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid REFERENCES actions(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE action_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for action_comments
CREATE POLICY "Users can view comments of their actions"
  ON action_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = action_comments.action_id
      AND (
        actions.created_by = auth.uid()
        OR actions.lead_id = auth.uid()
        OR auth.uid() = ANY(actions.supporting_staff)
      )
    )
  );

CREATE POLICY "Users can create comments for their actions"
  ON action_comments
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

-- Add indexes for better query performance
CREATE INDEX idx_action_comments_action_id ON action_comments(action_id);
CREATE INDEX idx_action_comments_created_by ON action_comments(created_by);