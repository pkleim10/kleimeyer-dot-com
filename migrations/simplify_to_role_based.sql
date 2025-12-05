-- =============================================
-- Simplify Permission System to Role-Based
-- =============================================
-- This migration converts from granular permission system to simple 3-role system
-- Roles: member (default), family, admin
-- Includes support for unauthenticated users (implicit role)

-- =============================================
-- STEP 1: Ensure user_roles table exists
-- =============================================
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('member', 'family', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- =============================================
-- STEP 2: Migrate existing users to roles
-- =============================================
-- Set default role to 'member' for all users without a role
INSERT INTO user_roles (user_id, role)
SELECT id, 'member'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_roles)
ON CONFLICT (user_id) DO NOTHING;

-- Migrate existing Admins: Keep current admin users as 'admin'
-- Check both user_roles and user_permissions for admin status
UPDATE user_roles
SET role = 'admin'
WHERE user_id IN (
  SELECT DISTINCT user_id 
  FROM user_permissions 
  WHERE permission = 'admin:full_access'
)
OR user_id IN (
  SELECT DISTINCT user_id 
  FROM user_roles 
  WHERE role = 'admin'
);

-- Migrate existing Family users: Keep as 'family'
-- Check both user_roles and user_permissions for family status
UPDATE user_roles
SET role = 'family'
WHERE user_id IN (
  SELECT DISTINCT user_id 
  FROM user_permissions 
  WHERE permission = 'family:full_access'
)
OR user_id IN (
  SELECT DISTINCT user_id 
  FROM user_roles 
  WHERE role = 'family'
)
AND role != 'admin'; -- Don't downgrade admins

-- Set all others to 'member' (should already be default, but ensure)
UPDATE user_roles
SET role = 'member'
WHERE role NOT IN ('admin', 'family');

