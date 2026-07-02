-- =====================================================
-- SnapNGrasp MCQs Table Schema
-- =====================================================
-- This schema creates tables for storing MCQs (multiple choice questions)
-- generated from uploaded images using Claude AI
-- =====================================================

-- Drop existing tables if needed (use with caution)
-- DROP TABLE IF EXISTS public.mcq_options CASCADE;
-- DROP TABLE IF EXISTS public.mcqs CASCADE;

-- Create MCQs table
CREATE TABLE IF NOT EXISTS public.mcqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  
  -- Question details
  question TEXT NOT NULL,
  correct_answer INTEGER NOT NULL CHECK (correct_answer >= 0 AND correct_answer <= 3),
  explanation TEXT,
  
  -- Metadata
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  topic TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create MCQ Options table (4 options per question)
CREATE TABLE IF NOT EXISTS public.mcq_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcq_id UUID NOT NULL REFERENCES public.mcqs(id) ON DELETE CASCADE,
  
  -- Option details
  option_index INTEGER NOT NULL CHECK (option_index >= 0 AND option_index <= 3),
  option_text TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique option index per MCQ
  UNIQUE(mcq_id, option_index)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mcqs_user_id ON public.mcqs(user_id);
CREATE INDEX IF NOT EXISTS idx_mcqs_upload_id ON public.mcqs(upload_id);
CREATE INDEX IF NOT EXISTS idx_mcqs_created_at ON public.mcqs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcq_options_mcq_id ON public.mcq_options(mcq_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.mcqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies for MCQs

-- Policy: Users can only view their own MCQs
CREATE POLICY "Users can view own mcqs"
  ON public.mcqs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own MCQs
CREATE POLICY "Users can insert own mcqs"
  ON public.mcqs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own MCQs
CREATE POLICY "Users can update own mcqs"
  ON public.mcqs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own MCQs
CREATE POLICY "Users can delete own mcqs"
  ON public.mcqs
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for MCQ Options

-- Policy: Users can view options for their MCQs
CREATE POLICY "Users can view own mcq options"
  ON public.mcq_options
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mcqs
      WHERE mcqs.id = mcq_options.mcq_id
      AND mcqs.user_id = auth.uid()
    )
  );

-- Policy: Users can insert options for their MCQs
CREATE POLICY "Users can insert own mcq options"
  ON public.mcq_options
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mcqs
      WHERE mcqs.id = mcq_options.mcq_id
      AND mcqs.user_id = auth.uid()
    )
  );

-- Policy: Users can delete options for their MCQs
CREATE POLICY "Users can delete own mcq options"
  ON public.mcq_options
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.mcqs
      WHERE mcqs.id = mcq_options.mcq_id
      AND mcqs.user_id = auth.uid()
    )
  );

-- Auto-update updated_at timestamp for MCQs
CREATE OR REPLACE FUNCTION public.update_mcqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mcqs_updated_at
  BEFORE UPDATE ON public.mcqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mcqs_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcqs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcq_options TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- =====================================================
-- Useful Queries
-- =====================================================

-- View all MCQs for a specific upload with options
/*
SELECT 
  m.id,
  m.question,
  m.correct_answer,
  m.explanation,
  m.difficulty,
  json_agg(
    json_build_object(
      'index', o.option_index,
      'text', o.option_text
    ) ORDER BY o.option_index
  ) as options
FROM public.mcqs m
LEFT JOIN public.mcq_options o ON m.id = o.mcq_id
WHERE m.upload_id = 'upload-uuid-here'
GROUP BY m.id, m.question, m.correct_answer, m.explanation, m.difficulty
ORDER BY m.created_at;
*/

-- Get MCQ statistics for a user
/*
SELECT 
  COUNT(*) as total_mcqs,
  COUNT(DISTINCT upload_id) as uploads_with_mcqs,
  COUNT(CASE WHEN difficulty = 'easy' THEN 1 END) as easy_count,
  COUNT(CASE WHEN difficulty = 'medium' THEN 1 END) as medium_count,
  COUNT(CASE WHEN difficulty = 'hard' THEN 1 END) as hard_count
FROM public.mcqs
WHERE user_id = 'user-uuid-here';
*/

-- Delete all MCQs for a specific upload (cascades to options)
/*
DELETE FROM public.mcqs WHERE upload_id = 'upload-uuid-here';
*/

-- =====================================================
-- Example Data Insert
-- =====================================================
/*
-- Insert a sample MCQ with options
WITH new_mcq AS (
  INSERT INTO public.mcqs (user_id, upload_id, question, correct_answer, explanation, difficulty)
  VALUES (
    'user-uuid-here',
    'upload-uuid-here',
    'What is the powerhouse of the cell?',
    1,
    'Mitochondria are called the powerhouse of the cell because they generate ATP through cellular respiration.',
    'easy'
  )
  RETURNING id
)
INSERT INTO public.mcq_options (mcq_id, option_index, option_text)
SELECT 
  new_mcq.id,
  option_data.idx,
  option_data.text
FROM new_mcq
CROSS JOIN (
  VALUES 
    (0, 'Nucleus'),
    (1, 'Mitochondria'),
    (2, 'Ribosome'),
    (3, 'Endoplasmic Reticulum')
) AS option_data(idx, text);
*/
