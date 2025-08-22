-- Fix RLS policies for family_documents table
-- Run this in your Supabase SQL editor

-- First, check if any policies exist
SELECT policyname FROM pg_policies WHERE tablename = 'family_documents';

-- Drop any existing policies (if any)
DROP POLICY IF EXISTS "Family members can view documents" ON family_documents;
DROP POLICY IF EXISTS "Family members can upload documents" ON family_documents;
DROP POLICY IF EXISTS "Family members can update documents" ON family_documents;
DROP POLICY IF EXISTS "Family members can delete documents" ON family_documents;

-- Create the proper RLS policies for family_documents

-- Family members and admins can view all documents
CREATE POLICY "Family members can view documents" ON family_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('family', 'admin')
    )
  );

-- Family members and admins can upload documents
CREATE POLICY "Family members can upload documents" ON family_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('family', 'admin')
    )
  );

-- Family members and admins can update documents
CREATE POLICY "Family members can update documents" ON family_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('family', 'admin')
    )
  );

-- Family members and admins can delete documents
CREATE POLICY "Family members can delete documents" ON family_documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('family', 'admin')
    )
  );

-- Verify the policies were created
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'family_documents'
ORDER BY policyname;