-- =============================================
-- STEP 3: Create helper function for role checks
-- =============================================
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS VARCHAR(20) AS $$
BEGIN
  -- Returns NULL for unauthenticated users
  IF user_uuid IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Returns role string for authenticated users
  RETURN (
    SELECT role 
    FROM user_roles 
    WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role(user_uuid) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is family or admin
CREATE OR REPLACE FUNCTION is_family_or_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role(user_uuid) IN ('family', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is family
CREATE OR REPLACE FUNCTION is_family(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role(user_uuid) = 'family';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 4: Update RLS policies for Recipes
-- =============================================
-- Recipes: View - All users (authenticated and unauthenticated)
DROP POLICY IF EXISTS "Anyone can view recipes" ON recipes;
CREATE POLICY "Anyone can view recipes" ON recipes
  FOR SELECT USING (true);

-- Recipes: Add/Edit/Delete - Family or Admin (authenticated only)
DROP POLICY IF EXISTS "Family or admin can create recipes" ON recipes;
CREATE POLICY "Family or admin can create recipes" ON recipes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Family or admin can update recipes" ON recipes;
CREATE POLICY "Family or admin can update recipes" ON recipes
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Family or admin can delete recipes" ON recipes;
CREATE POLICY "Family or admin can delete recipes" ON recipes
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

-- =============================================
-- STEP 5: Update RLS policies for Recipe Categories
-- =============================================
-- Recipe Categories: View - All users (authenticated and unauthenticated)
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
CREATE POLICY "Anyone can view categories" ON categories
  FOR SELECT USING (true);

-- Recipe Categories: Add/Edit/Delete - Family or Admin (authenticated only)
DROP POLICY IF EXISTS "Family or admin can create categories" ON categories;
CREATE POLICY "Family or admin can create categories" ON categories
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Family or admin can update categories" ON categories;
CREATE POLICY "Family or admin can update categories" ON categories
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Family or admin can delete categories" ON categories;
CREATE POLICY "Family or admin can delete categories" ON categories
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

-- =============================================
-- STEP 6: Update RLS policies for Family Bulletins
-- =============================================
-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view active bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Contributors and admins can view all bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Contributors and admins can create bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Contributors and admins can update bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Contributors and admins can delete bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Authenticated users can view all bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Users with view permission can see all bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Users with create permission can create bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Users with edit permission can update bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Users with delete permission can delete bulletins" ON family_bulletins;

-- Family Bulletins: All operations - Family or Admin (authenticated only)
CREATE POLICY "Family or admin can view bulletins" ON family_bulletins
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

CREATE POLICY "Family or admin can create bulletins" ON family_bulletins
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

CREATE POLICY "Family or admin can update bulletins" ON family_bulletins
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

CREATE POLICY "Family or admin can delete bulletins" ON family_bulletins
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

-- =============================================
-- STEP 7: Update RLS policies for Family Contacts
-- =============================================
-- Drop all existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read family contacts" ON family_contacts;
DROP POLICY IF EXISTS "Allow admins to manage family contacts" ON family_contacts;
DROP POLICY IF EXISTS "Users with family permissions can view contacts" ON family_contacts;
DROP POLICY IF EXISTS "Users with family permissions can create contacts" ON family_contacts;
DROP POLICY IF EXISTS "Users with family permissions can update contacts" ON family_contacts;
DROP POLICY IF EXISTS "Users with family permissions can delete contacts" ON family_contacts;

-- Family Contacts: All operations - Family or Admin (authenticated only)
CREATE POLICY "Family or admin can view contacts" ON family_contacts
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

CREATE POLICY "Family or admin can create contacts" ON family_contacts
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

CREATE POLICY "Family or admin can update contacts" ON family_contacts
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

CREATE POLICY "Family or admin can delete contacts" ON family_contacts
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

-- =============================================
-- STEP 8: Update RLS policies for Family Documents
-- =============================================
-- Drop all existing policies
DROP POLICY IF EXISTS "Family members can view documents" ON family_documents;
DROP POLICY IF EXISTS "Family members can upload documents" ON family_documents;
DROP POLICY IF EXISTS "Family members can update documents" ON family_documents;
DROP POLICY IF EXISTS "Family members can delete documents" ON family_documents;

-- Family Documents: All operations - Family or Admin (authenticated only)
CREATE POLICY "Family or admin can view documents" ON family_documents
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

CREATE POLICY "Family or admin can upload documents" ON family_documents
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

CREATE POLICY "Family or admin can update documents" ON family_documents
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

CREATE POLICY "Family or admin can delete documents" ON family_documents
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

-- Document Categories: View - Family or Admin, Manage - Admin only
DROP POLICY IF EXISTS "Anyone can view categories" ON document_categories;
DROP POLICY IF EXISTS "Family members can view categories" ON document_categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON document_categories;
DROP POLICY IF EXISTS "Admins can create categories" ON document_categories;
DROP POLICY IF EXISTS "Admins can update categories" ON document_categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON document_categories;

CREATE POLICY "Family or admin can view document categories" ON document_categories
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

CREATE POLICY "Admins can manage document categories" ON document_categories
  FOR ALL USING (
    auth.uid() IS NOT NULL AND is_user_admin(auth.uid())
  );

-- =============================================
-- STEP 9: Update RLS policies for Medications
-- =============================================
-- Drop all existing medication_groups policies
DROP POLICY IF EXISTS "Users can view shared medication groups" ON medication_groups;
DROP POLICY IF EXISTS "Users can create shared medication groups" ON medication_groups;
DROP POLICY IF EXISTS "Users can update shared medication groups" ON medication_groups;
DROP POLICY IF EXISTS "Users can delete shared medication groups" ON medication_groups;
DROP POLICY IF EXISTS "Family or admin can view shared medication groups" ON medication_groups;
DROP POLICY IF EXISTS "Family or admin can create shared medication groups" ON medication_groups;
DROP POLICY IF EXISTS "Family or admin can update shared medication groups" ON medication_groups;
DROP POLICY IF EXISTS "Family or admin can delete shared medication groups" ON medication_groups;

-- Shared medication groups: Family or Admin (authenticated only)
CREATE POLICY "Family or admin can view shared medication groups" ON medication_groups
  FOR SELECT USING (
    accessible_by = 'shared' AND 
    auth.uid() IS NOT NULL AND 
    is_family_or_admin(auth.uid())
  );

CREATE POLICY "Family or admin can create shared medication groups" ON medication_groups
  FOR INSERT WITH CHECK (
    accessible_by = 'shared' AND 
    auth.uid() IS NOT NULL AND 
    is_family_or_admin(auth.uid())
  );

CREATE POLICY "Family or admin can update shared medication groups" ON medication_groups
  FOR UPDATE USING (
    accessible_by = 'shared' AND 
    auth.uid() IS NOT NULL AND 
    is_family_or_admin(auth.uid())
  );

CREATE POLICY "Family or admin can delete shared medication groups" ON medication_groups
  FOR DELETE USING (
    accessible_by = 'shared' AND 
    auth.uid() IS NOT NULL AND 
    is_family_or_admin(auth.uid())
  );

-- Personal medication groups: User who created them (authenticated only)
DROP POLICY IF EXISTS "Users can view their own medication groups" ON medication_groups;
DROP POLICY IF EXISTS "Users can create their own medication groups" ON medication_groups;
DROP POLICY IF EXISTS "Users can update their own medication groups" ON medication_groups;
DROP POLICY IF EXISTS "Users can delete their own medication groups" ON medication_groups;

CREATE POLICY "Users can view their own medication groups" ON medication_groups
  FOR SELECT USING (
    accessible_by = 'only_me' AND 
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );

CREATE POLICY "Users can create their own medication groups" ON medication_groups
  FOR INSERT WITH CHECK (
    accessible_by = 'only_me' AND 
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );

CREATE POLICY "Users can update their own medication groups" ON medication_groups
  FOR UPDATE USING (
    accessible_by = 'only_me' AND 
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );

CREATE POLICY "Users can delete their own medication groups" ON medication_groups
  FOR DELETE USING (
    accessible_by = 'only_me' AND 
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );

-- Medications: Access based on group ownership
-- Drop all existing medications policies
DROP POLICY IF EXISTS "Users can view medications in their own groups" ON medications;
DROP POLICY IF EXISTS "Users can create medications in their own groups" ON medications;
DROP POLICY IF EXISTS "Users can create medications in shared groups" ON medications;
DROP POLICY IF EXISTS "Users can update their own medications" ON medications;
DROP POLICY IF EXISTS "Users can delete their own medications" ON medications;
DROP POLICY IF EXISTS "Family or admin can view medications in shared groups" ON medications;
DROP POLICY IF EXISTS "Family or admin can create medications in shared groups" ON medications;
DROP POLICY IF EXISTS "Family or admin can update medications in shared groups" ON medications;
DROP POLICY IF EXISTS "Family or admin can delete medications in shared groups" ON medications;
DROP POLICY IF EXISTS "Users can update medications in their own groups" ON medications;
DROP POLICY IF EXISTS "Users can delete medications in their own groups" ON medications;

-- View medications in personal groups (user owns the group)
CREATE POLICY "Users can view medications in their own groups" ON medications
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM medication_groups
      WHERE medication_groups.id = medications.group_id
      AND medication_groups.user_id = auth.uid()
      AND medication_groups.accessible_by = 'only_me'
    )
  );

-- View medications in shared groups (Family or Admin)
CREATE POLICY "Family or admin can view medications in shared groups" ON medications
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    is_family_or_admin(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM medication_groups
      WHERE medication_groups.id = medications.group_id
      AND medication_groups.accessible_by = 'shared'
    )
  );

