-- =====================================================
-- SnapNGrasp Flashcards Table Schema
-- =====================================================
-- This schema creates tables for storing flashcards
-- generated from uploaded images using Claude AI
-- =====================================================

-- Drop existing tables if needed (use with caution)
-- DROP TABLE IF EXISTS public.flashcards CASCADE;

-- Create Flashcards table
CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  
  -- Flashcard content
  front TEXT NOT NULL, -- Question / Term / Prompt
  back TEXT NOT NULL,  -- Answer / Explanation / Definition
  
  -- Metadata
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  topic TEXT,
  tags TEXT[], -- Array of tags for categorization
  
  -- Study tracking
  times_reviewed INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 5), -- 0 = not learned, 5 = mastered
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_upload_id ON public.flashcards(upload_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_created_at ON public.flashcards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashcards_mastery_level ON public.flashcards(mastery_level);
CREATE INDEX IF NOT EXISTS idx_flashcards_last_reviewed ON public.flashcards(last_reviewed_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Flashcards

-- Policy: Users can only view their own flashcards
CREATE POLICY "Users can view own flashcards"
  ON public.flashcards
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own flashcards
CREATE POLICY "Users can insert own flashcards"
  ON public.flashcards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own flashcards
CREATE POLICY "Users can update own flashcards"
  ON public.flashcards
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own flashcards
CREATE POLICY "Users can delete own flashcards"
  ON public.flashcards
  FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp for Flashcards
CREATE OR REPLACE FUNCTION public.update_flashcards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER flashcards_updated_at
  BEFORE UPDATE ON public.flashcards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_flashcards_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcards TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- =====================================================
-- Useful Queries
-- =====================================================

-- View all flashcards for a specific upload
/*
SELECT 
  id,
  front,
  back,
  difficulty,
  topic,
  tags,
  mastery_level,
  times_reviewed,
  times_correct,
  CASE 
    WHEN times_reviewed > 0 THEN ROUND((times_correct::DECIMAL / times_reviewed) * 100, 2)
    ELSE 0 
  END as accuracy_percentage,
  created_at
FROM public.flashcards
WHERE upload_id = 'upload-uuid-here'
ORDER BY created_at;
*/

-- Get flashcards that need review (not mastered)
/*
SELECT *
FROM public.flashcards
WHERE user_id = 'user-uuid-here'
  AND mastery_level < 5
  AND (last_reviewed_at IS NULL OR last_reviewed_at < NOW() - INTERVAL '1 day')
ORDER BY mastery_level ASC, last_reviewed_at ASC NULLS FIRST
LIMIT 20;
*/

-- Get flashcard statistics for a user
/*
SELECT 
  COUNT(*) as total_flashcards,
  COUNT(DISTINCT upload_id) as uploads_with_flashcards,
  SUM(times_reviewed) as total_reviews,
  ROUND(AVG(mastery_level), 2) as avg_mastery_level,
  COUNT(CASE WHEN mastery_level >= 4 THEN 1 END) as mastered_count,
  COUNT(CASE WHEN difficulty = 'easy' THEN 1 END) as easy_count,
  COUNT(CASE WHEN difficulty = 'medium' THEN 1 END) as medium_count,
  COUNT(CASE WHEN difficulty = 'hard' THEN 1 END) as hard_count
FROM public.flashcards
WHERE user_id = 'user-uuid-here';
*/

-- Get flashcards by topic
/*
SELECT topic, COUNT(*) as count
FROM public.flashcards
WHERE user_id = 'user-uuid-here'
GROUP BY topic
ORDER BY count DESC;
*/

-- Update flashcard review statistics (after user reviews)
/*
UPDATE public.flashcards
SET 
  times_reviewed = times_reviewed + 1,
  times_correct = times_correct + CASE WHEN :is_correct THEN 1 ELSE 0 END,
  last_reviewed_at = NOW(),
  mastery_level = CASE 
    WHEN :is_correct AND mastery_level < 5 THEN mastery_level + 1
    WHEN NOT :is_correct AND mastery_level > 0 THEN mastery_level - 1
    ELSE mastery_level
  END
WHERE id = 'flashcard-uuid-here';
*/

-- Delete all flashcards for a specific upload
/*
DELETE FROM public.flashcards WHERE upload_id = 'upload-uuid-here';
*/

-- =====================================================
-- Example Data Insert
-- =====================================================
/*
-- Insert sample flashcards
INSERT INTO public.flashcards (user_id, upload_id, front, back, difficulty, topic, tags)
VALUES 
  (
    'user-uuid-here',
    'upload-uuid-here',
    'What is the powerhouse of the cell?',
    'Mitochondria - They generate ATP through cellular respiration, providing energy for cellular processes.',
    'easy',
    'Cell Biology',
    ARRAY['biology', 'cells', 'organelles']
  ),
  (
    'user-uuid-here',
    'upload-uuid-here',
    'What is photosynthesis?',
    'The process by which plants convert light energy into chemical energy (glucose) using chlorophyll in chloroplasts. Formula: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂',
    'medium',
    'Plant Biology',
    ARRAY['biology', 'plants', 'photosynthesis']
  ),
  (
    'user-uuid-here',
    'upload-uuid-here',
    'Explain the difference between mitosis and meiosis',
    'Mitosis: produces 2 identical diploid cells for growth/repair. Meiosis: produces 4 non-identical haploid cells (gametes) for sexual reproduction. Meiosis has two divisions while mitosis has one.',
    'hard',
    'Cell Division',
    ARRAY['biology', 'cell division', 'genetics']
  );
*/

-- =====================================================
-- Spaced Repetition Algorithm Helper
-- =====================================================
/*
-- Function to calculate next review date based on mastery level
CREATE OR REPLACE FUNCTION calculate_next_review(mastery INTEGER)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  RETURN CASE mastery
    WHEN 0 THEN NOW() + INTERVAL '1 hour'    -- New card
    WHEN 1 THEN NOW() + INTERVAL '4 hours'   -- Seen once
    WHEN 2 THEN NOW() + INTERVAL '1 day'     -- Getting it
    WHEN 3 THEN NOW() + INTERVAL '3 days'    -- Know it
    WHEN 4 THEN NOW() + INTERVAL '1 week'    -- Know it well
    WHEN 5 THEN NOW() + INTERVAL '2 weeks'   -- Mastered
    ELSE NOW() + INTERVAL '1 day'
  END;
END;
$$ LANGUAGE plpgsql;
*/
