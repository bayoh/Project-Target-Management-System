/*
  # Add Intervention Support Tables

  1. New Tables
    - intervention_objectives
      - id (uuid, primary key)
      - intervention_id (uuid, references interventions)
      - description (text)
      - created_by (uuid, references auth.users)
      - created_at (timestamptz)
      - updated_at (timestamptz)

    - intervention_resources
      - id (uuid, primary key)
      - intervention_id (uuid, references interventions)
      - name (text)
      - quantity (numeric)
      - unit (text)
      - acquired (boolean)
      - created_by (uuid, references auth.users)
      - created_at (timestamptz)
      - updated_at (timestamptz)

    - intervention_success_criteria
      - id (uuid, primary key)
      - intervention_id (uuid, references interventions)
      - description (text)
      - target_value (numeric)
      - target_unit (text)
      - current_value (numeric)
      - created_by (uuid, references auth.users)
      - created_at (timestamptz)
      - updated_at (timestamptz)

    - intervention_activities
      - id (uuid, primary key)
      - intervention_id (uuid, references interventions)
      - action (text)
      - details (text)
      - created_by (uuid, references auth.users)
      - created_at (timestamptz)

    - intervention_comments
      - id (uuid, primary key)
      - intervention_id (uuid, references interventions)
      - content (text)
      - created_by (uuid, references auth.users)
      - created_at (timestamptz)

    - intervention_documents
      - id (uuid, primary key)
      - intervention_id (uuid, references interventions)
      - name (text)
      - size (numeric)
      - type (text)
      - url (text)
      - created_by (uuid, references auth.users)
      - created_at (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for viewing, creating, and updating records
*/

-- Create intervention_objectives table
CREATE TABLE intervention_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES interventions(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create intervention_resources table
CREATE TABLE intervention_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES interventions(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text,
  acquired boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create intervention_success_criteria table
CREATE TABLE intervention_success_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES interventions(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  target_value numeric,
  target_unit text,
  current_value numeric DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create intervention_activities table
CREATE TABLE intervention_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES interventions(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  details text,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create intervention_comments table
CREATE TABLE intervention_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES interventions(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create intervention_documents table
CREATE TABLE intervention_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES interventions(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  size numeric NOT NULL,
  type text NOT NULL,
  url text NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE intervention_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_success_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for intervention_objectives
CREATE POLICY "Users can view objectives of their interventions"
  ON intervention_objectives
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interventions
      WHERE interventions.id = intervention_objectives.intervention_id
      AND (
        interventions.created_by = auth.uid()
        OR interventions.lead_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create objectives for their interventions"
  ON intervention_objectives
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interventions
      WHERE interventions.id = intervention_id
      AND (
        interventions.created_by = auth.uid()
        OR interventions.lead_id = auth.uid()
      )
    )
  );

-- Create policies for intervention_resources
CREATE POLICY "Users can view resources of their interventions"
  ON intervention_resources
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interventions
      WHERE interventions.id = intervention_resources.intervention_id
      AND (
        interventions.created_by = auth.uid()
        OR interventions.lead_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create resources for their interventions"
  ON intervention_resources
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interventions
      WHERE interventions.id = intervention_id
      AND (
        interventions.created_by = auth.uid()
        OR interventions.lead_id = auth.uid()
      )
    )
  );

-- Create policies for intervention_success_criteria
CREATE POLICY "Users can view success criteria of their interventions"
  ON intervention_success_criteria
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interventions
      WHERE interventions.id = intervention_success_criteria.intervention_id
      AND (
        interventions.created_by = auth.uid()
        OR interventions.lead_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create success criteria for their interventions"
  ON intervention_success_criteria
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interventions
      WHERE interventions.id = intervention_id
      AND (
        interventions.created_by = auth.uid()
        OR interventions.lead_id = auth.uid()
      )
    )
  );

-- Create policies for intervention_activities
CREATE POLICY "Users can view activities of their interventions"
  ON intervention_activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interventions
      WHERE interventions.id = intervention_activities.intervention_id
      AND (
        interventions.created_by = auth.uid()
        OR interventions.lead_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create activities for their interventions"
  ON intervention_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interventions
      WHERE interventions.id = intervention_id
      AND (
        interventions.created_by = auth.uid()
        OR interventions.lead_id = auth.uid()
      )
    )
  );

-- Create policies for intervention_comments
CREATE POLICY "Users can view comments of their interventions"
  ON intervention_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interventions
      WHERE interventions.id = intervention_comments.intervention_id
      AND (
        interventions.created_by = auth.uid()
        OR interventions.lead_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create comments for their interventions"
  ON intervention_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interventions
      WHERE interventions.id = intervention_id
      AND (
        interventions.created_by = auth.uid()
        OR interventions.lead_id = auth.uid()
      )
    )
  );

-- Create policies for intervention_documents
CREATE POLICY "Users can view documents of their interventions"
  ON intervention_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interventions
      WHERE interventions.id = intervention_documents.intervention_id
      AND (
        interventions.created_by = auth.uid()
        OR interventions.lead_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create documents for their interventions"
  ON intervention_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interventions
      WHERE interventions.id = intervention_id
      AND (
        interventions.created_by = auth.uid()
        OR interventions.lead_id = auth.uid()
      )
    )
  );