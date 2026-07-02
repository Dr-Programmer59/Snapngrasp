-- Complete Users Table Setup with Social Authentication Support
-- Run this in your Supabase SQL Editor

-- First, check if the table exists and drop it if you want a fresh start (CAREFUL!)
-- DROP TABLE IF EXISTS users CASCADE;

-- Create users table with all necessary columns
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- NULL for social auth users
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  -- Social authentication columns
  apple_id TEXT UNIQUE,
  google_id TEXT UNIQUE,
  auth_provider TEXT DEFAULT 'email' NOT NULL,
  
  -- Additional profile fields
  bio TEXT,
  phone_number TEXT,
  date_of_birth DATE,
  gender TEXT,
  location TEXT,
  website TEXT,
  
  -- Account status
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Preferences
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  
  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,
  
  CONSTRAINT valid_auth_provider CHECK (auth_provider IN ('email', 'apple', 'google'))
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Add comments for documentation
COMMENT ON TABLE users IS 'User accounts with support for email and social authentication';
COMMENT ON COLUMN users.id IS 'Unique user identifier (UUID)';
COMMENT ON COLUMN users.email IS 'User email address (required for all auth methods)';
COMMENT ON COLUMN users.password_hash IS 'Hashed password (NULL for social auth users)';
COMMENT ON COLUMN users.apple_id IS 'Apple unique user identifier (sub from ID token)';
COMMENT ON COLUMN users.google_id IS 'Google unique user identifier (sub from ID token)';
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: email, apple, or google';
COMMENT ON COLUMN users.is_verified IS 'Whether the user email has been verified';
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN users.onboarding_completed IS 'Whether the user completed onboarding flow';

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (auth.uid()::text = id::text);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid()::text = id::text);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert a test user (optional - remove if not needed)
-- INSERT INTO users (email, full_name, auth_provider, is_verified)
-- VALUES ('test@example.com', 'Test User', 'email', true)
-- ON CONFLICT (email) DO NOTHING;

-- Verify table creation
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Users table created successfully with social authentication support!';
END $$;
