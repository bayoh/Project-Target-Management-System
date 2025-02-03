-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view indicator reports of their indicators" ON indicator_reports;
DROP POLICY IF EXISTS "Users can create reports for their indicators" ON indicator_reports;
DROP POLICY IF EXISTS "Users can update their reports" ON indicator_reports;

-- Create updated policies for indicator reports
CREATE POLICY "Users can view indicator reports"
  ON indicator_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM indicators i
      JOIN actions a ON i.action_id = a.id
      WHERE i.id = indicator_reports.indicator_id
      AND (
        a.created_by = auth.uid()
        OR a.lead_id = auth.uid()
        OR auth.uid() = ANY(a.supporting_staff)
      )
    )
  );

CREATE POLICY "Users can create indicator reports"
  ON indicator_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM indicators i
      JOIN actions a ON i.action_id = a.id
      WHERE i.id = indicator_id
      AND (
        a.created_by = auth.uid()
        OR a.lead_id = auth.uid()
        OR auth.uid() = ANY(a.supporting_staff)
      )
    )
  );

CREATE POLICY "Users can update their indicator reports"
  ON indicator_reports
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM indicators i
      JOIN actions a ON i.action_id = a.id
      WHERE i.id = indicator_reports.indicator_id
      AND (
        a.created_by = auth.uid()
        OR a.lead_id = auth.uid()
      )
    )
  );