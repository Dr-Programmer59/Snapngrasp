-- ============================================
-- STUDENT PROGRESS TRACKING SYSTEM
-- ============================================

-- Drop existing tables if they exist (to fix foreign key references)
DROP TABLE IF EXISTS ai_greeting_history CASCADE;
DROP TABLE IF EXISTS user_weak_areas CASCADE;
DROP TABLE IF EXISTS daily_activities CASCADE;
DROP TABLE IF EXISTS user_streaks CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;

-- Table: user_progress
-- Tracks individual MCQ/Flashcard/Visual attempts
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES uploads(id) ON DELETE SET NULL,
  
  -- Activity type
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('mcq', 'flashcard', 'visual', 'labeled_visual')),
  
  -- Performance data
  score INTEGER NOT NULL, -- Number correct
  total INTEGER NOT NULL, -- Total questions
  percentage DECIMAL(5,2) NOT NULL, -- Calculated percentage
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
  
  -- Subject and topic for analytics
  subject VARCHAR(100),
  topic VARCHAR(255),
  
  -- Time tracking
  time_spent_seconds INTEGER, -- Time spent on activity
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user_progress
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_activity_type ON user_progress(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed_at ON user_progress(completed_at);
CREATE INDEX IF NOT EXISTS idx_user_progress_subject ON user_progress(subject);

-- Table: user_streaks
-- Tracks daily login and activity streaks
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Streak data
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  
  -- Activity requirements (for maintaining streak)
  total_check_ins INTEGER DEFAULT 0,
  total_mcqs_solved INTEGER DEFAULT 0,
  total_flashcards_reviewed INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user_streaks
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_current_streak ON user_streaks(current_streak);

-- Table: daily_activities
-- Logs daily user activities for streak calculation
CREATE TABLE IF NOT EXISTS daily_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  
  -- Daily counters
  mcqs_solved INTEGER DEFAULT 0,
  flashcards_reviewed INTEGER DEFAULT 0,
  visuals_practiced INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  
  -- Daily performance
  total_correct INTEGER DEFAULT 0,
  total_attempted INTEGER DEFAULT 0,
  
  -- First and last activity timestamps
  first_activity_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one row per user per day
  UNIQUE(user_id, activity_date)
);

-- Indexes for daily_activities
CREATE INDEX IF NOT EXISTS idx_daily_activities_user_id ON daily_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_activities_date ON daily_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_activities_user_date ON daily_activities(user_id, activity_date);

-- Table: user_weak_areas
-- Tracks subjects/topics where user needs improvement
CREATE TABLE IF NOT EXISTS user_weak_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  subject VARCHAR(100) NOT NULL,
  topic VARCHAR(255),
  
  -- Performance metrics
  attempts INTEGER DEFAULT 0,
  correct INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'needs_practice' CHECK (status IN ('needs_practice', 'improving', 'mastered')),
  
  -- Timestamps
  first_attempt_at TIMESTAMP WITH TIME ZONE,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(user_id, subject, topic)
);

-- Indexes for user_weak_areas
CREATE INDEX IF NOT EXISTS idx_weak_areas_user_id ON user_weak_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_weak_areas_accuracy ON user_weak_areas(accuracy);

-- Table: ai_greeting_history
-- Stores AI-generated greetings shown to users (for variety)
CREATE TABLE IF NOT EXISTS ai_greeting_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  greeting_text TEXT NOT NULL,
  greeting_type VARCHAR(50) CHECK (greeting_type IN ('welcome', 'motivation', 'reminder', 'achievement', 'improvement')),
  
  shown_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ai_greeting_history
CREATE INDEX IF NOT EXISTS idx_greeting_history_user_id ON ai_greeting_history(user_id);
CREATE INDEX IF NOT EXISTS idx_greeting_history_shown_at ON ai_greeting_history(shown_at);

-- ============================================
-- FUNCTIONS FOR AUTOMATIC UPDATES
-- ============================================

-- Drop existing triggers and functions if they exist
DROP TRIGGER IF EXISTS trigger_update_streak ON daily_activities;
DROP TRIGGER IF EXISTS trigger_update_weak_areas ON user_progress;
DROP FUNCTION IF EXISTS update_user_streak() CASCADE;
DROP FUNCTION IF EXISTS update_weak_areas() CASCADE;

-- Function: Update user streak
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_current_date DATE;
  v_last_date DATE;
  v_day_diff INTEGER;
