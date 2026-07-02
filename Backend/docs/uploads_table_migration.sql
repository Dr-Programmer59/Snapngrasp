-- Add missing columns to uploads table
-- Run this in Supabase SQL Editor

-- Add confidence column (alias for extraction_confidence)
ALTER TABLE uploads 
ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2);

-- Add title column for organizing uploads
ALTER TABLE uploads 
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add subject column for categorizing uploads
ALTER TABLE uploads 
ADD COLUMN IF NOT EXISTS subject TEXT;

-- Add word_count column for text statistics
ALTER TABLE uploads 
ADD COLUMN IF NOT EXISTS word_count INTEGER;

-- Make file_path, file_url, file_size, and mime_type nullable (for text uploads)
ALTER TABLE uploads 
ALTER COLUMN file_path DROP NOT NULL;

ALTER TABLE uploads 
ALTER COLUMN file_url DROP NOT NULL;

ALTER TABLE uploads 
ALTER COLUMN file_size DROP NOT NULL;

ALTER TABLE uploads 
ALTER COLUMN mime_type DROP NOT NULL;

-- Create index for title search
CREATE INDEX IF NOT EXISTS idx_uploads_title ON uploads USING gin(to_tsvector('english', title));

-- Create index for subject filtering
CREATE INDEX IF NOT EXISTS idx_uploads_subject ON uploads(subject);

-- Add comments
COMMENT ON COLUMN uploads.confidence IS 'Extraction confidence score (0.00 to 1.00)';
COMMENT ON COLUMN uploads.title IS 'User-provided or extracted title for the upload';
COMMENT ON COLUMN uploads.subject IS 'Subject/category of the upload (e.g., Math, Science)';
COMMENT ON COLUMN uploads.word_count IS 'Number of words in extracted text';

-- Verify the changes
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'uploads'
  AND column_name IN ('confidence', 'title', 'subject', 'word_count', 'file_path', 'file_url')
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Uploads table updated with missing columns!';
END $$;
