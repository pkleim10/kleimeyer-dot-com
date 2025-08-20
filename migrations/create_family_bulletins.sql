-- Create family_bulletins table
CREATE TABLE IF NOT EXISTS family_bulletins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('appointment', 'payment', 'website', 'general')),
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE family_bulletins ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_family_bulletins_active ON family_bulletins(is_active);
CREATE INDEX IF NOT EXISTS idx_family_bulletins_priority ON family_bulletins(priority);
CREATE INDEX IF NOT EXISTS idx_family_bulletins_category ON family_bulletins(category);
CREATE INDEX IF NOT EXISTS idx_family_bulletins_expires_at ON family_bulletins(expires_at);
CREATE INDEX IF NOT EXISTS idx_family_bulletins_created_at ON family_bulletins(created_at);

-- RLS Policies

-- Allow all authenticated users to view active bulletins
CREATE POLICY "Anyone can view active bulletins" ON family_bulletins
  FOR SELECT USING (is_active = true);

-- Allow contributors and admins to view all bulletins (including inactive)
CREATE POLICY "Contributors and admins can view all bulletins" ON family_bulletins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('contributor', 'admin')
    )
  );

-- Allow contributors and admins to create bulletins
CREATE POLICY "Contributors and admins can create bulletins" ON family_bulletins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('contributor', 'admin')
    )
  );

-- Allow contributors and admins to update bulletins
CREATE POLICY "Contributors and admins can update bulletins" ON family_bulletins
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('contributor', 'admin')
    )
  );

-- Allow contributors and admins to delete bulletins
CREATE POLICY "Contributors and admins can delete bulletins" ON family_bulletins
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('contributor', 'admin')
    )
  );

-- Add trigger to automatically set created_by
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_family_bulletins_created_by
  BEFORE INSERT ON family_bulletins
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

-- Add some sample data for testing (optional)
INSERT INTO family_bulletins (title, content, category, priority, expires_at) VALUES
  ('Follow-up Appointment', 'Dad''s follow-up appointment with Dr. Smith on March 15th at 2:00 PM. Memorial Hospital, Building A, Floor 2.', 'appointment', 'high', '2024-03-15 14:00:00+00'),
  ('Insurance Payment Due', 'Insurance co-pay of $75 due by Friday, March 22nd. Please submit payment through the patient portal.', 'payment', 'medium', '2024-03-22 23:59:59+00'),
  ('Patient Portal Access', 'New patient portal features available at patientportal.com. Login: dad@email.com', 'website', 'low', '2024-04-01 00:00:00+00')
ON CONFLICT DO NOTHING;
