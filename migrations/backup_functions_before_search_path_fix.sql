-- Backup script for all SECURITY DEFINER functions before fixing search_path
-- Run this in Supabase SQL Editor BEFORE running fix_all_mutable_search_path.sql
-- This will output the current function definitions that you can save

-- =============================================
-- Role checking functions
-- =============================================

-- Backup get_user_role
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'get_user_role' AND pronamespace = 'public'::regnamespace;

-- Backup is_user_admin (may have multiple versions)
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'is_user_admin' AND pronamespace = 'public'::regnamespace;

-- Backup is_family_or_admin
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'is_family_or_admin' AND pronamespace = 'public'::regnamespace;

-- Backup is_family
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'is_family' AND pronamespace = 'public'::regnamespace;

-- =============================================
-- Permission functions
-- =============================================

-- Backup has_permission
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'has_permission' AND pronamespace = 'public'::regnamespace;

-- Backup can_access_family_bulletins
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'can_access_family_bulletins' AND pronamespace = 'public'::regnamespace;

-- Backup can_create_family_bulletins
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'can_create_family_bulletins' AND pronamespace = 'public'::regnamespace;

-- Backup can_edit_family_bulletins
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'can_edit_family_bulletins' AND pronamespace = 'public'::regnamespace;

-- Backup can_delete_family_bulletins
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'can_delete_family_bulletins' AND pronamespace = 'public'::regnamespace;

-- =============================================
-- User metadata function
-- =============================================

-- Backup update_user_metadata
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'update_user_metadata' AND pronamespace = 'public'::regnamespace;

-- =============================================
-- Storage functions
-- =============================================

-- Backup get_document_download_url
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'get_document_download_url' AND pronamespace = 'public'::regnamespace;

-- Backup get_document_upload_url
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'get_document_upload_url' AND pronamespace = 'public'::regnamespace;

-- Backup cleanup_document_storage
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'cleanup_document_storage' AND pronamespace = 'public'::regnamespace;

-- =============================================
-- Trigger functions
-- =============================================

-- Backup set_created_by
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'set_created_by' AND pronamespace = 'public'::regnamespace;

-- Backup set_document_created_by
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'set_document_created_by' AND pronamespace = 'public'::regnamespace;

-- Backup update_document_updated_at
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'update_document_updated_at' AND pronamespace = 'public'::regnamespace;

-- =============================================
-- Alternative: Get ALL functions at once
-- =============================================

-- This query gets all SECURITY DEFINER functions in the public schema
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND prosecdef = true  -- SECURITY DEFINER functions
ORDER BY proname;

