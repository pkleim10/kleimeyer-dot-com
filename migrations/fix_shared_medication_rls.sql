-- Fix RLS policy for creating medications in shared groups
-- Allow users with medication:edit_shared_groups permission to also create medications

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can create medications in shared groups" ON medications;

-- Recreate the policy with both view and edit permissions
CREATE POLICY "Users can create medications in shared groups"
  ON medications FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM medication_groups
      WHERE medication_groups.id = medications.group_id
      AND medication_groups.accessible_by = 'shared'
      AND EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()
        AND permission IN (
          'admin:full_access', 
          'medication:view_shared_groups',
          'medication:edit_shared_groups'
        )
      )
    )
  );

