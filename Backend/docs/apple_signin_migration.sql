-- Add Apple Sign-In and Google Sign-In support to users table
-- Run this in your Supabase SQL Editor

-- Add apple_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS apple_id TEXT UNIQUE;

-- Add google_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;

-- Add auth_provider column to track sign-in method
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Add comments for documentation
COMMENT ON COLUMN users.apple_id IS 'Apple unique user identifier (sub from ID token)';
COMMENT ON COLUMN users.google_id IS 'Google unique user identifier (sub from ID token)';
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: email, apple, google, etc.';
