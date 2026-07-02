# MCQ Question Types Enhancement

## Overview
Adding support for three question types in the MCQ system:
1. **Multiple Choice** (traditional MCQs with 4 options)
2. **Fill in the Blanks** (text input answer)
3. **True/False** (binary choice)

The system will randomly distribute these question types when generating MCQs from uploads.

---

## 1. DATABASE CHANGES

### 1.1 Migration SQL - Add Question Type Column

```sql
-- Add question_type column to mcqs table
ALTER TABLE public.mcqs 
ADD COLUMN question_type VARCHAR(20) DEFAULT 'mcq' 
CHECK (question_type IN ('mcq', 'fill_blank', 'true_false'));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_mcqs_question_type ON public.mcqs(question_type);

-- Add correct_answer_text column for fill-in-the-blank questions
ALTER TABLE public.mcqs 
ADD COLUMN correct_answer_text TEXT;

-- Update existing records to have 'mcq' type
UPDATE public.mcqs SET question_type = 'mcq' WHERE question_type IS NULL;

-- Comments for documentation
COMMENT ON COLUMN public.mcqs.question_type IS 'Type of question: mcq (multiple choice), fill_blank (fill in the blanks), true_false (true/false)';
COMMENT ON COLUMN public.mcqs.correct_answer_text IS 'Correct answer text for fill-in-the-blank questions';
```

### 1.2 Updated Schema Documentation

The `mcqs` table now supports:
- `question_type`: 'mcq' | 'fill_blank' | 'true_false'
- `correct_answer`: For MCQ (0-3) and True/False (0=False, 1=True)
- `correct_answer_text`: For fill-in-the-blank questions
- `mcq_options`: Only populated for MCQ and True/False types

---

## 2. BACKEND CHANGES

### 2.1 Update Claude Service Prompt

**File:** `Backend/src/services/claude.service.ts`

**Changes to quiz prompt:**

```typescript
quiz: `Create a ${count || 5}-question quiz from this text with a MIX of question types.

Question Type Distribution (random but balanced):
- Approximately 50% Multiple Choice Questions (MCQ)
- Approximately 30% Fill in the Blanks
- Approximately 20% True/False

Requirements:

1. **Multiple Choice Questions (MCQ):**
   - "question_type": "mcq"
   - "question": the question text
   - "options": string[4] // exactly 4 options
   - "correct_answer": number // index 0-3
   - "explanation": brief explanation

2. **Fill in the Blanks:**
   - "question_type": "fill_blank"
   - "question": text with ______ or [blank] to indicate where answer goes
   - "correct_answer_text": the correct answer (single word or short phrase)
   - "options": [] // empty array
   - "correct_answer": -1 // not used
   - "explanation": brief explanation

3. **True/False:**
   - "question_type": "true_false"
   - "question": a statement to evaluate
   - "options": ["True", "False"] // exactly 2 options
   - "correct_answer": 0 for False, 1 for True
   - "explanation": brief explanation

IMPORTANT: Also generate a descriptive title (3-6 words max).
Format: "Topic - Subtopic" or "Main Concept"

Return ONLY valid JSON:
{
  "title": "Descriptive Title",
  "mcqs": [
    {
      "question_type": "mcq",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 0,
      "explanation": "..."
    },
    {
      "question_type": "fill_blank",
      "question": "The process of ______ is essential for...",
      "correct_answer_text": "photosynthesis",
      "options": [],
      "correct_answer": -1,
      "explanation": "..."
    },
    {
      "question_type": "true_false",
      "question": "Water boils at 100°C at sea level.",
      "options": ["True", "False"],
      "correct_answer": 1,
      "explanation": "..."
    }
  ]
}

No extra text outside JSON.`,
```

### 2.2 Update MCQ Controller

**File:** `Backend/src/controllers/mcq.controller.ts`

**Changes in `generateMCQs` function:**

