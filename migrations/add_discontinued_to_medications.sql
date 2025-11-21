-- Add discontinued field to medications table
ALTER TABLE medications 
ADD COLUMN discontinued BOOLEAN DEFAULT FALSE;

-- Add comment to document the field
COMMENT ON COLUMN medications.discontinued IS 'Whether the medication has been discontinued';

