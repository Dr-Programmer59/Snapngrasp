-- Create folders table for organizing notes
-- Run this migration in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Folder details
  name VARCHAR(255) NOT NULL,
  color VARCHAR(20), -- Hex color for folder icon
  icon VARCHAR(50), -- Icon name (e.g., "folder-outline", "book-outline")
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT folder_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Add folder_id to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_created_at ON folders(created_at DESC);
CREATE INDEX idx_notes_folder_id ON notes(folder_id);

-- Enable Row Level Security
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own folders
CREATE POLICY "Users can view own folders"
  ON folders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own folders
CREATE POLICY "Users can create own folders"
  ON folders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own folders
CREATE POLICY "Users can update own folders"
  ON folders
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own folders
CREATE POLICY "Users can delete own folders"
  ON folders
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_folder_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_folder_timestamp
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_updated_at();
