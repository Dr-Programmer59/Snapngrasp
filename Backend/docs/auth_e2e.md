# Authentication E2E Test Checklist

## Test Environment Setup

- [ ] Supabase project created
- [ ] SQL schema executed (profiles, integrations, RLS, RPCs)
- [ ] Email provider enabled in Supabase
- [ ] `.env` file configured with valid Supabase credentials
- [ ] Server running on `http://localhost:8080`

---

## AC-1: Signup → Profile Row Exists

### Test: Email Signup Creates Profile

**Action:**
```bash
curl -X POST http://localhost:8080/api/auth/email/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser1@example.com",
    "password": "SecurePass123!",
    "display_name": "Test User 1"
  }'
```

**Expected Response (201):**
```json
{
  "status": "success",
  "data": {
    "user_id": "<uuid>",
    "email": "testuser1@example.com"
  }
}
```

**Verification:**
```sql
SELECT * FROM public.profiles WHERE email = 'testuser1@example.com';
```

**Expected:**
- `user_id` matches signup response
- `email` = 'testuser1@example.com'
- `display_name` = 'Test User 1'
- `role` = 'user'
- `onboarding_completed` = false
- `learning_style` = NULL
- `created_at` is set

**Status:** ✅ / ❌

---

## AC-2: Validate Works

### Test: Valid Token Returns Profile

**Step 1: Login**
```bash
curl -X POST http://localhost:8080/api/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser1@example.com",
    "password": "SecurePass123!"
  }'
```

**Save `access_token` from response**

**Step 2: Validate**
```bash
curl -X GET http://localhost:8080/api/auth/validate \
  -H "Authorization: Bearer <access_token>"
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "user_id": "<uuid>",
    "profile": {
      "email": "testuser1@example.com",
      "display_name": "Test User 1",
      "avatar_url": null,
      "role": "user",
      "learning_style": null,
      "onboarding_completed": false,
      "last_login_at": "<timestamp>"
    }
  }
}
```

**Verification:**
- `last_login_at` is updated in database

**Status:** ✅ / ❌

### Test: Invalid Token Returns 401

**Action:**
```bash
curl -X GET http://localhost:8080/api/auth/validate \
  -H "Authorization: Bearer invalid_token_here"
```

**Expected Response (401):**
```json
{
  "status": "error",
  "message": "Authentication failed"
}
```

**Status:** ✅ / ❌

### Test: Missing Token Returns 401

**Action:**
```bash
curl -X GET http://localhost:8080/api/auth/validate
```

**Expected Response (401):**
```json
{
  "status": "error",
  "message": "Missing authorization token"
}
```

**Status:** ✅ / ❌

---

## AC-3: Onboarding

### Test: Complete Onboarding Sets Learning Style

**Action:**
```bash
curl -X POST http://localhost:8080/api/onboarding/complete \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "learning_style": "visual",
    "display_name": "Updated Name"
  }'
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "profile": {
      "user_id": "<uuid>",
      "email": "testuser1@example.com",
      "display_name": "Updated Name",
      "learning_style": "visual",
      "onboarding_completed": true
    }
  }
}
```

**Verification:**
```sql
SELECT learning_style, onboarding_completed 
FROM public.profiles 
WHERE email = 'testuser1@example.com';
```

**Expected:**
- `learning_style` = 'visual'
- `onboarding_completed` = true

**Status:** ✅ / ❌

### Test: Update Learning Style Later

**Action:**
```bash
curl -X POST http://localhost:8080/api/onboarding/set-style \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "learning_style": "auditory"
  }'
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "profile": {
      "user_id": "<uuid>",
      "learning_style": "auditory"
    }
  }
}
```

**Verification:**
```sql
SELECT learning_style FROM public.profiles WHERE email = 'testuser1@example.com';
```

**Expected:**
- `learning_style` = 'auditory'

**Status:** ✅ / ❌

### Test: Invalid Learning Style Rejected

**Action:**
```bash
curl -X POST http://localhost:8080/api/onboarding/complete \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "learning_style": "invalid_style"
  }'
```

**Expected Response (400):**
```json
{
  "status": "error",
  "message": "learning_style must be visual, auditory, or interactive"
}
```

**Status:** ✅ / ❌

---

## AC-4: RLS (Row Level Security)

