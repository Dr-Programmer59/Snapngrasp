# Flashcard API Documentation

## Overview
The Flashcard API allows users to generate flashcards from uploaded images using Claude AI and practice with spaced repetition.

## Base URL
```
http://localhost:8080/api/flashcards
```

## Authentication
All endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Generate Flashcards

Generate flashcards from an uploaded image's extracted text.

**Endpoint:** `POST /api/flashcards/generate/:uploadId`

**Parameters:**
- `uploadId` (path parameter): UUID of the upload

**Request Body:**
```json
{
  "count": 10,
  "difficulty": "medium"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| count | number | No | 10 | Number of flashcards to generate |
| difficulty | string | No | "medium" | Difficulty level: "easy", "medium", or "hard" |

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "flashcards": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "front": "What is the powerhouse of the cell?",
        "back": "Mitochondria - They generate ATP through cellular respiration",
        "difficulty": "medium",
        "mastery_level": 0,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "count": 10,
    "upload_id": "upload-uuid",
    "metadata": {
      "model": "claude-sonnet-4-20250514",
      "usage": { "input_tokens": 1200, "output_tokens": 800 }
    }
  }
}
```

**Example Request (cURL):**
```bash
curl -X POST http://localhost:8080/api/flashcards/generate/UPLOAD_UUID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 15,
    "difficulty": "hard"
  }'
```

**Example Request (JavaScript):**
```javascript
const response = await fetch(`http://192.168.100.7:8080/api/flashcards/generate/${uploadId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    count: 15,
    difficulty: 'hard'
  })
});
const data = await response.json();
```

---

### 2. Get Flashcards by Upload

Retrieve all flashcards for a specific upload.

**Endpoint:** `GET /api/flashcards/upload/:uploadId`

**Parameters:**
- `uploadId` (path parameter): UUID of the upload

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "flashcards": [
      {
        "id": "flashcard-uuid",
        "user_id": "user-uuid",
        "upload_id": "upload-uuid",
        "front": "What is photosynthesis?",
        "back": "The process by which plants convert light energy into chemical energy",
        "difficulty": "medium",
        "topic": "Plant Biology",
        "tags": ["biology", "plants", "photosynthesis"],
        "mastery_level": 2,
        "times_reviewed": 5,
        "times_correct": 3,
        "last_reviewed_at": "2024-01-15T10:30:00Z",
        "created_at": "2024-01-14T09:00:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ],
    "count": 10,
    "upload_id": "upload-uuid"
  }
}
```

**Example Request:**
```bash
curl http://localhost:8080/api/flashcards/upload/UPLOAD_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Get Flashcards Due for Review

Get flashcards that need review based on spaced repetition algorithm.

**Endpoint:** `GET /api/flashcards/due`

**Query Parameters:**
- `limit` (optional): Number of flashcards to return (default: 20)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "flashcards": [
      {
        "id": "flashcard-uuid",
        "front": "What is DNA?",
        "back": "Deoxyribonucleic acid - the molecule that carries genetic instructions",
        "mastery_level": 1,
        "times_reviewed": 2,
        "last_reviewed_at": "2024-01-10T08:00:00Z",
        "created_at": "2024-01-08T10:00:00Z"
      }
    ],
    "count": 15
  }
}
```

**Selection Logic:**
- Only includes flashcards with `mastery_level < 5` (not fully mastered)
- Prioritizes cards not reviewed or last reviewed > 24 hours ago
- Orders by mastery_level (lowest first) and last_reviewed_at (oldest first)

**Example Request:**
```bash
curl http://localhost:8080/api/flashcards/due?limit=30 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. Review Flashcard

Update flashcard statistics after user reviews it.

**Endpoint:** `PUT /api/flashcards/:flashcardId/review`

**Parameters:**
- `flashcardId` (path parameter): UUID of the flashcard

**Request Body:**
```json
{
  "is_correct": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| is_correct | boolean | Yes | Whether user answered correctly |

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "flashcard": {
      "id": "flashcard-uuid",
      "front": "What is the powerhouse of the cell?",
      "back": "Mitochondria",
      "mastery_level": 3,
      "times_reviewed": 6,
      "times_correct": 5,
      "last_reviewed_at": "2024-01-15T11:00:00Z"
    },
    "mastery_increased": true,
    "mastery_decreased": false
  }
}
```

**Mastery Level Logic:**
- Correct answer + mastery < 5: `mastery_level += 1`
- Incorrect answer + mastery > 0: `mastery_level -= 1`
- Otherwise: stays the same

**Example Request:**
```bash
curl -X PUT http://localhost:8080/api/flashcards/FLASHCARD_UUID/review \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_correct": true}'
```

**Example Request (JavaScript):**
```javascript
const response = await fetch(`http://192.168.100.7:8080/api/flashcards/${flashcardId}/review`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ is_correct: true })
});
```

---

### 5. Delete Flashcard

Delete a specific flashcard.

**Endpoint:** `DELETE /api/flashcards/:flashcardId`

**Parameters:**
- `flashcardId` (path parameter): UUID of the flashcard

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Flashcard deleted successfully"
}
```

**Example Request:**
```bash
curl -X DELETE http://localhost:8080/api/flashcards/FLASHCARD_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Database Schema

### Flashcards Table

```sql
CREATE TABLE public.flashcards (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES public.uploads(id) ON DELETE CASCADE,
  
  -- Content
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  
  -- Metadata
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  topic TEXT,
  tags TEXT[],
  
  -- Study tracking
  times_reviewed INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 5),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Mastery Levels:**
