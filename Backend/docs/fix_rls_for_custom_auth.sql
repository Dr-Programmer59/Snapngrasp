-- Fix RLS Policies for Custom Authentication
-- Run this after creating the users table

-- Drop the existing policies that won't work with custom auth
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Option 1: Disable RLS completely (simplest for custom auth with backend)
-- Uncomment this if your backend handles all authorization:
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Option 2: Create a service role policy (if you want to keep RLS enabled)
-- This allows your backend service role to access all users
-- Uncomment these lines if you prefer to keep RLS:

-- CREATE POLICY "Service role has full access" ON users
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- CREATE POLICY "Allow insert for service role" ON users
--   FOR INSERT
--   WITH CHECK (true);

-- Verify RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'users' AND schemaname = 'public';

-- Show current policies (should be empty if RLS is disabled)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'users' AND schemaname = 'public';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies fixed for custom authentication!';
  RAISE NOTICE 'Your backend can now access the users table directly.';
END $$;
