/*
  # Fix Indicators RLS Policies

  1. Changes
    - Update RLS policies for indicators table to allow proper access
    - Add policies for users to manage indicators for actions they own or lead
    - Ensure proper cascading access through the action hierarchy

  2. Security
    - Enable RLS on indicators table
    - Add policies for viewing, creating, and updating indicators
    - Ensure proper access control through action ownership
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view indicators of their actions" ON indicators;
DROP POLICY IF EXISTS "Users can create indicators for their actions" ON indicators;
DROP POLICY IF EXISTS "Users can update their indicators" ON indicators;

-- Create updated policies for indicators
CREATE POLICY "Users can view indicators of their actions"
  ON indicators
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = indicators.action_id
      AND (
        actions.created_by = auth.uid()
        OR actions.lead_id = auth.uid()
        OR auth.uid() = ANY(actions.supporting_staff)
      )
    )
  );

CREATE POLICY "Users can create indicators for their actions"
  ON indicators
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

CREATE POLICY "Users can update their indicators"
  ON indicators
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = indicators.action_id
      AND (
        actions.created_by = auth.uid()
        OR actions.lead_id = auth.uid()
      )
    )
  );