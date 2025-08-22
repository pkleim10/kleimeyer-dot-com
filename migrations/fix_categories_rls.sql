-- Fix RLS policies for document_categories table
-- Run this in your Supabase SQL editor

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage categories" ON document_categories;

-- Create separate policies for different operations

-- Anyone with family or admin role can view categories
CREATE POLICY "Family members can view categories" ON document_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('family', 'admin')
    )
  );

-- Only admins can create categories
CREATE POLICY "Admins can create categories" ON document_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update categories
CREATE POLICY "Admins can update categories" ON document_categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete categories
CREATE POLICY "Admins can delete categories" ON document_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
