-- Extract Medication Tables Schema and RLS Policies
-- Run this in Supabase SQL Editor to get the complete structure

-- 1. Get table structure for medication_groups
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'medication_groups'
ORDER BY ordinal_position;

-- 2. Get table structure for medications
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'medications'
ORDER BY ordinal_position;

-- 3. Get table structure for medication_logs
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'medication_logs'
ORDER BY ordinal_position;

-- 4. Get all RLS policies for medication tables
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
WHERE schemaname = 'public'
  AND tablename IN ('medication_groups', 'medications', 'medication_logs')
ORDER BY tablename, policyname;

-- 5. Get foreign key constraints
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('medication_groups', 'medications', 'medication_logs');

-- 6. Get indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('medication_groups', 'medications', 'medication_logs')
ORDER BY tablename, indexname;

-- 7. Get constraints (unique, check, etc.)
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    tc.is_deferrable,
    tc.initially_deferred
FROM information_schema.table_constraints AS tc
LEFT JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('medication_groups', 'medications', 'medication_logs')
ORDER BY tc.table_name, tc.constraint_type;

-- 8. Get complete CREATE TABLE statements (PostgreSQL specific)
SELECT 
    'medication_groups' as table_name,
    pg_get_tabledef('medication_groups') as table_definition
UNION ALL
SELECT 
    'medications' as table_name,
    pg_get_tabledef('medications') as table_definition
UNION ALL
SELECT 
    'medication_logs' as table_name,
    pg_get_tabledef('medication_logs') as table_definition;

-- Alternative: Get full table definition using pg_dump style
-- Note: This might not work in Supabase SQL Editor, but you can try:
SELECT 
    'CREATE TABLE ' || table_name || ' (' || 
    string_agg(
        column_name || ' ' || 
        CASE 
            WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
            WHEN data_type = 'character' THEN 'CHAR(' || character_maximum_length || ')'
            WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
            ELSE UPPER(data_type)
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ', '
        ORDER BY ordinal_position
    ) || ');' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('medication_groups', 'medications', 'medication_logs')
GROUP BY table_name;

