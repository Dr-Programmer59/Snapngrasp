# MCQ API Documentation

## Overview
The MCQ API allows users to generate multiple-choice questions from uploaded images using Claude AI. MCQs are stored with proper relationships to uploads and users.

## Database Setup

### Run SQL Schema
Execute `Backend/docs/mcqs_schema.sql` in Supabase SQL Editor to create:
- `mcqs` table - Stores questions with metadata
- `mcq_options` table - Stores 4 options per question
- Proper foreign key relationships to `uploads` and `auth.users`
- Row Level Security (RLS) policies
- Indexes for performance

## API Endpoints

### 1. Generate MCQs
Generate MCQs from an uploaded image's extracted text.

**Endpoint:** `POST /api/mcqs/generate/:uploadId`

**Authentication:** Required (Bearer token)

**URL Parameters:**
- `uploadId` - UUID of the upload

**Request Body:**
```json
{
  "count": 5,
  "difficulty": "medium"
}
```

**Fields:**
- `count` (optional) - Number of MCQs to generate (default: 5)
- `difficulty` (optional) - Difficulty level: "easy", "medium", "hard" (default: "medium")

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "mcqs": [
      {
        "id": "mcq-uuid",
        "question": "What is the powerhouse of the cell?",
        "options": [
          "Nucleus",
          "Mitochondria",
          "Ribosome",
          "Endoplasmic Reticulum"
        ],
        "correct_answer": 1,
        "explanation": "Mitochondria are called the powerhouse because they generate ATP.",
        "difficulty": "easy"
      }
    ],
    "count": 5,
    "upload_id": "upload-uuid",
    "metadata": {
      "model": "claude-sonnet-4-20250514",
      "usage": { ... }
    }
  }
}
```

**Error Responses:**
- `401` - Authentication required
- `404` - Upload not found
- `400` - No text found in upload
- `500` - MCQ generation failed

**Example (curl):**
```bash
curl -X POST http://localhost:8080/api/mcqs/generate/UPLOAD_UUID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 10,
    "difficulty": "hard"
  }'
```

**Example (JavaScript):**
```javascript
const response = await fetch(`${API_URL}/api/mcqs/generate/${uploadId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    count: 10,
    difficulty: 'medium',
  }),
});

const data = await response.json();
console.log(data.data.mcqs);
```

---

### 2. Get MCQs by Upload
Retrieve all MCQs for a specific upload.

**Endpoint:** `GET /api/mcqs/upload/:uploadId`

**Authentication:** Required (Bearer token)

**URL Parameters:**
- `uploadId` - UUID of the upload

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "mcqs": [
      {
        "id": "mcq-uuid",
        "question": "What organelle performs photosynthesis?",
        "options": [
          "Mitochondria",
          "Chloroplast",
          "Nucleus",
          "Vacuole"
        ],
        "correct_answer": 1,
        "explanation": "Chloroplasts contain chlorophyll and perform photosynthesis.",
        "difficulty": "easy",
        "created_at": "2025-11-20T12:00:00Z"
      }
    ],
    "count": 5,
    "upload_id": "upload-uuid"
  }
}
```

**Error Responses:**
- `401` - Authentication required
- `500` - Failed to fetch MCQs

**Example (curl):**
```bash
curl http://localhost:8080/api/mcqs/upload/UPLOAD_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example (JavaScript):**
```javascript
const response = await fetch(`${API_URL}/api/mcqs/upload/${uploadId}`, {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const data = await response.json();
console.log(`Found ${data.data.count} MCQs`);
```

---

### 3. Delete MCQ
Delete a specific MCQ (options are deleted automatically).

**Endpoint:** `DELETE /api/mcqs/:mcqId`

**Authentication:** Required (Bearer token)

**URL Parameters:**
- `mcqId` - UUID of the MCQ to delete

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "MCQ deleted successfully"
}
```

**Error Responses:**
- `401` - Authentication required
- `500` - Failed to delete MCQ

**Example (curl):**
```bash
curl -X DELETE http://localhost:8080/api/mcqs/MCQ_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example (JavaScript):**
```javascript
const response = await fetch(`${API_URL}/api/mcqs/${mcqId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const data = await response.json();
console.log(data.message);
```

---

## Database Schema

### mcqs Table
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key → auth.users)
- upload_id: UUID (Foreign Key → uploads)
- question: TEXT
- correct_answer: INTEGER (0-3)
- explanation: TEXT
- difficulty: TEXT (easy/medium/hard)
- topic: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### mcq_options Table
```sql
- id: UUID (Primary Key)
- mcq_id: UUID (Foreign Key → mcqs)
- option_index: INTEGER (0-3)
- option_text: TEXT
- created_at: TIMESTAMP
```

### Relationships
- Each MCQ belongs to one user
- Each MCQ belongs to one upload
- Each MCQ has exactly 4 options
- Deleting an upload deletes all its MCQs (CASCADE)
- Deleting an MCQ deletes all its options (CASCADE)
- RLS ensures users can only access their own MCQs

---

## Usage Flow

1. **Upload Image** → `POST /api/uploads/image`
2. **Generate MCQs** → `POST /api/mcqs/generate/:uploadId`
3. **Get MCQs** → `GET /api/mcqs/upload/:uploadId`
4. **Delete MCQ** (optional) → `DELETE /api/mcqs/:mcqId`

---

## Testing

### 1. Setup Database
```sql
-- Run in Supabase SQL Editor
-- File: Backend/docs/mcqs_schema.sql
```

### 2. Get Upload ID
```bash
# First upload an image
curl -X POST http://localhost:8080/api/uploads/image \
  -H "Authorization: Bearer TOKEN" \
  -F "image=@test.jpg"

# Note the upload_id from response
```

### 3. Generate MCQs
```bash
curl -X POST http://localhost:8080/api/mcqs/generate/UPLOAD_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count": 5, "difficulty": "medium"}'
```

### 4. Verify in Database
```sql
-- Check created MCQs
SELECT m.*, 
  (SELECT json_agg(o.option_text ORDER BY o.option_index) 
   FROM mcq_options o WHERE o.mcq_id = m.id) as options
FROM mcqs m
WHERE upload_id = 'your-upload-id';
```

---

## Error Handling

All endpoints return consistent error format:
```json
{
  "status": "error",
  "message": "Error description"
}
```

Common errors:
- **401 Unauthorized** - Missing or invalid token
- **404 Not Found** - Upload doesn't exist
- **400 Bad Request** - No text in upload
- **500 Internal Server Error** - Server/AI processing error

---

## Notes

- MCQs are generated using Claude AI based on extracted text
- Each question has exactly 4 options
- `correct_answer` is 0-indexed (0, 1, 2, or 3)
- RLS policies ensure data isolation between users
- Cascade deletes maintain referential integrity
- All timestamps are in UTC
