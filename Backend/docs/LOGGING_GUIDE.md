# Activity API Logging Guide

## How to Read the Logs

### Frontend Logs (React Native Console)

When you open the dashboard, you should see this sequence:

```
🎯 [Activity API] ========== GET RECENT ACTIVITY ==========
🔑 [Activity API] Token retrieved: exists
📡 [Activity API] API URL: http://192.168.100.2:5000/api
📡 [Activity API] Full endpoint: http://192.168.100.2:5000/api/activity/recent
📡 [Activity API] Token (first 20 chars): eyJhbGciOiJIUzI1NiIs...
📡 [Activity API] Response status: 200
📡 [Activity API] Response ok: true
✅ [Activity API] Recent activity fetched: 3 items
✅ [Activity API] Has data: true
✅ [Activity API] Activities: [
  { type: 'mcq', title: 'Biology Quiz', percent: 70 },
  { type: 'flashcard', title: 'Chemistry Terms', percent: 40 },
  { type: 'visual', title: 'Cell Diagram', percent: 60 }
]
🎯 [Activity API] ========== END (SUCCESS) ==========

📊 [Activity API] ========== GET DASHBOARD STATS ==========
🔑 [Activity API] Token retrieved: exists
📡 [Activity API] API URL: http://192.168.100.2:5000/api
📡 [Activity API] Full endpoint: http://192.168.100.2:5000/api/activity/stats
📡 [Activity API] Token (first 20 chars): eyJhbGciOiJIUzI1NiIs...
📡 [Activity API] Response status: 200
📡 [Activity API] Response ok: true
✅ [Activity API] Dashboard stats fetched: { flashcards: 5, streak: 7, accuracy: 85, quizzes: 3 }
📊 [Activity API] ========== END (SUCCESS) ==========
```

### Backend Logs (Terminal Running `npm start`)

When the API is called, you should see:

```
🌐 [Activity Routes] GET /api/activity/recent
🌐 [Activity Routes] Headers: { authorization: 'Present', contentType: 'application/json' }

🎯 [Activity] ========== GET RECENT ACTIVITY ==========
👤 [Activity] User ID: 06cc5377-cde2-4916-a543-7791ade42949
📊 [Activity] Fetching flashcard sets...
📚 [Activity] Flashcard sets found: 2
📚 [Activity] Flashcard sets: [
  { id: 'uuid1', title: 'Chemistry Terms', progress: 40 },
  { id: 'uuid2', title: 'Biology Terms', progress: 60 }
]
📊 [Activity] Fetching MCQ sets...
📝 [Activity] MCQ sets found: 1
📝 [Activity] MCQ sets: [
  { id: 'uuid3', title: 'Biology Quiz', attempted: 7, total: 10 }
]
📊 [Activity] Fetching visuals...
🎨 [Activity] Visuals found: 1
🎨 [Activity] Visuals: [
  { id: 'uuid4', title: 'Cell Diagram', viewed: true }
]
✅ [Activity] Total activities assembled: 4
✅ [Activity] Returning top 5 activities: 4
✅ [Activity] Activities: [
  { type: 'mcq', title: 'Biology Quiz', percent: 70 },
  { type: 'flashcard', title: 'Chemistry Terms', percent: 40 },
  { type: 'flashcard', title: 'Biology Terms', percent: 60 },
  { type: 'visual', title: 'Cell Diagram', percent: 50 }
]
🎯 [Activity] ========== END RECENT ACTIVITY ==========
```

## Common Scenarios

### ✅ Success - Everything Working

**Frontend:**
```
✅ [Activity API] Recent activity fetched: 3 items
✅ [Activity API] Has data: true
```

**Backend:**
```
✅ [Activity] Returning top 5 activities: 3
```

**What this means:** API is working, database has data, showing in dashboard

---

### ⚠️ No Data - Empty Tables

**Frontend:**
```
✅ [Activity API] Recent activity fetched: 0 items
✅ [Activity API] Has data: false
```

**Backend:**
```
📚 [Activity] Flashcard sets found: 0
📝 [Activity] MCQ sets found: 0
🎨 [Activity] Visuals found: 0
✅ [Activity] Total activities assembled: 0
```

