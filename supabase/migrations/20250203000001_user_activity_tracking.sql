-- User Activity Tracking System - Database Schema
-- Migration: Create user_activity_logs and user_sessions tables

-- Create enum for action types
CREATE TYPE activity_action_type AS ENUM (
  'login',
  'logout', 
  'create',
  'update',
  'delete',
  'view',
  'export',
  'import',
  'search',
  'filter',
  'sort',
  'bulk_action'
);

-- Create enum for entity types
CREATE TYPE entity_type AS ENUM (
  'cluster',
  'pathway',
  'intervention',
  'action',
  'task',
  'indicator',
  'indicator_report',
  'user',
  'help_section',
  'help_content',
  'navigation'
);

-- Create user_activity_logs table
CREATE TABLE user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type activity_action_type NOT NULL,
  entity_type entity_type,
  entity_id UUID,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  session_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_sessions table
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_time TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_timestamp ON user_activity_logs(timestamp DESC);
CREATE INDEX idx_user_activity_logs_action_type ON user_activity_logs(action_type);
CREATE INDEX idx_user_activity_logs_entity_type ON user_activity_logs(entity_type);
CREATE INDEX idx_user_activity_logs_user_timestamp ON user_activity_logs(user_id, timestamp DESC);
CREATE INDEX idx_user_activity_logs_metadata ON user_activity_logs USING GIN (metadata);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_login_time ON user_sessions(login_time DESC);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);

-- Create RLS policies for user_activity_logs
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own activity logs
CREATE POLICY "Users can view own activity logs" ON user_activity_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: System can insert activity logs
CREATE POLICY "System can insert activity logs" ON user_activity_logs
  FOR INSERT WITH CHECK (true);

-- Policy: Admins can view all activity logs
CREATE POLICY "Admins can view all activity logs" ON user_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('super_admin', 'admin')
    )
  );

-- Create RLS policies for user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: System can manage sessions
CREATE POLICY "System can manage sessions" ON user_sessions
  FOR ALL WITH CHECK (true);

-- Policy: Admins can view all sessions
CREATE POLICY "Admins can view all sessions" ON user_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('super_admin', 'admin')
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_sessions updated_at
CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create view for user activity summary
CREATE VIEW user_activity_summary AS
SELECT 
  u.id as user_id,
  u.email,
  u.raw_user_meta_data->>'name' as name,
  u.raw_user_meta_data->>'role' as role,
  u.created_at as user_created_at,
  s.last_login,
  s.last_logout,
  s.active_sessions,
  a.last_activity,
  a.total_activities_30d,
  a.most_common_action
FROM auth.users u
LEFT JOIN (
  SELECT 
    user_id,
    MAX(login_time) as last_login,
    MAX(logout_time) as last_logout,
    COUNT(*) FILTER (WHERE is_active = true) as active_sessions
  FROM user_sessions
  GROUP BY user_id
) s ON u.id = s.user_id
LEFT JOIN (
  SELECT 
    user_id,
    MAX(timestamp) as last_activity,
    COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '30 days') as total_activities_30d,
    MODE() WITHIN GROUP (ORDER BY action_type) as most_common_action
  FROM user_activity_logs
  GROUP BY user_id
) a ON u.id = a.user_id
ORDER BY COALESCE(a.last_activity, s.last_login, u.created_at) DESC;

-- Grant necessary permissions
GRANT SELECT ON user_activity_summary TO authenticated;
GRANT SELECT, INSERT ON user_activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_sessions TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE user_activity_logs IS 'Tracks all user actions within the system';
COMMENT ON TABLE user_sessions IS 'Tracks user login/logout sessions';
COMMENT ON VIEW user_activity_summary IS 'Provides aggregated view of user activity for dashboards';