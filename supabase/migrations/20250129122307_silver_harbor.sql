-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Only super admins can modify system settings" ON system_settings;

-- Create updated policies for system_settings
CREATE POLICY "Everyone can view system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can insert system settings"
  ON system_settings FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update system settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete system settings"
  ON system_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Ensure default settings exist
INSERT INTO system_settings (id, app_name, tagline)
VALUES (1, 'Project Manager', 'Manage your projects efficiently')
ON CONFLICT (id) DO NOTHING;