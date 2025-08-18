-- Add slug column to recipes table
ALTER TABLE recipes ADD COLUMN slug TEXT;

-- Create a unique index on slug
CREATE UNIQUE INDEX recipes_slug_idx ON recipes (slug);

-- Update existing recipes to have slugs based on their names
UPDATE recipes 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Make slug NOT NULL after populating
ALTER TABLE recipes ALTER COLUMN slug SET NOT NULL;
