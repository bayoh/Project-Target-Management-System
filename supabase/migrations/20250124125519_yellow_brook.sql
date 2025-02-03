/*
  # Add Action Tracking Indicators

  1. New Tables
    - `indicator_types`
      - Defines the types of indicators (quantitative/qualitative)
    - `indicators`
      - Stores indicator definitions
      - Links to actions
      - Tracks targets and progress
    - `indicator_reports`
      - Stores periodic reports for indicators
      - Captures both quantitative values and qualitative narratives

  2. Changes
    - Add support for tracking various types of indicators
    - Enable reporting on progress and achievements
    - Support job-specific metrics

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users
*/

-- Create indicator types enum
CREATE TYPE indicator_type AS ENUM ('quantitative', 'qualitative');

-- Create indicators table
CREATE TABLE indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid REFERENCES actions(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  type indicator_type NOT NULL,
  target_value numeric, -- For quantitative indicators
  target_date date,
  category text, -- e.g., 'jobs', 'training', 'infrastructure'
  subcategory text, -- e.g., 'women', 'youth', 'general'
  unit text, -- e.g., 'people', 'percentage', 'currency'
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indicator reports table
CREATE TABLE indicator_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid REFERENCES indicators(id) ON DELETE CASCADE NOT NULL,
  report_date date NOT NULL,
  quantitative_value numeric,
  qualitative_value text,
  supporting_documents jsonb, -- URLs to supporting documents
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for indicators
CREATE POLICY "Users can view indicators of their actions"
  ON indicators
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actions
      WHERE actions.id = indicators.action_id
      AND actions.created_by = auth.uid()
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
      AND actions.created_by = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their indicators"
  ON indicators
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Create policies for indicator reports
CREATE POLICY "Users can view indicator reports of their indicators"
  ON indicator_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM indicators
      WHERE indicators.id = indicator_reports.indicator_id
      AND indicators.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create reports for their indicators"
  ON indicator_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM indicators
      WHERE indicators.id = indicator_id
      AND indicators.created_by = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their reports"
  ON indicator_reports
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Add indexes for better query performance
CREATE INDEX idx_indicators_action_id ON indicators(action_id);
CREATE INDEX idx_indicator_reports_indicator_id ON indicator_reports(indicator_id);
CREATE INDEX idx_indicators_category ON indicators(category);
CREATE INDEX idx_indicators_type ON indicators(type);