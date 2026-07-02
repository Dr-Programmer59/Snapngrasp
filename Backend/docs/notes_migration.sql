-- Create notes table with rich text support
-- Run this migration in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content fields
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT, -- Rich text HTML format (bold, italic, etc.)
  
  -- Organization
  tags TEXT[] DEFAULT '{}', -- Array of tags for categorization
  category VARCHAR(100), -- Category like "Biology", "Math", "History"
  upload_id UUID REFERENCES uploads(id) ON DELETE SET NULL, -- Link to related upload
  
  -- Metadata
  is_favorite BOOLEAN DEFAULT FALSE,
  color VARCHAR(20), -- Hex color for note card (e.g., "#FF5733")
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX idx_notes_is_favorite ON notes(is_favorite);
CREATE INDEX idx_notes_category ON notes(category);
CREATE INDEX idx_notes_upload_id ON notes(upload_id);
CREATE INDEX idx_notes_tags ON notes USING GIN(tags); -- GIN index for array search

-- Enable Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notes
CREATE POLICY "Users can view own notes"
  ON notes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own notes
CREATE POLICY "Users can create own notes"
  ON notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own notes
CREATE POLICY "Users can update own notes"
  ON notes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own notes
CREATE POLICY "Users can delete own notes"
  ON notes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER trigger_update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_notes_updated_at();

-- Comments for documentation
COMMENT ON TABLE notes IS 'User notes with rich text formatting support';
COMMENT ON COLUMN notes.title IS 'Note title or subject';
COMMENT ON COLUMN notes.content IS 'Plain text content of the note';
COMMENT ON COLUMN notes.content_html IS 'Rich text HTML content with formatting (bold, italic, lists, etc.)';
COMMENT ON COLUMN notes.tags IS 'Array of tags for organizing notes';
COMMENT ON COLUMN notes.category IS 'Note category or subject area';
COMMENT ON COLUMN notes.upload_id IS 'Optional reference to related upload/study material';
COMMENT ON COLUMN notes.is_favorite IS 'Whether the note is marked as favorite';
COMMENT ON COLUMN notes.color IS 'Hex color code for visual organization';
