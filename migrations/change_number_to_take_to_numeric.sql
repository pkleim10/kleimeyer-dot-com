-- Change number_to_take from INTEGER to NUMERIC to support fractional values (e.g., 1.5 for "1 and 1/2")
ALTER TABLE medications 
ALTER COLUMN number_to_take TYPE NUMERIC(3,1) USING number_to_take::NUMERIC(3,1);

-- Update default value to be numeric
ALTER TABLE medications 
ALTER COLUMN number_to_take SET DEFAULT 1.0;

