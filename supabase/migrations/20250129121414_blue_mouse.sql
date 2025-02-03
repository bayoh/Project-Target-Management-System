-- Create system storage bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('system', 'system', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Create system_settings table
CREATE TABLE system_settings (
  id integer PRIMARY KEY DEFAULT 1,
  app_name text NOT NULL DEFAULT 'Project Manager',
  tagline text DEFAULT 'Manage your projects efficiently',
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for system_settings
CREATE POLICY "Everyone can view system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only super admins can modify system settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Create policies for system bucket
CREATE POLICY "System files are publicly accessible"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'system');

CREATE POLICY "Only super admins can manage system files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'system'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Insert default settings
INSERT INTO system_settings (id, app_name, tagline)
VALUES (1, 'Project Manager', 'Manage your projects efficiently')
ON CONFLICT (id) DO NOTHING;