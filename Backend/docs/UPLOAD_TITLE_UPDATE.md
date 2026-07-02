# Upload Schema Update - Title & Subject Support

## Overview
Updated the upload system to extract and store document titles and subjects automatically using Claude AI.

## Changes Made

### 1. Database Schema (`uploads_schema.sql`)
Added two new fields to the uploads table:
- `title TEXT` - AI-generated title (3-7 words)
- `subject TEXT` - Detected subject/topic (Biology, Math, etc.)

**New indexes:**
- `idx_uploads_subject` - For filtering by subject
- `idx_uploads_title` - Full-text search on titles

### 2. Claude Service (`claude.service.ts`)
**Updated OCR Prompt:**
- Now requests JSON output with `title`, `subject`, and `text` fields
- Generates concise descriptive titles (3-7 words)
- Identifies subject/topic automatically

**Updated `extractTextFromImage` function:**
- Returns: `{ text, title, subject, confidence, metadata }`
- Handles JSON parsing with markdown code block stripping
- Fallback to "Untitled Document" / "Unknown" if parsing fails

### 3. Upload Controller (`upload.controller.ts`)
**Updated `uploadImage` function:**
- Saves `title` and `subject` to database
- Returns `title` and `subject` in API response

**Existing functions (already implemented):**
- `getUploadHistory` - Get user's uploads with pagination
- `getUploadById` - Get single upload details
- `deleteUpload` - Delete upload

## API Endpoints

### Upload Image
```
POST /api/uploads/image
Headers: Authorization: Bearer <token>
Body: FormData with 'image' file

Response:
{
  "status": "success",
  "data": {
    "upload_id": "uuid",
    "filename": "image.jpg",
    "file_url": "/uploads/user-id/timestamp-image.jpg",
    "title": "Cell Structure and Function",
    "subject": "Biology",
    "extracted_text": "...",
    "confidence": 0.9,
    "word_count": 150,
    "created_at": "2025-11-23T..."
  }
}
```

### Get Upload History
```
GET /api/uploads/history?limit=20&offset=0
Headers: Authorization: Bearer <token>

Response:
{
  "status": "success",
  "data": {
    "uploads": [
      {
        "id": "uuid",
        "title": "Cell Structure and Function",
        "subject": "Biology",
        "filename": "image.jpg",
        "file_url": "/uploads/...",
        "extracted_text": "...",
        "created_at": "...",
        ...
      }
    ],
    "total": 10,
    "limit": 20,
    "offset": 0
  }
}
```

### Get Single Upload
```
GET /api/uploads/:uploadId
Headers: Authorization: Bearer <token>
```

### Delete Upload
```
DELETE /api/uploads/:uploadId
Headers: Authorization: Bearer <token>
```

## Database Migration Steps

### Option 1: Drop and Recreate (Development Only - LOSES ALL DATA)
```sql
-- ⚠️ WARNING: This will delete all existing uploads!
DROP TABLE IF EXISTS public.uploads CASCADE;

-- Then run the full schema from uploads_schema.sql
```

### Option 2: Alter Existing Table (Preserves Data)
```sql
-- Add new columns
ALTER TABLE public.uploads 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT;

-- Add new indexes
CREATE INDEX IF NOT EXISTS idx_uploads_subject ON public.uploads(subject);
CREATE INDEX IF NOT EXISTS idx_uploads_title ON public.uploads USING gin(to_tsvector('english', title));

-- Update existing records with default values
UPDATE public.uploads 
SET title = 'Untitled Document', subject = 'Unknown' 
WHERE title IS NULL OR subject IS NULL;
```

## Frontend Integration

The upload history endpoint is already available. You can now:

1. **Upload Screen** - Call `/api/uploads/history` to show user's uploads
2. **Display** - Show title and subject for each upload
3. **Filter** - Group uploads by subject
4. **Search** - Search by title

Example React Native API call:
```javascript
import { getAPIClient } from './config/api';

export const getUserUploads = async (limit = 20, offset = 0) => {
  const api = getAPIClient();
  const response = await api.get(`/uploads/history?limit=${limit}&offset=${offset}`);
  return response.data.data;
};
```

## Testing

1. **Update Supabase Schema**: Run the migration SQL in Supabase SQL Editor
2. **Restart Backend**: The code changes are already in place
3. **Test Upload**: Upload a new image and verify title/subject are generated
4. **Test History**: Call `/api/uploads/history` to see titles and subjects

## Benefits

✅ Automatic title generation - No manual input needed
✅ Subject detection - Helps organize notes by topic
✅ Better UX - Users can see meaningful titles instead of filenames
✅ Searchable - Full-text search on titles
✅ Filterable - Group notes by subject
✅ Backward compatible - Handles old format responses

## Next Steps

1. Run database migration in Supabase
2. Test upload with new schema
3. Update frontend Upload screen to display titles
4. Add subject filtering/grouping UI