- 0: Not learned (new card)
- 1: Seen once
- 2: Getting it
- 3: Know it
- 4: Know it well
- 5: Mastered

**Indexes:**
- `idx_flashcards_user_id` on `user_id`
- `idx_flashcards_upload_id` on `upload_id`
- `idx_flashcards_created_at` on `created_at DESC`
- `idx_flashcards_mastery_level` on `mastery_level`
- `idx_flashcards_last_reviewed` on `last_reviewed_at`

---

## Usage Flow

### 1. Generate Flashcards After Upload

```javascript
// After image upload and OCR extraction
const uploadId = 'uuid-from-upload';

// Generate flashcards
const response = await fetch(`${API_URL}/flashcards/generate/${uploadId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    count: 10,
    difficulty: 'medium'
  })
});

const { data } = await response.json();
console.log(`Generated ${data.count} flashcards`);
```

### 2. Study Session with Spaced Repetition

```javascript
// Get cards due for review
const dueResponse = await fetch(`${API_URL}/flashcards/due?limit=20`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { data: { flashcards } } = await dueResponse.json();

// For each flashcard
for (const card of flashcards) {
  // Show front
  console.log('Question:', card.front);
  
  // Get user answer
  const userAnswered = getUserAnswer();
  
  // Show back
  console.log('Answer:', card.back);
  
  // Record review
  await fetch(`${API_URL}/flashcards/${card.id}/review`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ is_correct: userAnswered })
  });
}
```

### 3. View All Flashcards for Upload

```javascript
const response = await fetch(`${API_URL}/flashcards/upload/${uploadId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { data } = await response.json();
console.log(`Total flashcards: ${data.count}`);

// Calculate accuracy
data.flashcards.forEach(card => {
  const accuracy = card.times_reviewed > 0 
    ? (card.times_correct / card.times_reviewed * 100).toFixed(1)
    : 0;
  console.log(`${card.front} - ${accuracy}% accuracy, Level ${card.mastery_level}`);
});
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "Authentication required"
}
```

### 404 Not Found
```json
{
  "status": "error",
  "message": "Upload not found"
}
```

### 400 Bad Request
```json
{
  "status": "error",
  "message": "No text found in this upload"
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Failed to generate flashcards"
}
```

---

## Testing Steps

### 1. Setup Database
```bash
# Run in Supabase SQL Editor
cat Backend/docs/flashcards_schema.sql | pbcopy
# Paste and execute in Supabase
```

### 2. Generate Flashcards
```bash
# Get an upload ID from your uploads
UPLOAD_ID="your-upload-uuid"
TOKEN="your-jwt-token"

# Generate flashcards
curl -X POST http://localhost:8080/api/flashcards/generate/$UPLOAD_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count": 5, "difficulty": "easy"}'
```

### 3. Practice Session
```bash
# Get due flashcards
curl http://localhost:8080/api/flashcards/due?limit=10 \
  -H "Authorization: Bearer $TOKEN"

# Review a flashcard
FLASHCARD_ID="flashcard-uuid-from-above"
curl -X PUT http://localhost:8080/api/flashcards/$FLASHCARD_ID/review \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_correct": true}'
```

### 4. View Statistics
```sql
-- In Supabase SQL Editor
SELECT 
  COUNT(*) as total,
  AVG(mastery_level) as avg_mastery,
  SUM(times_reviewed) as total_reviews,
  COUNT(CASE WHEN mastery_level >= 4 THEN 1 END) as mastered
FROM flashcards
WHERE user_id = 'your-user-id';
```

---

## Spaced Repetition Algorithm

The system uses a simple spaced repetition algorithm:

**Review Intervals by Mastery Level:**
- Level 0 (New): Review after 1 hour
- Level 1: Review after 4 hours
- Level 2: Review after 1 day
- Level 3: Review after 3 days
- Level 4: Review after 1 week
- Level 5 (Mastered): Review after 2 weeks

The `/due` endpoint returns cards that haven't been reviewed in > 24 hours and have mastery < 5.

---

## Integration with Frontend

### React Native API Helper

```javascript
// SnapnGraspp/src/api/flashcard.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.100.7:8080/api/flashcards';

export const generateFlashcards = async (uploadId, count = 10, difficulty = 'medium') => {
  const token = await AsyncStorage.getItem('access_token');
  const response = await fetch(`${API_URL}/generate/${uploadId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ count, difficulty })
  });
  return response.json();
};

export const getDueFlashcards = async (limit = 20) => {
  const token = await AsyncStorage.getItem('access_token');
  const response = await fetch(`${API_URL}/due?limit=${limit}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

export const reviewFlashcard = async (flashcardId, isCorrect) => {
  const token = await AsyncStorage.getItem('access_token');
  const response = await fetch(`${API_URL}/${flashcardId}/review`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ is_correct: isCorrect })
  });
  return response.json();
};
```

---

## Notes

- Flashcards are linked to both `user_id` and `upload_id` for proper organization
- RLS policies ensure users can only access their own flashcards
- The system tracks review statistics for spaced repetition learning
- Mastery level adjusts dynamically based on user performance
- CASCADE deletes ensure cleanup when uploads are deleted
- Claude AI generates question-answer pairs from extracted text
