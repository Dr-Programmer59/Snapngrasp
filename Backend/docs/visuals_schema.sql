-- =====================================================
-- SnapNGrasp Visual Question Cards Schema
-- =====================================================
-- This schema creates tables for storing visual learning cards
-- (labeled diagrams, process flows, charts) generated from notes
-- =====================================================

-- Drop existing tables if needed (use with caution)
-- DROP TABLE IF EXISTS public.visual_user_answers CASCADE;
-- DROP TABLE IF EXISTS public.visual_options CASCADE;
-- DROP TABLE IF EXISTS public.visual_labels CASCADE;
-- DROP TABLE IF EXISTS public.visuals CASCADE;

-- Create Visuals table
CREATE TABLE IF NOT EXISTS public.visuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  
  -- Visual content
  title TEXT NOT NULL, -- e.g. "Human brain anatomy", "Water cycle"
  question_text TEXT NOT NULL, -- e.g. "Select the correct label for each part"
  visual_type TEXT NOT NULL CHECK (visual_type IN ('label_diagram', 'process_flow', 'chart_labels', 'timeline', 'concept_map')),
  subject TEXT, -- e.g. "Biology", "Physics", "History"
  
  -- Image generation
  image_prompt TEXT NOT NULL, -- Prompt sent to Google Imagen API
  image_url TEXT, -- URL of generated image
  base_image_url TEXT, -- URL of base image if uploaded
  generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
  
  -- Instructions and metadata
  instruction_text TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  total_steps INTEGER DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Visual Labels table (parts to identify in the visual)
CREATE TABLE IF NOT EXISTS public.visual_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visual_id UUID NOT NULL REFERENCES public.visuals(id) ON DELETE CASCADE,
  
  -- Label details
  name TEXT NOT NULL, -- e.g. "Frontal Lobe", "Mitochondria"
  description TEXT, -- Optional explanation
  position_x DECIMAL(5,2), -- X coordinate (0-100 percentage)
  position_y DECIMAL(5,2), -- Y coordinate (0-100 percentage)
  slot_index INTEGER, -- Alternative to x,y for ordered layouts
  is_correct_answer BOOLEAN DEFAULT true, -- For tracking which are real vs distractors
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Visual Options table (selectable answers)
CREATE TABLE IF NOT EXISTS public.visual_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visual_id UUID NOT NULL REFERENCES public.visuals(id) ON DELETE CASCADE,
  
  -- Option details
  option_text TEXT NOT NULL, -- e.g. "Frontal Lobe"
  is_correct BOOLEAN DEFAULT false, -- True if it's a real label, false if distractor
  option_index INTEGER, -- Display order
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique option index per visual
  UNIQUE(visual_id, option_index)
);

-- Create Visual User Answers table (track user progress)
CREATE TABLE IF NOT EXISTS public.visual_user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visual_id UUID NOT NULL REFERENCES public.visuals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.visual_labels(id) ON DELETE CASCADE,
  
  -- Answer details
  selected_option TEXT NOT NULL, -- What the user selected
  is_correct BOOLEAN NOT NULL, -- Whether they got it right
  time_taken_seconds INTEGER, -- How long they took
  
  -- Timestamps
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_visuals_user_id ON public.visuals(user_id);
CREATE INDEX IF NOT EXISTS idx_visuals_upload_id ON public.visuals(upload_id);
CREATE INDEX IF NOT EXISTS idx_visuals_created_at ON public.visuals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visuals_status ON public.visuals(generation_status);
CREATE INDEX IF NOT EXISTS idx_visual_labels_visual_id ON public.visual_labels(visual_id);
CREATE INDEX IF NOT EXISTS idx_visual_options_visual_id ON public.visual_options(visual_id);
CREATE INDEX IF NOT EXISTS idx_visual_answers_visual_id ON public.visual_user_answers(visual_id);
CREATE INDEX IF NOT EXISTS idx_visual_answers_user_id ON public.visual_user_answers(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.visuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_user_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Visuals

CREATE POLICY "Users can view own visuals"
  ON public.visuals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own visuals"
  ON public.visuals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own visuals"
  ON public.visuals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own visuals"
  ON public.visuals
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for Visual Labels

CREATE POLICY "Users can view labels for own visuals"
  ON public.visual_labels
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.visuals
      WHERE visuals.id = visual_labels.visual_id
      AND visuals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert labels for own visuals"
  ON public.visual_labels
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.visuals
      WHERE visuals.id = visual_labels.visual_id
      AND visuals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete labels for own visuals"
  ON public.visual_labels
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.visuals
      WHERE visuals.id = visual_labels.visual_id
      AND visuals.user_id = auth.uid()
    )
  );

-- RLS Policies for Visual Options

CREATE POLICY "Users can view options for own visuals"
  ON public.visual_options
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.visuals
      WHERE visuals.id = visual_options.visual_id
      AND visuals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert options for own visuals"
  ON public.visual_options
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.visuals
      WHERE visuals.id = visual_options.visual_id
      AND visuals.user_id = auth.uid()
    )
  );

