-- =============================================
-- FIX FAMILY CONTACTS RLS POLICIES
-- =============================================
-- Run this SQL in the Supabase SQL Editor to fix the family contacts security issue
-- This will prevent unauthorized users from viewing family contacts

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Allow authenticated users to read family contacts" ON family_contacts;

-- Drop the legacy admin policy
DROP POLICY IF EXISTS "Allow admins to manage family contacts" ON family_contacts;

-- Create new permission-based policies
-- Allow users with family permissions to view contacts
CREATE POLICY "Users with family permissions can view contacts" ON family_contacts
  FOR SELECT USING (
    has_permission(auth.uid(), 'admin:full_access') OR
    has_permission(auth.uid(), 'family:full_access') OR
    has_permission(auth.uid(), 'family:view_contacts')
  );

-- Allow users with family permissions to create contacts
CREATE POLICY "Users with family permissions can create contacts" ON family_contacts
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), 'admin:full_access') OR
    has_permission(auth.uid(), 'family:full_access') OR
    has_permission(auth.uid(), 'family:create_contacts')
  );

-- Allow users with family permissions to update contacts
CREATE POLICY "Users with family permissions can update contacts" ON family_contacts
  FOR UPDATE USING (
    has_permission(auth.uid(), 'admin:full_access') OR
    has_permission(auth.uid(), 'family:full_access') OR
    has_permission(auth.uid(), 'family:edit_contacts')
  );

-- Allow users with family permissions to delete contacts
CREATE POLICY "Users with family permissions can delete contacts" ON family_contacts
  FOR DELETE USING (
    has_permission(auth.uid(), 'admin:full_access') OR
    has_permission(auth.uid(), 'family:full_access') OR
    has_permission(auth.uid(), 'family:delete_contacts')
  );

-- =============================================
-- VERIFICATION
-- =============================================
-- After running the above, test that:
-- 1. Users with family:view_contacts can see contacts
-- 2. Users without family permissions cannot see contacts
-- 3. The family page now uses the API endpoint for security

-- =============================================
-- SECURITY FIX COMPLETE
-- =============================================
-- Family contacts are now properly protected by permission-based RLS policies!
-- Only users with appropriate family permissions can access contacts.
