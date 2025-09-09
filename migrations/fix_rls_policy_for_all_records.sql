-- Fix RLS policy to allow viewing all records (let API handle filtering)
-- This allows the API to control whether to show expired records or not

-- Drop the existing policy that filters by expiration
DROP POLICY IF EXISTS "Anyone can view non-expired bulletins" ON family_bulletins;

-- Create a new policy that allows viewing all records for authenticated users
-- The API will handle filtering based on the status parameter
CREATE POLICY "Authenticated users can view all bulletins" ON family_bulletins
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

-- Verify the policy was created
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'family_bulletins' AND cmd = 'SELECT'
ORDER BY policyname;
