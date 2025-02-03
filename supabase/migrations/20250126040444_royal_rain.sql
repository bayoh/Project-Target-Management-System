/*
  # Create storage bucket for intervention documents

  1. New Storage Bucket
    - Creates a new public bucket for storing intervention documents
    - Sets up appropriate security policies
  
  2. Security
    - Enables RLS
    - Adds policies for authenticated users to manage their documents
*/

-- Enable storage by creating the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('intervention-documents', 'intervention-documents', true);

-- Set up security policies for the bucket
CREATE POLICY "Users can view intervention documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'intervention-documents'
    AND EXISTS (
      SELECT 1 FROM public.interventions i
      WHERE i.id::text = (REGEXP_MATCH(name, '^([^/]+)/'))[1]
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
      WHERE i.id::text = (REGEXP_MATCH(name, '^([^/]+)/'))[1]
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
      WHERE i.id::text = (REGEXP_MATCH(name, '^([^/]+)/'))[1]
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
      WHERE i.id::text = (REGEXP_MATCH(name, '^([^/]+)/'))[1]
      AND (
        i.created_by = auth.uid()
        OR i.lead_id = auth.uid()
      )
    )
  );