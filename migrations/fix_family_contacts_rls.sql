-- Fix family_contacts RLS policies to allow only 'family' role to manage contacts
-- Based on user requirement: only 'family' role should be able to SELECT, INSERT, UPDATE, or DELETE bulletins

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read family contacts" ON family_contacts;
DROP POLICY IF EXISTS "Allow contributors and admins to manage family contacts" ON family_contacts;

-- Create new policies that allow only family role to manage contacts
-- Allow family role to read family contacts
CREATE POLICY "Allow family role to read family contacts" ON family_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'family'
    )
  );

-- Allow family role to insert family contacts
CREATE POLICY "Allow family role to insert family contacts" ON family_contacts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'family'
    )
  );

-- Allow family role to update family contacts
CREATE POLICY "Allow family role to update family contacts" ON family_contacts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'family'
    )
  );

-- Allow family role to delete family contacts
CREATE POLICY "Allow family role to delete family contacts" ON family_contacts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'family'
    )
  );

-- Verify the policies were created
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'family_contacts'
ORDER BY policyname;
