/*
  # Add created_by to tasks table

  1. Changes
    - Add created_by column to tasks table
    - Add foreign key constraint to auth.users
    - Update RLS policies to include created_by checks
*/

-- Add created_by column to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid();

-- Update RLS policies for tasks to include created_by checks
DROP POLICY IF EXISTS "Users can view tasks of their actions" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks in their actions" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks they're assigned to" ON tasks;

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
    OR tasks.assigned_to = auth.uid()
    OR tasks.created_by = auth.uid()
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
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update tasks they created or are assigned to"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = tasks.action_id
      AND actions.created_by = auth.uid()
    )
  );