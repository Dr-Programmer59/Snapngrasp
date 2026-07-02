-- Check mcq_options table schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'mcq_options'
ORDER BY ordinal_position;

-- Check mcqs table schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'mcqs'
ORDER BY ordinal_position;
