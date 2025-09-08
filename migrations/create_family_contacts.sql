-- Create family_contacts table for Family Business app
CREATE TABLE IF NOT EXISTS family_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE family_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for family_contacts
-- Allow all authenticated users to read family contacts
CREATE POLICY "Allow authenticated users to read family contacts" ON family_contacts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow admins to manage family contacts
CREATE POLICY "Allow admins to manage family contacts" ON family_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_family_contacts_updated_at 
  BEFORE UPDATE ON family_contacts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data
INSERT INTO family_contacts (name, phone, description, notes) VALUES
  ('Dr. Sarah Johnson', '(555) 123-4567', 'Primary Care Physician', 'Available Mon-Fri 9AM-5PM'),
  ('Nurse Maria Rodriguez', '(555) 234-5678', 'Floor Nurse - Room 302', 'Direct line to Dad''s room'),
  ('Hospital Main Desk', '(555) 345-6789', 'General Hospital Information', '24/7 availability'),
  ('Family Liaison - Tom Wilson', '(555) 456-7890', 'Patient Family Support', 'Helps coordinate family visits and updates'),
  ('Mom', '(555) 567-8901', 'Family Contact', 'Call anytime for updates');
