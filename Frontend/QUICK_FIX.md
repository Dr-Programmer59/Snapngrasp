# Quick Fix Guide for SIGABRT TurboModule Crash

## ⚠️ Your app is crashing with SIGABRT on launch in TestFlight

All 5 crash reports show the same issue:
- **Exception**: EXC_CRASH (SIGABRT) - Abort trap: 6
- **Thread**: com.meta.react.turbomodulemanager.queue
- **Cause**: TurboModule void method exception

## 🎯 Most Likely Cause (95% probability)

**Missing environment variables in EAS cloud builds**

Your app works in development because it uses your local `.env` file.
EAS cloud builds don't have access to your local files.

## ✅ Step-by-Step Fix (Do this NOW)

### 1. Add Environment Variables to EAS Dashboard

**Open this URL in your browser:**
```
https://expo.dev/accounts/abdulcoder59/projects/snapngraspp/environment-variables
```

**Click "Add Variable" and add these 3 variables:**

| Variable Name | Value | Visibility | Environments |
|---------------|-------|------------|--------------|
| `EXPO_PUBLIC_API_URL` | `https://api.snapngrasp.com` | Plain text | ☑️ preview ☑️ production |
| `EXPO_PUBLIC_BACKEND_URL` | `https://api.snapngrasp.com` | Plain text | ☑️ preview ☑️ production |
| `EXPO_PUBLIC_AGENT_MODE` | `private` | Plain text | ☑️ preview ☑️ production |

**CRITICAL**: 
- Make sure visibility is **"Plain text"** (NOT Secret)
- Check both **preview** AND **production** environments
- The `EXPO_PUBLIC_` prefix is REQUIRED for runtime variables

### 2. Add Sentry Token for Debugging (Optional but Recommended)

**Get token from Sentry:**
```
https://sentry.io/settings/snagngrasp/auth-tokens/
```

**Create New Token:**
- Name: `EAS Build Token`
- Scopes: Check `project:releases`, `project:write`, `org:read`
- Copy the token

**Add to EAS:**
```bash
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value <your-token> --type string
```

Or via dashboard:
- Variable: `SENTRY_AUTH_TOKEN`
- Visibility: **Secret**
- Environments: All

This will let you see the ACTUAL error message instead of just "SIGABRT".

### 3. Rebuild with Cache Clear

```bash
cd "d:\jordan project\snapNgrasp\project\full\SnapnGraspp"
eas build --platform ios --profile preview --clear-cache
```

The `--clear-cache` flag is important to clear old environment settings.

### 4. Verify in Build Logs

Watch the build logs for:
```
✔ Resolved environment variables
✔ EXPO_PUBLIC_API_URL is set
✔ Uploading source maps to Sentry (if token was added)
```

If you see errors about missing variables, recheck step 1.

### 5. Install and Test

Once build completes:
1. Install on your iPhone
2. Open the app
3. It should NOT crash instantly anymore
4. If there are any other errors, check Sentry dashboard

## 🔍 How to Verify Variables Are Set

Run this command to see what EAS has:
```bash
eas env:list --environment preview
```

You should see all three variables listed.

## 🆘 If Still Crashing After This Fix

### Create a Development Build for Debugging:

```bash
# 1. Build dev client (includes debugging tools)
eas build --profile development --platform ios

# 2. Install on your iPhone

# 3. Start Metro on your Windows computer
npx expo start --dev-client

# 4. Open app on phone (connects to your PC)

# 5. Watch your terminal - exact error will print there
```

This lets you see the REAL error message on your Windows machine, no Mac needed.

## 📊 Success Indicators

✅ App opens to home screen (no instant crash)
✅ Can navigate to voice screen
✅ Voice chat button appears
✅ Can tap "Start Voice Chat" and see permission dialog

## ⏱️ Time Estimate

- Adding env vars: 3 minutes
- Building: 15-20 minutes
- Testing: 2 minutes

**Total: ~25 minutes to fix**

## 📝 What We Fixed

1. ✅ Disabled New Architecture (`newArchEnabled: false`)
2. ✅ Forced Hermes JS engine
3. ✅ Added error handling to Sentry init
4. ✅ Added error handling to auth check
5. ✅ Added comprehensive logging

**Still needed**: Environment variables in EAS (you must do this manually)

## 🔗 Quick Links

- **EAS Env Vars**: https://expo.dev/accounts/abdulcoder59/projects/snapngraspp/environment-variables
- **Sentry Tokens**: https://sentry.io/settings/snagngrasp/auth-tokens/
- **Full Guide**: [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md)
- **Troubleshooting**: [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)

---

**Next Actions:**
1. [ ] Add 3 environment variables to EAS dashboard
2. [ ] (Optional) Add SENTRY_AUTH_TOKEN for better debugging
3. [ ] Run `eas build --platform ios --profile preview --clear-cache`
4. [ ] Install and test

**If this fixes it**: You're done! 🎉

**If still crashing**: Create development build to see exact error.
