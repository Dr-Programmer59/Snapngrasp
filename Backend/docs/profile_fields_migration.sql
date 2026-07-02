-- Add additional profile fields for user customization
-- Run this migration in your Supabase SQL editor

-- Add new columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS study_goals TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education_level VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS institution VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';

-- Add comments for documentation
COMMENT ON COLUMN profiles.study_goals IS 'User''s study goals and objectives';
COMMENT ON COLUMN profiles.bio IS 'User biography or about section';
COMMENT ON COLUMN profiles.phone_number IS 'User phone number for contact';
COMMENT ON COLUMN profiles.date_of_birth IS 'User date of birth';
COMMENT ON COLUMN profiles.education_level IS 'Current education level (e.g., high school, undergraduate, graduate)';
COMMENT ON COLUMN profiles.institution IS 'School, college, or university name';
COMMENT ON COLUMN profiles.preferred_language IS 'Preferred language code (e.g., en, es, fr)';

-- Create index on preferred_language for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language ON profiles(preferred_language);
