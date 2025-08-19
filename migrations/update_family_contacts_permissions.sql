-- Update family_contacts RLS policies to allow contributors to manage contacts
-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read family contacts" ON family_contacts;
DROP POLICY IF EXISTS "Allow admins to manage family contacts" ON family_contacts;

-- Create new policies that allow contributors to manage contacts
-- Allow all authenticated users to read family contacts
CREATE POLICY "Allow authenticated users to read family contacts" ON family_contacts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow contributors and admins to manage family contacts
CREATE POLICY "Allow contributors and admins to manage family contacts" ON family_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('contributor', 'admin')
    )
  );
