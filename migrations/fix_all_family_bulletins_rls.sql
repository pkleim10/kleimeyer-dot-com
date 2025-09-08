-- Fix ALL RLS policies for family_bulletins table to include family role
-- Run this in your Supabase SQL editor

-- Drop existing policies
DROP POLICY IF EXISTS "Contributors and admins can create bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Contributors and admins can update bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Contributors and admins can delete bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Contributors and admins can view all bulletins" ON family_bulletins;

-- Create new policies that include family role

-- Allow family members, contributors, and admins to view all bulletins (including inactive)
CREATE POLICY "Family members, contributors and admins can view all bulletins" ON family_bulletins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('family', 'contributor', 'admin')
    )
  );

-- Allow family members, contributors, and admins to create bulletins
CREATE POLICY "Family members, contributors and admins can create bulletins" ON family_bulletins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('family', 'contributor', 'admin')
    )
  );

-- Allow family members, contributors, and admins to update bulletins
CREATE POLICY "Family members, contributors and admins can update bulletins" ON family_bulletins
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('family', 'contributor', 'admin')
    )
  );

-- Allow family members, contributors, and admins to delete bulletins
CREATE POLICY "Family members, contributors and admins can delete bulletins" ON family_bulletins
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('family', 'contributor', 'admin')
    )
  );

-- Verify all policies were created
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'family_bulletins'
ORDER BY cmd, policyname;

