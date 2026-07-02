-- Update complete_onboarding function to include study_goals
-- Run this in your Supabase SQL editor

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
