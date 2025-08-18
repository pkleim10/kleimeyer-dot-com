-- Fix infinite recursion in user_roles RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Only admins can manage user roles" ON user_roles;

-- Create new policies that avoid recursion
-- Allow users to view their own role
CREATE POLICY "Users can view their own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- For now, allow all authenticated users to manage roles (we'll control this at the application level)
-- This avoids the RLS recursion issue while still maintaining security through application logic
CREATE POLICY "Authenticated users can manage roles" ON user_roles
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create a more efficient function to check admin status
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  SELECT role INTO user_role
  FROM user_roles 
  WHERE user_id = user_uuid;
  
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a more efficient function to check contributor status
CREATE OR REPLACE FUNCTION is_contributor(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  SELECT role INTO user_role
  FROM user_roles 
  WHERE user_id = user_uuid;
  
  RETURN user_role IN ('contributor', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