-- Create medications in personal groups
CREATE POLICY "Users can create medications in their own groups" ON medications
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM medication_groups
      WHERE medication_groups.id = medications.group_id
      AND medication_groups.user_id = auth.uid()
      AND medication_groups.accessible_by = 'only_me'
    )
  );

-- Create medications in shared groups (Family or Admin)
CREATE POLICY "Family or admin can create medications in shared groups" ON medications
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    is_family_or_admin(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM medication_groups
      WHERE medication_groups.id = medications.group_id
      AND medication_groups.accessible_by = 'shared'
    )
  );

-- Update medications in personal groups
CREATE POLICY "Users can update medications in their own groups" ON medications
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM medication_groups
      WHERE medication_groups.id = medications.group_id
      AND medication_groups.user_id = auth.uid()
      AND medication_groups.accessible_by = 'only_me'
    )
  );

-- Update medications in shared groups (Family or Admin)
CREATE POLICY "Family or admin can update medications in shared groups" ON medications
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    is_family_or_admin(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM medication_groups
      WHERE medication_groups.id = medications.group_id
      AND medication_groups.accessible_by = 'shared'
    )
  );

-- Delete medications in personal groups
CREATE POLICY "Users can delete medications in their own groups" ON medications
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM medication_groups
      WHERE medication_groups.id = medications.group_id
      AND medication_groups.user_id = auth.uid()
      AND medication_groups.accessible_by = 'only_me'
    )
  );

