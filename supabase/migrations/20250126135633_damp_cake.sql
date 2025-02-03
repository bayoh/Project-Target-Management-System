/*
  # Report System Tables

  1. New Tables
    - `report_templates` - Stores report templates
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `layout` (jsonb)
      - `created_by` (uuid)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `generated_reports` - Stores generated reports
      - `id` (uuid, primary key) 
      - `template_id` (uuid)
      - `intervention_id` (uuid)
      - `data` (jsonb)
      - `created_by` (uuid)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create report_templates table
CREATE TABLE report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  layout jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create generated_reports table
CREATE TABLE generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES report_templates(id) ON DELETE CASCADE NOT NULL,
  intervention_id uuid REFERENCES interventions(id) ON DELETE CASCADE NOT NULL,
  data jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for report_templates
CREATE POLICY "Users can view report templates"
  ON report_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create report templates"
  ON report_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their report templates"
  ON report_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their report templates"
  ON report_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create policies for generated_reports
CREATE POLICY "Users can view generated reports"
  ON generated_reports
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
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create generated reports"
  ON generated_reports
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

CREATE POLICY "Users can delete their generated reports"
  ON generated_reports
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Add indexes for better performance
CREATE INDEX idx_report_templates_created_by ON report_templates(created_by);
CREATE INDEX idx_generated_reports_template_id ON generated_reports(template_id);
CREATE INDEX idx_generated_reports_intervention_id ON generated_reports(intervention_id);
CREATE INDEX idx_generated_reports_created_by ON generated_reports(created_by);