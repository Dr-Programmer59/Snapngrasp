-- Run this in Supabase SQL Editor to check migration status
-- This will tell you if the tables exist and have data

-- Check if tables exist
SELECT 
  'mcq_sets' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'mcq_sets'
  ) AS exists
UNION ALL
SELECT 
  'flashcard_sets' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'flashcard_sets'
  ) AS exists
UNION ALL
SELECT 
  'mcq_user_answers' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'mcq_user_answers'
  ) AS exists;

-- If tables exist, check if they have data
-- Run these one at a time if needed:

SELECT COUNT(*) as mcq_sets_count FROM public.mcq_sets;
SELECT COUNT(*) as flashcard_sets_count FROM public.flashcard_sets;
SELECT COUNT(*) as visuals_count FROM public.visuals;

-- Check if visuals table has new columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'visuals'
  AND column_name IN ('viewed', 'completed', 'total_slots', 'slots_filled', 'correct_slots');
