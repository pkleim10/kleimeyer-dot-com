-- Add rating column to family_bulletins table
ALTER TABLE family_bulletins 
ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- Add comment to document the field
COMMENT ON COLUMN family_bulletins.rating IS 'Star rating from 1-5, NULL means unrated';