-- Delete medications in shared groups (Family or Admin)
CREATE POLICY "Family or admin can delete medications in shared groups" ON medications
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    is_family_or_admin(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM medication_groups
      WHERE medication_groups.id = medications.group_id
      AND medication_groups.accessible_by = 'shared'
    )
  );

-- =============================================
-- STEP 10: Update RLS policies for Photo Albums
-- =============================================
-- Drop all existing policies
DROP POLICY IF EXISTS "Albums select" ON photo_albums;
DROP POLICY IF EXISTS "Albums insert" ON photo_albums;
DROP POLICY IF EXISTS "Albums update" ON photo_albums;
DROP POLICY IF EXISTS "Albums delete" ON photo_albums;

-- Photo Albums: All operations - Family or Admin (authenticated only)
CREATE POLICY "Family or admin can view photo albums" ON photo_albums
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

CREATE POLICY "Family or admin can create photo albums" ON photo_albums
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

CREATE POLICY "Family or admin can update photo albums" ON photo_albums
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

CREATE POLICY "Family or admin can delete photo albums" ON photo_albums
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND is_family_or_admin(auth.uid())
  );

-- =============================================
-- STEP 11: Update RLS policies for user_roles
-- =============================================
-- Drop all existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read user_roles" ON user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to manage user_roles" ON user_roles;

-- Only admins can manage user_roles
CREATE POLICY "Admins can view user roles" ON user_roles
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND is_user_admin(auth.uid())
  );

CREATE POLICY "Admins can manage user roles" ON user_roles
  FOR ALL USING (
    auth.uid() IS NOT NULL AND is_user_admin(auth.uid())
  );

-- =============================================
-- STEP 12: Remove Thanksgiving Checklist
-- =============================================
-- Drop RLS policies
DROP POLICY IF EXISTS "Users with family permissions can view checklist" ON thanksgiving_checklist;
DROP POLICY IF EXISTS "Users with family permissions can create checklist" ON thanksgiving_checklist;
DROP POLICY IF EXISTS "Users with family permissions can update checklist" ON thanksgiving_checklist;
DROP POLICY IF EXISTS "Users with family permissions can delete checklist" ON thanksgiving_checklist;

-- Drop triggers
DROP TRIGGER IF EXISTS update_thanksgiving_checklist_updated_at ON thanksgiving_checklist;

-- Drop table
DROP TABLE IF EXISTS thanksgiving_checklist CASCADE;

-- =============================================
-- STEP 13: Create updated_at trigger for user_roles
-- =============================================
CREATE OR REPLACE FUNCTION update_user_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_roles_updated_at();

-- =============================================
-- VERIFICATION
-- =============================================
-- After running this migration, verify:
-- 1. All users have a role (member, family, or admin)
-- 2. Existing admins remain as admin
-- 3. Existing family users remain as family
-- 4. All others are set to member
-- 5. RLS policies are working correctly
-- 6. Thanksgiving checklist table is removed

