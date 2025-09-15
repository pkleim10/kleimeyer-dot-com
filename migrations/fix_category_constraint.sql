-- Fix category constraint to include 'medical' category
-- Drop the existing constraint
ALTER TABLE family_bulletins DROP CONSTRAINT IF EXISTS family_bulletins_category_check;

-- Add the new constraint with 'medical' included
ALTER TABLE family_bulletins ADD CONSTRAINT family_bulletins_category_check 
  CHECK (category IN ('appointment', 'payment', 'website', 'general', 'medical'));
