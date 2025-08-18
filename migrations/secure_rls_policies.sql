-- Create secure RLS policies for user_roles table
-- First, clean up any existing policies
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Only admins can manage user roles" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to read user_roles" ON user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to manage user_roles" ON user_roles;

-- Ensure RLS is enabled
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create a secure function to check admin status without recursion
CREATE OR REPLACE FUNCTION is_user_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Use a direct query that bypasses RLS
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = user_uuid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy 1: Users can view their own role
CREATE POLICY "Users can view their own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Admins can view all roles (using the helper function)
CREATE POLICY "Admins can view all roles" ON user_roles
  FOR SELECT USING (is_user_admin(auth.uid()));

-- Policy 3: Admins can manage all roles
CREATE POLICY "Admins can manage all roles" ON user_roles
  FOR ALL USING (is_user_admin(auth.uid()));

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_roles';
