-- =====================================================
-- SnapNGrasp Labeled Visual MCQ System Migration
-- =====================================================
-- Migration to support new labeled diagram system with
-- AI-generated MCQ questions for hidden labels
-- =====================================================

-- Add new JSONB columns to visuals table for labeled diagram system
ALTER TABLE public.visuals 
ADD COLUMN IF NOT EXISTS all_labels JSONB,
ADD COLUMN IF NOT EXISTS questions JSONB,
ADD COLUMN IF NOT EXISTS correct_answers JSONB;

-- Make question_text nullable since new labeled system uses questions JSONB instead
ALTER TABLE public.visuals 
ALTER COLUMN question_text DROP NOT NULL;

-- Update visual_type CHECK constraint to allow 'labeled_diagram'
ALTER TABLE public.visuals 
DROP CONSTRAINT IF EXISTS visuals_visual_type_check;

ALTER TABLE public.visuals 
ADD CONSTRAINT visuals_visual_type_check 
CHECK (visual_type IN ('label_diagram', 'labeled_diagram', 'process_flow', 'chart_labels', 'timeline', 'concept_map'));

-- Add comments for documentation
COMMENT ON COLUMN public.visuals.all_labels IS 'Array of label objects with label_number, part_name, is_hidden';
COMMENT ON COLUMN public.visuals.questions IS 'Array of MCQ question objects for hidden labels with options and explanations';
COMMENT ON COLUMN public.visuals.correct_answers IS 'Optional array of correct answers for quick reference';

-- Example structure for all_labels:
-- [
--   {
--     "label_number": 1,
--     "part_name": "Left Atrium",
--     "is_hidden": false
--   },
--   {
--     "label_number": 2,
--     "part_name": "Right Ventricle",
--     "is_hidden": true
--   }
-- ]

-- Example structure for questions:
-- [
--   {
--     "label_number": 2,
--     "question": "What is label number 2?",
--     "options": ["Right Ventricle", "Left Atrium", "Aorta", "Pulmonary Artery"],
--     "correct_answer": "Right Ventricle",
--     "explanation": "The right ventricle pumps blood to the lungs..."
--   }
-- ]

-- =====================================================
-- Run this migration in your Supabase SQL Editor
-- =====================================================
