-- Comprehensive backup of all SECURITY DEFINER functions
-- Run this in Supabase SQL Editor BEFORE running fix_all_mutable_search_path.sql
-- 
-- INSTRUCTIONS:
-- 1. Run this query
-- 2. Right-click on the results table → "Download as CSV" or "Copy as CSV"
-- 3. Open the CSV in a text editor
-- 4. Copy the "backup_sql" column content
-- 5. Save as function_backup_YYYY-MM-DD.sql

-- Get all SECURITY DEFINER functions with their full definitions
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition,
    '-- Function: ' || proname || E'\n' ||
    '-- Parameters: ' || pg_get_function_arguments(oid) || E'\n' ||
    '-- Return type: ' || pg_get_function_result(oid) || E'\n' ||
    pg_get_functiondef(oid) || E';\n\n' as backup_sql
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND prosecdef = true  -- Only SECURITY DEFINER functions
ORDER BY proname;

