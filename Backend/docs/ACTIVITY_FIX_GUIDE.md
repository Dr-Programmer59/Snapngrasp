# Activity Dashboard Fix - Implementation Guide

## Issues Identified

1. **Database Schema Mismatch**: Activity controller expects columns that don't exist in the database
2. **No Answer Submission**: MCQs and flashcards don't save user progress
3. **Missing from Dashboard**: Items don't appear in recent activity because of missing/incorrect data

## Solution Implementation

### 1. Database Migration (REQUIRED FIRST)

Run this SQL in your Supabase SQL Editor:

```sql
-- File: Backend/docs/activity_migration.sql
-- This adds all missing columns and creates the mcq_user_answers table

-- Add missing columns to MCQs table
ALTER TABLE public.mcqs 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS correct_answers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;

-- Add missing columns to flashcards table
ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS total_cards INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cards_known INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cards_to_review INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

-- Create MCQ user answers table to track individual question responses
CREATE TABLE IF NOT EXISTS public.mcq_user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcq_id UUID NOT NULL REFERENCES public.mcqs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_answer INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mcq_id, user_id)
);

-- Enable RLS and policies
ALTER TABLE public.mcq_user_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mcq answers"
  ON public.mcq_user_answers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mcq answers"
  ON public.mcq_user_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mcq answers"
  ON public.mcq_user_answers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mcq_answers_mcq_id ON public.mcq_user_answers(mcq_id);
CREATE INDEX IF NOT EXISTS idx_mcq_answers_user_id ON public.mcq_user_answers(user_id);
```

### 2. Backend Code Changes (COMPLETED)

The following files have been updated:

#### ✅ MCQ Controller (`mcq.controller.ts`)
- Added `title`, `total_questions`, `correct_answers`, `completed` to MCQ generation
- Created new `submitMCQAnswer()` endpoint to save user answers
- Auto-calculates statistics when answers are submitted

#### ✅ MCQ Routes (`mcq.routes.ts`)
- Added `POST /api/mcqs/:mcqId/answer` endpoint

#### ✅ Flashcard Controller (`flashcard.controller.ts`)
- Added `title`, `total_cards`, `cards_known`, `cards_to_review`, `progress` to generation
- Updated `reviewFlashcard()` to recalculate aggregate stats

#### ✅ Visual Controller (`visual.controller.ts`)
- Fixed `name` column missing error

### 3. Testing Steps

After running the database migration and restarting the backend:

1. **Generate New MCQs**:
   - Upload an image
   - Generate MCQs from it
   - The MCQs should now have a `title` field

2. **Answer MCQs**:
   - Answer MCQ questions using: `POST /api/mcqs/{mcqId}/answer`
   - Body: `{ "selectedAnswer": 0 }` (0-3)
   - Progress should be tracked

3. **Generate New Flashcards**:
   - Upload an image
   - Generate flashcards from it
   - Should have `title` and aggregate stats

4. **Review Flashcards**:
   - Review cards using: `PUT /api/flashcards/{flashcardId}/review`
   - Body: `{ "is_correct": true }`
   - Aggregate stats should update

5. **Check Dashboard**:
   - Navigate to Dashboard
   - Recent activity should show MCQs and Flashcards with:
     - Titles
     - Progress percentages
     - Stats (X/Y correct, cards known, etc.)

### 4. Frontend Integration Needed

The frontend needs to call the new endpoints when users interact with MCQs and flashcards:

**For MCQs:**
```javascript
// When user selects an answer
const response = await fetch(`${BACKEND_API_URL}/mcqs/${mcqId}/answer`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ selectedAnswer: selectedIndex }),
});

const result = await response.json();
// result.data.is_correct - whether answer was correct
// result.data.correct_answer - the correct answer index
// result.data.explanation - explanation text
```

**For Flashcards:**
```javascript
// When user marks a flashcard as correct/incorrect
await fetch(`${BACKEND_API_URL}/flashcards/${flashcardId}/review`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ is_correct: true }), // or false
});
```

### 5. Data Migration for Existing Records

If you have existing MCQs/flashcards without the new fields, run this to populate them:

```sql
-- Update existing MCQs with upload titles
UPDATE public.mcqs m
SET title = u.file_name
FROM public.uploads u
WHERE m.upload_id = u.id AND m.title IS NULL;

-- Update existing flashcards with upload titles
UPDATE public.flashcards f
SET title = u.file_name
FROM public.uploads u
WHERE f.upload_id = u.id AND f.title IS NULL;

-- Count total questions per upload for MCQs
WITH mcq_counts AS (
  SELECT upload_id, COUNT(*) as total
  FROM public.mcqs
  GROUP BY upload_id
)
UPDATE public.mcqs m
SET total_questions = mc.total
FROM mcq_counts mc
WHERE m.upload_id = mc.upload_id;

-- Count total cards per upload for flashcards
WITH card_counts AS (
  SELECT upload_id, COUNT(*) as total
  FROM public.flashcards
  GROUP BY upload_id
)
UPDATE public.flashcards f
SET total_cards = cc.total,
    cards_to_review = cc.total
FROM card_counts cc
WHERE f.upload_id = cc.upload_id;
```

## Summary

**What was fixed:**
1. ✅ Added missing database columns for activity tracking
2. ✅ Created endpoint to submit MCQ answers
3. ✅ Auto-calculate MCQ statistics (correct_answers, total_questions, completed)
4. ✅ Auto-calculate flashcard statistics (cards_known, cards_to_review, progress)
5. ✅ Fixed visual labels `name` column error
6. ✅ Updated `updated_at` timestamps when progress changes

**What shows in dashboard now:**
- MCQ quiz sets with progress (X/Y correct)
- Flashcard sets with progress percentage
- Recently generated visuals
- All items show when last updated

**Next steps:**
1. Run the database migration SQL
2. Restart backend server
3. Test by generating new MCQs/flashcards
4. Update frontend to call the answer submission endpoints