-- RLS Policies for Visual User Answers

CREATE POLICY "Users can view own answers"
  ON public.visual_user_answers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answers"
  ON public.visual_user_answers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own answers"
  ON public.visual_user_answers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_visuals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER visuals_updated_at
  BEFORE UPDATE ON public.visuals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_visuals_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visuals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visual_labels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visual_options TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visual_user_answers TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- =====================================================
-- Useful Queries
-- =====================================================

-- Get complete visual with labels and options
/*
SELECT 
  v.id,
  v.title,
  v.question_text,
  v.visual_type,
  v.image_url,
  v.instruction_text,
  v.total_steps,
  json_agg(
    DISTINCT jsonb_build_object(
      'id', l.id,
      'name', l.name,
      'description', l.description,
      'position_x', l.position_x,
      'position_y', l.position_y,
      'slot_index', l.slot_index
    )
  ) FILTER (WHERE l.id IS NOT NULL) as labels,
  json_agg(
    DISTINCT jsonb_build_object(
      'id', o.id,
      'option_text', o.option_text,
      'option_index', o.option_index
    ) ORDER BY o.option_index
  ) FILTER (WHERE o.id IS NOT NULL) as options
FROM public.visuals v
LEFT JOIN public.visual_labels l ON v.id = l.visual_id
LEFT JOIN public.visual_options o ON v.id = o.visual_id
WHERE v.id = 'visual-uuid-here'
GROUP BY v.id;
*/

-- Get user's progress on a visual
/*
SELECT 
  v.title,
  v.total_steps,
  COUNT(DISTINCT va.label_id) as completed_steps,
  SUM(CASE WHEN va.is_correct THEN 1 ELSE 0 END) as correct_answers,
  COUNT(*) as total_attempts,
  ROUND(AVG(va.time_taken_seconds), 2) as avg_time_seconds
FROM public.visuals v
LEFT JOIN public.visual_user_answers va ON v.id = va.visual_id
WHERE v.id = 'visual-uuid-here' AND va.user_id = 'user-uuid-here'
GROUP BY v.id, v.title, v.total_steps;
*/

-- Get all visuals for an upload
/*
SELECT 
  v.*,
  COUNT(DISTINCT l.id) as label_count,
  COUNT(DISTINCT o.id) as option_count
FROM public.visuals v
LEFT JOIN public.visual_labels l ON v.id = l.visual_id
LEFT JOIN public.visual_options o ON v.id = o.visual_id
WHERE v.upload_id = 'upload-uuid-here'
GROUP BY v.id
ORDER BY v.created_at DESC;
*/

-- Get visuals by subject
/*
SELECT subject, COUNT(*) as count
FROM public.visuals
WHERE user_id = 'user-uuid-here'
GROUP BY subject
ORDER BY count DESC;
*/

-- =====================================================
-- Example Data Insert
-- =====================================================
/*
-- Insert a sample visual with labels and options
WITH new_visual AS (
  INSERT INTO public.visuals (
    user_id, upload_id, title, question_text, visual_type, subject,
    image_prompt, instruction_text, total_steps
  )
  VALUES (
    'user-uuid-here',
    'upload-uuid-here',
    'Human brain anatomy',
    'Select the correct label for each part',
    'label_diagram',
    'Biology',
    'Detailed anatomical diagram of human brain, sagittal view, labeled educational style',
    'Note: Select the label you want to practice, then choose the correct element.',
    5
  )
  RETURNING id
),
labels AS (
  INSERT INTO public.visual_labels (visual_id, name, description, position_x, position_y, slot_index)
  SELECT 
    new_visual.id,
    label_data.name,
    label_data.description,
    label_data.x,
    label_data.y,
    label_data.idx
  FROM new_visual
  CROSS JOIN (
    VALUES 
      ('Frontal Lobe', 'Controls reasoning and movement', 25.0, 30.0, 0),
      ('Limbic Lobe', 'Involved in emotion and memory', 50.0, 45.0, 1),
      ('Occipital Lobe', 'Processes visual information', 75.0, 35.0, 2),
      ('Cerebellum', 'Coordinates movement and balance', 60.0, 70.0, 3),
      ('Spinal Cord', 'Transmits signals between brain and body', 50.0, 90.0, 4)
  ) AS label_data(name, description, x, y, idx)
  RETURNING id, name
)
INSERT INTO public.visual_options (visual_id, option_text, is_correct, option_index)
SELECT 
  new_visual.id,
  option_data.text,
  option_data.correct,
  option_data.idx
FROM new_visual
CROSS JOIN (
  VALUES 
    ('Frontal Lobe', true, 0),
    ('Parietal Lobe', false, 1),
    ('Temporal Lobe', false, 2),
    ('Limbic Lobe', true, 3),
    ('Occipital Lobe', true, 4),
    ('Cerebellum', true, 5),
    ('Spinal Cord', true, 6)
) AS option_data(text, correct, idx);
*/
