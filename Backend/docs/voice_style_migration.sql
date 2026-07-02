-- Add voice_style field to profiles table
-- This stores the user's preferred ElevenLabs voice agent style

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS voice_style VARCHAR(50) DEFAULT 'Chill';

-- Add comment for documentation
COMMENT ON COLUMN profiles.voice_style IS 'User preferred voice style: Chill, Fast Cram, or Teacher-Style';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_voice_style ON profiles(voice_style);