```typescript
// Update MCQ data type interface
interface MCQData {
  question_type: 'mcq' | 'fill_blank' | 'true_false';
  question: string;
  options: string[];
  correct_answer: number;
  correct_answer_text?: string; // For fill_blank type
  explanation: string;
}

// In the database insertion loop, handle different question types:
for (const mcq of mcqData) {
  // Insert MCQ with question_type
  const { data: insertedMCQ, error: mcqError } = await supabase
    .from('mcqs')
    .insert({
      user_id: userId,
      upload_id: uploadId,
      set_id: mcqSet.id,
      question: mcq.question,
      question_type: mcq.question_type || 'mcq', // Default to mcq
      correct_answer: mcq.correct_answer,
      correct_answer_text: mcq.correct_answer_text || null,
      explanation: mcq.explanation || null,
      difficulty,
    })
    .select()
    .single();

  if (mcqError || !insertedMCQ) {
    logger.error({ err: mcqError }, '[MCQ] Failed to insert MCQ');
    continue;
  }

  // Only insert options for MCQ and True/False types
  if (mcq.question_type === 'mcq' || mcq.question_type === 'true_false') {
    const optionsData = mcq.options.map((optionText, index) => ({
      mcq_id: insertedMCQ.id,
      option_index: index,
      option_text: optionText,
    }));

    const { error: optionsError } = await supabase
      .from('mcq_options')
      .insert(optionsData);

    if (optionsError) {
      logger.error({ err: optionsError }, '[MCQ] Failed to insert options');
      continue;
    }
  }

  insertedMCQs.push({
    id: insertedMCQ.id,
    question_type: insertedMCQ.question_type,
    question: insertedMCQ.question,
    options: mcq.options,
    correct_answer: insertedMCQ.correct_answer,
    correct_answer_text: insertedMCQ.correct_answer_text,
    explanation: insertedMCQ.explanation,
    difficulty: insertedMCQ.difficulty,
  });
}
```

**Changes in `getMCQsByUpload` function:**

```typescript
// Format response to include question_type
const formattedMCQs = mcqs.map((mcq: any) => ({
  id: mcq.id,
  question_type: mcq.question_type,
  question: mcq.question,
  options: mcq.mcq_options
    .sort((a: any, b: any) => a.option_index - b.option_index)
    .map((opt: any) => opt.option_text),
  correct_answer: mcq.correct_answer,
  correct_answer_text: mcq.correct_answer_text,
  explanation: mcq.explanation,
  difficulty: mcq.difficulty,
  created_at: mcq.created_at,
}));
```

**Changes in `submitMCQAnswer` function:**

```typescript
// Handle different answer types
export const submitMCQAnswer = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { mcqId } = req.params;
    const { selected_answer, answer_text } = req.body; // Add answer_text for fill_blank

    // Get the MCQ to check question type
    const { data: mcq, error: mcqError } = await supabase
      .from('mcqs')
      .select('*')
      .eq('id', mcqId)
      .eq('user_id', userId)
      .single();

    if (mcqError || !mcq) {
      res.status(404).json({
        status: 'error',
        message: 'MCQ not found',
      });
      return;
    }

    // Determine if answer is correct based on question type
    let isCorrect = false;
    let submittedAnswer = selected_answer;

    if (mcq.question_type === 'fill_blank') {
      // For fill-in-the-blank, compare answer_text (case-insensitive, trimmed)
      const userAnswer = (answer_text || '').trim().toLowerCase();
      const correctAnswer = (mcq.correct_answer_text || '').trim().toLowerCase();
      isCorrect = userAnswer === correctAnswer;
      submittedAnswer = -1; // Not using index for fill_blank
    } else {
      // For MCQ and True/False, compare selected_answer index
      if (selected_answer === undefined || selected_answer === null) {
        res.status(400).json({
          status: 'error',
          message: 'Answer is required',
        });
        return;
      }
      isCorrect = selected_answer === mcq.correct_answer;
    }

    // Insert user answer
    const { data: userAnswer, error: answerError } = await supabase
      .from('user_mcq_answers')
      .insert({
        user_id: userId,
        mcq_id: mcqId,
        selected_answer: submittedAnswer,
        answer_text: answer_text || null, // Store text answer for fill_blank
        is_correct: isCorrect,
      })
      .select()
      .single();

    if (answerError) {
      logger.error({ err: answerError }, '[MCQ] Failed to save answer');
      res.status(500).json({
        status: 'error',
        message: 'Failed to save answer',
      });
      return;
    }

    // Update MCQ set progress
    // ... (existing logic)

    res.status(200).json({
      status: 'success',
      data: {
        is_correct: isCorrect,
        correct_answer: mcq.correct_answer,
        correct_answer_text: mcq.correct_answer_text,
        explanation: mcq.explanation,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[MCQ] Failed to submit answer');
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit answer',
    });
  }
};
```

