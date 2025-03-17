-- Add image column to categories table
ALTER TABLE categories
ADD COLUMN image TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN categories.image IS 'The filename of the category image stored in the public/assets folder'; 