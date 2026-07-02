# Real-Time Progress Tracking Implementation

## Overview
This implementation provides real-time progress tracking for MCQs and flashcards with proper activity dashboard integration.

## Key Features

### MCQ Progress Tracking
- ✅ **Questions Attempted** - Shows X/Y questions answered
- ✅ **Correct Answers** - Tracks how many were correct
- ✅ **Wrong Answers** - Tracks how many were incorrect  
- ✅ **Progress Bar** - Shows % of questions attempted
- ✅ **Completion Status** - Marks quiz as complete when all answered
- ✅ **Recent Activity** - Auto-updates dashboard when you answer questions

### Flashcard Progress Tracking
- ✅ **Cards Reviewed** - How many cards you've looked at
- ✅ **Cards Known** - Mastery level 4-5 (mastered)
- ✅ **Cards Learning** - Mastery level 1-3 (in progress)
- ✅ **Cards To Review** - Mastery level 0 (not started)
- ✅ **Progress Bar** - Shows % of cards mastered
- ✅ **Recent Activity** - Auto-updates dashboard when you review cards

## Database Structure

### New Tables Created

#### `mcq_sets` - Tracks quiz progress at the set level
```sql
{
  id: UUID,
  user_id: UUID,
  upload_id: UUID,
  title: TEXT,                    // e.g. "Biology Chapter 1 Quiz"
  difficulty: TEXT,               // 'easy', 'medium', 'hard'
  total_questions: INTEGER,       // e.g. 10
  questions_attempted: INTEGER,   // e.g. 7 (you've done 7/10)
  correct_answers: INTEGER,       // e.g. 5 (5 correct)
  wrong_answers: INTEGER,         // e.g. 2 (2 wrong)
  completed: BOOLEAN,             // true when all answered
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP           // Updates every time you answer
}
```

#### `flashcard_sets` - Tracks flashcard progress at the set level
```sql
{
  id: UUID,
  user_id: UUID,
  upload_id: UUID,
  title: TEXT,                    // e.g. "Biology Terms"
  difficulty: TEXT,
  total_cards: INTEGER,           // e.g. 20
  cards_reviewed: INTEGER,        // e.g. 15 (reviewed at least once)
  cards_known: INTEGER,           // e.g. 8 (mastered)
  cards_learning: INTEGER,        // e.g. 5 (in progress)
  cards_to_review: INTEGER,       // e.g. 7 (not started)
  progress: INTEGER,              // e.g. 40% (8/20 known)
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP           // Updates every time you review
}
```

#### `mcq_user_answers` - Stores individual question answers
```sql
{
  id: UUID,
  mcq_id: UUID,                   // Which question
  user_id: UUID,
  selected_answer: INTEGER,       // 0, 1, 2, or 3
  is_correct: BOOLEAN,            // Was it right?
  created_at: TIMESTAMP
}
```

### Modified Tables

- `mcqs` - Added `set_id` column to link to `mcq_sets`
- `flashcards` - Added `set_id` column to link to `flashcard_sets`

## API Behavior

### When You Generate MCQs
```
POST /api/mcqs/generate/:uploadId

Response:
{
  "set_id": "uuid-of-the-quiz-set",
  "mcqs": [...questions...],
  "count": 10
}
```

Creates:
- 1 MCQ set with `total_questions: 10`, `questions_attempted: 0`
- 10 individual MCQ records
- Dashboard shows: "0/10 Attempted, 0 Correct, 0 Wrong" (0% progress)

### When You Answer an MCQ
```
POST /api/mcqs/:mcqId/answer
Body: { "selectedAnswer": 2 }

Response:
{
  "is_correct": true,
  "correct_answer": 2,
  "explanation": "..."
}
```

Updates:
- Creates/updates answer in `mcq_user_answers`
- Recalculates set statistics:
  - `questions_attempted`: 1
  - `correct_answers`: 1 (if correct)
  - `wrong_answers`: 0
  - `updated_at`: NOW (moves to top of recent activity!)
- Dashboard now shows: "1/10 Attempted, 1 Correct, 0 Wrong" (10% progress)

