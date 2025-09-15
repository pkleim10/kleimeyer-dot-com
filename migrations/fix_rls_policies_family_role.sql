-- Fix RLS policies to include 'family' role for admin access
-- Drop existing policies
DROP POLICY IF EXISTS "Contributors and admins can view all bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Contributors and admins can create bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Contributors and admins can update bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Contributors and admins can delete bulletins" ON family_bulletins;

-- Recreate policies with 'family' role included
-- Allow contributors, admins, and family to view all bulletins (including inactive)
CREATE POLICY "Contributors, admins, and family can view all bulletins" ON family_bulletins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('contributor', 'admin', 'family')
    )
  );

-- Allow contributors, admins, and family to create bulletins
CREATE POLICY "Contributors, admins, and family can create bulletins" ON family_bulletins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('contributor', 'admin', 'family')
    )
  );

-- Allow contributors, admins, and family to update bulletins
CREATE POLICY "Contributors, admins, and family can update bulletins" ON family_bulletins
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('contributor', 'admin', 'family')
    )
  );

-- Allow contributors, admins, and family to delete bulletins
CREATE POLICY "Contributors, admins, and family can delete bulletins" ON family_bulletins
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('contributor', 'admin', 'family')
    )
  );
