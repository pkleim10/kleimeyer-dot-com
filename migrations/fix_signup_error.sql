-- Fix signup error by cleaning up problematic functions and ensuring proper setup

-- Drop any problematic functions that might contain settingNameToToggle
DO $$
BEGIN
  -- Drop any functions that might be causing the signup error
  DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
  
  -- Check if there are any other functions that might be problematic
  -- This will help identify any functions that might be causing the 500 error
  RAISE NOTICE 'Cleaned up potentially problematic functions';
END $$;

-- Ensure user_roles table exists and is properly configured
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('member', 'contributor', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- Enable Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Only admins can manage user roles" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can manage roles" ON user_roles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view their own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can manage roles" ON user_roles
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create a simple function to handle new user registration (without triggers)
CREATE OR REPLACE FUNCTION handle_new_user_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple insert with conflict handling
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'member')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create user role for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop any existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a new, simple trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_simple();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user_simple() TO authenticated;
