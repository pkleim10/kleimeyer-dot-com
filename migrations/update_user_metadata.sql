-- Function to update user metadata (first_name and last_name)
CREATE OR REPLACE FUNCTION update_user_metadata(
  user_uuid UUID,
  first_name TEXT,
  last_name TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update the user metadata in auth.users
  UPDATE auth.users 
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{first_name}',
    to_jsonb(first_name)
  )
  WHERE id = user_uuid;
  
  UPDATE auth.users 
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{last_name}',
    to_jsonb(last_name)
  )
  WHERE id = user_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_metadata(UUID, TEXT, TEXT) TO authenticated;

-- Example usage:
-- SELECT update_user_metadata('your-user-id-here', 'John', 'Doe');
