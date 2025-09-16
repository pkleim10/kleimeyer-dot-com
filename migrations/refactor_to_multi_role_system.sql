-- Refactor to Multi-Role System
-- This migration converts from hierarchical single-role to flexible multi-role system

-- Step 1: Create new user_permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, permission)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission);

-- Enable Row Level Security
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Step 2: Define all available permissions
-- These are granular permissions that can be assigned to users
INSERT INTO user_permissions (user_id, permission) 
SELECT DISTINCT user_id, 
  CASE 
    WHEN role = 'admin' THEN 'admin:full_access'
    WHEN role = 'family' THEN 'family:full_access'
    WHEN role = 'contributor' THEN 'contributor:full_access'
    WHEN role = 'member' THEN 'member:basic_access'
  END
FROM user_roles
ON CONFLICT (user_id, permission) DO NOTHING;

-- Step 3: Create helper functions for permission checking
CREATE OR REPLACE FUNCTION has_permission(user_uuid UUID, permission_name VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE user_id = user_uuid AND permission = permission_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create permission-based RLS policies
-- These will replace the role-based policies

-- Example: Family bulletins permissions
CREATE OR REPLACE FUNCTION can_access_family_bulletins(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_permission(user_uuid, 'admin:full_access') OR
         has_permission(user_uuid, 'family:full_access') OR
         has_permission(user_uuid, 'family:view_bulletins');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_create_family_bulletins(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_permission(user_uuid, 'admin:full_access') OR
         has_permission(user_uuid, 'family:full_access') OR
         has_permission(user_uuid, 'family:create_bulletins');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_edit_family_bulletins(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_permission(user_uuid, 'admin:full_access') OR
         has_permission(user_uuid, 'family:full_access') OR
         has_permission(user_uuid, 'family:edit_bulletins');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_delete_family_bulletins(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_permission(user_uuid, 'admin:full_access') OR
         has_permission(user_uuid, 'family:full_access') OR
         has_permission(user_uuid, 'family:delete_bulletins');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create RLS policies for family_bulletins using new permission system
DROP POLICY IF EXISTS "Anyone can view active bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Contributors, admins, and family can view all bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Contributors, admins, and family can create bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Contributors, admins, and family can update bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Contributors, admins, and family can delete bulletins" ON family_bulletins;

-- New permission-based policies
CREATE POLICY "Users with view permission can see all bulletins" ON family_bulletins
  FOR SELECT USING (
    can_access_family_bulletins(auth.uid())
  );

CREATE POLICY "Users with create permission can create bulletins" ON family_bulletins
  FOR INSERT WITH CHECK (
    can_create_family_bulletins(auth.uid())
  );

CREATE POLICY "Users with edit permission can update bulletins" ON family_bulletins
  FOR UPDATE USING (
    can_edit_family_bulletins(auth.uid())
  );

CREATE POLICY "Users with delete permission can delete bulletins" ON family_bulletins
  FOR DELETE USING (
    can_delete_family_bulletins(auth.uid())
  );

-- Step 6: Create similar functions and policies for other tables
-- (This would be expanded for recipes, documents, contacts, etc.)

-- Step 7: Create a view for easy permission management
CREATE OR REPLACE VIEW user_permission_summary AS
SELECT 
  u.id as user_id,
  u.email,
  array_agg(up.permission ORDER BY up.permission) as permissions,
  array_agg(ur.role ORDER BY ur.role) as legacy_roles
FROM auth.users u
LEFT JOIN user_permissions up ON u.id = up.user_id
LEFT JOIN user_roles ur ON u.id = ur.user_id
GROUP BY u.id, u.email;

-- Step 8: Create RLS policies for user_permissions table
CREATE POLICY "Users can view their own permissions" ON user_permissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all permissions" ON user_permissions
  FOR ALL USING (
    has_permission(auth.uid(), 'admin:full_access')
  );

-- Note: The old user_roles table is kept for backward compatibility
-- but new permissions should be managed through user_permissions
