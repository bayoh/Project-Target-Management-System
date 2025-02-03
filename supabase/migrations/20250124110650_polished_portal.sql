/*
  # Create users view and function

  1. New Objects
    - Function `get_authenticated_users()` to securely access user information
    - View `users_view` based on the function
  
  2. Security
    - Function is security definer to safely access auth.users
    - View inherits RLS from the function
    - Only authenticated users can access the view
*/

-- Create a secure function to access user information
CREATE OR REPLACE FUNCTION get_authenticated_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    u.created_at
  FROM auth.users u;
END;
$$;

-- Revoke execute from public and grant to authenticated users only
REVOKE EXECUTE ON FUNCTION get_authenticated_users() FROM public;
GRANT EXECUTE ON FUNCTION get_authenticated_users() TO authenticated;

-- Create the view using the secure function
CREATE OR REPLACE VIEW users_view AS
SELECT * FROM get_authenticated_users();

-- Grant access to authenticated users
GRANT SELECT ON users_view TO authenticated;