**What this means:** API working but no data in database
**Fix:** Generate new MCQs/flashcards/visuals AFTER running migration

---

### ❌ No Token - Not Logged In

**Frontend:**
```
🔑 [Activity API] Token retrieved: missing
⚠️ [Activity API] No token found, skipping activity fetch
🎯 [Activity API] ========== END (NO TOKEN) ==========
```

**Backend:** (No logs - request never reaches backend)

**What this means:** User not authenticated
**Fix:** Log out and log back in to refresh token

---

### ❌ Wrong API URL

**Frontend:**
```
📡 [Activity API] Full endpoint: http://192.168.100.2:5000/api/activity/recent
📡 [Activity API] Response status: [Network request failed]
❌ [Activity API] Error fetching recent activity: [TypeError: Network request failed]
```

**Backend:** (No logs - request never reaches backend)

**What this means:** Can't reach backend server
**Fix:** 
- Check backend is running (`npm start` in Backend folder)
- Check IP address matches your computer's IP
- Check firewall isn't blocking port 5000

---

### ❌ Backend Error - Database Issue

**Frontend:**
```
📡 [Activity API] Response status: 500
❌ [Activity API] Error response: { error: 'Failed to fetch recent activity' }
```

**Backend:**
```
❌ [Activity] Flashcard sets error: { code: '42P01', message: 'relation "flashcard_sets" does not exist' }
```

**What this means:** Database migration not run
**Fix:** Run `activity_migration.sql` in Supabase SQL Editor

---

### ❌ Authentication Failed

**Frontend:**
```
📡 [Activity API] Response status: 401
❌ [Activity API] Error response: { error: 'User not authenticated' }
```

**Backend:**
```
❌ [Activity] No user ID found in request
```

**What this means:** Token invalid or expired
**Fix:** Log out and log back in

---

## Debugging Checklist

If you see no activity data:

1. **Check Frontend Logs:**
   - [ ] Token exists? (`🔑 Token retrieved: exists`)
   - [ ] Correct API URL? (Should match your backend IP)
   - [ ] Response status 200? (`📡 Response status: 200`)
   - [ ] Items fetched? (`✅ Recent activity fetched: X items`)

2. **Check Backend Logs:**
   - [ ] Request received? (`🌐 [Activity Routes] GET /api/activity/recent`)
   - [ ] User ID present? (`👤 User ID: xxx`)
   - [ ] Sets found? (`📚 Flashcard sets found: X`)
   - [ ] Activities returned? (`✅ Returning top 5 activities: X`)

3. **Check Database:**
   - [ ] Run `verify_migration.sql` - tables exist?
   - [ ] Run queries to check for data in `mcq_sets`, `flashcard_sets`, `visuals`
   - [ ] Verify RLS policies allow access

4. **Generate Fresh Data:**
   - [ ] Run migration first
   - [ ] Restart backend
   - [ ] Generate NEW MCQs/flashcards (after migration)
   - [ ] Answer some questions
   - [ ] Refresh dashboard

## Quick Commands

**View Backend Logs:**
```powershell
cd "D:\jordan project\snapNgrasp\project\Backend"
npm start
# Watch the console output
```

**View Frontend Logs:**
- In React Native: Check Metro bundler terminal or device console
- Look for lines starting with `🎯 [Activity API]` or `📊 [Activity API]`

**Test API Manually:**
```powershell
# Get your token from AsyncStorage (check app logs)
# Then test API:
curl http://192.168.100.2:5000/api/activity/recent `
  -H "Authorization: Bearer YOUR_TOKEN_HERE" `
  -H "Content-Type: application/json"
```

## Expected Flow

1. User opens Dashboard
2. Frontend fetches token from AsyncStorage
3. Frontend calls `/activity/recent` and `/activity/stats`
4. Backend receives request with auth token
5. Backend validates token, extracts user ID
6. Backend queries `mcq_sets`, `flashcard_sets`, `visuals` tables
7. Backend assembles activities array
8. Backend returns JSON response
9. Frontend receives data
10. Dashboard displays activities

If any step fails, the logs will show exactly where!
