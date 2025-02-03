/*
  # Fix storage bucket and permissions

  1. Changes
    - Ensures storage bucket exists with correct settings
    - Updates storage policies with proper intervention access checks
    - Adds explicit owner check to storage policies
  
  2. Security
    - Maintains RLS protection
    - Ensures proper access control for document operations
*/

-- First ensure the bucket exists with correct settings
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('intervention-documents', 'intervention-documents', true)
  ON CONFLICT (id) DO UPDATE
  SET public = true;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view intervention documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload intervention documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their intervention documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their intervention documents" ON storage.objects;

-- Create updated storage policies with proper access checks
CREATE POLICY "Users can view intervention documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'intervention-documents'
    AND (
      -- Check if user has access to the intervention
      EXISTS (
        SELECT 1 FROM public.interventions i
        WHERE i.id::text = SPLIT_PART(name, '/', 1)
        AND (
          i.created_by = auth.uid()
          OR i.lead_id = auth.uid()
        )
      )
      OR
      -- Or if they created the document
      auth.uid()::text = SPLIT_PART(SPLIT_PART(name, '/', 2), '-', 1)
    )
  );

CREATE POLICY "Users can upload intervention documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'intervention-documents'
    AND EXISTS (
      SELECT 1 FROM public.interventions i
      WHERE i.id::text = SPLIT_PART(name, '/', 1)
      AND (
        i.created_by = auth.uid()
        OR i.lead_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete intervention documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'intervention-documents'
    AND EXISTS (
      SELECT 1 FROM public.interventions i
      WHERE i.id::text = SPLIT_PART(name, '/', 1)
      AND (
        i.created_by = auth.uid()
        OR i.lead_id = auth.uid()
      )
    )
  );

-- Update intervention_documents table policies
DROP POLICY IF EXISTS "Users can view intervention documents" ON intervention_documents;
DROP POLICY IF EXISTS "Users can create intervention documents" ON intervention_documents;
DROP POLICY IF EXISTS "Users can delete intervention documents" ON intervention_documents;

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
        OR created_by = auth.uid()
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
    AND created_by = auth.uid()
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