### 2.3 Update user_mcq_answers Table (if needed)

```sql
-- Add answer_text column for fill-in-the-blank answers
ALTER TABLE public.user_mcq_answers 
ADD COLUMN IF NOT EXISTS answer_text TEXT;

COMMENT ON COLUMN public.user_mcq_answers.answer_text IS 'Text answer for fill-in-the-blank questions';
```

---

## 3. FRONTEND CHANGES

### 3.1 Update MCQQuizScreen Component

**File:** `SnapnGraspp/src/screens/MCQQuizScreen.js`

**Add state for text input (fill-in-the-blank):**

```javascript
const [textAnswer, setTextAnswer] = useState('');
```

**Update selectOption function:**

```javascript
const selectOption = async (optionIndex) => {
  if (answered[index]) return; // already answered (locked)
  if (selected !== null) return; // lock after selection
  setSelected(optionIndex);

  const isCorrect = optionIndex === currentQuestion.correct_answer;

  // Track this answer locally
  setAnswered((prev) => {
    const copy = [...prev];
    copy[index] = {
      questionId: currentQuestion.id,
      isCorrect,
      selectedOption: optionIndex,
    };
    return copy;
  });

  // Update score once
  if (isCorrect) {
    setScore((prev) => {
      const next = prev + 1;
      scoreRef.current = next;
      return next;
    });
  }

  // Submit answer to backend
  try {
    await submitMCQAnswer(currentQuestion.id, optionIndex, null);
    console.log("✅ Answer submitted for question:", currentQuestion.id);
  } catch (error) {
    console.error("❌ Failed to submit answer:", error);
  }
};

// New function for fill-in-the-blank submission
const submitFillBlank = async () => {
  if (answered[index]) return; // already answered
  if (!textAnswer.trim()) {
    Alert.alert('Error', 'Please enter an answer');
    return;
  }

  // Check if correct (case-insensitive)
  const userAnswer = textAnswer.trim().toLowerCase();
  const correctAnswer = (currentQuestion.correct_answer_text || '').toLowerCase();
  const isCorrect = userAnswer === correctAnswer;

  setSelected(0); // Mark as answered

  // Track this answer locally
  setAnswered((prev) => {
    const copy = [...prev];
    copy[index] = {
      questionId: currentQuestion.id,
      isCorrect,
      selectedOption: 0, // Dummy value
      answerText: textAnswer,
    };
    return copy;
  });

  // Update score
  if (isCorrect) {
    setScore((prev) => {
      const next = prev + 1;
      scoreRef.current = next;
      return next;
    });
  }

  // Submit to backend
  try {
    await submitMCQAnswer(currentQuestion.id, null, textAnswer);
    console.log("✅ Fill-blank answer submitted");
  } catch (error) {
    console.error("❌ Failed to submit answer:", error);
  }
};
```

**Update the question rendering section:**

