-- Enable Row Level Security on public tables
-- These tables have RLS policies defined but RLS was not enabled
-- This migration enables RLS to enforce the existing policies

-- Enable RLS on recipes table
-- Policies already exist from simplify_to_role_based.sql:
--   - "Anyone can view recipes" (public read)
--   - "Family or admin can create recipes" (authenticated write)
--   - "Family or admin can update recipes" (authenticated write)
--   - "Family or admin can delete recipes" (authenticated write)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on categories table
-- Policies already exist from simplify_to_role_based.sql:
--   - "Anyone can view categories" (public read)
--   - "Family or admin can create categories" (authenticated write)
--   - "Family or admin can update categories" (authenticated write)
--   - "Family or admin can delete categories" (authenticated write)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is enabled on user_roles table (idempotent)
-- Policies exist from fix_rls_no_recursion.sql:
--   - "Allow authenticated users to read user_roles"
--   - "Allow authenticated users to manage user_roles"
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