### Test: User Cannot Read Another User's Profile

**Step 1: Create second user**
```bash
curl -X POST http://localhost:8080/api/auth/email/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser2@example.com",
    "password": "SecurePass123!",
    "display_name": "Test User 2"
  }'
```

**Step 2: Try to query another user's profile via Supabase client**

```sql
-- As testuser1, try to read testuser2's profile
SELECT * FROM public.profiles WHERE email = 'testuser2@example.com';
```

**Expected:**
- Query returns 0 rows (RLS blocks)

**Status:** ✅ / ❌

### Test: User Can Update Own Profile

**Action:**
```bash
curl -X POST http://localhost:8080/api/onboarding/set-style \
  -H "Authorization: Bearer <testuser1_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "learning_style": "interactive"
  }'
```

**Expected Response (200):**
- Update succeeds

**Status:** ✅ / ❌

### Test: Admin Can Read All Profiles

**Step 1: Promote testuser1 to admin**
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'testuser1@example.com';
```

**Step 2: Call admin RPC**
```sql
-- As admin testuser1
SELECT * FROM admin_list_users();
```

**Expected:**
- Returns all users (testuser1, testuser2)

**Status:** ✅ / ❌

---

## AC-5: Admin Role

### Test: admin_list_users() Only Works for Admins

**Step 1: Call as regular user (testuser2)**
```sql
-- As testuser2 (role = 'user')
SELECT * FROM admin_list_users();
```

**Expected:**
- Error: "Forbidden: admin only"

**Status:** ✅ / ❌

**Step 2: Call as admin (testuser1)**
```sql
-- As testuser1 (role = 'admin')
SELECT * FROM admin_list_users();
```

**Expected:**
- Returns list of all users

**Status:** ✅ / ❌

### Test: admin_set_role() Only Works for Admins

**Step 1: Regular user tries to promote self**
```sql
-- As testuser2 (role = 'user')
SELECT * FROM admin_set_role('<testuser2_uuid>', 'admin');
```

**Expected:**
- Error: "Forbidden: admin only"

**Status:** ✅ / ❌

**Step 2: Admin promotes another user**
```sql
-- As testuser1 (role = 'admin')
SELECT * FROM admin_set_role('<testuser2_uuid>', 'admin');
```

**Expected:**
- testuser2 role updated to 'admin'

**Verification:**
```sql
SELECT role FROM public.profiles WHERE email = 'testuser2@example.com';
```

**Status:** ✅ / ❌

---

## AC-6: Integrations

### Test: upsert_integration Creates Canvas Link

**Action:**
```sql
-- As testuser1
SELECT * FROM upsert_integration(
  'canvas',
  'canvas_user_123',
  'canvas_access_token_xyz'
);
```

**Expected:**
- New row created in `user_integrations`
- `provider` = 'canvas'
- `external_user_id` = 'canvas_user_123'
- `access_token` = 'canvas_access_token_xyz'

**Verification:**
```sql
SELECT * FROM public.user_integrations 
WHERE user_id = auth.uid() AND provider = 'canvas';
```

**Status:** ✅ / ❌

### Test: Integration Visible Only to Owner and Admins

**Step 1: testuser1 creates integration**
```sql
-- As testuser1
SELECT * FROM upsert_integration('canvas', 'user1_canvas', 'token1');
```

**Step 2: testuser2 tries to read testuser1's integration**
```sql
-- As testuser2
SELECT * FROM public.user_integrations WHERE provider = 'canvas';
```

**Expected:**
- Returns only testuser2's integrations (if any)
- Does NOT return testuser1's integration

**Status:** ✅ / ❌

**Step 3: Admin reads all integrations**
```sql
-- As admin
SELECT * FROM public.user_integrations;
```

**Expected:**
- Returns all integrations (testuser1, testuser2)

**Status:** ✅ / ❌

### Test: delete_integration Removes Link

**Action:**
```sql
-- As testuser1
SELECT * FROM delete_integration('canvas');
```

**Verification:**
```sql
SELECT * FROM public.user_integrations 
WHERE user_id = auth.uid() AND provider = 'canvas';
```

**Expected:**
- 0 rows returned

**Status:** ✅ / ❌

---

## AC-7: Logout

### Test: Device Logout Succeeds

**Action:**
```bash
curl -X POST http://localhost:8080/api/auth/logout
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": { "ok": true }
}
```

**Note:** Client should clear local tokens after this call.

**Status:** ✅ / ❌

### Test: Logout All Revokes Refresh Tokens

**Step 1: Get multiple sessions (login twice)**
```bash
# Login 1
curl -X POST http://localhost:8080/api/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser1@example.com", "password": "SecurePass123!"}'

