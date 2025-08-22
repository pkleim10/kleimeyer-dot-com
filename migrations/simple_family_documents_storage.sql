-- Simple RLS policies for family-documents storage bucket
-- Run this in your Supabase SQL editor after creating the bucket

-- 1. Create the storage bucket manually in Supabase dashboard:
-- Go to Storage > Create bucket
-- Name: family-documents
-- Public: false (private)

-- 2. Basic RLS policies for family-documents bucket

-- Allow family members and admins to view/download documents
CREATE POLICY "Family members can view documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'family-documents' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('family', 'admin')
  )
);

-- Allow family members and admins to upload documents
CREATE POLICY "Family members can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'family-documents' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('family', 'admin')
  )
);

-- Allow family members and admins to update documents
CREATE POLICY "Family members can update documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'family-documents' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('family', 'admin')
  )
);

-- Allow family members and admins to delete documents
CREATE POLICY "Family members can delete documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'family-documents' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('family', 'admin')
  )
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
