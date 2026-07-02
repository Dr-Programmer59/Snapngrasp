-- =====================================================
-- Add explanation field to flashcards table
-- =====================================================
-- This migration adds an 'explanation' column to store
-- detailed reasoning and approach for each flashcard
-- =====================================================

-- Add explanation column to flashcards table
ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS explanation TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.flashcards.explanation IS 'Detailed explanation with logical reasoning and approach to understand the answer, shown when user clicks "I dont know"';
