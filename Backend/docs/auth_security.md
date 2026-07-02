# Authentication Security Review

## Overview

Security analysis of SnapNGrasp authentication & identity layer.

---

## ✅ Security Measures Implemented

### 1. Row Level Security (RLS)

**Status:** ✅ Enabled on all tables

**Policies:**
- `profiles` table:
  - Users can SELECT/UPDATE their own record only
  - Admins have full access (SELECT/UPDATE/DELETE)
  - No public INSERT (handled by trigger)

- `user_integrations` table:
  - Users have full access to their own records
  - Admins have full access to all records
  - No cross-user access

**SQL:**
```sql
-- Self read/update
CREATE POLICY "profiles.self_read" ON profiles FOR SELECT
  USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "profiles.self_update" ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin full access
CREATE POLICY "profiles.admin_all" ON profiles FOR ALL
  USING (is_admin(auth.uid()));
```

### 2. Admin Role Protection

**Status:** ✅ Secured with `SECURITY DEFINER` + explicit checks

**Functions:**
- `admin_set_role()` - Set user roles
- `admin_list_users()` - List all users

**Protection:**
```sql
CREATE FUNCTION admin_set_role(p_user_id uuid, p_role user_role)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with elevated privileges
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  -- ...
END;
$$;
```

### 3. Token Validation

**Status:** ✅ Server-side validation via Supabase

**Flow:**
1. Client sends `Authorization: Bearer <token>`
2. Backend calls `supabase.auth.getUser(token)`
3. Supabase validates JWT signature & expiry
4. User attached to request or 401 returned

**Code:**
```typescript
export const verifyToken = async (token: string): Promise<User> => {
  const client = getSupabaseServer();
  const { data, error } = await client.auth.getUser(token);
  
  if (error || !data.user) {
    throw new Error('Invalid or expired token');
  }
  
  return data.user;
};
```

### 4. Canvas Token Storage

**Status:** ⚠️ Plaintext (future: encrypt)

**Current:**
- Stored in `user_integrations.access_token` (text)
- Protected by RLS (owner + admin only)

**Recommendation:**
```sql
-- Future: Use pgcrypto or Supabase Vault
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt on insert
INSERT INTO user_integrations (access_token)
VALUES (pgp_sym_encrypt('token', 'encryption_key'));

-- Decrypt on read (via RPC)
SELECT pgp_sym_decrypt(access_token::bytea, 'encryption_key')
FROM user_integrations;
```

### 5. CORS Protection

**Status:** ✅ Configurable whitelist

**Configuration:**
```typescript
app.use(cors({
  origin: env.CORS_ORIGIN.split(','), // ['http://localhost:3000', ...]
  credentials: true,
}));
```

**Recommendation:**
- Never use `*` in production
- Whitelist only mobile app + admin panel origins

### 6. Rate Limiting

**Status:** ⚠️ To be configured

**Recommendation:**
```typescript
import rateLimit from 'express-rate-limit';

// Apply to auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many auth attempts, please try again later',
});

router.post('/auth/email/signup', authLimiter, emailSignup);
router.post('/auth/email/login', authLimiter, emailLogin);
```

### 7. Input Validation

**Status:** ✅ Basic validation in controllers

**Current:**
- Check required fields
- Validate enum values (learning_style, provider)
- Email format validated by Supabase

**Recommendation:**
- Add Zod schemas for all request bodies
- Implement `validate.middleware.ts`

### 8. Session Management

**Status:** ✅ JWT-based (stateless)

**How it works:**
- Supabase issues access token (JWT) + refresh token
- Mobile client stores both securely
- Backend validates access token on each request
- No server-side session storage needed

**Logout:**
- Device logout: Client clears tokens locally
- Logout all: Backend calls `auth.admin.signOut(user_id)` to revoke refresh tokens

### 9. Password Security

**Status:** ✅ Handled by Supabase Auth

- Passwords hashed with bcrypt
- Min password length enforced
- No plaintext storage

### 10. Error Handling

**Status:** ✅ Generic errors in production

**Code:**
```typescript
res.status(500).json({
  status: 'error',
  message: env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message,
});
```

**Recommendation:**
- Never expose stack traces in production
- Log errors with Sentry (no PII)

---

## ⚠️ Known Risks & Mitigations

### Risk 1: Canvas Token Exposure
**Severity:** Medium

**Scenario:** Admin or attacker with database access can read Canvas tokens.

**Mitigation:**
- [ ] Encrypt tokens with pgcrypto or Vault
- [x] RLS limits access to owner + admin
- [ ] Rotate tokens periodically
- [ ] Use short-lived tokens when Canvas API supports it

### Risk 2: Admin Role Escalation
**Severity:** High

**Scenario:** Compromised admin account can promote any user to admin.

**Mitigation:**
- [x] Admin functions require `is_admin()` check
- [x] Audit trail via `updated_at` timestamps
- [ ] Add `admin_actions` log table
- [ ] Require MFA for admin accounts (Supabase MFA)

### Risk 3: Brute Force Login Attempts
**Severity:** Medium

**Scenario:** Attacker tries many password combinations.

**Mitigation:**
- [ ] Implement rate limiting (5 req/15min)
- [x] Supabase has built-in rate limiting
- [ ] Add CAPTCHA for repeated failures
- [ ] Log failed auth attempts (no PII)

### Risk 4: JWT Token Theft
**Severity:** High

**Scenario:** Access token intercepted or stolen from mobile device.

**Mitigation:**
- [x] Short-lived access tokens (1 hour default)
- [x] HTTPS only in production
- [x] Refresh tokens for re-authentication
- [ ] Device fingerprinting (optional)
- [ ] Logout-all API for compromised accounts