```javascript
{/* Question Card */}
<View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
  <View style={styles.cardInner}>
    {/* Question Number and Type Badge */}
    <View style={styles.questionHeader}>
      <View style={styles.questionBadge}>
        <Text style={[styles.questionLabel, { color: palette.primary }]}>Question {index + 1}</Text>
      </View>
      {currentQuestion.question_type && (
        <View style={[styles.typeBadge, { 
          backgroundColor: 
            currentQuestion.question_type === 'mcq' ? 'rgba(108,92,231,0.1)' : 
            currentQuestion.question_type === 'fill_blank' ? 'rgba(37,209,159,0.1)' : 
            'rgba(244,176,0,0.1)'
        }]}>
          <Text style={[styles.typeText, { 
            color: 
              currentQuestion.question_type === 'mcq' ? palette.primary : 
              currentQuestion.question_type === 'fill_blank' ? palette.green : 
              palette.star
          }]}>
            {currentQuestion.question_type === 'mcq' ? 'Multiple Choice' : 
             currentQuestion.question_type === 'fill_blank' ? 'Fill in the Blank' : 
             'True/False'}
          </Text>
        </View>
      )}
    </View>

    {/* Question Text */}
    <Text style={[styles.questionText, { color: palette.text }]}>
      {currentQuestion.question}
    </Text>

    {/* Render based on question type */}
    {currentQuestion.question_type === 'fill_blank' ? (
      /* Fill in the Blank Input */
      <View style={styles.fillBlankContainer}>
        <TextInput
          style={[styles.fillBlankInput, { 
            backgroundColor: palette.optionBg,
            borderColor: answered[index] ? 
              (answered[index].isCorrect ? palette.green : palette.red) : 
              palette.optionBorder,
            color: palette.text
          }]}
          placeholder="Type your answer here..."
          placeholderTextColor={palette.muted2}
          value={textAnswer}
          onChangeText={setTextAnswer}
          editable={!answered[index]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        {!answered[index] && (
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: palette.primary }]}
            onPress={submitFillBlank}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>Submit Answer</Text>
          </TouchableOpacity>
        )}
        
        {answered[index] && (
          <View style={[styles.fillBlankFeedback, { 
            backgroundColor: answered[index].isCorrect ? 
              'rgba(37,209,159,0.1)' : 'rgba(255,90,95,0.1)',
            borderColor: answered[index].isCorrect ? palette.green : palette.red
          }]}>
            <Ionicons 
              name={answered[index].isCorrect ? 'checkmark-circle' : 'close-circle'} 
              size={20} 
              color={answered[index].isCorrect ? palette.green : palette.red} 
            />
            <Text style={[styles.feedbackText, { 
              color: answered[index].isCorrect ? palette.green : palette.red 
            }]}>
              {answered[index].isCorrect ? 
                'Correct!' : 
                `Incorrect. Answer: ${currentQuestion.correct_answer_text}`
              }
            </Text>
          </View>
        )}
      </View>
    ) : (
      /* Multiple Choice or True/False Options */
      <View style={styles.optionsContainer}>
        {currentQuestion.options?.map((opt, i) => {
          const isSelected = selected === i;
          const correctIdx = currentQuestion.correct_answer;
          const isAnswered = answered[index];
          const showCorrect = isAnswered && i === correctIdx;
          const showWrong = isAnswered && isSelected && i !== correctIdx;

          let optionBg = palette.optionBg;
          let optionBorder = palette.optionBorder;
          let checkCircle = null;

          if (showCorrect) {
            optionBg = "rgba(37,209,159,0.12)";
            optionBorder = palette.green;
            checkCircle = (
              <View style={[styles.checkCircle, { backgroundColor: palette.green }]}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            );
          } else if (showWrong) {
            optionBg = "rgba(255,90,95,0.12)";
            optionBorder = palette.red;
            checkCircle = (
              <View style={[styles.checkCircle, { backgroundColor: palette.red }]}>
                <Ionicons name="close" size={14} color="#fff" />
              </View>
            );
          } else if (isSelected && !isAnswered) {
            optionBorder = palette.primary;
          }

          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.option,
                { backgroundColor: optionBg, borderColor: optionBorder },
              ]}
              onPress={() => selectOption(i)}
              disabled={!!answered[index]}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionLetter, { color: palette.text }]}>
                {String.fromCharCode(65 + i)}
              </Text>
              <Text style={[styles.optionText, { color: palette.text }]}>
                {opt}
              </Text>
              {checkCircle}
            </TouchableOpacity>
          );
        })}
      </View>
    )}

    {/* Explanation (show after answering) */}
    {answered[index] && currentQuestion.explanation && (
      <View style={[styles.explanationBox, { 
        backgroundColor: palette.optionBg, 
        borderColor: palette.optionBorder 
      }]}>
        <View style={styles.explanationHeader}>
          <Ionicons name="information-circle" size={18} color={palette.primary} />
          <Text style={[styles.explanationTitle, { color: palette.primary }]}>
            Explanation
          </Text>
        </View>
        <Text style={[styles.explanationText, { color: palette.muted }]}>
          {currentQuestion.explanation}
        </Text>
      </View>
    )}
  </View>
</View>
```

