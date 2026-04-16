-- LeaseMinder: persist latest current odometer reading and when it was recorded

ALTER TABLE leased_vehicles
  ADD COLUMN IF NOT EXISTS current_odometer INTEGER NULL CHECK (current_odometer IS NULL OR current_odometer >= 0),
  ADD COLUMN IF NOT EXISTS current_odometer_recorded_at TIMESTAMPTZ NULL;
