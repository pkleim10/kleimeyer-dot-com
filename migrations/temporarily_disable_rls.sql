-- Temporarily disable RLS for testing
-- Run this in your Supabase SQL editor

-- Disable RLS on family_documents table
ALTER TABLE family_documents DISABLE ROW LEVEL SECURITY;

-- Disable RLS on document_categories table  
ALTER TABLE document_categories DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('family_documents', 'document_categories')
ORDER BY tablename;
