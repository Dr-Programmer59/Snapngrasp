# Favorites/Bookmarks System

## Overview
The favorites system allows users to bookmark their favorite flashcards, MCQs, and visuals for quick access.

## Database Schema

### Table: `favorites`
```sql
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('flashcard', 'mcq', 'visual')),
  activity_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, activity_type, activity_id)
);
```

**Setup Instructions:**
1. Go to Supabase Dashboard > SQL Editor
2. Run the SQL from `Backend/docs/favorites_schema.sql`
3. Verify the table was created successfully

## API Endpoints

### GET `/api/favorites`
Get all favorites for the current user.

**Response:**
```json
{
  "favorites": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "activity_type": "flashcard",
      "activity_id": "uuid",
      "created_at": "2026-01-17T..."
    }
  ]
}
```

### POST `/api/favorites`
Add an activity to favorites.

**Request Body:**
```json
{
  "activity_type": "flashcard",
  "activity_id": "uuid"
}
```

**Response:**
```json
{
  "message": "Added to favorites",
  "favorite": { ... }
}
```

### DELETE `/api/favorites`
Remove an activity from favorites.

**Request Body:**
```json
{
  "activity_type": "flashcard",
  "activity_id": "uuid"
}
```

**Response:**
```json
{
  "message": "Removed from favorites"
}
```

### GET `/api/favorites/check`
Check if an activity is favorited.

**Query Parameters:**
- `activity_type`: flashcard | mcq | visual
- `activity_id`: UUID

**Response:**
```json
{
  "is_favorited": true
}
```

## Frontend Usage

### Import the API
```javascript
import { getFavorites, addFavorite, removeFavorite } from '../api/favorites';
```

### Fetch Favorites
```javascript
const fetchFavorites = async () => {
  try {
    const data = await getFavorites();
    // data.favorites contains array of favorite objects
  } catch (error) {
    console.error('Error fetching favorites:', error);
  }
};
```

### Add to Favorites
```javascript
const handleAddFavorite = async (activityType, activityId) => {
  try {
    await addFavorite(activityType, activityId);
    console.log('Added to favorites');
  } catch (error) {
    console.error('Error adding favorite:', error);
  }
};
```

### Remove from Favorites
```javascript
const handleRemoveFavorite = async (activityType, activityId) => {
  try {
    await removeFavorite(activityType, activityId);
    console.log('Removed from favorites');
  } catch (error) {
    console.error('Error removing favorite:', error);
  }
};
```

## Play Screen Implementation

The Play screen now:
1. Fetches favorites on component mount
2. Stores favorite IDs in a Set for efficient lookup
3. Shows filled star icon for favorited items
4. Filters activities in the "Bookmarks" tab to show only favorites
5. Persists favorites to the backend when toggled

**Key Features:**
- ✅ Favorites persist across app sessions
- ✅ Fast favorite status lookup using Set
- ✅ Real-time UI updates when toggling favorites
- ✅ Bookmarks tab shows only favorited activities
- ✅ Works across all activity types (flashcards, MCQs, visuals)

## Testing

1. **Add to Favorites:**
   - Go to Play screen
   - Tap the star icon on any activity card
   - Icon should turn solid yellow
   - Check "Bookmarks" tab - item should appear

2. **Remove from Favorites:**
   - Tap the solid star icon
   - Icon should turn outline
   - Item should disappear from "Bookmarks" tab

3. **Persistence:**
   - Add some favorites
   - Close and reopen the app
   - Favorites should still be marked

4. **Backend Verification:**
   - Check Supabase Dashboard > Table Editor > favorites
   - Should see entries with correct user_id, activity_type, and activity_id
