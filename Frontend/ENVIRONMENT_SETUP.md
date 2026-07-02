# Environment Variable Setup for EAS Builds

## Critical: TurboModule Crash Prevention

The instant crash (SIGABRT on TurboModule queue) is most commonly caused by **missing or incorrect environment variables** in EAS cloud builds.

## Required Environment Variables

### In your local `.env` file:
```env
EXPO_PUBLIC_API_URL=https://api.snapngrasp.com
EXPO_PUBLIC_BACKEND_URL=https://api.snapngrasp.com
EXPO_PUBLIC_AGENT_MODE=private
```

### In EAS Dashboard (expo.dev):

1. Go to: https://expo.dev/accounts/abdulcoder59/projects/snapngraspp/environment-variables

2. Add these variables for **preview** and **production** environments:

| Variable Name | Value | Visibility | Environments |
|---------------|-------|------------|--------------|
| `EXPO_PUBLIC_API_URL` | `https://api.snapngrasp.com` | Plain text | preview, production |
| `EXPO_PUBLIC_BACKEND_URL` | `https://api.snapngrasp.com` | Plain text | preview, production |
| `EXPO_PUBLIC_AGENT_MODE` | `private` | Plain text | preview, production |
| `SENTRY_AUTH_TOKEN` | `<your-token-here>` | Secret | All |

### Important Rules:

1. **Runtime variables MUST use `EXPO_PUBLIC_` prefix**
   - Only `EXPO_PUBLIC_*` variables are embedded in the JS bundle
   - Non-prefixed vars are build-time only (not accessible in app code)

2. **"Secret" visibility variables**
   - Use for build-time tokens (SENTRY_AUTH_TOKEN)
   - NOT accessible in app runtime code
   - Safe for API keys that only build scripts need

3. **"Plain text" visibility variables**
   - Use for runtime values the app needs
   - Embedded in JS bundle (visible in app)
   - Use for API URLs, public config

## How to Add Environment Variables in EAS

### Option 1: Via Dashboard (Recommended)
```bash
# 1. Open browser
https://expo.dev/accounts/abdulcoder59/projects/snapngraspp/environment-variables

# 2. Click "Add Variable"
# 3. Fill in:
#    - Name: EXPO_PUBLIC_API_URL
#    - Value: https://api.snapngrasp.com
#    - Visibility: Plain text
#    - Environments: Select "preview" and "production"
# 4. Click "Add"
# 5. Repeat for other variables
```

### Option 2: Via CLI
```bash
eas env:create EXPO_PUBLIC_API_URL --value https://api.snapngrasp.com --environment preview
eas env:create EXPO_PUBLIC_API_URL --value https://api.snapngrasp.com --environment production
eas env:create EXPO_PUBLIC_BACKEND_URL --value https://api.snapngrasp.com --environment preview
eas env:create EXPO_PUBLIC_BACKEND_URL --value https://api.snapngrasp.com --environment production
eas env:create EXPO_PUBLIC_AGENT_MODE --value private --environment preview
eas env:create EXPO_PUBLIC_AGENT_MODE --value private --environment production
```

### Option 3: In `eas.json` (Already Configured)
Your `eas.json` already has env vars in build profiles, but EAS dashboard takes precedence.

## Sentry Source Maps Setup

To see actual error messages (not just SIGABRT), you need source maps:

### 1. Get Sentry Auth Token
```bash
# Go to: https://sentry.io/settings/snagngrasp/auth-tokens/
# Click "Create New Token"
# Name: EAS Build Token
# Scopes: project:releases, project:write, org:read
# Copy the token
```

### 2. Add to EAS
```bash
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value <your-token> --type string
```

Or via dashboard:
- https://expo.dev/accounts/abdulcoder59/projects/snapngraspp/environment-variables
- Add Variable: `SENTRY_AUTH_TOKEN`, Visibility: **Secret**, All environments

### 3. Verify in Build Logs
When you build, you should see:
```
✔ Uploading source maps to Sentry
```

## Common Issues & Solutions

### Issue: "App crashes instantly on TestFlight, no error message"
**Cause**: Environment variable not set or incorrect visibility
**Fix**: 
1. Check EAS dashboard has all variables
2. Ensure `EXPO_PUBLIC_` prefix for runtime vars
3. Rebuild with `--clear-cache`

### Issue: "Sentry shows crashes but no readable stack trace"
**Cause**: Source maps not uploaded
**Fix**: 
1. Add `SENTRY_AUTH_TOKEN` to EAS
2. Verify Sentry plugin in app.json
3. Check build logs for "Uploading source maps"

### Issue: "Environment variables work in dev but not in build"
**Cause**: Local `.env` used in dev, but EAS cloud doesn't have access
**Fix**: 
1. Add variables to EAS dashboard
2. Don't rely on `.env` for cloud builds

### Issue: "Variable shows as undefined in production"
**Cause**: Missing `EXPO_PUBLIC_` prefix or wrong visibility
**Fix**: 
1. Rename variable with `EXPO_PUBLIC_` prefix
2. Change visibility to "Plain text"
3. Rebuild

## Testing Your Fix

### 1. Verify EAS has variables
```bash
eas env:list --environment preview
```

Should show:
```
EXPO_PUBLIC_API_URL=https://api.snapngrasp.com
EXPO_PUBLIC_BACKEND_URL=https://api.snapngrasp.com
EXPO_PUBLIC_AGENT_MODE=private
```

### 2. Build with clear cache
```bash
eas build --platform ios --profile preview --clear-cache
```

### 3. Check build logs
Look for:
- ✔ Resolved environment variables
- ✔ EXPO_PUBLIC_API_URL is set
- ✔ Uploading source maps to Sentry (if token set)

### 4. Install and test
- Install on device
- Open app
- Should NOT crash instantly
- Check device logs or Sentry for any errors

## Quick Diagnostic Build

If still crashing, create a development build to see real-time errors:

```bash
# 1. Build dev client
eas build --profile development --platform ios

# 2. Install on device

# 3. Start Metro on your computer
npx expo start --dev-client

# 4. Open app on phone (it will connect to your computer)

# 5. Watch your terminal for errors
# The exact error will print in your terminal window
```

## Success Checklist

- [ ] All `EXPO_PUBLIC_*` variables set in EAS dashboard
- [ ] Variables added to **preview** and **production** environments
- [ ] `SENTRY_AUTH_TOKEN` added as **Secret** visibility
- [ ] Built with `--clear-cache` flag
- [ ] Checked build logs for environment confirmation
- [ ] App opens without instant crash
- [ ] Sentry dashboard shows readable stack traces

---

**Reference**: 
- EAS Env Vars: https://docs.expo.dev/build-reference/variables/
- Sentry Setup: https://docs.expo.dev/guides/using-sentry/
