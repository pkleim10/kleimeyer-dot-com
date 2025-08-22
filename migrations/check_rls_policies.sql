-- Check RLS policies for family documents and categories
-- Run this in your Supabase SQL editor

-- Check policies on family_documents table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'family_documents'
ORDER BY policyname;

-- Check policies on document_categories table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'document_categories'
ORDER BY policyname;

-- Check if RLS is enabled on both tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('family_documents', 'document_categories')
ORDER BY tablename;
