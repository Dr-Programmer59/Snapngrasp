-- Add avatar_url column to profiles table
-- Run this migration in your Supabase SQL editor

-- Add avatar_url column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.avatar_url IS 'URL of user profile photo/avatar';

-- Create index for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url) WHERE avatar_url IS NOT NULL;

-- You may also want to create a storage bucket for profile photos in Supabase Storage
-- Go to Storage > Create Bucket > Name: "avatars" > Public: true
