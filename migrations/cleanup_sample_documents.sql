-- Clean up sample documents that reference non-existent files
-- Run this in your Supabase SQL editor

-- Remove the sample documents that were inserted for testing
DELETE FROM family_documents 
WHERE filename IN (
  'sample-medical-record.pdf',
  'family-photo-2024.jpg', 
  'insurance-policy.pdf'
);

-- Verify the cleanup
SELECT COUNT(*) as remaining_documents FROM family_documents;