**Add new styles:**

```javascript
questionHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
},
questionBadge: {
  flex: 1,
},
typeBadge: {
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
},
typeText: {
  fontSize: 11,
  fontWeight: '600',
  fontFamily: 'Poppins',
},
fillBlankContainer: {
  marginTop: 16,
},
fillBlankInput: {
  borderWidth: 2,
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 15,
  fontFamily: 'Poppins',
  marginBottom: 12,
},
submitButton: {
  borderRadius: 12,
  paddingVertical: 14,
  alignItems: 'center',
  marginBottom: 12,
},
submitButtonText: {
  color: '#fff',
  fontSize: 15,
  fontWeight: '600',
  fontFamily: 'Poppins',
},
fillBlankFeedback: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 12,
  borderRadius: 8,
  borderWidth: 1,
  gap: 8,
},
feedbackText: {
  fontSize: 14,
  fontWeight: '500',
  fontFamily: 'Poppins',
  flex: 1,
},
```

### 3.2 Update API Service

**File:** `SnapnGraspp/src/api/studyMaterial.js`

**Update submitMCQAnswer function:**

```javascript
export const submitMCQAnswer = async (mcqId, selectedAnswer, answerText = null) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/api/mcqs/${mcqId}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        selected_answer: selectedAnswer,
        answer_text: answerText 
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit answer');
    }

    return await response.json();
  } catch (error) {
    console.error('Submit MCQ answer error:', error);
    throw error;
  }
};
```

---

## 4. TESTING CHECKLIST

### Database
- [ ] Run migration SQL successfully
- [ ] Verify question_type column exists with constraint
- [ ] Verify correct_answer_text column exists
- [ ] Check indexes created

### Backend
- [ ] Test MCQ generation with mixed types
- [ ] Verify API returns all question types correctly
- [ ] Test fill-in-the-blank answer submission
- [ ] Test True/False answer submission
- [ ] Check case-insensitive matching for fill-blank

### Frontend
- [ ] MCQ type displays with 4 options
- [ ] Fill-blank type shows text input
- [ ] True/False type shows 2 options
- [ ] Type badge displays correctly
- [ ] Answer submission works for all types
- [ ] Feedback shows correctly for all types
- [ ] Score calculation accurate
- [ ] Navigation works after answering

---

## 5. DEPLOYMENT STEPS

1. **Database Migration:**
   - Connect to Supabase dashboard
   - Run migration SQL in SQL Editor
   - Verify columns added successfully

2. **Backend Deployment:**
   - Update claude.service.ts with new prompt
   - Update mcq.controller.ts with new logic
   - Test locally
   - Deploy to production

3. **Frontend Update:**
   - Update MCQQuizScreen.js with new UI
   - Update studyMaterial.js API
   - Test on device
   - Build and submit new version

---

## SUMMARY

This update adds three question types to the MCQ system:
- **MCQ**: Traditional 4-option multiple choice (50% of questions)
- **Fill Blank**: Text input answer (30% of questions)
- **True/False**: Binary choice (20% of questions)

The distribution is randomized by Claude AI during generation, providing variety and better learning experience.