BEGIN
  v_current_date := CURRENT_DATE;
  
  -- Get user's last activity date
  SELECT last_activity_date INTO v_last_date
  FROM user_streaks
  WHERE user_id = NEW.user_id;
  
  IF v_last_date IS NULL THEN
    -- First activity ever
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (NEW.user_id, 1, 1, v_current_date)
    ON CONFLICT (user_id) DO UPDATE
    SET current_streak = 1,
        longest_streak = GREATEST(user_streaks.longest_streak, 1),
        last_activity_date = v_current_date,
        updated_at = NOW();
  ELSE
    v_day_diff := v_current_date - v_last_date;
    
    IF v_day_diff = 0 THEN
      -- Same day, no streak change
      UPDATE user_streaks
      SET updated_at = NOW()
      WHERE user_id = NEW.user_id;
    ELSIF v_day_diff = 1 THEN
      -- Consecutive day, increment streak
      UPDATE user_streaks
      SET current_streak = current_streak + 1,
          longest_streak = GREATEST(longest_streak, current_streak + 1),
          last_activity_date = v_current_date,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    ELSE
      -- Streak broken, reset to 1
      UPDATE user_streaks
      SET current_streak = 1,
          last_activity_date = v_current_date,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update streak on daily activity
CREATE TRIGGER trigger_update_streak
AFTER INSERT OR UPDATE ON daily_activities
FOR EACH ROW
EXECUTE FUNCTION update_user_streak();

-- Function: Update weak areas based on performance
CREATE OR REPLACE FUNCTION update_weak_areas()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update weak area stats
  INSERT INTO user_weak_areas (user_id, subject, topic, attempts, correct, accuracy, last_attempt_at)
  VALUES (
    NEW.user_id,
    NEW.subject,
    NEW.topic,
    1,
    NEW.score,
    NEW.percentage,
    NEW.completed_at
  )
  ON CONFLICT (user_id, subject, topic) DO UPDATE
  SET attempts = user_weak_areas.attempts + 1,
      correct = user_weak_areas.correct + NEW.score,
      accuracy = ((user_weak_areas.correct + NEW.score)::DECIMAL / (user_weak_areas.attempts + 1) / 
                  (SELECT AVG(total) FROM user_progress WHERE user_id = NEW.user_id AND subject = NEW.subject)) * 100,
      status = CASE
        WHEN ((user_weak_areas.correct + NEW.score)::DECIMAL / (user_weak_areas.attempts + 1) / 
              (SELECT AVG(total) FROM user_progress WHERE user_id = NEW.user_id AND subject = NEW.subject)) * 100 >= 80 THEN 'mastered'
        WHEN ((user_weak_areas.correct + NEW.score)::DECIMAL / (user_weak_areas.attempts + 1) / 
              (SELECT AVG(total) FROM user_progress WHERE user_id = NEW.user_id AND subject = NEW.subject)) * 100 >= 60 THEN 'improving'
        ELSE 'needs_practice'
      END,
      last_attempt_at = NEW.completed_at,
      updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update weak areas on progress insert
CREATE TRIGGER trigger_update_weak_areas
AFTER INSERT ON user_progress
FOR EACH ROW
WHEN (NEW.subject IS NOT NULL)
EXECUTE FUNCTION update_weak_areas();

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_weak_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_greeting_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS user_progress_policy ON user_progress;
DROP POLICY IF EXISTS user_streaks_policy ON user_streaks;
DROP POLICY IF EXISTS daily_activities_policy ON daily_activities;
DROP POLICY IF EXISTS user_weak_areas_policy ON user_weak_areas;
DROP POLICY IF EXISTS ai_greeting_history_policy ON ai_greeting_history;

-- Policies: Users can only access their own data
CREATE POLICY user_progress_policy ON user_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_streaks_policy ON user_streaks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY daily_activities_policy ON daily_activities
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_weak_areas_policy ON user_weak_areas
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY ai_greeting_history_policy ON ai_greeting_history
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View: User overall statistics
CREATE OR REPLACE VIEW user_overall_stats AS
SELECT 
  user_id,
  COUNT(*) as total_activities,
  SUM(score) as total_correct,
  SUM(total) as total_attempted,
  AVG(percentage) as average_percentage,
  MAX(completed_at) as last_activity,
  SUM(time_spent_seconds) as total_time_spent
FROM user_progress
GROUP BY user_id;

-- View: Subject-wise performance
CREATE OR REPLACE VIEW user_subject_performance AS
SELECT 
  user_id,
  subject,
  COUNT(*) as attempts,
  AVG(percentage) as average_percentage,
  MAX(percentage) as best_score,
  MIN(percentage) as lowest_score
FROM user_progress
WHERE subject IS NOT NULL
GROUP BY user_id, subject;
