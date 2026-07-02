-- =====================================================
-- MCQ Question Types Migration
-- Add support for multiple question types
-- =====================================================

-- Add question_type column to mcqs table
ALTER TABLE public.mcqs 
ADD COLUMN IF NOT EXISTS question_type VARCHAR(20) DEFAULT 'mcq' 
CHECK (question_type IN ('mcq', 'fill_blank', 'true_false'));

-- Add correct_answer_text column for fill-in-the-blank questions
ALTER TABLE public.mcqs 
ADD COLUMN IF NOT EXISTS correct_answer_text TEXT;

-- Drop the old correct_answer check constraint that doesn't allow -1
ALTER TABLE public.mcqs 
DROP CONSTRAINT IF EXISTS mcqs_correct_answer_check;

-- Add new constraint that allows -1 for fill-blank questions (no option index)
ALTER TABLE public.mcqs 
ADD CONSTRAINT mcqs_correct_answer_check 
CHECK (correct_answer >= -1 AND correct_answer <= 3);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_mcqs_question_type ON public.mcqs(question_type);

-- Update existing records to have 'mcq' type
UPDATE public.mcqs SET question_type = 'mcq' WHERE question_type IS NULL;

-- Add answer_text column to mcq_user_answers table for fill-in-the-blank answers
ALTER TABLE public.mcq_user_answers 
ADD COLUMN IF NOT EXISTS answer_text TEXT;

-- Comments for documentation
COMMENT ON COLUMN public.mcqs.question_type IS 'Type of question: mcq (multiple choice), fill_blank (fill in the blanks), true_false (true/false)';
COMMENT ON COLUMN public.mcqs.correct_answer_text IS 'Correct answer text for fill-in-the-blank questions';
COMMENT ON COLUMN public.mcq_user_answers.answer_text IS 'Text answer for fill-in-the-blank questions';

-- Verify changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'mcqs' 
AND column_name IN ('question_type', 'correct_answer_text');
