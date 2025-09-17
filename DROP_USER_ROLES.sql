-- =============================================
-- DROP USER_ROLES TABLE - LEGACY ROLE SYSTEM
-- =============================================
-- Run this SQL in the Supabase SQL Editor to completely remove the legacy role system
-- This will drop the user_roles table and all related objects

-- Drop RLS policies first
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Only admins can manage user roles" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to read user_roles" ON user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to manage user_roles" ON user_roles;

-- Drop indexes
DROP INDEX IF EXISTS idx_user_roles_user_id;

-- Drop functions that reference user_roles
DROP FUNCTION IF EXISTS get_user_role(UUID);
DROP FUNCTION IF EXISTS is_admin(UUID);
DROP FUNCTION IF EXISTS is_contributor(UUID);

-- Drop the table (CASCADE will handle any remaining dependencies)
DROP TABLE IF EXISTS user_roles CASCADE;

-- =============================================
-- VERIFICATION
-- =============================================
-- After running the above, verify the table is gone:
-- SELECT * FROM user_roles; -- This should return "relation does not exist"

-- =============================================
-- CLEANUP COMPLETE
-- =============================================
-- The legacy role system has been completely removed!
-- The system now uses only:
-- - user_permissions table for granular permissions
-- - has_permission() function for permission checks  
-- - RLS policies based on permissions
-- - New permission-based authorization in all APIs
