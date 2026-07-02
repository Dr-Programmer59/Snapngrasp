# SQL Migrations Required

Run these SQL commands in your Supabase SQL Editor in this order:

## 1. Add avatar_url column (if not exists)
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
COMMENT ON COLUMN profiles.avatar_url IS 'URL of user profile photo/avatar';
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url) WHERE avatar_url IS NOT NULL;
```

## 2. Update complete_onboarding function
```sql
CREATE OR REPLACE FUNCTION complete_onboarding(
  p_style TEXT,
  p_display_name TEXT DEFAULT NULL,
  p_study_goals TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  learning_style TEXT,
  study_goals TEXT,
  onboarding_completed BOOLEAN,
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
  UPDATE profiles
  SET 
    learning_style = p_style,
    display_name = COALESCE(p_display_name, display_name),
    study_goals = COALESCE(p_study_goals, study_goals),
    onboarding_completed = TRUE,
    updated_at = NOW()
  WHERE profiles.user_id = v_user_id;

  -- Return the updated profile
  RETURN QUERY
  SELECT 
    profiles.user_id,
    profiles.email,
    profiles.display_name,
    profiles.learning_style,
    profiles.study_goals,
    profiles.onboarding_completed,
    profiles.created_at,
    profiles.updated_at
  FROM profiles
  WHERE profiles.user_id = v_user_id;
END;
$$;
```

## 3. Verify the profiles table has all required columns
```sql
-- Check if these columns exist
SELECT column_name, data_type 
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
```

If any columns are missing, add them:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS learning_style TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS study_goals TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education_level VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS institution VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
```
