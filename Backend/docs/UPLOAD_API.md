# Upload API Documentation

## Overview
The Upload API allows users to upload images and extract text using Claude Vision AI. The extracted text is stored in the database along with the original image.

## Setup

### 1. Install Dependencies
```bash
npm install @anthropic-ai/sdk multer @types/multer
```

### 2. Environment Variables
Add to `Backend/.env`:
```bash
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

Get your API key from: https://console.anthropic.com/

### 3. Database Setup
Run the SQL schema in Supabase SQL Editor:
```bash
# File: Backend/docs/uploads_schema.sql
```

This creates:
- `uploads` table with RLS policies
- Indexes for performance
- Auto-update trigger for `updated_at`

### 4. Supabase Storage Setup
1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `uploads`
3. Set bucket to **Public** or configure RLS policies
4. Configure:
   - Max file size: 10MB
   - Allowed types: image/jpeg, image/png, image/webp, image/gif

## API Endpoints

### Upload Image
Upload an image and extract text using Claude Vision.

**Endpoint:** `POST /api/uploads/image`

**Authentication:** Required (Bearer token)

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `image` (file): Image file (JPEG, PNG, WEBP, GIF)
  - Max size: 10MB

**Example (curl):**
```bash
curl -X POST http://localhost:8080/api/uploads/image \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "image=@/path/to/image.jpg"
```

**Example (JavaScript):**
```javascript
const formData = new FormData();
formData.append('image', fileBlob, 'image.jpg');

const response = await fetch('http://localhost:8080/api/uploads/image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  body: formData,
});

const data = await response.json();
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "upload_id": "uuid",
    "filename": "image.jpg",
    "file_url": "https://...supabase.co/storage/v1/object/public/uploads/...",
    "extracted_text": "This is the extracted text from the image...",
    "confidence": 0.95,
    "word_count": 42,
    "created_at": "2025-11-19T21:30:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: No file provided or invalid file type
- `401 Unauthorized`: Missing or invalid token
- `413 Payload Too Large`: File exceeds 10MB
- `500 Internal Server Error`: Processing failed

---

### Get Upload History
Get paginated list of user's uploads.

**Endpoint:** `GET /api/uploads/history`

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Example:**
```bash
curl http://localhost:8080/api/uploads/history?limit=10&offset=0 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "uploads": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "filename": "image.jpg",
        "file_url": "https://...",
        "extracted_text": "...",
        "extraction_confidence": 0.95,
        "status": "completed",
        "created_at": "2025-11-19T21:30:00Z"
      }
    ],
    "total": 42,
    "limit": 10,
    "offset": 0
  }
}
```

---

### Get Upload by ID
Get details of a specific upload.

**Endpoint:** `GET /api/uploads/:uploadId`

**Authentication:** Required

**Example:**
```bash
curl http://localhost:8080/api/uploads/uuid-here \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "filename": "notes.jpg",
    "file_path": "user-id/1234567890-notes.jpg",
    "file_url": "https://...",
    "file_size": 1024000,
    "mime_type": "image/jpeg",
    "extracted_text": "Full extracted text...",
    "extraction_confidence": 0.95,
    "extraction_metadata": {
      "model": "claude-sonnet-4-20250514",
      "usage": { "input_tokens": 100, "output_tokens": 500 }
    },
    "status": "completed",
    "created_at": "2025-11-19T21:30:00Z",
    "updated_at": "2025-11-19T21:30:00Z"
  }
}
```

**Error Responses:**
- `404 Not Found`: Upload not found or user doesn't have access

---

### Delete Upload
Delete an upload and remove the file from storage.

**Endpoint:** `DELETE /api/uploads/:uploadId`

**Authentication:** Required

**Example:**
```bash
curl -X DELETE http://localhost:8080/api/uploads/uuid-here \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Upload deleted successfully"
}
```

**Error Responses:**
- `404 Not Found`: Upload not found

---

## Database Schema

### `uploads` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| filename | TEXT | Original filename |
| file_path | TEXT | Storage path |
| file_url | TEXT | Public URL |
| file_size | INTEGER | Size in bytes |
| mime_type | TEXT | MIME type |
| extracted_text | TEXT | Text extracted by Claude |
| extraction_confidence | DECIMAL(3,2) | Confidence score (0-1) |
| extraction_metadata | JSONB | Claude API metadata |
| status | TEXT | Status (pending/completed/failed/no_text_found) |
| error_message | TEXT | Error details if failed |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### RLS Policies
- Users can only view/insert/update/delete their own uploads
- Enforced at database level for security

---

## Claude Vision Integration

### Features
- **Text Extraction**: Extract all visible text from images
- **Handwriting Recognition**: Transcribe handwritten notes
- **Table Preservation**: Maintain table structure
- **Math Formulas**: Convert to LaTeX notation
- **High Accuracy**: 95%+ confidence for clear images

### Supported Models
- `claude-sonnet-4-20250514` (current)
- Supports image formats: JPEG, PNG, WEBP, GIF

### Image Requirements
- Max size: 10MB
- Recommended: Clear, well-lit images
- For best results: High resolution, good contrast

---

## Error Handling

### Common Errors

**Invalid File Type:**
```json
{
  "status": "error",
  "message": "Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed."
}
```

**File Too Large:**
```json
{
  "status": "error",
  "message": "File size exceeds 10MB limit"
}
```

**No Text Found:**
```json
{
  "status": "success",
  "data": {
    "extracted_text": "",
    "confidence": 0,
    "status": "no_text_found"
  }
}
```

**API Key Missing:**
```json
{
  "status": "error",
  "message": "ANTHROPIC_API_KEY is not configured"
}
```

---

## Usage Limits

### Anthropic API
- Check your plan limits at: https://console.anthropic.com/
- Monitor usage in the metadata field
- Implement rate limiting if needed

### Storage
- Default Supabase plan: 1GB storage
- Monitor usage in Supabase Dashboard
- Consider cleanup policies for old uploads

---

## Testing

### Manual Test
```bash
# 1. Get auth token
TOKEN=$(curl -X POST http://localhost:8080/api/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.data.access_token')

# 2. Upload image
curl -X POST http://localhost:8080/api/uploads/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@test-image.jpg"

# 3. Get history
curl http://localhost:8080/api/uploads/history \
  -H "Authorization: Bearer $TOKEN"
```

---

## Next Steps

1. **Add to your React Native app**:
   - Create `uploadImage()` function in `src/api/upload.js`
   - Use `expo-image-picker` for image selection
   - Show upload progress and extracted text

2. **Enhance features**:
   - Add study material generation from extracted text
   - Implement OCR result review/editing
   - Add batch upload support
   - Generate flashcards/quizzes from uploads

3. **Optimize**:
   - Add image compression before upload
   - Implement caching for repeated uploads
   - Add background upload queue

---

## Security Considerations

- ✅ All endpoints require authentication
- ✅ RLS policies enforce user isolation
- ✅ File type validation prevents malicious uploads
- ✅ File size limits prevent abuse
- ✅ Secure storage with Supabase
- ⚠️ Consider adding virus scanning in production
- ⚠️ Implement rate limiting per user
- ⚠️ Monitor API costs and set budgets
