-- =====================================================
-- SnapNGrasp Uploads Table Schema
-- =====================================================
-- This schema creates the uploads table for storing
-- user-uploaded images and extracted text via Claude Vision
-- =====================================================

-- Drop existing table if needed (use with caution)
-- DROP TABLE IF EXISTS public.uploads CASCADE;

-- Create uploads table
CREATE TABLE IF NOT EXISTS public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- File information
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  
  -- Extraction results
  extracted_text TEXT,
  extraction_confidence DECIMAL(3,2), -- 0.00 to 1.00
  extraction_metadata JSONB,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'no_text_found')),
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON public.uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON public.uploads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON public.uploads(status);
CREATE INDEX IF NOT EXISTS idx_uploads_subject ON public.uploads(subject);
CREATE INDEX IF NOT EXISTS idx_uploads_title ON public.uploads USING gin(to_tsvector('english', title));

-- Enable Row Level Security (RLS)
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can only view their own uploads
CREATE POLICY "Users can view own uploads"
  ON public.uploads
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own uploads
CREATE POLICY "Users can insert own uploads"
  ON public.uploads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own uploads
CREATE POLICY "Users can update own uploads"
  ON public.uploads
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own uploads
CREATE POLICY "Users can delete own uploads"
  ON public.uploads
  FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER uploads_updated_at
  BEFORE UPDATE ON public.uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_uploads_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uploads TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- =====================================================
-- Storage Bucket Setup (Run in Supabase Dashboard > Storage)
-- =====================================================
-- 1. Create a bucket named 'uploads' in Supabase Storage
-- 2. Set the bucket to PUBLIC or configure RLS policies for the bucket
-- 3. Configure file size limits (e.g., 10MB)
-- 4. Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- Example storage policy (adjust as needed):
/*
-- Policy: Users can upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'uploads' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own files
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'uploads' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'uploads' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);
*/

-- =====================================================
-- Useful Queries
-- =====================================================

-- View all uploads for a user
-- SELECT * FROM public.uploads WHERE user_id = 'user-uuid-here' ORDER BY created_at DESC;

-- Get upload statistics
-- SELECT 
--   COUNT(*) as total_uploads,
--   COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
--   COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
--   SUM(file_size) as total_size_bytes,
--   AVG(extraction_confidence) as avg_confidence
-- FROM public.uploads
-- WHERE user_id = 'user-uuid-here';

-- Cleanup old uploads (run periodically)
-- DELETE FROM public.uploads WHERE created_at < NOW() - INTERVAL '90 days';
