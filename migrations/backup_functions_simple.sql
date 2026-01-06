-- Simple backup query - easier to extract results
-- Run this in Supabase SQL Editor and export/download results

-- Option 1: Just function definitions (easiest to copy)
SELECT pg_get_functiondef(oid) as function_sql
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND prosecdef = true
ORDER BY proname;

-- Option 2: With function names (for reference)
-- SELECT 
--     proname as function_name,
--     pg_get_functiondef(oid) as function_sql
-- FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace
--   AND prosecdef = true
-- ORDER BY proname;

