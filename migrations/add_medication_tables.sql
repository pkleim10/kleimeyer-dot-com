-- Migration: Add medication management tables
-- Created: 2025-11-20
-- Description: Creates tables for medication groups, medications, and medication logs

-- Table: medication_groups
-- Stores medication groups (highest-level construct for organizing medications)
CREATE TABLE IF NOT EXISTS medication_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  accessible_by VARCHAR(20) NOT NULL DEFAULT 'only_me' CHECK (accessible_by IN ('only_me', 'shared')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Table: medications
-- Stores individual medication entries
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES medication_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100),
  frequency_type VARCHAR(50) NOT NULL CHECK (frequency_type IN ('times_per_day', 'specific_times', 'as_needed')),
  times_per_day INTEGER,
  specific_times JSONB, -- Array of time strings or predefined values ('morning', 'evening', 'bedtime', or HH:MM format)
  frequency_pattern VARCHAR(50) CHECK (frequency_pattern IN ('every_day', 'every_x_days', 'specific_days')),
  every_x_days INTEGER,
  specific_days JSONB, -- Array of day numbers (0-6, Sunday-Saturday)
  with_food BOOLEAN DEFAULT FALSE,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  number_to_take INTEGER DEFAULT 1,
  format VARCHAR(50) CHECK (format IN ('Pill', 'Capsule', 'Chewable', 'Injection', 'Other')),
  indication VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: medication_logs
-- Stores medication intake logs (checklist entries)
CREATE TABLE IF NOT EXISTS medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time VARCHAR(20), -- Time string (HH:MM) or predefined value ('morning', 'evening', 'bedtime')
  time_number INTEGER, -- For times_per_day frequency (1, 2, 3, etc.)
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_medication_groups_user_id ON medication_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_medication_groups_accessible_by ON medication_groups(accessible_by);
CREATE INDEX IF NOT EXISTS idx_medications_group_id ON medications(group_id);
CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_medication_id ON medication_logs(medication_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_user_id ON medication_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_scheduled_date ON medication_logs(scheduled_date);

-- Unique index for medication_logs to prevent duplicate entries
-- This ensures one log entry per medication per date per time slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_medication_logs_unique 
ON medication_logs(medication_id, scheduled_date, COALESCE(scheduled_time, time_number::text));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_medication_groups_updated_at
  BEFORE UPDATE ON medication_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for medication_groups
ALTER TABLE medication_groups ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own groups and shared groups they have permission to see
CREATE POLICY "Users can view their own medication groups"
  ON medication_groups FOR SELECT
  USING (
    auth.uid() = user_id OR
    (
      accessible_by = 'shared' AND
      EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()
        AND permission IN ('admin:full_access', 'medication:view_shared_groups')
      )
    )
  );

-- Policy: Users can create their own groups
CREATE POLICY "Users can create their own medication groups"
  ON medication_groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own groups and shared groups they have permission to edit
CREATE POLICY "Users can update their own medication groups"
  ON medication_groups FOR UPDATE
  USING (
    auth.uid() = user_id OR
    (
      accessible_by = 'shared' AND
      EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()
        AND permission IN ('admin:full_access', 'medication:edit_shared_groups')
      )
    )
  );

-- Policy: Users can delete their own groups and shared groups they have permission to delete
CREATE POLICY "Users can delete their own medication groups"
  ON medication_groups FOR DELETE
  USING (
    auth.uid() = user_id OR
    (
      accessible_by = 'shared' AND
      EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()
        AND permission IN ('admin:full_access', 'medication:delete_shared_groups')
      )
    )
  );

-- RLS Policies for medications
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view medications in their own groups or shared groups they can view
CREATE POLICY "Users can view medications in accessible groups"
  ON medications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM medication_groups mg
      WHERE mg.id = medications.group_id
      AND (
        mg.user_id = auth.uid() OR
        (
          mg.accessible_by = 'shared' AND
          EXISTS (
            SELECT 1 FROM user_permissions
            WHERE user_id = auth.uid()
            AND permission IN ('admin:full_access', 'medication:view_shared_groups')
          )
        )
      )
    )
  );

-- Policy: Users can create medications in groups they own or shared groups they can edit
CREATE POLICY "Users can create medications in accessible groups"
  ON medications FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM medication_groups mg
      WHERE mg.id = medications.group_id
      AND (
        mg.user_id = auth.uid() OR
        (
          mg.accessible_by = 'shared' AND
          EXISTS (
            SELECT 1 FROM user_permissions
            WHERE user_id = auth.uid()
            AND permission IN ('admin:full_access', 'medication:edit_shared_groups')
          )
        )
      )
    )
  );

-- Policy: Users can update medications in groups they own or shared groups they can edit
CREATE POLICY "Users can update medications in accessible groups"
  ON medications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM medication_groups mg
      WHERE mg.id = medications.group_id
      AND (
        mg.user_id = auth.uid() OR
        (
          mg.accessible_by = 'shared' AND
          EXISTS (
            SELECT 1 FROM user_permissions
            WHERE user_id = auth.uid()
            AND permission IN ('admin:full_access', 'medication:edit_shared_groups')
          )
        )
      )
    )
  );

-- Policy: Users can delete medications in groups they own or shared groups they can edit
CREATE POLICY "Users can delete medications in accessible groups"
  ON medications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM medication_groups mg
      WHERE mg.id = medications.group_id
      AND (
        mg.user_id = auth.uid() OR
        (
          mg.accessible_by = 'shared' AND
          EXISTS (
            SELECT 1 FROM user_permissions
            WHERE user_id = auth.uid()
            AND permission IN ('admin:full_access', 'medication:edit_shared_groups')
          )
        )
      )
    )
  );

-- RLS Policies for medication_logs
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view logs for medications they can view
CREATE POLICY "Users can view medication logs for accessible medications"
  ON medication_logs FOR SELECT
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM medications m
      JOIN medication_groups mg ON mg.id = m.group_id
      WHERE m.id = medication_logs.medication_id
      AND (
        mg.user_id = auth.uid() OR
        (
          mg.accessible_by = 'shared' AND
          EXISTS (
            SELECT 1 FROM user_permissions
            WHERE user_id = auth.uid()
            AND permission IN ('admin:full_access', 'medication:view_shared_groups')
          )
        )
      )
    )
  );

-- Policy: Users can create/update logs for medications they can view
CREATE POLICY "Users can manage medication logs for accessible medications"
  ON medication_logs FOR ALL
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM medications m
      JOIN medication_groups mg ON mg.id = m.group_id
      WHERE m.id = medication_logs.medication_id
      AND (
        mg.user_id = auth.uid() OR
        (
          mg.accessible_by = 'shared' AND
          EXISTS (
            SELECT 1 FROM user_permissions
            WHERE user_id = auth.uid()
            AND permission IN ('admin:full_access', 'medication:view_shared_groups')
          )
        )
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM medications m
      JOIN medication_groups mg ON mg.id = m.group_id
      WHERE m.id = medication_logs.medication_id
      AND (
        mg.user_id = auth.uid() OR
        (
          mg.accessible_by = 'shared' AND
          EXISTS (
            SELECT 1 FROM user_permissions
            WHERE user_id = auth.uid()
            AND permission IN ('admin:full_access', 'medication:view_shared_groups')
          )
        )
      )
    )
  );

