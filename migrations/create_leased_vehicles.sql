-- LeaseMinder: per-user leased vehicle records for mileage tracking (kleimeyer.com)
-- Run in Supabase SQL editor or via migration tooling after review.

CREATE TABLE IF NOT EXISTS leased_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_name TEXT NOT NULL,
  lease_start_date DATE NOT NULL,
  lease_period_months INTEGER NOT NULL CHECK (lease_period_months >= 1 AND lease_period_months <= 120),
  initial_odometer INTEGER NOT NULL CHECK (initial_odometer >= 0),
  annual_allocated_miles INTEGER NULL CHECK (annual_allocated_miles IS NULL OR annual_allocated_miles > 0),
  mileage_allocation_basis TEXT NOT NULL DEFAULT 'total' CHECK (mileage_allocation_basis IN ('total', 'annual')),
  total_allocated_miles INTEGER NOT NULL CHECK (total_allocated_miles > 0),
  overage_cost_per_mile NUMERIC(12, 4) NOT NULL CHECK (overage_cost_per_mile >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leased_vehicles_user_id ON leased_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_leased_vehicles_lease_start ON leased_vehicles(lease_start_date);

ALTER TABLE leased_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own leased vehicles" ON leased_vehicles;
DROP POLICY IF EXISTS "Users insert own leased vehicles" ON leased_vehicles;
DROP POLICY IF EXISTS "Users update own leased vehicles" ON leased_vehicles;
DROP POLICY IF EXISTS "Users delete own leased vehicles" ON leased_vehicles;

CREATE POLICY "Users select own leased vehicles"
  ON leased_vehicles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own leased vehicles"
  ON leased_vehicles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own leased vehicles"
  ON leased_vehicles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own leased vehicles"
  ON leased_vehicles FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_leased_vehicles_updated_at ON leased_vehicles;
CREATE TRIGGER update_leased_vehicles_updated_at
  BEFORE UPDATE ON leased_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
