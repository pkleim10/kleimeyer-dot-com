-- Clean up ALL RLS policies for family_bulletins table
-- This will remove all existing policies and create a simple one that allows all authenticated users to view all records

-- Drop ALL existing policies for family_bulletins table
DROP POLICY IF EXISTS "Anyone can view active bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Anyone can view non-expired bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Contributors and admins can view all bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Family members, contributors and admins can view all bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Authenticated users can view all bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Contributors and admins can create bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Family members, contributors and admins can create bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Contributors and admins can update bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Family members, contributors and admins can update bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Contributors and admins can delete bulletins" ON family_bulletins;
DROP POLICY IF EXISTS "Family members, contributors and admins can delete bulletins" ON family_bulletins;

-- Create simple policies that allow all authenticated users to perform all operations
-- This lets the API handle all filtering logic

-- Allow all authenticated users to view all bulletins (no filtering)
CREATE POLICY "All authenticated users can view all bulletins" ON family_bulletins
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow all authenticated users to create bulletins
CREATE POLICY "All authenticated users can create bulletins" ON family_bulletins
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow all authenticated users to update bulletins
CREATE POLICY "All authenticated users can update bulletins" ON family_bulletins
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Allow all authenticated users to delete bulletins
CREATE POLICY "All authenticated users can delete bulletins" ON family_bulletins
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Verify all policies were created correctly
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'family_bulletins'
ORDER BY cmd, policyname;
