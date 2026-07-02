## AI Feedback System Documentation

### Overview
The AI Feedback System uses Claude Sonnet 4 to analyze student performance and provide personalized, actionable feedback on their learning progress. It identifies strong areas, weak areas, and provides specific suggestions for improvement.

---

## Database Setup

### 1. Run the Migration

Execute the SQL migration in your Supabase dashboard:

```bash
Backend/docs/feedback_sessions_migration.sql
```

This creates the `feedback_sessions` table with the following structure:
- `id` - Unique identifier
- `user_id` - Reference to the user
- `upload_id` - Reference to the upload (optional)
- `session_type` - Type of session (mcq, visual, flashcard, mixed)
- `total_questions` - Total number of questions
- `correct_answers` - Number of correct answers
- `percentage_score` - Percentage score
- `strong_areas` - JSON array of strong performance areas
- `weak_areas` - JSON array of areas needing improvement
- `personalized_message` - AI-generated personalized message
- `next_steps` - JSON array of recommended actions
- `performance_data` - Raw performance data for analysis

---

## Backend API

### Endpoints

#### 1. Generate Feedback
**POST** `/api/feedback/generate`

Generates AI-powered feedback based on student performance.

**Request Body:**
```json
{
  "user_id": "uuid",
  "session_type": "mcq" | "visual" | "flashcard" | "mixed",
  "upload_id": "uuid (optional)",
  "mcq_answers": [
    {
      "question_id": "string",
      "question_text": "string",
      "user_answer": "string",
      "correct_answer": "string",
      "is_correct": boolean,
      "topic": "string",
      "subject": "string"
    }
  ],
  "visual_answers": [
    {
      "visual_id": "string",
      "visual_title": "string",
      "slot_answers": [
        {
          "slot_id": "string",
          "user_answer": "string",
          "correct_answer": "string",
          "is_correct": boolean
        }
      ],
      "subject": "string",
      "topic": "string"
    }
  ],
  "flashcard_sessions": [
    {
      "flashcard_id": "string",
      "question": "string",
      "confidence_level": "easy" | "medium" | "hard",
      "topic": "string",
      "subject": "string"
    }
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "overall_score": {
      "correct": 7,
      "total": 10,
      "percentage": 70
    },
    "strong_areas": [
      {
        "topic": "Cell Structure",
        "description": "Excellent understanding of basic cell anatomy",
        "evidence": "Answered all 5 cell structure questions correctly"
      }
    ],
    "weak_areas": [
      {
        "topic": "Photosynthesis",
        "description": "Need to review the chemical equations",
        "suggestions": [
          "Review the light-dependent and light-independent reactions",
          "Practice balancing photosynthesis equations",
          "Watch video tutorials on chloroplast function"
        ]
      }
    ],
    "personalized_message": "Great job on cell structure! Focus on understanding photosynthesis equations to improve your overall score.",
    "next_steps": [
      "Review photosynthesis chapter in your textbook",
      "Complete practice problems on cellular respiration",
      "Take the advanced cell biology quiz"
    ]
  }
}
```

#### 2. Get Feedback History
**GET** `/api/feedback/history/:userId?limit=10`

Retrieves feedback history for a user.

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "session_type": "mcq",
      "total_questions": 10,
      "correct_answers": 7,
      "percentage_score": 70,
      "strong_areas": [...],
      "weak_areas": [...],
      "personalized_message": "...",
      "next_steps": [...],
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

## Frontend Integration

### Installation

The feedback system is already integrated. Just import the helpers:

```javascript
import { generateMCQFeedback, generateVisualFeedback, generateFlashcardFeedback } from '../utils/feedbackHelper';
```

### Usage Examples

#### 1. MCQ Quiz Completion

```javascript
import { generateMCQFeedback } from '../utils/feedbackHelper';

// After quiz completion
const handleQuizComplete = async () => {
  await generateMCQFeedback(
    navigation,
    mcqs,          // Array of MCQ objects
    userAnswers,   // Array of user's answers
    uploadId       // Optional: upload ID for context
  );
};
```

#### 2. Visual Practice Completion

```javascript
import { generateVisualFeedback } from '../utils/feedbackHelper';

// After visual practice
const handleVisualComplete = async () => {
  await generateVisualFeedback(
    navigation,
    visuals,       // Array of visual objects
    userAnswers,   // Object: { visualId: { slotId: answer } }
    uploadId       // Optional: upload ID for context
  );
};
```

#### 3. Flashcard Session Completion

```javascript
import { generateFlashcardFeedback } from '../utils/feedbackHelper';

// After flashcard session
const handleFlashcardComplete = async () => {
  await generateFlashcardFeedback(
    navigation,
    flashcards,         // Array of flashcard objects
    confidenceLevels,   // Array of confidence levels: 'easy', 'medium', 'hard'
    uploadId            // Optional: upload ID for context
  );
};
```

#### 4. Mixed Session

```javascript
import { generateMixedFeedback } from '../utils/feedbackHelper';

// After a session with multiple types
const handleMixedComplete = async () => {
  await generateMixedFeedback(
    navigation,
    {
      mcqs: mcqArray,
      mcqAnswers: mcqAnswersArray,
      visuals: visualArray,
      visualAnswers: visualAnswersObject,
      flashcards: flashcardArray,
      confidenceLevels: confidenceLevelsArray,
    },
    uploadId
  );
};
```

### Example: Integrating into MCQQuizScreen

