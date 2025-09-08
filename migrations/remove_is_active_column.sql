-- Remove is_active column from family_bulletins table
-- This column is no longer needed as we've simplified the system to only use expiration dates

-- First, drop the RLS policy that depends on is_active
DROP POLICY IF EXISTS "Anyone can view active bulletins" ON family_bulletins;

-- Create a new policy that doesn't depend on is_active
-- This policy allows all authenticated users to view non-expired bulletins
CREATE POLICY "Anyone can view non-expired bulletins" ON family_bulletins
  FOR SELECT USING (
    expires_at IS NULL OR expires_at > NOW()
  );

-- Drop any indexes that might reference the is_active column
DROP INDEX IF EXISTS idx_family_bulletins_active;

-- Remove the is_active column
ALTER TABLE family_bulletins DROP COLUMN IF EXISTS is_active;

-- Verify the column has been removed
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'family_bulletins' 
AND column_name = 'is_active';
