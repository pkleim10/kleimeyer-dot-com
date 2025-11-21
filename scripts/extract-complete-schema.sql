-- Complete Schema Extraction for Medication Tables
-- This will give you everything you need to recreate the tables

-- ============================================
-- 1. TABLE STRUCTURES
-- ============================================

-- medication_groups table structure
SELECT 
    'medication_groups' as table_name,
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'character varying' THEN 'VARCHAR(' || COALESCE(character_maximum_length::text, '') || ')'
        WHEN data_type = 'character' THEN 'CHAR(' || COALESCE(character_maximum_length::text, '') || ')'
        WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
        WHEN data_type = 'USER-DEFINED' THEN udt_name
        ELSE UPPER(data_type)
    END as full_data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'medication_groups'
ORDER BY ordinal_position;

-- medications table structure
SELECT 
    'medications' as table_name,
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'character varying' THEN 'VARCHAR(' || COALESCE(character_maximum_length::text, '') || ')'
        WHEN data_type = 'character' THEN 'CHAR(' || COALESCE(character_maximum_length::text, '') || ')'
        WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
        WHEN data_type = 'USER-DEFINED' THEN udt_name
        ELSE UPPER(data_type)
    END as full_data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'medications'
ORDER BY ordinal_position;

-- medication_logs table structure
SELECT 
    'medication_logs' as table_name,
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'character varying' THEN 'VARCHAR(' || COALESCE(character_maximum_length::text, '') || ')'
        WHEN data_type = 'character' THEN 'CHAR(' || COALESCE(character_maximum_length::text, '') || ')'
        WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
        WHEN data_type = 'USER-DEFINED' THEN udt_name
        ELSE UPPER(data_type)
    END as full_data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'medication_logs'
ORDER BY ordinal_position;

-- ============================================
-- 2. RLS POLICIES
-- ============================================

SELECT 
    tablename,
    policyname,
    cmd as command,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('medication_groups', 'medications', 'medication_logs')
ORDER BY tablename, policyname;

-- ============================================
-- 3. INDEXES
-- ============================================

SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('medication_groups', 'medications', 'medication_logs')
ORDER BY tablename, indexname;

-- ============================================
-- 4. CONSTRAINTS (Primary Keys, Foreign Keys, Unique, Check)
-- ============================================

SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
LEFT JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('medication_groups', 'medications', 'medication_logs')
ORDER BY tc.table_name, tc.constraint_type;

-- ============================================
-- 5. TRIGGERS (for updated_at, etc.)
-- ============================================

SELECT
    event_object_table as table_name,
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('medication_groups', 'medications', 'medication_logs')
ORDER BY event_object_table, trigger_name;

