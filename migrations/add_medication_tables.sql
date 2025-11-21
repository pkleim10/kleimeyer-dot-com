-- Migration: Create Medication Management Tables
-- This migration drops existing medication tables (if they exist) and creates new ones with the correct schema

-- ============================================
-- DROP EXISTING TABLES (if they exist)
-- ============================================
DROP TABLE IF EXISTS medication_logs CASCADE;
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS medication_groups CASCADE;

-- ============================================
-- CREATE TABLES
-- ============================================

-- medication_groups table
CREATE TABLE medication_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  accessible_by TEXT NOT NULL DEFAULT 'only_me' CHECK (accessible_by IN ('only_me', 'shared')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- medications table
CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES medication_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency_type TEXT NOT NULL CHECK (frequency_type IN ('times_per_day', 'specific_times', 'as_needed')),
  times_per_day INTEGER,
  specific_times JSONB, -- Array of time strings: ["morning", "evening", "08:00", "20:00"]
  frequency_pattern TEXT CHECK (frequency_pattern IN ('every_day', 'every_x_days', 'specific_days')),
  every_x_days INTEGER,
  specific_days JSONB, -- Array of day numbers: [0, 1, 2, 3, 4, 5, 6] where 0=Sunday
  with_food BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  number_to_take INTEGER DEFAULT 1,
  format TEXT CHECK (format IN ('pill', 'capsule', 'chewable', 'injection', 'other')),
  indication TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- medication_logs table
CREATE TABLE medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT, -- Time string like "morning", "evening", "bedtime", or "HH:MM"
  time_number INTEGER, -- For times_per_day medications: 1, 2, 3, etc.
  taken_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX idx_medication_groups_user_id ON medication_groups(user_id);
CREATE INDEX idx_medication_groups_accessible_by ON medication_groups(accessible_by);

CREATE INDEX idx_medications_group_id ON medications(group_id);
CREATE INDEX idx_medications_user_id ON medications(user_id);
CREATE INDEX idx_medications_start_date ON medications(start_date);
CREATE INDEX idx_medications_end_date ON medications(end_date);

CREATE INDEX idx_medication_logs_medication_id ON medication_logs(medication_id);
CREATE INDEX idx_medication_logs_scheduled_date ON medication_logs(scheduled_date);
CREATE INDEX idx_medication_logs_taken_at ON medication_logs(taken_at);

-- Unique constraint for medication_logs: one log per medication/date/time combination
CREATE UNIQUE INDEX idx_medication_logs_unique ON medication_logs(
  medication_id, 
  scheduled_date, 
  COALESCE(scheduled_time, time_number::text)
);

-- ============================================
-- CREATE UPDATED_AT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE TRIGGERS
-- ============================================

CREATE TRIGGER update_medication_groups_updated_at
  BEFORE UPDATE ON medication_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE medication_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR medication_groups
-- ============================================

-- Users can view their own groups
CREATE POLICY "Users can view their own medication groups"
  ON medication_groups FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view shared groups if they have permission
CREATE POLICY "Users can view shared medication groups"
  ON medication_groups FOR SELECT
  USING (
    accessible_by = 'shared' AND
    (
      EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()
        AND permission IN ('admin:full_access', 'medication:view_shared_groups')
      )
    )
  );

-- Users can create their own groups
CREATE POLICY "Users can create their own medication groups"
  ON medication_groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can create shared groups if they have permission
CREATE POLICY "Users can create shared medication groups"
  ON medication_groups FOR INSERT
  WITH CHECK (
    accessible_by = 'shared' AND
    (
      EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()
        AND permission IN ('admin:full_access', 'medication:create_shared_groups')
      )
    )
  );

-- Users can update their own groups
CREATE POLICY "Users can update their own medication groups"
  ON medication_groups FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can update shared groups if they have permission
CREATE POLICY "Users can update shared medication groups"
  ON medication_groups FOR UPDATE
  USING (
    accessible_by = 'shared' AND
    (
      EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()
        AND permission IN ('admin:full_access', 'medication:edit_shared_groups')
      )
    )
  )
  WITH CHECK (
    accessible_by = 'shared' AND
    (
      EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()
        AND permission IN ('admin:full_access', 'medication:edit_shared_groups')
      )
    )
  );

