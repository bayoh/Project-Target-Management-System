-- Drop existing foreign key if it exists
ALTER TABLE interventions
DROP CONSTRAINT IF EXISTS interventions_lead_id_fkey;

-- Create a view that includes only the necessary user fields
CREATE OR REPLACE VIEW users_view AS
SELECT 
  u.id,
  u.email,
  p.full_name,
  p.role,
  p.status
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id;

-- Add foreign key constraint to interventions table
ALTER TABLE interventions
ADD CONSTRAINT interventions_lead_id_fkey
FOREIGN KEY (lead_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;

-- Grant necessary permissions
GRANT SELECT ON users_view TO authenticated;

-- Create a function to get lead information
CREATE OR REPLACE FUNCTION get_intervention_lead(lead_id uuid)
RETURNS jsonb AS $$
  SELECT COALESCE(
    jsonb_build_object(
      'id', u.id,
      'email', u.email,
      'full_name', p.full_name
    ),
    '{}'::jsonb
  )
  FROM auth.users u
  LEFT JOIN user_profiles p ON u.id = p.id
  WHERE u.id = lead_id;
$$ LANGUAGE sql IMMUTABLE;

-- Create index on lead_id for better performance
CREATE INDEX IF NOT EXISTS idx_interventions_lead_id ON interventions(lead_id);

-- Add a view for intervention details that includes lead information
CREATE OR REPLACE VIEW intervention_details AS
SELECT 
  i.*,
  get_intervention_lead(i.lead_id) as lead_info
FROM interventions i;