-- =====================================================
-- SnapNGrasp Chat Messages Table Schema
-- =====================================================
-- This schema creates the chat_messages table for storing
-- conversations between users and the AI tutor
-- =====================================================

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  
  -- Metadata
  model TEXT, -- Claude model used
  usage_tokens INTEGER, -- Total tokens used
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can only view their own chat messages
CREATE POLICY "Users can view own chat messages"
  ON public.chat_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own chat messages
CREATE POLICY "Users can insert own chat messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own chat messages
CREATE POLICY "Users can delete own chat messages"
  ON public.chat_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- =====================================================
-- Useful Queries
-- =====================================================

-- View recent chats for a user
-- SELECT * FROM public.chat_messages 
-- WHERE user_id = 'user-uuid-here' 
-- ORDER BY created_at DESC 
-- LIMIT 50;

-- Get chat statistics
-- SELECT 
--   COUNT(*) as total_messages,
--   SUM(usage_tokens) as total_tokens,
--   AVG(usage_tokens) as avg_tokens_per_message,
--   MIN(created_at) as first_chat,
--   MAX(created_at) as last_chat
-- FROM public.chat_messages
-- WHERE user_id = 'user-uuid-here';

-- Cleanup old chats (run periodically)
-- DELETE FROM public.chat_messages 
-- WHERE created_at < NOW() - INTERVAL '30 days';
