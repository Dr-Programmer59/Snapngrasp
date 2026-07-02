# Visual Slot-Based Learning Migration Guide

## Overview
This migration updates the visual learning system from marker-based (1-8 numbered) to a modern slot-based labeling system with chip selection.

## Changes

### Database Schema
- **Added columns to `visual_labels`**: `label_id`, `text`, `hint`, `short_hint`
- **New table `visual_slots`**: Stores slot positions and metadata
- **Updated `visual_user_answers`**: Added `slot_id` column

### Backend Changes
- Updated Claude prompt to generate slot-based structure
- Modified visual insertion to use new labels/slots format
- Updated `getVisualById` to return slots instead of options
- Fixed `question_text` mapping (uses `instruction_text`)

### Frontend Changes
- Completely redesigned `VisualPracticeScreen.js`
- Slot-based callout boxes with percentage positioning
- Chip selection interface at bottom
- Active slot highlighting (purple border)
- Visual feedback (green correct, red incorrect)
- Progress bar and step indicator
- Modern header matching brain anatomy design

## Migration Steps

### 1. Run Database Migration

Connect to your Supabase database and run the migration:

```bash
# Using Supabase CLI
supabase db push ./Backend/docs/visuals_slot_migration.sql

# OR using psql
psql -h your-db-host -U postgres -d your-db-name -f ./Backend/docs/visuals_slot_migration.sql

# OR in Supabase Dashboard
# Go to SQL Editor and paste contents of visuals_slot_migration.sql
```

### 2. Verify Tables Created

Run this query to verify the new structure:

```sql
-- Check visual_slots table exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'visual_slots';

-- Check visual_labels has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'visual_labels';
```

### 3. Restart Backend

```bash
cd Backend
npm run dev
```

### 4. Test Visual Generation

1. Upload a document or type text
2. Generate study materials
3. Check backend logs for visual generation
4. Verify slots and labels are inserted correctly

### 5. Test Frontend

1. Navigate to a visual practice activity
2. Verify slot callout boxes appear
3. Test chip selection
4. Verify feedback and progress bar

## Data Structure

### New Visual Object Structure

```typescript
{
  id: string,
  title: string,
  subject: string,
  visual_type: "label_diagram",
  difficulty: "easy" | "medium" | "hard",
  instruction_text: string,
  image_url: string,
  labels: [
    {
      label_id: "label_1",
      text: "Frontal Lobe",
      hint: "One-sentence explanation",
      short_hint: "Brief tooltip"
    }
  ],
  slots: [
    {
      slot_id: "slot_1",
      x: 0.15, // percentage 0.0-1.0
      y: 0.20, // percentage 0.0-1.0
      correct_label_id: "label_1",
      is_pre_labeled: true, // shows answer
      is_required: true // must be filled
    }
  ]
}
```

## Rollback (if needed)

If issues occur, you can rollback:

```sql
-- Remove new table
DROP TABLE IF EXISTS public.visual_slots CASCADE;

-- Remove new columns from visual_labels
ALTER TABLE public.visual_labels 
DROP COLUMN IF EXISTS label_id,
DROP COLUMN IF EXISTS text,
DROP COLUMN IF EXISTS hint,
DROP COLUMN IF EXISTS short_hint;

-- Remove slot_id from visual_user_answers
ALTER TABLE public.visual_user_answers 
DROP COLUMN IF EXISTS slot_id;
```

## Troubleshooting

### Error: "null value in column 'question_text'"
**Solution**: Migration complete! The code now maps `instruction_text` to `question_text`.

### Error: "relation 'visual_slots' does not exist"
**Solution**: Run the migration SQL file.

### Labels not showing in frontend
**Solution**: Check that `visual_labels` has `label_id` and `text` columns populated.

### Slots not positioned correctly
**Solution**: Verify x/y values are between 0.0 and 1.0 (percentages).

## Testing Checklist

- [ ] Database migration runs without errors
- [ ] Backend compiles without TypeScript errors
- [ ] Visual generation creates labels and slots
- [ ] GET /api/visuals/:id returns slots array
- [ ] Frontend displays slot callout boxes
- [ ] Chip selection works correctly
- [ ] Progress bar updates on correct answers
- [ ] Pre-labeled slots are non-interactive
- [ ] Image generation includes callout boxes

## Support

If you encounter issues:
1. Check backend logs for database errors
2. Verify migration ran successfully
3. Check that new tables/columns exist
4. Ensure frontend is using updated VisualPracticeScreen.js
