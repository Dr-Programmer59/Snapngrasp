-- =====================================================
-- SnapNGrasp Visual Slot-Based Learning Migration
-- =====================================================
-- Migration to support new slot-based labeling system
-- with chips and pre-labeled slots
-- =====================================================

-- Add new columns to visual_labels table for slot-based system
ALTER TABLE public.visual_labels 
ADD COLUMN IF NOT EXISTS label_id TEXT,
ADD COLUMN IF NOT EXISTS text TEXT,
ADD COLUMN IF NOT EXISTS hint TEXT,
ADD COLUMN IF NOT EXISTS short_hint TEXT;

-- Create visual_slots table for slot positions and metadata
CREATE TABLE IF NOT EXISTS public.visual_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visual_id UUID NOT NULL REFERENCES public.visuals(id) ON DELETE CASCADE,
  
  -- Slot identification and position
  slot_id TEXT NOT NULL, -- e.g. "slot_1", "slot_2"
  x DECIMAL(5,4) NOT NULL, -- X position as percentage (0.0 - 1.0)
  y DECIMAL(5,4) NOT NULL, -- Y position as percentage (0.0 - 1.0)
  
  -- Slot metadata
  correct_label_id TEXT NOT NULL, -- References visual_labels.label_id
  is_pre_labeled BOOLEAN DEFAULT false, -- Whether slot shows answer initially
  is_required BOOLEAN DEFAULT true, -- Whether slot must be filled for completion
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique slot_id per visual
  UNIQUE(visual_id, slot_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_visual_slots_visual_id ON public.visual_slots(visual_id);

-- Update visual_user_answers to support slot-based answers
ALTER TABLE public.visual_user_answers 
ADD COLUMN IF NOT EXISTS slot_id TEXT;

-- Add index for slot_id lookups
CREATE INDEX IF NOT EXISTS idx_visual_answers_slot_id ON public.visual_user_answers(slot_id);

-- Comments for documentation
COMMENT ON TABLE public.visual_slots IS 'Stores slot positions and metadata for slot-based visual labeling activities';
COMMENT ON COLUMN public.visual_slots.x IS 'Horizontal position as percentage (0.0 = left, 1.0 = right)';
COMMENT ON COLUMN public.visual_slots.y IS 'Vertical position as percentage (0.0 = top, 1.0 = bottom)';
COMMENT ON COLUMN public.visual_slots.is_pre_labeled IS 'If true, slot displays label text initially (example for user)';
COMMENT ON COLUMN public.visual_slots.is_required IS 'If true, slot must be correctly filled for activity completion';
COMMENT ON COLUMN public.visual_labels.label_id IS 'Unique identifier for label used in slot matching (e.g. label_1)';
COMMENT ON COLUMN public.visual_labels.text IS 'Display text for the label chip';
COMMENT ON COLUMN public.visual_labels.hint IS 'Educational explanation shown when user needs help';
COMMENT ON COLUMN public.visual_labels.short_hint IS 'Brief tooltip hint (max 8 words)';
