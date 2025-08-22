-- Setup family-documents storage bucket and RLS policies
-- Run this in your Supabase SQL editor

-- 1. Create the storage bucket (if it doesn't exist)
-- Note: This might need to be done manually in the Supabase dashboard
-- Go to Storage > Create bucket > Name: family-documents, Public: false

-- 2. Enable RLS on the storage bucket
-- This is typically done automatically when you create a private bucket

-- 3. Create RLS policies for the family-documents bucket

-- Policy: Family members and admins can view/download documents
CREATE POLICY "Family members can view documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'family-documents' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('family', 'admin')
  )
);

-- Policy: Family members and admins can upload documents
CREATE POLICY "Family members can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'family-documents' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('family', 'admin')
  )
);

-- Policy: Family members and admins can update document metadata
CREATE POLICY "Family members can update documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'family-documents' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('family', 'admin')
  )
);

-- Policy: Family members and admins can delete documents
CREATE POLICY "Family members can delete documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'family-documents' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('family', 'admin')
  )
);

-- 4. Create a function to get signed URLs for document downloads
CREATE OR REPLACE FUNCTION get_document_download_url(file_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  download_url TEXT;
BEGIN
  -- Check if user has family role
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('family', 'admin')
  ) THEN
    RAISE EXCEPTION 'Access denied - family role required';
  END IF;

  -- Generate signed URL for download
  SELECT storage.sign(
    'family-documents',
    file_path,
    '1 hour',
    'GET'
  ) INTO download_url;

  RETURN download_url;
END;
$$;

-- 5. Create a function to get signed URLs for document uploads
CREATE OR REPLACE FUNCTION get_document_upload_url(file_path TEXT, file_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  upload_url TEXT;
BEGIN
  -- Check if user has family role
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('family', 'admin')
  ) THEN
    RAISE EXCEPTION 'Access denied - family role required';
  END IF;

  -- Generate signed URL for upload
  SELECT storage.sign(
    'family-documents',
    file_path,
    '1 hour',
    'POST',
    '{"Content-Type": "' || file_type || '"}'
  ) INTO upload_url;

  RETURN upload_url;
END;
$$;

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;

-- 7. Create indexes for better performance (if not already created)
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_id ON storage.objects(bucket_id);
CREATE INDEX IF NOT EXISTS idx_storage_objects_name ON storage.objects(name);

-- 8. Optional: Create a view for easier document management
CREATE OR REPLACE VIEW family_documents_view AS
SELECT 
  fd.*,
  so.name as storage_name,
  so.metadata as storage_metadata,
  so.updated_at as storage_updated_at
FROM family_documents fd
LEFT JOIN storage.objects so ON so.name = fd.file_path AND so.bucket_id = 'family-documents'
WHERE EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid() AND role IN ('family', 'admin')
);

-- Grant access to the view
GRANT SELECT ON family_documents_view TO authenticated;

-- 9. Create a trigger to automatically clean up storage when documents are deleted
CREATE OR REPLACE FUNCTION cleanup_document_storage()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the file from storage when the database record is deleted
  DELETE FROM storage.objects 
  WHERE bucket_id = 'family-documents' AND name = OLD.file_path;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS cleanup_document_storage_trigger ON family_documents;
CREATE TRIGGER cleanup_document_storage_trigger
  BEFORE DELETE ON family_documents
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_document_storage();

-- 10. Add some helpful comments
COMMENT ON TABLE family_documents IS 'Family document repository - accessible only to family members and admins';
COMMENT ON TABLE document_categories IS 'Categories for organizing family documents';
COMMENT ON FUNCTION get_document_download_url(TEXT) IS 'Get signed URL for downloading a document (family role required)';
COMMENT ON FUNCTION get_document_upload_url(TEXT, TEXT) IS 'Get signed URL for uploading a document (family role required)';
COMMENT ON VIEW family_documents_view IS 'View combining document metadata with storage information';

-- 11. Verify the setup
DO $$
BEGIN
  RAISE NOTICE 'Family documents storage setup complete!';
  RAISE NOTICE 'Make sure to create the "family-documents" bucket in the Supabase dashboard if it does not exist.';
  RAISE NOTICE 'Bucket should be set to private (not public).';
END $$;
