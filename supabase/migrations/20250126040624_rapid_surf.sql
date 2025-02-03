/*
  # Fix storage policies for intervention documents

  1. Updates
    - Fixes path matching in storage policies
    - Simplifies policy conditions
    - Ensures proper access control
  
  2. Security
    - Maintains RLS protection
    - Allows proper access for intervention owners and leads
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view intervention documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload intervention documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their intervention documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their intervention documents" ON storage.objects;

-- Create updated policies with simpler path matching
CREATE POLICY "Users can view intervention documents"
  ON storage.objects
  FOR SELECT
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

CREATE POLICY "Users can update their intervention documents"
  ON storage.objects
  FOR UPDATE
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

CREATE POLICY "Users can delete their intervention documents"
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