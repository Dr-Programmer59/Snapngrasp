# Troubleshooting: Dashboard Not Showing Recent Activity

## Current Status

✅ **Fixed**: Activity API now handles missing token gracefully  
❓ **Unknown**: Has database migration been run?  
❓ **Unknown**: Has backend server been restarted?  
❓ **Unknown**: Do you have any data in the new tables?

## Step-by-Step Fix

### 1. Verify Database Migration

Run this in **Supabase SQL Editor**:
```sql
-- File: Backend/docs/verify_migration.sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'mcq_sets'
) AS mcq_sets_exists;
```

**Expected Result**: `mcq_sets_exists: true`

If it returns `false`, you need to run the migration:
- Open `Backend/docs/activity_migration.sql`
- Copy entire contents
- Paste in Supabase SQL Editor
- Click "Run"

### 2. Restart Backend Server

```powershell
cd "D:\jordan project\snapNgrasp\project\Backend"
npm start
```

Look for these logs:
```
✅ Server started on port 5000
✅ Routes loaded: /api/activity/recent
✅ Routes loaded: /api/activity/stats
```

### 3. Check If You Have Data

The dashboard will only show items if you have data in the **NEW** tables:

**For MCQs to appear:**
- Must have generated MCQs **AFTER** running the migration
- Old MCQs won't appear (they don't have `set_id`)
- New MCQs create an entry in `mcq_sets` table

**For Flashcards to appear:**
- Must have generated flashcards **AFTER** running the migration
- Old flashcards won't appear (they don't have `set_id`)
- New flashcards create an entry in `flashcard_sets` table

**For Visuals to appear:**
- Old visuals should work (we added columns to existing table)
- New visuals will have progress tracking

### 4. Test the Flow

1. **Upload a new image**
   - Go to upload screen
   - Take/upload a photo
   - Wait for OCR to complete

2. **Generate NEW MCQs**
   - Select the upload
   - Generate MCQs
   - Answer 2-3 questions
   - Check dashboard → should show "3/10 Attempted, 2 Correct, 1 Wrong"

3. **Generate NEW Flashcards**
   - Select the upload
   - Generate flashcards
   - Review 2-3 cards
   - Check dashboard → should show "3 Reviewed, 1 Known"

4. **Generate NEW Visual**
   - Select the upload  
   - Generate visual
   - Open it (marks as viewed)
   - Fill some labels
   - Check dashboard → should show "5/8 Filled, 4 Correct"

### 5. Check Backend Logs

When you refresh the dashboard, you should see:

```
[Activity] Fetching recent activity for user: 06cc5377-...
[Activity] Found 3 flashcard sets
[Activity] Found 2 MCQ sets
[Activity] Found 1 visual
[Activity] Returning 5 activities
```

If you see:
```
[Activity] Found 0 flashcard sets
[Activity] Found 0 MCQ sets
```

This means:
- Migration not run, OR
- No new data generated after migration, OR
- RLS policies blocking access

### 6. Common Issues

**Issue**: "No authentication token found"
- **Fix**: Already fixed in activity.js (returns empty data instead of crashing)

**Issue**: Dashboard shows "No recent activity" but you generated items
- **Cause**: Items were generated BEFORE migration
- **Fix**: Generate new items AFTER running migration

**Issue**: Backend returns empty arrays
- **Cause**: RLS policies or wrong table structure
- **Fix**: Run verify_migration.sql to check tables exist

**Issue**: Frontend shows loading forever
- **Cause**: Backend not running or wrong URL
- **Fix**: Check backend is running on correct port

### 7. Quick Verification Commands

**Check if backend is running:**
```powershell
# In a NEW PowerShell terminal
curl http://localhost:5000/api/auth/validate
```

**Expected**: Should return 401 or similar (proves server is running)

**Check AsyncStorage has token:**
In your React Native app, add this temporarily to Dashboard.js:
```javascript
useEffect(() => {
  AsyncStorage.getItem('access_token').then(token => {
    console.log('🔑 Token exists:', !!token);
    console.log('🔑 Token preview:', token?.substring(0, 20));
  });
}, []);
```

**Expected**: Should log "Token exists: true"

### 8. Manual Database Check

Run in Supabase SQL Editor:
```sql
-- Check your user's MCQ sets
SELECT * FROM public.mcq_sets 
WHERE user_id = '06cc5377-cde2-4916-a543-7791ade42949'
ORDER BY updated_at DESC;

-- Check your user's flashcard sets
SELECT * FROM public.flashcard_sets 
WHERE user_id = '06cc5377-cde2-4916-a543-7791ade42949'
ORDER BY updated_at DESC;

-- Check your user's visuals
SELECT id, title, viewed, completed, total_slots, slots_filled, correct_slots, updated_at
FROM public.visuals 
WHERE user_id = '06cc5377-cde2-4916-a543-7791ade42949'
ORDER BY updated_at DESC;
```

**Expected**: If you generated items after migration, you should see rows

### 9. Force Backend Restart

If backend seems stuck:
```powershell
# Kill all node processes
taskkill /F /IM node.exe

# Start backend fresh
cd "D:\jordan project\snapNgrasp\project\Backend"
npm start
```

### 10. Force App Refresh

In your React Native app:
- Press `Ctrl + M` (Android) or shake device
- Select "Reload"
- OR restart Metro bundler and rebuild app

## Summary

**Most Likely Issue**: You haven't run the database migration yet

**Quick Fix**:
1. Run `activity_migration.sql` in Supabase
2. Restart backend server
3. Generate NEW MCQs/flashcards/visuals
4. Check dashboard

**If still not working**: Share the output of `verify_migration.sql` and backend console logs