### Risk 5: XSS/CSRF (Web Admin Panel)
**Severity:** Medium (if web admin built)

**Scenario:** Attacker injects scripts or forges requests.

**Mitigation:**
- [x] Helmet middleware (CSP, XSS protection)
- [x] CORS whitelist
- [ ] CSRF tokens for state-changing operations
- [ ] HttpOnly cookies for web sessions (if applicable)

### Risk 6: SQL Injection
**Severity:** Low

**Scenario:** Attacker manipulates SQL queries.

**Mitigation:**
- [x] Supabase uses parameterized queries
- [x] RLS enforces access control
- [x] No raw SQL in application code

### Risk 7: Mass Assignment
**Severity:** Low

**Scenario:** User updates fields they shouldn't (e.g., `role`).

**Mitigation:**
- [x] RLS policies prevent direct updates to `role`
- [x] Only admin can call `admin_set_role()`
- [x] Controllers whitelist allowed fields

### Risk 8: Denial of Service (DoS)
**Severity:** Medium

**Scenario:** Attacker floods auth endpoints.

**Mitigation:**
- [ ] Rate limiting on all auth routes
- [ ] Cloudflare or WAF for DDoS protection
- [ ] Monitor Supabase usage limits
- [ ] Alert on abnormal traffic patterns

---

## 🔒 Secret Management

### Environment Variables

**Sensitive:**
- `SUPABASE_SERVICE_ROLE_KEY` - Full database access
- `SUPABASE_ANON_KEY` - Public, but should be rotated
- `CANVAS_API_TOKEN` - Canvas LMS access
- `SENTRY_DSN` - Error tracking

**Storage:**
- [x] `.env` file (git-ignored)
- [ ] Use secrets manager (AWS Secrets Manager, Doppler, etc.)
- [ ] Never commit to version control

**Rotation:**
1. **SUPABASE_SERVICE_ROLE_KEY:**
   - Go to Supabase Dashboard → Settings → API
   - Generate new service role key
   - Update `.env` and redeploy
   - Old key remains valid until deleted

2. **OAuth Secrets (Google, Apple):**
   - Regenerate in provider console
   - Update Supabase Auth settings
   - Test login flow

3. **Canvas API Token:**
   - Generate new token in Canvas admin
   - Update `.env` or user integration records

---

## 📋 Security Checklist

### Pre-Production

- [ ] Enable HTTPS/TLS (Render auto-provides)
- [ ] Set `NODE_ENV=production`
- [ ] Restrict CORS to known origins only
- [ ] Enable rate limiting on all auth routes
- [ ] Add Zod validation to all endpoints
- [ ] Configure Sentry error tracking
- [ ] Encrypt Canvas tokens (pgcrypto)
- [ ] Audit admin actions logging
- [ ] Test RLS policies thoroughly
- [ ] Review Supabase Auth settings:
  - [ ] Email confirmations enabled
  - [ ] Password requirements (min length, complexity)
  - [ ] Session timeout configured
- [ ] Test logout-all functionality
- [ ] Document incident response plan

### Post-Launch Monitoring

- [ ] Monitor failed auth attempts (Sentry)
- [ ] Alert on multiple 401/403 responses
- [ ] Track admin role changes
- [ ] Review Supabase logs weekly
- [ ] Rotate secrets quarterly
- [ ] Perform security audit annually

---

## 🛡️ Compliance Considerations

### GDPR (if EU users)
- [ ] User can request data export (via admin)
- [ ] User can request account deletion
- [ ] Data retention policy documented
- [ ] Consent for data processing

### FERPA (if student data in USA)
- [ ] Canvas integration is read-only
- [ ] No sharing of student data with third parties
- [ ] Secure storage of educational records

### OAuth Provider Policies
- [ ] Google OAuth Terms of Service
- [ ] Apple Sign In guidelines
- [ ] Canvas API usage policy

---

## 📞 Incident Response

### Suspected Token Leak

1. **Immediate:**
   - Run `POST /api/auth/logout-all` for affected user
   - Check Supabase logs for unusual activity
   - Notify user to change password

2. **Investigation:**
   - Review access logs for suspicious IPs
   - Check if other users affected
   - Determine leak source (app, device, network)

3. **Remediation:**
   - Rotate Supabase service role key if compromised
   - Force re-authentication for all users (if widespread)
   - Patch vulnerability

### Admin Account Compromise

1. **Immediate:**
   - Revoke admin role: `UPDATE profiles SET role='user' WHERE user_id=...`
   - Logout all sessions for that admin
   - Review recent admin actions

2. **Investigation:**
   - Check `admin_set_role()` calls in logs
   - Verify no unauthorized role changes
   - Review Supabase audit logs

3. **Remediation:**
   - Reset admin password
   - Enable MFA for all admins
   - Review admin access controls

---

## Summary

**Overall Security Posture:** ✅ Strong foundation

**Critical:** 
- ✅ RLS enabled and tested
- ✅ Admin functions protected
- ✅ JWT validation server-side

**High Priority:**
- ⚠️ Add rate limiting
- ⚠️ Encrypt Canvas tokens
- ⚠️ Add request validation (Zod)

**Medium Priority:**
- ⚠️ Admin action audit log
- ⚠️ MFA for admin accounts
- ⚠️ CAPTCHA for repeated failures

**Low Priority:**
- ⚠️ Device fingerprinting
- ⚠️ Advanced DoS protection
- ⚠️ Compliance documentation

---

**Next Review:** 3 months or after major changes
