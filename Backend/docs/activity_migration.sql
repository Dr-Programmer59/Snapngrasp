-- =====================================================
-- SnapNGrasp Activity Dashboard Migration
-- =====================================================
-- Adds missing columns needed J    for dashboard activity tracking
-- =====================================================

-- Create MCQ Sets table to track quiz progress at the set level
CREATE TABLE IF NOT EXISTS public.mcq_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  
  -- Set details
  title TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  
  -- Progress tracking
  total_questions INTEGER DEFAULT 0,
  questions_attempted INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  wrong_answers INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Flashcard Sets table to track flashcard progress at the set level
CREATE TABLE IF NOT EXISTS public.flashcard_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  
  -- Set details
  title TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  
  -- Progress tracking
  total_cards INTEGER DEFAULT 0,
  cards_reviewed INTEGER DEFAULT 0,
  cards_known INTEGER DEFAULT 0,
  cards_learning INTEGER DEFAULT 0,
  cards_to_review INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add set_id to existing tables
ALTER TABLE public.mcqs 
ADD COLUMN IF NOT EXISTS set_id UUID REFERENCES public.mcq_sets(id) ON DELETE CASCADE;

ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS set_id UUID REFERENCES public.flashcard_sets(id) ON DELETE CASCADE;

-- Add tracking columns to visuals table
ALTER TABLE public.visuals
ADD COLUMN IF NOT EXISTS viewed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS total_slots INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS slots_filled INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS correct_slots INTEGER DEFAULT 0;

-- Create MCQ user answers table to track individual question responses
CREATE TABLE IF NOT EXISTS public.mcq_user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcq_id UUID NOT NULL REFERENCES public.mcqs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Answer details
  selected_answer INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One answer per user per MCQ
  UNIQUE(mcq_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.mcq_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_user_answers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own mcq sets" ON public.mcq_sets;
DROP POLICY IF EXISTS "Users can insert own mcq sets" ON public.mcq_sets;
DROP POLICY IF EXISTS "Users can update own mcq sets" ON public.mcq_sets;
DROP POLICY IF EXISTS "Users can delete own mcq sets" ON public.mcq_sets;
DROP POLICY IF EXISTS "Users can view own flashcard sets" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Users can insert own flashcard sets" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Users can update own flashcard sets" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Users can delete own flashcard sets" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Users can view own mcq answers" ON public.mcq_user_answers;
DROP POLICY IF EXISTS "Users can insert own mcq answers" ON public.mcq_user_answers;
DROP POLICY IF EXISTS "Users can update own mcq answers" ON public.mcq_user_answers;

-- RLS Policies for MCQ Sets
CREATE POLICY "Users can view own mcq sets"
  ON public.mcq_sets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mcq sets"
  ON public.mcq_sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mcq sets"
  ON public.mcq_sets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mcq sets"
  ON public.mcq_sets FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for Flashcard Sets
CREATE POLICY "Users can view own flashcard sets"
  ON public.flashcard_sets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own flashcard sets"
  ON public.flashcard_sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flashcard sets"
  ON public.flashcard_sets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own flashcard sets"
  ON public.flashcard_sets FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for MCQ User Answers
CREATE POLICY "Users can view own mcq answers"
  ON public.mcq_user_answers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mcq answers"
  ON public.mcq_user_answers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mcq answers"
  ON public.mcq_user_answers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mcq_sets_user_id ON public.mcq_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_mcq_sets_upload_id ON public.mcq_sets(upload_id);
CREATE INDEX IF NOT EXISTS idx_mcq_sets_updated_at ON public.mcq_sets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_user_id ON public.flashcard_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_upload_id ON public.flashcard_sets(upload_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_updated_at ON public.flashcard_sets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcq_answers_mcq_id ON public.mcq_user_answers(mcq_id);
CREATE INDEX IF NOT EXISTS idx_mcq_answers_user_id ON public.mcq_user_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_mcqs_set_id ON public.mcqs(set_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_set_id ON public.flashcards(set_id);

-- Comments
COMMENT ON TABLE public.mcq_sets IS 'Tracks progress for MCQ quiz sets at the set level';
COMMENT ON TABLE public.flashcard_sets IS 'Tracks progress for flashcard sets at the set level';
COMMENT ON TABLE public.mcq_user_answers IS 'Stores user answers to individual MCQ questions';
COMMENT ON COLUMN public.mcq_sets.questions_attempted IS 'Number of questions the user has attempted';
COMMENT ON COLUMN public.mcq_sets.correct_answers IS 'Number of correctly answered questions';
COMMENT ON COLUMN public.mcq_sets.wrong_answers IS 'Number of incorrectly answered questions';
COMMENT ON COLUMN public.flashcard_sets.cards_reviewed IS 'Number of cards that have been reviewed at least once';
COMMENT ON COLUMN public.flashcard_sets.cards_known IS 'Number of cards marked as known/mastered (mastery >= 4)';
COMMENT ON COLUMN public.flashcard_sets.cards_learning IS 'Number of cards being learned (mastery 1-3)';
COMMENT ON COLUMN public.flashcard_sets.cards_to_review IS 'Number of cards that need review (mastery 0)';
COMMENT ON COLUMN public.flashcard_sets.progress IS 'Overall progress percentage (0-100)';
COMMENT ON COLUMN public.visuals.viewed IS 'Whether the visual has been opened/viewed by the user';
COMMENT ON COLUMN public.visuals.completed IS 'Whether all slots have been correctly filled';
COMMENT ON COLUMN public.visuals.total_slots IS 'Total number of label slots in this visual';
COMMENT ON COLUMN public.visuals.slots_filled IS 'Number of slots the user has attempted to fill';
COMMENT ON COLUMN public.visuals.correct_slots IS 'Number of slots correctly filled by the user';

-- Auto-update updated_at timestamp for MCQ Sets
CREATE OR REPLACE FUNCTION public.update_mcq_sets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mcq_sets_updated_at
  BEFORE UPDATE ON public.mcq_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mcq_sets_updated_at();

-- Auto-update updated_at timestamp for Flashcard Sets
CREATE OR REPLACE FUNCTION public.update_flashcard_sets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_flashcard_sets_updated_at
  BEFORE UPDATE ON public.flashcard_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_flashcard_sets_updated_at();
