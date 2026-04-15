-- Persist LeaseMinder UI: total miles vs annual miles (independent of annual_allocated_miles nullability)

ALTER TABLE leased_vehicles
  ADD COLUMN IF NOT EXISTS mileage_allocation_basis TEXT DEFAULT 'total';

UPDATE leased_vehicles
SET mileage_allocation_basis = 'annual'
WHERE annual_allocated_miles IS NOT NULL AND annual_allocated_miles > 0;

UPDATE leased_vehicles
SET mileage_allocation_basis = 'total'
WHERE mileage_allocation_basis IS NULL OR mileage_allocation_basis NOT IN ('total', 'annual');

ALTER TABLE leased_vehicles
  ALTER COLUMN mileage_allocation_basis SET NOT NULL;

ALTER TABLE leased_vehicles
  ALTER COLUMN mileage_allocation_basis SET DEFAULT 'total';

ALTER TABLE leased_vehicles DROP CONSTRAINT IF EXISTS leased_vehicles_mileage_allocation_basis_check;
ALTER TABLE leased_vehicles
  ADD CONSTRAINT leased_vehicles_mileage_allocation_basis_check
  CHECK (mileage_allocation_basis IN ('total', 'annual'));
