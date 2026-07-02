# Notes System Documentation

## Overview
Complete note-taking system with rich text formatting, tags, categories, and favorites. Supports **bold** and *italic* markdown-style formatting.

## Database Schema

### Table: `notes`
```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  upload_id UUID REFERENCES uploads(id) ON DELETE SET NULL,
  is_favorite BOOLEAN DEFAULT false,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes
- `idx_notes_user_id` - Fast lookup by user
- `idx_notes_created_at` - Sorting by creation date
- `idx_notes_updated_at` - Sorting by update date
- `idx_notes_is_favorite` - Filter favorites
- `idx_notes_category` - Filter by category
- `idx_notes_upload_id` - Link to uploads
- `idx_notes_tags` (GIN) - Fast array search for tags

## API Endpoints

### GET /api/notes
Get all notes for authenticated user.

**Query Parameters:**
- `search` (optional) - Search in title and content
- `tag` (optional) - Filter by tag
- `sort` (optional) - Sort field: `created_at` (default) or `updated_at`
- `order` (optional) - Sort order: `desc` (default) or `asc`

**Response:**
```json
{
  "notes": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "My Note",
      "content": "Plain text content",
      "content_html": "<strong>HTML</strong> formatted content",
      "tags": ["biology", "chapter1"],
      "category": "Study Notes",
      "is_favorite": false,
      "color": null,
      "upload_id": null,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### GET /api/notes/tags
Get all unique tags used by the user.

**Response:**
```json
{
  "tags": ["biology", "chemistry", "chapter1", "exam"]
}
```

### GET /api/notes/:noteId
Get a single note by ID.

**Response:**
```json
{
  "note": {
    "id": "uuid",
    "title": "My Note",
    "content": "...",
    "content_html": "...",
    "tags": ["biology"],
    "category": "Study Notes",
    "is_favorite": true,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

### POST /api/notes
Create a new note.

**Request Body:**
```json
{
  "title": "My New Note",
  "content": "This is **bold** and *italic* text",
  "tags": ["biology", "chapter1"],
  "category": "Study Notes",
  "upload_id": "uuid (optional)",
  "color": "#FF5733 (optional)"
}
```

**Response:**
```json
{
  "message": "Note created successfully",
  "note": {
    "id": "uuid",
    "title": "My New Note",
    "content": "This is **bold** and *italic* text",
    "content_html": "This is <strong>bold</strong> and <em>italic</em> text",
    "tags": ["biology", "chapter1"],
    "category": "Study Notes",
    "is_favorite": false,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

### PUT /api/notes/:noteId
Update an existing note.

**Request Body:**
```json
{
  "title": "Updated Title",
  "content": "Updated **content**",
  "tags": ["biology", "updated"],
  "category": "Personal",
  "is_favorite": true,
  "color": "#00FF00"
}
```

**Response:**
```json
{
  "message": "Note updated successfully",
  "note": { /* updated note object */ }
}
```

### DELETE /api/notes/:noteId
Delete a note.

**Response:**
```json
{
  "message": "Note deleted successfully"
}
```

### PUT /api/notes/:noteId/favorite
Toggle favorite status.

**Response:**
```json
{
  "message": "Note favorite status updated",
  "note": {
    "id": "uuid",
    "is_favorite": true
  }
}
```

## Rich Text Formatting

### Markdown-Style Input
Users write notes using simple markdown syntax:
- `**text**` → bold
- `*text*` → italic
- `\n` → line break

### HTML Conversion
The backend automatically converts markdown to HTML:
```javascript
// Input
"This is **bold** and *italic* text"

// Stored in content_html
"This is <strong>bold</strong> and <em>italic</em> text"
```

### Conversion Functions (Frontend)

#### convertToHTML(text)
Converts markdown-style formatting to HTML:
```javascript
const html = convertToHTML("**Bold** and *italic*");
// Result: "<strong>Bold</strong> and <em>italic</em>"
```

#### convertFromHTML(html)
Converts HTML back to markdown for editing:
```javascript
const markdown = convertFromHTML("<strong>Bold</strong> and <em>italic</em>");
// Result: "**Bold** and *italic*"
```

## Frontend Screens

### NotesScreen.js
**Purpose:** List all notes with search, filter, and actions

**Features:**
- Pull-to-refresh
- Delete confirmation
- Toggle favorite
- Navigate to detail/edit
- Empty state
- Loading state
- Tags display
- Formatted dates

**Navigation:**
- → CreateNoteScreen (Add button)
- → NoteDetailScreen (Tap note)
- → EditNotesScreen (Edit button)

### CreateNoteScreen.js
**Purpose:** Create new notes with rich text

**Features:**
- Title, tags, category inputs
- Rich text formatting toolbar
- Bold/italic buttons
- Format hints
- Save with loading state
- Auto-convert markdown to HTML
- Navigate back with reload

**API Call:**
```javascript
await createNote({
  title: "My Note",
  content: "**Bold** text",
  tags: ["biology", "chapter1"],
  category: "Study Notes"
});
```

### EditNotesScreen.js
**Purpose:** Edit existing notes

**Features:**
- Load note data by ID
- Pre-fill all fields
- Convert HTML back to markdown for editing
- Update with loading state
- Same rich text toolbar as create
- Delete option

**API Calls:**
```javascript
// Load
const note = await getNoteById(noteId);
const markdown = convertFromHTML(note.content_html);

// Update
await updateNote(noteId, {
  title: "Updated",
  content: "**New** content",
  tags: ["updated"],
  category: "Personal"
});
```

### NoteDetailScreen.js
**Purpose:** View note with full formatting

**Features:**
- Display title, tags, category
- Render HTML content (stripped to plain text)
- Favorite toggle
- Edit button
- Delete button
- Metadata (created/updated dates)

**Actions:**
- Toggle favorite
- Navigate to edit
- Delete with confirmation

## Frontend API Client (`notes.js`)

### Functions

#### getNotes(search, tag, sort, order)
Fetch all notes with optional filters.

#### getNoteById(noteId)
Fetch single note.

#### createNote(noteData)
Create new note with markdown conversion.

#### updateNote(noteId, updates)
Update existing note.

#### deleteNote(noteId)
Delete note.

#### toggleFavorite(noteId)
Toggle favorite status.

#### getTags()
Get all user's tags.

#### convertToHTML(text)
Convert markdown to HTML.

#### convertFromHTML(html)
Convert HTML back to markdown.

## Usage Examples

### Create Note with Formatting
```javascript
import { createNote } from "../api/notes";

const note = await createNote({
  title: "Biology Chapter 1",
  content: "**Cell Structure**\n\n*Mitochondria* is the powerhouse of the cell.",
  tags: ["biology", "chapter1", "cells"],
  category: "Study Notes"
});

// Stored as:
// content: "**Cell Structure**\n\n*Mitochondria* is the..."
// content_html: "<strong>Cell Structure</strong><br><br><em>Mitochondria</em> is the..."
```

### Search Notes
```javascript
import { getNotes } from "../api/notes";

// Search in title/content
const results = await getNotes("mitochondria");

// Filter by tag
const biologyNotes = await getNotes(null, "biology");

// Sort by updated date
const recent = await getNotes(null, null, "updated_at", "desc");
```

### Update Note
```javascript
import { updateNote, convertFromHTML } from "../api/notes";

// Load for editing
const note = await getNoteById(noteId);
const editableText = convertFromHTML(note.content_html);

// Update
await updateNote(noteId, {
  content: editableText + "\n\n**New section**",
  tags: [...note.tags, "updated"]
});
```

### Toggle Favorite
```javascript
import { toggleFavorite } from "../api/notes";

await toggleFavorite(noteId);
// is_favorite flips true ↔ false
```

## Security

### Row Level Security (RLS)
```sql
-- Users can only view their own notes
CREATE POLICY notes_select_own ON notes
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own notes
CREATE POLICY notes_insert_own ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own notes
CREATE POLICY notes_update_own ON notes
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own notes
CREATE POLICY notes_delete_own ON notes
  FOR DELETE USING (auth.uid() = user_id);
```

### Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## Database Migration

Run migration to create table and indexes:

```bash
# Connect to Supabase
psql "postgresql://postgres:[YOUR-PASSWORD]@[HOST]/postgres"

# Run migration
\i Backend/docs/notes_migration.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `notes_migration.sql`
3. Run SQL

## Testing

### Test Create
```bash
curl -X POST http://localhost:8080/api/notes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Note",
    "content": "This is **bold** and *italic*",
    "tags": ["test"],
    "category": "Testing"
  }'
```

### Test Get All
```bash
curl -X GET "http://localhost:8080/api/notes?search=bold&tag=test" \
  -H "Authorization: Bearer <token>"
```

### Test Update
```bash
curl -X PUT http://localhost:8080/api/notes/<note-id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated",
    "content": "**New** content"
  }'
```

### Test Delete
```bash
curl -X DELETE http://localhost:8080/api/notes/<note-id> \
  -H "Authorization: Bearer <token>"
```

## Troubleshooting

### Notes Not Loading
- Check JWT token is valid
- Verify user_id matches auth.uid()
- Check RLS policies are enabled

### Rich Text Not Rendering
- Verify content_html field has HTML
- Check convertToHTML() is called on save
- Ensure HTML is properly escaped

### Tags Not Searchable
- Verify GIN index exists: `idx_notes_tags`
- Check tags are stored as TEXT[] array
- Use `@>` operator for array contains

### Favorite Toggle Not Working
- Check is_favorite column exists
- Verify PUT /notes/:id/favorite endpoint
- Ensure RLS allows updates

## Next Steps

1. **Run Database Migration**
   ```bash
   psql < Backend/docs/notes_migration.sql
   ```

2. **Test Backend API**
   - Create note via Postman/curl
   - Verify HTML conversion
   - Test search and filters

3. **Test Frontend Screens**
   - Create note with formatting
   - Edit existing note
   - View note detail
   - Toggle favorites
   - Search and filter

4. **Optional Enhancements**
   - Add color picker for note colors
   - Implement note pinning
   - Add note sharing
   - Support more markdown (lists, headers)
   - Add rich text editor component (Quill, Draft.js)
   - Implement note templates
   - Add note export (PDF, markdown)

## Related Documentation
- [Feedback System](./FEEDBACK_SYSTEM_README.md)
- [Profile Management](./PROFILE_MANAGEMENT_README.md)
- [Authentication](./AUTH_README.md)
