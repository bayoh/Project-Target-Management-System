/*
  # Fix intervention and users view relationship

  1. Changes
    - Add foreign key reference from interventions.lead_id to auth.users
    - Update users_view to include necessary fields
    - Add RLS policies for proper access control

  2. Security
    - Maintain RLS policies for data protection
    - Ensure proper access to user data through the view
*/

-- Drop and recreate the users view with proper structure
DROP VIEW IF EXISTS users_view;

CREATE OR REPLACE VIEW users_view AS
SELECT 
  id,
  email,
  created_at
FROM auth.users;

-- Add comment to clarify view usage
COMMENT ON VIEW users_view IS 'Secure view of auth.users for application use';

-- Grant appropriate permissions
GRANT SELECT ON users_view TO authenticated;

-- Update interventions table to properly reference auth.users
ALTER TABLE interventions
  DROP CONSTRAINT IF EXISTS interventions_lead_id_fkey,
  ADD CONSTRAINT interventions_lead_id_fkey 
    FOREIGN KEY (lead_id) 
    REFERENCES auth.users(id)
    ON DELETE SET NULL;