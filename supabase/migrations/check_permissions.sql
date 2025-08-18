-- Check current permissions for implementing_partners and associated_projects tables
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name IN ('implementing_partners', 'associated_projects')
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Grant permissions to anon role for basic read access
GRANT SELECT ON implementing_partners TO anon;
GRANT SELECT ON associated_projects TO anon;

-- Grant full access to authenticated role
GRANT ALL PRIVILEGES ON implementing_partners TO authenticated;
GRANT ALL PRIVILEGES ON associated_projects TO authenticated;

-- Verify permissions after granting
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name IN ('implementing_partners', 'associated_projects')
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;