-- Fix: Add 'type' column to visuals table as an alias or add it directly
-- This fixes the error: column visuals.type does not exist

-- Option 1: Add a 'type' column that mirrors visual_type
ALTER TABLE public.visuals 
ADD COLUMN IF NOT EXISTS type TEXT;

-- Copy existing visual_type data to type column
UPDATE public.visuals 
SET type = visual_type 
WHERE type IS NULL;

-- Add a trigger to keep type and visual_type in sync
CREATE OR REPLACE FUNCTION sync_visual_type()
RETURNS TRIGGER AS $$
BEGIN
  NEW.type := NEW.visual_type;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_visual_type_trigger ON public.visuals;
CREATE TRIGGER sync_visual_type_trigger
BEFORE INSERT OR UPDATE ON public.visuals
FOR EACH ROW
EXECUTE FUNCTION sync_visual_type();
