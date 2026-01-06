-- Fix mutable search_path in all SECURITY DEFINER functions
-- This migration adds SET search_path = public, pg_temp to all functions
-- This prevents search_path injection attacks while allowing unqualified public schema references

-- =============================================
-- Role checking functions (from simplify_to_role_based.sql)
-- =============================================

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Returns NULL for unauthenticated users
  IF user_uuid IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Returns role string for authenticated users
  RETURN (
    SELECT role 
    FROM user_roles 
    WHERE user_id = user_uuid
  );
END;
$$;

-- Fix is_user_admin function
CREATE OR REPLACE FUNCTION is_user_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN get_user_role(user_uuid) = 'admin';
END;
$$;

-- Fix is_family_or_admin function
CREATE OR REPLACE FUNCTION is_family_or_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN get_user_role(user_uuid) IN ('family', 'admin');
END;
$$;

-- Fix is_family function
CREATE OR REPLACE FUNCTION is_family(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN get_user_role(user_uuid) = 'family';
END;
$$;

-- =============================================
-- Permission functions (from refactor_to_multi_role_system.sql)
-- =============================================

-- Fix has_permission function
CREATE OR REPLACE FUNCTION has_permission(user_uuid UUID, permission_name VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE user_id = user_uuid AND permission = permission_name
  );
END;
$$;

-- Fix can_access_family_bulletins function
CREATE OR REPLACE FUNCTION can_access_family_bulletins(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN has_permission(user_uuid, 'admin:full_access') OR
         has_permission(user_uuid, 'family:full_access') OR
         has_permission(user_uuid, 'family:view_bulletins');
END;
$$;

-- Fix can_create_family_bulletins function
CREATE OR REPLACE FUNCTION can_create_family_bulletins(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN has_permission(user_uuid, 'admin:full_access') OR
         has_permission(user_uuid, 'family:full_access') OR
         has_permission(user_uuid, 'family:create_bulletins');
END;
$$;

-- Fix can_edit_family_bulletins function
CREATE OR REPLACE FUNCTION can_edit_family_bulletins(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN has_permission(user_uuid, 'admin:full_access') OR
         has_permission(user_uuid, 'family:full_access') OR
         has_permission(user_uuid, 'family:edit_bulletins');
END;
$$;

-- Fix can_delete_family_bulletins function
CREATE OR REPLACE FUNCTION can_delete_family_bulletins(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN has_permission(user_uuid, 'admin:full_access') OR
         has_permission(user_uuid, 'family:full_access') OR
         has_permission(user_uuid, 'family:delete_bulletins');
END;
$$;

-- =============================================
-- Admin check function (from fix_rls_no_recursion.sql)
-- =============================================

-- Fix is_user_admin function (duplicate/replacement version)
-- Note: This replaces the one from simplify_to_role_based.sql
CREATE OR REPLACE FUNCTION is_user_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Use a direct query that bypasses RLS
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = user_uuid AND role = 'admin'
  );
END;
$$;

-- =============================================
-- User metadata function (from update_user_metadata.sql)
-- =============================================

-- Fix update_user_metadata function
CREATE OR REPLACE FUNCTION update_user_metadata(
  user_uuid UUID,
  first_name TEXT,
  last_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Update the user metadata in auth.users
  UPDATE auth.users 
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{first_name}',
    to_jsonb(first_name)
  )
  WHERE id = user_uuid;
  
  UPDATE auth.users 
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{last_name}',
    to_jsonb(last_name)
  )
  WHERE id = user_uuid;
  
  RETURN FOUND;
END;
$$;

-- =============================================
-- Storage functions (from setup_family_documents_storage.sql)
-- =============================================

-- Fix get_document_download_url function
CREATE OR REPLACE FUNCTION get_document_download_url(file_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- Fix get_document_upload_url function
CREATE OR REPLACE FUNCTION get_document_upload_url(file_path TEXT, file_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- Fix cleanup_document_storage function
CREATE OR REPLACE FUNCTION cleanup_document_storage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Delete the file from storage when the database record is deleted
  DELETE FROM storage.objects 
  WHERE bucket_id = 'family-documents' AND name = OLD.file_path;
  
  RETURN OLD;
END;
$$;

-- =============================================
-- Trigger functions (from create_family_bulletins.sql and create_family_documents.sql)
-- =============================================

-- Fix set_created_by function (for family_bulletins)
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$;

-- Fix set_document_created_by function (for family_documents)
CREATE OR REPLACE FUNCTION set_document_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$;

-- Fix update_document_updated_at function
CREATE OR REPLACE FUNCTION update_document_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

