-- Add 'family' role to the user_roles check constraint
-- Run this in your Supabase SQL editor

-- First, let's see what the current constraint looks like
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'user_roles'::regclass AND contype = 'c';

-- Drop the existing check constraint
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Create a new check constraint that includes 'family'
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('admin', 'contributor', 'family'));

-- Verify the constraint was created
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'user_roles'::regclass AND contype = 'c';
