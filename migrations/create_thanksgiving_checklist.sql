-- Create thanksgiving_checklist table for Family Business app
CREATE TABLE IF NOT EXISTS thanksgiving_checklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item TEXT NOT NULL,
  volunteer TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_thanksgiving_checklist_user_id ON thanksgiving_checklist(user_id);
CREATE INDEX IF NOT EXISTS idx_thanksgiving_checklist_created_at ON thanksgiving_checklist(created_at);

-- Enable Row Level Security
ALTER TABLE thanksgiving_checklist ENABLE ROW LEVEL SECURITY;

-- RLS Policies using permission system
-- Allow users with family permissions to view checklist items
CREATE POLICY "Users with family permissions can view checklist" ON thanksgiving_checklist
  FOR SELECT USING (
    has_permission(auth.uid(), 'admin:full_access') OR
    has_permission(auth.uid(), 'family:full_access') OR
    has_permission(auth.uid(), 'family:view_bulletins')
  );

-- Allow users with family permissions to create checklist items
CREATE POLICY "Users with family permissions can create checklist" ON thanksgiving_checklist
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), 'admin:full_access') OR
    has_permission(auth.uid(), 'family:full_access') OR
    has_permission(auth.uid(), 'family:create_bulletins') OR
    has_permission(auth.uid(), 'family:edit_bulletins')
  );

-- Allow users with family permissions to update checklist items
CREATE POLICY "Users with family permissions can update checklist" ON thanksgiving_checklist
  FOR UPDATE USING (
    has_permission(auth.uid(), 'admin:full_access') OR
    has_permission(auth.uid(), 'family:full_access') OR
    has_permission(auth.uid(), 'family:edit_bulletins')
  );

-- Allow users with family permissions to delete checklist items
CREATE POLICY "Users with family permissions can delete checklist" ON thanksgiving_checklist
  FOR DELETE USING (
    has_permission(auth.uid(), 'admin:full_access') OR
    has_permission(auth.uid(), 'family:full_access') OR
    has_permission(auth.uid(), 'family:delete_bulletins')
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_thanksgiving_checklist_updated_at 
  BEFORE UPDATE ON thanksgiving_checklist 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