### When You Answer More Questions
After answering 7 questions (5 correct, 2 wrong):
- Dashboard shows: "7/10 Attempted, 5 Correct, 2 Wrong" (70% progress)
- Progress bar: 70% filled
- Status: Not completed
- Appears at top of recent activity (because `updated_at` is recent)

### When You Complete the Quiz
After answering all 10 questions:
- Dashboard shows: "10/10 Attempted, 8 Correct, 2 Wrong" (100% progress)
- Progress bar: 100% filled
- Status: ✨ Completed (starred)
- Stays in recent activity

### Flashcards Work Similarly
When you review a flashcard:
```
PUT /api/flashcards/:flashcardId/review
Body: { "is_correct": true }
```

Updates set statistics:
- `cards_reviewed`: +1 (if first time)
- `cards_known`: +1 (if mastery reaches 4+)
- `cards_learning`: updated based on mastery 1-3
- `cards_to_review`: updated based on mastery 0
- `progress`: recalculated percentage
- `updated_at`: NOW (appears in recent activity!)

## Dashboard Display

### Recent Activity Shows:

**MCQ Quiz Example:**
```
📝 Biology Chapter 1 Quiz
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 70% complete

7/10 Attempted | 5 Correct | 2 Wrong
Last updated: 2 minutes ago
```

**Flashcard Set Example:**
```
📚 Biology Terms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 40% complete

15 Reviewed | 8 Known | 5 Learning | 7 To Review
Last updated: 5 minutes ago
```

## Frontend Integration

### To Submit MCQ Answer:
```javascript
const submitAnswer = async (mcqId, selectedAnswer) => {
  const response = await fetch(`${BACKEND_API_URL}/mcqs/${mcqId}/answer`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ selectedAnswer }),
  });
  
  const result = await response.json();
  
  if (result.data.is_correct) {
    // Show "Correct!" message
    // Show explanation
  } else {
    // Show "Wrong" message  
    // Show correct answer
    // Show explanation
  }
  
  // Refresh dashboard to show updated progress
  fetchDashboardData();
};
```

### To Review Flashcard:
```javascript
const reviewCard = async (flashcardId, wasCorrect) => {
  await fetch(`${BACKEND_API_URL}/flashcards/${flashcardId}/review`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ is_correct: wasCorrect }),
  });
  
  // Refresh dashboard
  fetchDashboardData();
};
```

## Migration Steps

1. **Run the SQL migration** in Supabase SQL Editor:
   ```
   Backend/docs/activity_migration.sql
   ```

2. **Restart backend server** to load updated code

3. **Generate new MCQs/Flashcards** - Old ones won't have sets

4. **Test answering questions** - Progress should update in real-time

5. **Check dashboard** - Should show recent activity with progress

## What Updates in Real-Time

✅ **Every time you answer an MCQ:**
- Questions attempted count increases
- Correct/wrong count updates
- Progress bar updates
- `updated_at` changes → moves to top of recent activity
- Dashboard refreshes

✅ **Every time you review a flashcard:**
- Cards reviewed count increases
- Mastery levels update (known/learning/to review)
- Progress percentage recalculates
- `updated_at` changes → moves to top of recent activity
- Dashboard refreshes

✅ **Dashboard shows:**
- Partial progress (e.g., "3/10 done, 2 correct, 1 wrong")
- Most recently updated items at the top
- Progress bars showing completion percentage
- Stars for completed items

## Example User Flow

1. User uploads biology notes image
2. Generates 10 MCQs → Dashboard shows: "0/10 Attempted (0%)"
3. Answers question 1 (correct) → Dashboard: "1/10 Attempted, 1 Correct (10%)"
4. Answers question 2 (wrong) → Dashboard: "2/10 Attempted, 1 Correct, 1 Wrong (20%)"
5. Closes app, comes back later
6. Dashboard still shows: "2/10 Attempted" - picks up where they left off
7. Answers 3 more questions → Dashboard: "5/10 Attempted, 4 Correct, 1 Wrong (50%)"
8. This quiz appears at TOP of recent activity (because `updated_at` is most recent)
9. Completes all 10 → Dashboard: "10/10 Attempted ✨ Complete (100%)"

🎯 **User can always see their progress and pick up where they left off!**
