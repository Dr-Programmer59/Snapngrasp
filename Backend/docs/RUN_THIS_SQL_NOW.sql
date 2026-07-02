-- Complete Onboarding Setup
-- Run this ENTIRE script in your Supabase SQL Editor

-- Step 1: Ensure all required columns exist in profiles table
DO $$ 
BEGIN
    -- Add avatar_url if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
        COMMENT ON COLUMN profiles.avatar_url IS 'URL of user profile photo/avatar';
    END IF;

    -- Add display_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='display_name') THEN
        ALTER TABLE profiles ADD COLUMN display_name TEXT;
    END IF;

    -- Add learning_style if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='learning_style') THEN
        ALTER TABLE profiles ADD COLUMN learning_style TEXT;
    END IF;

    -- Add study_goals if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='study_goals') THEN
        ALTER TABLE profiles ADD COLUMN study_goals TEXT;
    END IF;

    -- Add bio if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='bio') THEN
        ALTER TABLE profiles ADD COLUMN bio TEXT;
    END IF;

    -- Add phone_number if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone_number') THEN
        ALTER TABLE profiles ADD COLUMN phone_number VARCHAR(20);
    END IF;

    -- Add education_level if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='education_level') THEN
        ALTER TABLE profiles ADD COLUMN education_level VARCHAR(50);
    END IF;

    -- Add institution if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='institution') THEN
        ALTER TABLE profiles ADD COLUMN institution VARCHAR(255);
    END IF;

    -- Add onboarding_completed if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='onboarding_completed') THEN
        ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Step 2: Drop and recreate the complete_onboarding function
DROP FUNCTION IF EXISTS complete_onboarding(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION complete_onboarding(
  p_style TEXT,
  p_display_name TEXT DEFAULT NULL,
  p_study_goals TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  role user_role,
  learning_style learning_style,
  study_goals TEXT,
  bio TEXT,
  phone_number VARCHAR(20),
  education_level VARCHAR(50),
  institution VARCHAR(255),
  onboarding_completed BOOLEAN,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the current user's ID from auth.users
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update the profile with onboarding data
  UPDATE profiles p
  SET 
    learning_style = p_style::learning_style,
    display_name = COALESCE(p_display_name, p.display_name),
    study_goals = COALESCE(p_study_goals, p.study_goals),
    onboarding_completed = TRUE,
    updated_at = NOW()
  WHERE p.user_id = v_user_id;

  -- Return the updated profile
  RETURN QUERY
  SELECT 
    p.user_id,
    p.email,
    p.display_name,
    p.avatar_url,
    p.role,
    p.learning_style,
    p.study_goals,
    p.bio,
    p.phone_number,
    p.education_level,
    p.institution,
    p.onboarding_completed,
    p.last_login_at,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.user_id = v_user_id;
END;
$$;

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url) WHERE avatar_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_learning_style ON profiles(learning_style) WHERE learning_style IS NOT NULL;

-- Step 4: Verify the function was created
SELECT 
  routine_name, 
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'complete_onboarding';

-- Step 5: Verify all columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN (
    'avatar_url',
    'display_name',
    'learning_style',
    'study_goals',
    'bio',
    'phone_number',
    'education_level',
    'institution',
    'onboarding_completed'
  )
ORDER BY column_name;
