-- Create family_documents table
CREATE TABLE IF NOT EXISTS family_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT,
  category TEXT DEFAULT 'general',
  description TEXT,
  tags TEXT[],
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_categories table for organizing documents
CREATE TABLE IF NOT EXISTS document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO document_categories (name, description, color) VALUES
  ('general', 'General documents', '#3B82F6'),
  ('medical', 'Medical records and health documents', '#EF4444'),
  ('financial', 'Financial documents and records', '#10B981'),
  ('legal', 'Legal documents and contracts', '#8B5CF6'),
  ('photos', 'Family photos and images', '#F59E0B'),
  ('school', 'School records and educational documents', '#06B6D4'),
  ('insurance', 'Insurance policies and claims', '#84CC16'),
  ('home', 'Home-related documents', '#F97316')
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE family_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_family_documents_category ON family_documents(category);
CREATE INDEX IF NOT EXISTS idx_family_documents_created_by ON family_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_family_documents_created_at ON family_documents(created_at);
CREATE INDEX IF NOT EXISTS idx_family_documents_file_type ON family_documents(file_type);
CREATE INDEX IF NOT EXISTS idx_family_documents_tags ON family_documents USING GIN(tags);

-- RLS Policies for family_documents
-- Family members and admins can view all documents
CREATE POLICY "Family members can view documents" ON family_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('family', 'admin')
    )
  );

-- Family members and admins can upload documents
CREATE POLICY "Family members can upload documents" ON family_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('family', 'admin')
    )
  );

-- Family members and admins can update documents
CREATE POLICY "Family members can update documents" ON family_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('family', 'admin')
    )
  );

-- Family members and admins can delete documents
CREATE POLICY "Family members can delete documents" ON family_documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('family', 'admin')
    )
  );

-- RLS Policies for document_categories
-- Anyone can view categories
CREATE POLICY "Anyone can view categories" ON document_categories
  FOR SELECT USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can manage categories" ON document_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add trigger to automatically set created_by
CREATE OR REPLACE FUNCTION set_document_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_family_documents_created_by
  BEFORE INSERT ON family_documents
  FOR EACH ROW
  EXECUTE FUNCTION set_document_created_by();

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_family_documents_updated_at
  BEFORE UPDATE ON family_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_document_updated_at();

-- Add some sample documents for testing (optional)
INSERT INTO family_documents (filename, original_filename, file_path, file_size, file_type, mime_type, category, description) VALUES
  ('sample-medical-record.pdf', 'Medical Record.pdf', '/documents/medical/sample-medical-record.pdf', 1024000, 'pdf', 'application/pdf', 'medical', 'Sample medical record for testing'),
  ('family-photo-2024.jpg', 'Family Photo 2024.jpg', '/documents/photos/family-photo-2024.jpg', 2048000, 'image', 'image/jpeg', 'photos', 'Family photo from 2024'),
  ('insurance-policy.pdf', 'Insurance Policy.pdf', '/documents/insurance/insurance-policy.pdf', 512000, 'pdf', 'application/pdf', 'insurance', 'Current insurance policy')
ON CONFLICT DO NOTHING;
