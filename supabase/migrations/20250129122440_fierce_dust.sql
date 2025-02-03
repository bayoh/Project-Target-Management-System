-- Drop existing table and policies
DROP TABLE IF EXISTS system_settings CASCADE;

-- Recreate system_settings table with proper structure
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

-- Create policies for system_settings with proper checks
CREATE POLICY "Everyone can view system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can manage system settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
      AND status = 'active'
    )
  );

-- Ensure the system bucket exists
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('system', 'system', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Create storage policies for system bucket
DROP POLICY IF EXISTS "System files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Only super admins can manage system files" ON storage.objects;

CREATE POLICY "System files are publicly accessible"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'system');

CREATE POLICY "Super admins can manage system files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'system'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
      AND status = 'active'
    )
  );

-- Insert default settings
INSERT INTO system_settings (id, app_name, tagline)
VALUES (1, 'Project Manager', 'Manage your projects efficiently')
ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON system_settings TO authenticated;