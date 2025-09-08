-- Fix RLS policies for family_bulletins table to allow family members to create bulletins
-- Run this in your Supabase SQL editor

-- Drop existing create policy
DROP POLICY IF EXISTS "Contributors and admins can create bulletins" ON family_bulletins;

-- Create new policy that allows family members, contributors, and admins to create bulletins
CREATE POLICY "Family members, contributors and admins can create bulletins" ON family_bulletins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('family', 'contributor', 'admin')
    )
  );

-- Verify the policy was created
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'family_bulletins' AND cmd = 'INSERT'
ORDER BY policyname;