# Save access_token_1

# Login 2
curl -X POST http://localhost:8080/api/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser1@example.com", "password": "SecurePass123!"}'

# Save access_token_2
```

**Step 2: Logout all**
```bash
curl -X POST http://localhost:8080/api/auth/logout-all \
  -H "Authorization: Bearer <access_token_1>" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "<testuser1_uuid>"}'
```

**Step 3: Try to use old tokens**
```bash
curl -X GET http://localhost:8080/api/auth/validate \
  -H "Authorization: Bearer <access_token_1>"
```

**Expected Response (401):**
- Tokens are invalid after logout-all

**Status:** ✅ / ❌

---

## Performance Tests

### Test: Validate Response Time < 500ms

**Action:**
```bash
curl -w "\nTotal time: %{time_total}s\n" \
  -X GET http://localhost:8080/api/auth/validate \
  -H "Authorization: Bearer <access_token>"
```

**Expected:**
- Response time < 500ms

**Status:** ✅ / ❌

### Test: Concurrent Validations (10 simultaneous)

**Action:**
Use Apache Bench or similar:
```bash
ab -n 100 -c 10 -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/auth/validate
```

**Expected:**
- All requests succeed (200)
- No timeouts or errors

**Status:** ✅ / ❌

---

## Error Handling Tests

### Test: Missing Required Field (signup)

**Action:**
```bash
curl -X POST http://localhost:8080/api/auth/email/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Expected Response (400):**
```json
{
  "status": "error",
  "message": "Email and password are required"
}
```

**Status:** ✅ / ❌

### Test: Duplicate Email Signup

**Action:**
```bash
# Signup with same email twice
curl -X POST http://localhost:8080/api/auth/email/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "duplicate@example.com", "password": "pass123"}'

curl -X POST http://localhost:8080/api/auth/email/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "duplicate@example.com", "password": "pass123"}'
```

**Expected Response (400):**
```json
{
  "status": "error",
  "message": "User already registered"
}
```

**Status:** ✅ / ❌

### Test: Wrong Password Login

**Action:**
```bash
curl -X POST http://localhost:8080/api/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser1@example.com", "password": "WrongPassword"}'
```

**Expected Response (401):**
```json
{
  "status": "error",
  "message": "Invalid credentials"
}
```

**Status:** ✅ / ❌

---

## OAuth Tests (Manual)

### Test: Get Google OAuth URL

**Action:**
```bash
curl "http://localhost:8080/api/auth/oauth/url?provider=google&redirect_to=http://localhost:3000/callback"
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "url": "https://accounts.google.com/o/oauth2/v2/auth?...",
    "provider": "google"
  }
}
```

**Status:** ✅ / ❌

### Test: Invalid OAuth Provider

**Action:**
```bash
curl "http://localhost:8080/api/auth/oauth/url?provider=facebook"
```

**Expected Response (400):**
```json
{
  "status": "error",
  "message": "Valid provider (google|apple) is required"
}
```

**Status:** ✅ / ❌

---

## Summary

| Test Category | Total | Passed | Failed |
|---------------|-------|--------|--------|
| Signup & Profile | 1 | - | - |
| Token Validation | 3 | - | - |
| Onboarding | 3 | - | - |
| RLS | 3 | - | - |
| Admin Role | 2 | - | - |
| Integrations | 3 | - | - |
| Logout | 2 | - | - |
| Performance | 2 | - | - |
| Error Handling | 3 | - | - |
| OAuth | 2 | - | - |
| **TOTAL** | **24** | **-** | **-** |

---

## Notes

- Run tests in order (AC-1 → AC-7)
- Use fresh database for each test run
- Save all tokens for reuse in subsequent tests
- Verify database state after each operation
- Check server logs for errors

---

**Test Date:** ___________  
**Tester:** ___________  
**Environment:** Development / Staging / Production  
**Result:** ✅ PASS / ❌ FAIL
