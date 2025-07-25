-- Create help_sections table for editable help sidebar
CREATE TABLE help_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for ordering
CREATE INDEX idx_help_sections_order ON help_section(display_order);

-- Insert default help sections based on current hardcoded sections
INSERT INTO help_section (id, title, icon_name, display_order) VALUES
  ('getting-started', 'Getting Started', 'BookOpen', 1),
  ('user-dashboard', 'User Dashboard', 'LayoutDashboard', 2),
  ('interventions', 'Interventions Management', 'Briefcase', 3),
  ('actions', 'Actions Management', 'Target', 4),
  ('issues', 'Issue Tracking', 'AlertTriangle', 5),
  ('reports', 'Reports & Analytics', 'FileText', 6),
  ('user-management', 'User Management', 'Users', 7),
  ('system-settings', 'System Settings', 'Settings', 8);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_help_sections_updated_at
    BEFORE UPDATE ON help_section
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint to link help_content to help_sections
ALTER TABLE help_content 
ADD CONSTRAINT fk_help_content_section_id 
FOREIGN KEY (section_id) REFERENCES help_section(id) ON DELETE CASCADE;

-- Add RLS policies
ALTER TABLE help_sections ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read help sections
CREATE POLICY "Allow authenticated users to read help section" ON help_section
  FOR SELECT TO authenticated USING (true);

-- Allow only admins to modify help sections
CREATE POLICY "Allow admins to manage help section" ON help_section
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );