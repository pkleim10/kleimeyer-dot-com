-- Clean up old RLS policies to prevent conflicts
-- Drop all possible old policies that might exist

-- Drop policies from the original migration
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Only admins can manage user roles" ON user_roles;

-- Drop policies from the fix_user_roles_rls migration
DROP POLICY IF EXISTS "Authenticated users can manage roles" ON user_roles;

-- Drop policies from the fix_admin_rls migration
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- Drop policies from the fix_rls_no_recursion migration
DROP POLICY IF EXISTS "Allow authenticated users to read user_roles" ON user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to manage user_roles" ON user_roles;

-- Verify current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_roles';