```javascript
// In MCQQuizScreen.js
import { generateMCQFeedback } from '../utils/feedbackHelper';

// When quiz is completed (last question answered)
const handleQuizComplete = async () => {
  // Show loading indicator
  setLoading(true);
  
  try {
    // Generate AI feedback and navigate
    await generateMCQFeedback(
      navigation,
      quizData,
      answered,
      mcqData?.upload_id
    );
  } catch (error) {
    console.error('Error:', error);
    // Fallback to basic feedback
    navigation.navigate('feedback_screen', {
      feedbackData: {
        overall_score: {
          correct: score,
          total: quizData.length,
          percentage: Math.round((score / quizData.length) * 100),
        },
        personalized_message: `You scored ${score}/${quizData.length}!`,
        strong_areas: [],
        weak_areas: [],
        next_steps: [],
      },
    });
  } finally {
    setLoading(false);
  }
};

// Call this when last question is answered
if (index === total - 1 && answered[index]) {
  handleQuizComplete();
}
```

---

## AI Analysis

### How It Works

1. **Performance Data Collection**: The system collects:
   - MCQ answers (question, user answer, correct answer, topic)
   - Visual labeling results (slots, correct vs incorrect labels)
   - Flashcard confidence levels (easy, medium, hard)
   - Upload context (subject, description, file name)

2. **Claude Analysis**: Sends data to Claude Sonnet 4 with a structured prompt requesting:
   - Strong areas (≥70% correct in a topic)
   - Weak areas (<70% correct in a topic)
   - Personalized encouragement
   - Actionable next steps

3. **Intelligent Insights**:
   - Groups related mistakes into topics
   - Provides specific evidence for strong areas
   - Offers concrete suggestions for weak areas
   - Adjusts tone based on overall performance
   - Considers difficulty and session type

### Example AI Feedback

**Strong Area:**
```json
{
  "topic": "Cell Membrane Transport",
  "description": "Excellent understanding of passive and active transport mechanisms",
  "evidence": "Correctly answered 4/4 questions about diffusion, osmosis, and facilitated transport"
}
```

**Weak Area:**
```json
{
  "topic": "Cellular Respiration",
  "description": "Struggling with the stages and products of aerobic respiration",
  "suggestions": [
    "Create a flowchart showing glycolysis → Krebs cycle → electron transport chain",
    "Memorize the ATP yield at each stage (2 ATP, 2 ATP, 34 ATP)",
    "Watch a video on mitochondrial structure and function",
    "Practice calculating total ATP production from one glucose molecule"
  ]
}
```

---

## Testing

### 1. Test Basic Feedback Generation

```javascript
// Test with minimal data
const testFeedback = async () => {
  const result = await generateFeedback({
    user_id: 'your-user-id',
    session_type: 'mcq',
    mcq_answers: [
      {
        question_id: '1',
        question_text: 'What is the powerhouse of the cell?',
        user_answer: 'Mitochondria',
        correct_answer: 'Mitochondria',
        is_correct: true,
        topic: 'Cell Structure',
        subject: 'Biology',
      },
      {
        question_id: '2',
        question_text: 'What is the function of chloroplasts?',
        user_answer: 'Respiration',
        correct_answer: 'Photosynthesis',
        is_correct: false,
        topic: 'Plant Biology',
        subject: 'Biology',
      },
    ],
  });
  
  console.log('Feedback:', result.data);
};
```

### 2. Check Database

After generating feedback, verify in Supabase:

```sql
SELECT * FROM feedback_sessions
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 5;
```

### 3. Test Feedback Screen

```javascript
// Navigate directly to feedback screen with test data
navigation.navigate('feedback_screen', {
  feedbackData: {
    overall_score: { correct: 7, total: 10, percentage: 70 },
    strong_areas: [
      {
        topic: 'Test Topic',
        description: 'Great work!',
        evidence: 'Scored 100%',
      },
    ],
    weak_areas: [
      {
        topic: 'Another Topic',
        description: 'Needs improvement',
        suggestions: ['Study more', 'Practice problems'],
      },
    ],
    personalized_message: 'Keep up the good work!',
    next_steps: ['Review notes', 'Take practice quiz'],
  },
});
```

---

## Customization

### Adjust AI Prompt

Edit `Backend/src/controllers/feedback.controller.ts` to customize Claude's analysis:

```typescript
const claudePrompt = `You are an expert educational AI tutor...
// Modify guidelines here
GUIDELINES:
1. Your custom guideline
2. Another custom guideline
...`;
```

### Change Feedback Criteria

```typescript
// In feedback.controller.ts
// Change the threshold for strong/weak areas
strong_areas: [≥70% correct in a topic]  // Default
weak_areas: [<70% correct in a topic]    // Default
```

### Customize UI

Edit `SnapnGraspp/src/screens/feedback_screen.js` to change colors, layout, or styling.

---

## Troubleshooting

### Issue: "No feedback data available"
- Check that `feedbackData` is passed to the screen via route.params
- Verify the API call succeeded
- Check console logs for errors

### Issue: AI feedback not generating
- Verify `ANTHROPIC_API_KEY` is set in `.env`
- Check Claude API limits/quota
- Review backend logs for API errors
- Fallback basic feedback will be shown

### Issue: Feedback not saving to database
- Verify `feedback_sessions` table exists
- Check RLS policies allow user to insert
- Review backend logs for SQL errors

---

## Best Practices

1. **Always pass upload_id**: Provides better context for AI analysis
2. **Include topic/subject**: Helps group insights effectively
3. **Test with real data**: AI performs better with realistic performance data
4. **Handle errors gracefully**: Always have fallback feedback
5. **Monitor API usage**: Claude API has rate limits and costs

---

## Future Enhancements

- [ ] Track feedback history trends over time
- [ ] Compare performance across different uploads/topics
- [ ] Add visual charts showing progress
- [ ] Implement spaced repetition recommendations
- [ ] Add difficulty adaptation based on performance
- [ ] Generate custom practice sets targeting weak areas
