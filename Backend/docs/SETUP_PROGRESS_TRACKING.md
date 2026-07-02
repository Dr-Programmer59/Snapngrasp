# Progress Tracking System Setup

## ⚠️ IMPORTANT: Database Schema Required

The 500 error on check-in is because the database tables haven't been created yet.

## Setup Steps

### 1. Apply Database Schema

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Open the file: `Backend/docs/progress_tracking_schema.sql`
4. Copy the entire SQL content
5. Paste it into the Supabase SQL Editor
6. Click **Run** to execute the SQL

This will create:
- ✅ `user_progress` table - Individual activity tracking
- ✅ `user_streaks` table - Streak management
- ✅ `daily_activities` table - Daily check-in records
- ✅ `user_weak_areas` table - Performance analysis
- ✅ `ai_greeting_history` table - AI greeting log
- ✅ Triggers for automatic updates
- ✅ Indexes for performance

### 2. Verify Tables Created

Run this query in Supabase SQL Editor to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_progress', 
  'user_streaks', 
  'daily_activities', 
  'user_weak_areas', 
  'ai_greeting_history'
);
```

You should see all 5 tables listed.

### 3. Test Check-in

After applying the schema:
1. Restart the backend server (if running)
2. Refresh the mobile app
3. The check-in should now work without 500 error
4. AI greeting modal should appear on first check-in of the day

## Features After Setup

✨ **Daily Check-in**: Automatic when user opens app
🔥 **Streak System**: Snapchat-style daily maintenance
🤖 **AI Greetings**: Personalized messages from Claude
📊 **Progress Tracking**: MCQ, Flashcard, Visual activity logging
📈 **Performance Analysis**: Subject-wise weak area detection
🎯 **Context-aware**: AI considers your streak, performance, weak areas

## Troubleshooting

### Still getting 500 error?

1. **Check RLS Policies**: Make sure authenticated users can insert/select from these tables
2. **Check User ID**: Verify the user_id from token matches users table format
3. **Backend Logs**: Check backend console for specific error message

### RLS Policy Template (if needed)

If you get permission errors, apply these RLS policies:

```sql
-- Enable RLS on all tables
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_weak_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_greeting_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own data
CREATE POLICY "Users can manage own progress" ON user_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own streaks" ON user_streaks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own daily activities" ON daily_activities
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own weak areas" ON user_weak_areas
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own greeting history" ON ai_greeting_history
  FOR ALL USING (auth.uid() = user_id);
```

## Next Steps After Setup

Once check-in works:

1. **Test AI Greeting**: First check-in should show greeting modal
2. **Test Multiple Days**: Check-in on consecutive days to test streak
3. **Test Progress Logging**: Complete an MCQ/Flashcard to log progress
4. **View Statistics**: Check dashboard for updated stats

## System Architecture

```
Frontend (Dashboard) → API (/api/progress/check-in)
                       ↓
                    Controller (dailyCheckIn)
                       ↓
                    Service (checkInUser)
                       ↓
                    Database (daily_activities)
                       ↓
                    Triggers (update_user_streak)
                       ↓
                    Updated (user_streaks)
```

## Support

If issues persist after applying schema:
- Check backend logs for specific error
- Verify Supabase connection in .env
- Ensure ANTHROPIC_API_KEY is set for AI greetings
- Test database connection with simple query
