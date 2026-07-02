-- Create feedback_sessions table
-- This table stores AI-generated feedback for student learning sessions

CREATE TABLE IF NOT EXISTS feedback_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES uploads(id) ON DELETE SET NULL,
  
  -- Session details
  session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('mcq', 'visual', 'flashcard', 'mixed')),
  
  -- Performance metrics
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  percentage_score INTEGER NOT NULL DEFAULT 0,
  
  -- AI-generated feedback
  strong_areas JSONB DEFAULT '[]'::jsonb,
  weak_areas JSONB DEFAULT '[]'::jsonb,
  personalized_message TEXT,
  next_steps JSONB DEFAULT '[]'::jsonb,
  
  -- Raw performance data
  performance_data JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_feedback_sessions_user_id ON feedback_sessions(user_id);
CREATE INDEX idx_feedback_sessions_upload_id ON feedback_sessions(upload_id);
CREATE INDEX idx_feedback_sessions_created_at ON feedback_sessions(created_at DESC);
CREATE INDEX idx_feedback_sessions_session_type ON feedback_sessions(session_type);
CREATE INDEX idx_feedback_sessions_percentage ON feedback_sessions(percentage_score);

-- Enable Row Level Security
ALTER TABLE feedback_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON feedback_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON feedback_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own feedback
CREATE POLICY "Users can update own feedback"
  ON feedback_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own feedback
CREATE POLICY "Users can delete own feedback"
  ON feedback_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER trigger_update_feedback_sessions_updated_at
  BEFORE UPDATE ON feedback_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_sessions_updated_at();

-- Comments for documentation
COMMENT ON TABLE feedback_sessions IS 'Stores AI-generated feedback for student learning sessions';
COMMENT ON COLUMN feedback_sessions.session_type IS 'Type of learning session: mcq, visual, flashcard, or mixed';
COMMENT ON COLUMN feedback_sessions.strong_areas IS 'Array of topics where student performed well';
COMMENT ON COLUMN feedback_sessions.weak_areas IS 'Array of topics needing improvement with suggestions';
COMMENT ON COLUMN feedback_sessions.personalized_message IS 'AI-generated personalized encouragement';
COMMENT ON COLUMN feedback_sessions.next_steps IS 'Array of recommended actions for the student';
COMMENT ON COLUMN feedback_sessions.performance_data IS 'Raw performance data used for analysis';
