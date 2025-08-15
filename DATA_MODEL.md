# Data Model Documentation

This document provides a comprehensive overview of the database schema and data model for the Project Management System.

## Core Entity Hierarchy

The system follows a hierarchical structure:

```
Clusters
└── Pathways
    └── Interventions
        └── Actions
            ├── Tasks
            ├── Indicators
            └── Targets
```

## Core Tables

### 1. Clusters
Top-level organizational units that group related pathways.

```sql
CREATE TABLE clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code number,
  description text,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 2. Pathways
Groups of interventions within a cluster, representing strategic approaches.

```sql
CREATE TABLE pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid REFERENCES clusters(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  code number,
  description text,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 3. Interventions
Specific intervention projects within a pathway.

```sql
CREATE TABLE interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_id uuid REFERENCES pathways(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  code number,
  description text,
  status project_status NOT NULL DEFAULT 'not_started',
  start_date date,
  end_date date,
  budget numeric,
  lead_id uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 4. Actions
Concrete steps within an intervention.

```sql
CREATE TABLE actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES interventions(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  code number,
  description text,
  status project_status NOT NULL DEFAULT 'not_started',
  start_date date,
  actual_startDate date,
  actual_endDate date,
  end_date date,
  lead_id uuid REFERENCES auth.users(id),
  supporting_staff text[],
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 5. Tasks
Individual tasks within an action.

```sql
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid REFERENCES actions(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES auth.users(id),
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Supporting Tables

### User Management

#### User Profiles
```sql
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  role text NOT NULL DEFAULT 'user',
  avatar_url text,
  phone text,
  bio text,
  followers_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  posts_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Intervention Support Tables

#### Intervention Comments
```sql
CREATE TABLE intervention_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES interventions(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
```

#### Intervention Documents
```sql
CREATE TABLE intervention_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES interventions(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz DEFAULT now()
);
```

#### Intervention Objectives
```sql
CREATE TABLE intervention_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES interventions(id) ON DELETE CASCADE,
  description text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Intervention Resources
```sql
CREATE TABLE intervention_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES interventions(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric,
  unit text,
  acquired boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Intervention Success Criteria
```sql
CREATE TABLE intervention_success_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES interventions(id) ON DELETE CASCADE,
  description text NOT NULL,
  target_value numeric,
  target_unit text,
  current_value numeric DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Intervention Activities
```sql
CREATE TABLE intervention_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES interventions(id) ON DELETE CASCADE,
  action text NOT NULL,
  details text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
```

### Action Support Tables

#### Action Issues
```sql
CREATE TABLE action_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid REFERENCES actions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'open',
  date_identified date DEFAULT CURRENT_DATE,
  date_resolved date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Action Needs
```sql
CREATE TABLE action_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid REFERENCES actions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending',
  date_identified date DEFAULT CURRENT_DATE,
  date_fulfilled date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Action Achievements
```sql
CREATE TABLE action_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid REFERENCES actions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  date_achieved date DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Action Targets
```sql
CREATE TABLE action_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid REFERENCES actions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  baseline_value numeric DEFAULT 0,
  target_value numeric NOT NULL,
  current_value numeric DEFAULT 0,
  unit text,
  target_date date,
  category text,
  women_target numeric,
  women_current numeric DEFAULT 0,
  youth_target numeric,
  youth_current numeric DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Target History
```sql
CREATE TABLE target_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid REFERENCES action_targets(id) ON DELETE CASCADE,
  previous_baseline_value numeric,
  new_baseline_value numeric,
  previous_current_value numeric,
  new_current_value numeric,
  previous_target_value numeric,
  new_target_value numeric,
  previous_women_target numeric,
  new_women_target numeric,
  previous_women_current numeric,
  new_women_current numeric,
  previous_youth_target numeric,
  new_youth_target numeric,
  previous_youth_current numeric,
  new_youth_current numeric,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now()
);
```

### Indicators and Reporting

#### Indicators
```sql
CREATE TABLE indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid REFERENCES actions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type indicator_type NOT NULL, -- 'quantitative' | 'qualitative'
  target_value numeric,
  target_date date,
  category text,
  subcategory text,
  unit text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Indicator Reports
```sql
CREATE TABLE indicator_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid REFERENCES indicators(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  quantitative_value numeric,
  qualitative_value text,
  supporting_documents jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Partnership Management

#### Implementing Partners
```sql
CREATE TABLE implementing_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  contact_person text,
  contact_email text,
  contact_phone text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Associated Projects
```sql
CREATE TABLE associated_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  start_date date,
  end_date date,
  budget numeric,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Action-Partner Relationships
```sql
CREATE TABLE action_implementing_partners (
  action_id uuid REFERENCES actions(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES implementing_partners(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  PRIMARY KEY (action_id, partner_id)
);
```

#### Action-Project Relationships
```sql
CREATE TABLE action_associated_projects (
  action_id uuid REFERENCES actions(id) ON DELETE CASCADE,
  project_id uuid REFERENCES associated_projects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  PRIMARY KEY (action_id, project_id)
);
```

### Reporting System

#### Report Templates
```sql
CREATE TABLE report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  layout jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Generated Reports
```sql
CREATE TABLE generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES report_templates(id) ON DELETE CASCADE,
  intervention_id uuid REFERENCES interventions(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
```

### Activity Tracking

#### User Activity Logs
```sql
CREATE TABLE user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type activity_action_type NOT NULL,
  entity_type entity_type,
  entity_id uuid,
  timestamp timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text,
  session_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

#### User Sessions
```sql
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  login_time timestamptz DEFAULT now(),
  logout_time timestamptz,
  ip_address inet,
  user_agent text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Jobs Dashboard

#### Jobs Statistics
```sql
CREATE TABLE jobs_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector text NOT NULL,
  total_jobs integer NOT NULL,
  percentage numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Targets (Jobs)
```sql
CREATE TABLE targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  job_subcategory text,
  target_value numeric,
  current_value numeric DEFAULT 0,
  unit text,
  target_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### System Configuration

#### System Settings
```sql
CREATE TABLE system_settings (
  id integer PRIMARY KEY DEFAULT 1,
  app_name text NOT NULL DEFAULT 'Project Manager',
  tagline text DEFAULT 'Manage your projects efficiently',
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
```

#### Help Sections
```sql
CREATE TABLE help_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Custom Types

### Enums
```sql
-- Project and task status
CREATE TYPE project_status AS ENUM ('not_started', 'in_progress', 'at_risk', 'completed');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'delayed');

-- Indicator types
CREATE TYPE indicator_type AS ENUM ('quantitative', 'qualitative');

-- Activity tracking
CREATE TYPE activity_action_type AS ENUM (
  'login', 'logout', 'create', 'update', 'delete', 'view',
  'export', 'import', 'search', 'filter', 'sort', 'bulk_action'
);

CREATE TYPE entity_type AS ENUM (
  'cluster', 'pathway', 'intervention', 'action', 'task',
  'indicator', 'indicator_report', 'user', 'help_section',
  'help_content', 'navigation'
);
```

## Storage Buckets

### File Storage
- **avatars**: User profile pictures
- **system**: System files (logos, etc.)
- **intervention-documents**: Intervention-related documents

## Key Relationships

1. **Hierarchical Structure**: Clusters → Pathways → Interventions → Actions → Tasks
2. **User Management**: All entities link to users via `created_by` and `lead_id`
3. **Activity Tracking**: All user actions are logged in `user_activity_logs`
4. **Target Tracking**: Changes to targets are automatically recorded in `target_history`
5. **Many-to-Many Relationships**: Actions can have multiple implementing partners and associated projects
6. **Document Management**: Interventions can have multiple documents and comments
7. **Reporting**: Flexible report generation using templates and data storage

## Security

- **Row Level Security (RLS)** is enabled on all tables
- **Policies** ensure users can only access data they own or are authorized to view
- **Cascade Deletes** maintain referential integrity
- **Triggers** automatically track changes and maintain audit trails

## Performance Optimizations

- **Indexes** on frequently queried columns
- **Materialized Views** for dashboard statistics
- **Database Functions** for complex aggregations
- **Automatic Refresh Triggers** for materialized views

This data model supports a comprehensive project management system with hierarchical organization, detailed tracking, reporting capabilities, and robust security measures.