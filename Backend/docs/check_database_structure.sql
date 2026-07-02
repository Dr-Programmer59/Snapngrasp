-- Diagnostic: Check existing database structure
-- Run this first to see what tables and columns exist

-- 1. List all tables in your database
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. If users table exists, show its structure
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check for any auth-related tables
SELECT 
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%user%' OR table_name LIKE '%auth%')
ORDER BY table_name;

-- 4. Check if you're using Supabase Auth (auth.users)
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'auth'
ORDER BY ordinal_position;
