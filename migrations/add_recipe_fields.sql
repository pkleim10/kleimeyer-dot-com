-- Add new columns to recipes table
ALTER TABLE recipes
ADD COLUMN source TEXT,
ADD COLUMN notes TEXT,
ADD COLUMN image TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN recipes.source IS 'The source of the recipe (e.g., "Grandma", "Cookbook", etc.)';
COMMENT ON COLUMN recipes.notes IS 'Additional notes, tips, or caveats about the recipe';
COMMENT ON COLUMN recipes.image IS 'The URL of the recipe image stored in Supabase storage (recipe-images bucket)'; 