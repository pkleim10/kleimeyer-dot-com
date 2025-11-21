-- Add day start and end times to medication_groups table
ALTER TABLE medication_groups 
ADD COLUMN day_start_time TIME DEFAULT '06:00:00',
ADD COLUMN day_end_time TIME DEFAULT '23:59:59';

-- Add comments to document the fields
COMMENT ON COLUMN medication_groups.day_start_time IS 'Time when the medication day starts (for wraparound day sorting). Default: 06:00:00';
COMMENT ON COLUMN medication_groups.day_end_time IS 'Time when the medication day ends (for wraparound day sorting). Default: 23:59:59';

