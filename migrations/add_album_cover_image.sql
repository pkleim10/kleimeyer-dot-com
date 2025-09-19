-- Add cover_image_id column to photo_albums table
ALTER TABLE photo_albums 
ADD COLUMN cover_image_id UUID REFERENCES family_documents(id) ON DELETE SET NULL;

-- Create index for cover_image_id
CREATE INDEX IF NOT EXISTS idx_photo_albums_cover_image_id ON photo_albums(cover_image_id);

-- Update RLS policies to allow cover image access
-- The existing policies should already cover this since we're just adding a reference
