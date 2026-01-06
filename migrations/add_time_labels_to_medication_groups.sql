-- Add time_labels column to medication_groups table
-- This allows users to assign custom labels to medication times (e.g., "Slot 1", "Slot 2")
-- for use with automatic pill dispensers

ALTER TABLE medication_groups 
ADD COLUMN IF NOT EXISTS time_labels JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN medication_groups.time_labels IS 'JSONB object mapping time strings to labels. Example: {"12:00": "Slot 1", "16:00": "Slot 2", "morning": "Morning Slot"}. Keys are time strings in HH:MM format or named times (morning, evening, bedtime).';

