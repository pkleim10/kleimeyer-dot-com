-- Extract RLS Policies for Medication Tables
-- Run this in Supabase SQL Editor

-- Get all RLS policies with full details
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('medication_groups', 'medications', 'medication_logs')
ORDER BY tablename, policyname;

-- Get the actual policy creation SQL (if you want to recreate them)
SELECT 
    'CREATE POLICY "' || policyname || '" ON ' || schemaname || '.' || tablename ||
    ' FOR ' || cmd ||
    CASE 
        WHEN permissive = 'PERMISSIVE' THEN ' USING (' || qual || ')'
        ELSE ''
    END ||
    CASE 
        WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')'
        ELSE ''
    END || ';' as policy_sql
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('medication_groups', 'medications', 'medication_logs')
ORDER BY tablename, policyname;

