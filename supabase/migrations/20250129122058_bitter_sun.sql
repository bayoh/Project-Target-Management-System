-- Drop and recreate the users_view with last_sign_in_at
DROP VIEW IF EXISTS users_view;

CREATE OR REPLACE VIEW users_view AS
SELECT 
  u.id,
  u.email,
  u.last_sign_in_at,
  p.full_name,
  p.role,
  p.status
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id;

-- Grant necessary permissions
GRANT SELECT ON users_view TO authenticated;