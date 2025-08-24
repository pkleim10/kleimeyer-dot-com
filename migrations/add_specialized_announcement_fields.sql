-- Add specialized fields for different announcement types
ALTER TABLE family_bulletins 
ADD COLUMN url TEXT,
ADD COLUMN website_email TEXT,
ADD COLUMN website_password TEXT,
ADD COLUMN appointment_datetime TIMESTAMP WITH TIME ZONE,
ADD COLUMN appointment_location TEXT,
ADD COLUMN payment_amount DECIMAL(10,2),
ADD COLUMN payment_due_date DATE,
ADD COLUMN payment_reference TEXT,
ADD COLUMN payment_recipient TEXT,
ADD COLUMN action_required BOOLEAN DEFAULT FALSE,
ADD COLUMN medical_provider TEXT;

-- Add comments to document the fields
COMMENT ON COLUMN family_bulletins.url IS 'URL for website announcements';
COMMENT ON COLUMN family_bulletins.website_email IS 'Email/User ID for website announcements';
COMMENT ON COLUMN family_bulletins.website_password IS 'Password for website announcements';
COMMENT ON COLUMN family_bulletins.appointment_datetime IS 'Date and time for appointment announcements';
COMMENT ON COLUMN family_bulletins.appointment_location IS 'Location for appointment announcements';
COMMENT ON COLUMN family_bulletins.payment_amount IS 'Amount for payment announcements';
COMMENT ON COLUMN family_bulletins.payment_due_date IS 'Due date for payment announcements';
COMMENT ON COLUMN family_bulletins.payment_reference IS 'Reference/account number for payment announcements';
COMMENT ON COLUMN family_bulletins.payment_recipient IS 'Recipient for payment announcements';
COMMENT ON COLUMN family_bulletins.action_required IS 'Whether action is required for general announcements';
COMMENT ON COLUMN family_bulletins.medical_provider IS 'Provider for medical announcements';
