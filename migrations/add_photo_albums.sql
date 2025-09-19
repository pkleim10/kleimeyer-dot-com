-- Create photo_albums table
CREATE TABLE IF NOT EXISTS photo_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_document_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- album relation on documents
ALTER TABLE family_documents
  ADD COLUMN IF NOT EXISTS album_id UUID REFERENCES photo_albums(id) ON DELETE SET NULL;

-- RLS enable
ALTER TABLE photo_albums ENABLE ROW LEVEL SECURITY;

-- Basic policies leveraging has_permission()
DROP POLICY IF EXISTS "Albums select" ON photo_albums;
CREATE POLICY "Albums select" ON photo_albums
  FOR SELECT USING (
    has_permission(auth.uid(), 'admin:full_access') OR
    has_permission(auth.uid(), 'family:full_access') OR
    has_permission(auth.uid(), 'family:view_documents')
  );

DROP POLICY IF EXISTS "Albums insert" ON photo_albums;
CREATE POLICY "Albums insert" ON photo_albums
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), 'admin:full_access') OR
    has_permission(auth.uid(), 'family:full_access') OR
    has_permission(auth.uid(), 'family:upload_documents')
  );

DROP POLICY IF EXISTS "Albums update" ON photo_albums;
CREATE POLICY "Albums update" ON photo_albums
  FOR UPDATE USING (
    has_permission(auth.uid(), 'admin:full_access') OR
    has_permission(auth.uid(), 'family:full_access') OR
    has_permission(auth.uid(), 'family:manage_documents')
  );

DROP POLICY IF EXISTS "Albums delete" ON photo_albums;
CREATE POLICY "Albums delete" ON photo_albums
  FOR DELETE USING (
    has_permission(auth.uid(), 'admin:full_access') OR
    has_permission(auth.uid(), 'family:full_access') OR
    has_permission(auth.uid(), 'family:manage_documents')
  );

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_family_documents_album_id ON family_documents(album_id);

