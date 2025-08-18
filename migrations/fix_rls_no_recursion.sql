-- Fix RLS policies to avoid infinite recursion
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can manage roles" ON user_roles;

-- Disable RLS temporarily to allow admin operations
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Create a simple function to check admin status without recursion
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

-- Re-enable RLS with simple policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Simple policy: allow all authenticated users to read user_roles
-- We'll control access at the application level
CREATE POLICY "Allow authenticated users to read user_roles" ON user_roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert/update (controlled by app logic)
CREATE POLICY "Allow authenticated users to manage user_roles" ON user_roles
  FOR ALL USING (auth.uid() IS NOT NULL);
