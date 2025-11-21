-- Add 'patch' to the format CHECK constraint in medications table
ALTER TABLE medications 
DROP CONSTRAINT IF EXISTS medications_format_check;

ALTER TABLE medications 
ADD CONSTRAINT medications_format_check 
CHECK (format IN ('pill', 'capsule', 'chewable', 'injection', 'patch', 'other'));

