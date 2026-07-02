# Authentication & Identity Layer - Setup Guide

## Overview

Complete authentication system for SnapNGrasp using Supabase Auth + Node.js backend.

**Features:**
- Multi-provider OAuth (Email, Google, Apple)
- JWT token validation
- Profile management with RLS
- Onboarding flow with learning styles
- Admin role management
- Canvas LMS integration prep

---

## Quick Start

### ❶ Configure Supabase Auth Providers

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Enable providers:
   - **Email**: Enable (configure SMTP if needed)
   - **Google**: Enable and add OAuth credentials
   - **Apple**: Enable and add OAuth credentials

3. Add redirect URLs:
   ```
   http://localhost:3000/auth/callback
   https://your-mobile-app/auth/callback
   ```

### ❷ Run SQL Schema (Already Done)

The database schema has been created with:
- ✅ Enum types (`user_role`, `learning_style`)
- ✅ `profiles` table with auto-creation trigger
- ✅ `user_integrations` table for Canvas
- ✅ RLS policies (self + admin access)
- ✅ RPC functions for safe operations

### ❸ Promote an Admin User

After a user signs up, run this **ONCE** in Supabase SQL Editor:

```sql
-- Replace with your admin email
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com';
```

### ❹ Configure Environment

Copy `.env.example` to `.env` and fill in:

```bash
# Supabase (get from Supabase Dashboard → Settings → API)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
SUPABASE_ANON_KEY=eyJxxx...

# OAuth redirect (your app's callback URL)
OAUTH_REDIRECT_URL=http://localhost:3000/auth/callback

# CORS (comma-separated origins)
CORS_ORIGIN=http://localhost:3000,https://your-mobile-app
```

### ❺ Start the Server

```bash
npm run dev
```

Server starts on `http://localhost:8080`

---

## API Endpoints

### Authentication

#### `GET /api/auth/validate`
Verify bearer token and return user profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "user_id": "uuid",
    "profile": {
      "email": "user@example.com",
      "display_name": "John Doe",
      "avatar_url": null,
      "role": "user",
      "learning_style": "visual",
      "onboarding_completed": true,
      "last_login_at": "2025-10-29T06:00:00.000Z"
    }
  }
}
```

#### `POST /api/auth/logout`
Device sign-out (client should clear local session).

**Response (200):**
```json
{
  "status": "success",
  "data": { "ok": true }
}
```

#### `POST /api/auth/logout-all`
Revoke all refresh tokens (admin or self).

**Body:**
```json
{
  "user_id": "uuid"
}
```

#### `POST /api/auth/email/signup`
Create new user with email/password.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "display_name": "John Doe"
}
```

#### `POST /api/auth/email/login`
Login with email/password.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "access_token": "eyJxxx...",
    "refresh_token": "xxx...",
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    }
  }
}
```

#### `GET /api/auth/oauth/url`
Get OAuth provider URL for Google/Apple login.

**Query:**
- `provider`: `google` or `apple`
- `redirect_to`: Callback URL (optional)

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "url": "https://accounts.google.com/...",
    "provider": "google"
  }
}
```

---

### Onboarding

#### `POST /api/onboarding/complete`
Complete first-time onboarding.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Body:**
```json
{
  "learning_style": "visual",
  "display_name": "John Doe"
}
```

**Learning styles:** `visual`, `auditory`, `interactive`

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "profile": {
      "user_id": "uuid",
      "email": "user@example.com",
      "display_name": "John Doe",
      "learning_style": "visual",
      "onboarding_completed": true
    }
  }
}
```

#### `POST /api/onboarding/set-style`
Update learning style later.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Body:**
```json
{
  "learning_style": "auditory"
}
```

---

## Testing End-to-End

### 1. Sign Up
```bash
curl -X POST http://localhost:8080/api/auth/email/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "display_name": "Test User"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:8080/api/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Copy the `access_token` from response.

### 3. Validate Token
```bash
curl -X GET http://localhost:8080/api/auth/validate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Complete Onboarding
```bash
curl -X POST http://localhost:8080/api/onboarding/complete \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "learning_style": "visual",
    "display_name": "Test User"
  }'
```

### 5. Verify in Supabase
```sql
SELECT * FROM public.profiles WHERE email = 'test@example.com';
```

Should show:
- `onboarding_completed = true`
- `learning_style = 'visual'`
- `last_login_at` updated

---

## Security Features

### Row Level Security (RLS)
- ✅ Users can only read/update their own profile
- ✅ Admins can read/update all profiles
- ✅ Integrations (Canvas) are user-scoped or admin-accessible only

### Admin Functions
- Protected by `SECURITY DEFINER` + `is_admin()` check
- Only admin role can execute:
  - `admin_set_role(user_id, role)`
  - `admin_list_users()`

### Rate Limiting
- Configure `express-rate-limit` on auth endpoints (recommended: 5 req/min for signup/login)

### CORS
- Restrict to known mobile app origins via `CORS_ORIGIN` env var

---

## Canvas Integration (Future)

The `user_integrations` table is ready for Canvas LMS:

```sql
-- User links their Canvas account
SELECT * FROM upsert_integration(
  'canvas',
  'canvas_user_id',
  'canvas_access_token'
);

-- Later: sync assignments (read-only)
SELECT * FROM user_integrations 
WHERE user_id = auth.uid() AND provider = 'canvas';
```

Backend will use this token to call Canvas API (GET assignments, due dates).

---

## Troubleshooting

### Issue: "Missing Supabase configuration"
**Fix:** Ensure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ANON_KEY` are set in `.env`

### Issue: "Invalid or expired token" (401)
**Fix:** Token may have expired. Re-login to get a fresh token.

### Issue: "Forbidden: admin only"
**Fix:** User must have `role = 'admin'` in profiles table. Run the bootstrap SQL.

### Issue: RLS blocking queries
**Fix:** Ensure policies are correctly set up. Check `auth.uid()` is returning the expected user ID.

---

## Next Steps

1. ✅ Auth & Onboarding implemented
2. ⏳ Implement uploads & OCR (Google Vision)
3. ⏳ Implement study endpoints (flashcards, quizzes)
4. ⏳ Implement progress tracking
5. ⏳ Implement Canvas sync (read-only)
6. ⏳ Implement admin dashboard

---

## Support

For issues, check:
- Supabase logs (Dashboard → Logs)
- Backend logs (pino output)
- Network tab in browser/Postman

**Pro tip:** Use Supabase SQL Editor to manually query `profiles` and `user_integrations` tables for debugging.
