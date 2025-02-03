/*
  # Project Management Schema

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `status` (enum: 'not_started', 'in_progress', 'at_risk', 'completed')
      - `start_date` (date)
      - `end_date` (date)
      - `budget` (numeric)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `tasks`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `title` (text)
      - `description` (text)
      - `status` (enum: 'pending', 'in_progress', 'completed', 'delayed')
      - `assigned_to` (uuid, references auth.users)
      - `due_date` (date)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for project access
    - Add policies for task management
*/

-- Create custom types
CREATE TYPE project_status AS ENUM ('not_started', 'in_progress', 'at_risk', 'completed');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'delayed');

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status project_status NOT NULL DEFAULT 'not_started',
  start_date date,
  end_date date,
  budget numeric,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_dates CHECK (start_date <= end_date)
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES auth.users(id),
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for projects
CREATE POLICY "Users can view their own projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create policies for tasks
CREATE POLICY "Users can view tasks of their projects"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND projects.created_by = auth.uid()
    )
    OR
    tasks.assigned_to = auth.uid()
  );

CREATE POLICY "Users can create tasks in their projects"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks they're assigned to"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND projects.created_by = auth.uid()
    )
    OR
    tasks.assigned_to = auth.uid()
  );