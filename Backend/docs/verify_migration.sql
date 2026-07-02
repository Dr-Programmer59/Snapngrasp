-- Quick test to verify migration was applied
-- Run this in Supabase SQL Editor to check if tables exist

-- Check if mcq_sets table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'mcq_sets'
) AS mcq_sets_exists;

-- Check if flashcard_sets table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'flashcard_sets'
) AS flashcard_sets_exists;

-- Check if mcq_user_answers table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'mcq_user_answers'
) AS mcq_user_answers_exists;

-- Check if visuals table has new columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'visuals'
  AND column_name IN ('viewed', 'completed', 'total_slots', 'slots_filled', 'correct_slots');

-- Check if you have any MCQ sets
SELECT COUNT(*) as mcq_sets_count FROM public.mcq_sets;

-- Check if you have any flashcard sets
SELECT COUNT(*) as flashcard_sets_count FROM public.flashcard_sets;

-- Check if you have any visuals
SELECT COUNT(*) as visuals_count FROM public.visuals;
