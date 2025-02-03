/*
  # Fix intervention documents table policies

  1. Updates
    - Adds proper RLS policies for intervention_documents table
    - Ensures consistent access control with storage policies
    - Fixes policy conditions for document operations
  
  2. Security
    - Maintains RLS protection
    - Allows proper access for intervention owners and leads
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view documents of their interventions" ON intervention_documents;
DROP POLICY IF EXISTS "Users can create documents for their interventions" ON intervention_documents;

-- Create updated policies for intervention_documents table
CREATE POLICY "Users can view intervention documents"
  ON intervention_documents
  FOR SELECT
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

CREATE POLICY "Users can create intervention documents"
  ON intervention_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interventions i
      WHERE i.id = intervention_id
      AND (
        i.created_by = auth.uid()
        OR i.lead_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete intervention documents"
  ON intervention_documents
  FOR DELETE
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