-- Users can delete their own groups
CREATE POLICY "Users can delete their own medication groups"
  ON medication_groups FOR DELETE
  USING (auth.uid() = user_id);

-- Users can delete shared groups if they have permission
CREATE POLICY "Users can delete shared medication groups"
  ON medication_groups FOR DELETE
  USING (
    accessible_by = 'shared' AND
    (
      EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()
        AND permission IN ('admin:full_access', 'medication:delete_shared_groups')
      )
    )
  );

-- ============================================
-- RLS POLICIES FOR medications
-- ============================================

-- Users can view medications in their own groups
CREATE POLICY "Users can view medications in their own groups"
  ON medications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM medication_groups
      WHERE medication_groups.id = medications.group_id
      AND (
        medication_groups.user_id = auth.uid()
        OR (
          medication_groups.accessible_by = 'shared' AND
          EXISTS (
            SELECT 1 FROM user_permissions
            WHERE user_id = auth.uid()
            AND permission IN ('admin:full_access', 'medication:view_shared_groups')
          )
        )
      )
    )
  );

-- Users can create medications in their own groups
CREATE POLICY "Users can create medications in their own groups"
  ON medications FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM medication_groups
      WHERE medication_groups.id = medications.group_id
      AND medication_groups.user_id = auth.uid()
    )
  );

-- Users can create medications in shared groups if they have permission
CREATE POLICY "Users can create medications in shared groups"
  ON medications FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM medication_groups
      WHERE medication_groups.id = medications.group_id
      AND medication_groups.accessible_by = 'shared'
      AND EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()
        AND permission IN ('admin:full_access', 'medication:view_shared_groups')
      )
    )
  );

-- Users can update their own medications
CREATE POLICY "Users can update their own medications"
  ON medications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own medications
CREATE POLICY "Users can delete their own medications"
  ON medications FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES FOR medication_logs
-- ============================================

-- Users can view logs for medications they can view
CREATE POLICY "Users can view medication logs"
  ON medication_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = medication_logs.medication_id
      AND (
        medications.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM medication_groups
          WHERE medication_groups.id = medications.group_id
          AND (
            medication_groups.user_id = auth.uid()
            OR (
              medication_groups.accessible_by = 'shared' AND
              EXISTS (
                SELECT 1 FROM user_permissions
                WHERE user_id = auth.uid()
                AND permission IN ('admin:full_access', 'medication:view_shared_groups')
              )
            )
          )
        )
      )
    )
  );

-- Users can create/update logs for medications they can view
CREATE POLICY "Users can manage medication logs"
  ON medication_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = medication_logs.medication_id
      AND (
        medications.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM medication_groups
          WHERE medication_groups.id = medications.group_id
          AND (
            medication_groups.user_id = auth.uid()
            OR (
              medication_groups.accessible_by = 'shared' AND
              EXISTS (
                SELECT 1 FROM user_permissions
                WHERE user_id = auth.uid()
                AND permission IN ('admin:full_access', 'medication:view_shared_groups')
              )
            )
          )
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = medication_logs.medication_id
      AND (
        medications.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM medication_groups
          WHERE medication_groups.id = medications.group_id
          AND (
            medication_groups.user_id = auth.uid()
            OR (
              medication_groups.accessible_by = 'shared' AND
              EXISTS (
                SELECT 1 FROM user_permissions
                WHERE user_id = auth.uid()
                AND permission IN ('admin:full_access', 'medication:view_shared_groups')
              )
            )
          )
        )
      )
    )
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE medication_groups IS 'Groups of medications for organization (e.g., "My Medications", "Mom''s Medications")';
COMMENT ON TABLE medications IS 'Individual medications with scheduling and dosage information';
COMMENT ON TABLE medication_logs IS 'Logs of when medications were taken';

COMMENT ON COLUMN medications.specific_times IS 'JSONB array of time strings: ["morning", "evening", "08:00", "20:00"]';
COMMENT ON COLUMN medications.specific_days IS 'JSONB array of day numbers [0-6] where 0=Sunday, 6=Saturday';
COMMENT ON COLUMN medication_logs.scheduled_time IS 'Time string: "morning", "evening", "bedtime", or "HH:MM" format';
COMMENT ON COLUMN medication_logs.time_number IS 'For times_per_day medications: 1, 2, 3, etc.';
