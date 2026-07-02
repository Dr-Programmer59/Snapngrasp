# SnapnGraspp - Troubleshooting Guide

## Project Overview
AI-powered study assistant with voice chat, file uploads, and learning management features.

## Tech Stack

### Frontend (React Native/Expo)
- **Framework**: Expo SDK 54 with expo-router
- **Voice Agent**: @elevenlabs/react-native ^0.5.0
- **WebRTC**: @livekit/react-native + @livekit/react-native-webrtc
- **Permissions**: expo-av (Audio.requestPermissionsAsync)
- **Crash Reporting**: @sentry/react-native
- **JS Engine**: Hermes (explicitly enabled)
- **Architecture**: Legacy (newArchEnabled: false)

### Backend
- **Server**: Node.js/Express with TypeScript
- **Database**: PostgreSQL with Supabase
- **Production URL**: https://api.snapngrasp.com
- **Dev URL**: http://192.168.100.4:8080

### Build System
- **EAS Build**: @abdulcoder59/snapngraspp
- **Project ID**: 80b63725-06a3-4da4-9a15-4843477acbec
- **Bundle ID**: com.snapngrasp.app

## Critical Configuration Files

### app.json
```json
{
  "newArchEnabled": false,  // MUST be false to prevent TurboModule crash
  "ios": {
    "jsEngine": "hermes",  // Force Hermes engine
    "infoPlist": {
      "NSMicrophoneUsageDescription": "...",  // Required for voice
      "NSCameraUsageDescription": "...",      // Required for uploads
      "UIBackgroundModes": ["audio", "voip"]
    }
  }
}
```

### eas.json
```json
{
  "cli": {
    "appVersionSource": "local"  // Use local version numbers
  },
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.snapngrasp.com",
        "EXPO_PUBLIC_BACKEND_URL": "https://api.snapngrasp.com",
        "EXPO_PUBLIC_AGENT_MODE": "private"
      }
    }
  }
}
```

### VoiceAgentScreen.tsx
```typescript
// CRITICAL: Request permission BEFORE WebRTC
const startConversation = async () => {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') return;
  
  await AudioSession.configureAudio(...);
  await conversation.startSession(...);
};
```

## Known Crashes & Solutions

### 1. Instant Crash on Launch (SIGABRT) - **MOST COMMON**
**Symptom**: App crashes immediately after splash screen, no error visible

**Root Cause**: Missing or incorrectly configured environment variables in EAS builds

**Stack Trace Signature**:
```
facebook::react::ObjCTurboModule::performVoidMethodInvocation
Thread: com.meta.react.turbomodulemanager.queue
Exception: EXC_CRASH (SIGABRT)
```

**Solution**:
1. **Add environment variables to EAS Dashboard** (not just local .env):
   - Go to: https://expo.dev/accounts/abdulcoder59/projects/snapngraspp/environment-variables
   - Add these for **preview** and **production** environments:
    - `EXPO_PUBLIC_API_URL` = `https://api.snapngrasp.com` (Plain text)
    - `EXPO_PUBLIC_BACKEND_URL` = `https://api.snapngrasp.com` (Plain text)
     - `EXPO_PUBLIC_AGENT_MODE` = `private` (Plain text)
   
2. **Verify variable naming**:
   - Runtime variables MUST start with `EXPO_PUBLIC_`
   - Non-prefixed vars are NOT accessible in app code
   
3. **Add Sentry auth token for debugging**:
   - Create token at: https://sentry.io/settings/snagngrasp/auth-tokens/
   - Add to EAS: `SENTRY_AUTH_TOKEN` (Secret visibility)
   - This enables source maps for readable crash reports

4. **Rebuild with cache clear**:
   ```bash
   eas build --platform ios --profile preview --clear-cache
   ```

**Why This Happens**:
- Local dev uses your `.env` file
- EAS cloud builds don't have access to your local files
- Missing env vars cause `undefined` API URLs → fetch fails → TurboModule crash
- This is the #1 cause of "works in dev, crashes in TestFlight"

**See**: [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) for complete guide

### 2. New Architecture TurboModule Bug (SIGABRT)
**Symptom**: Same SIGABRT crash, but env vars are correctly set

**Cause**: New Architecture has a bug where void methods throw exceptions on background threads

**Stack Trace Signature**:
```
facebook::react::ObjCTurboModule::performVoidMethodInvocation
Thread: com.meta.react.turbomodulemanager.queue
Exception: EXC_CRASH (SIGABRT)
```

**Solution**:
- Set `"newArchEnabled": false` in app.json (already done)
- Force `"jsEngine": "hermes"` in ios config (already done)
- Rebuild with: `eas build --platform ios --clear-cache`

**Note**: We already applied this fix, so if still crashing, it's likely issue #1 (env vars)

### 3. Microphone Permission Crash
**Symptom**: App crashes when accessing voice screen

**Cause**: WebRTC/AudioSession accessed before requesting permission

**Solution**:
- Call `Audio.requestPermissionsAsync()` BEFORE any WebRTC code
- Add NSMicrophoneUsageDescription to infoPlist
- Never auto-connect voice on mount - use manual button

### 4. EAS Build Validation Errors
**Symptom**: `"build.*.ios.newArchEnabled" is not allowed`

**Solution**:
- Remove `ios.newArchEnabled` from eas.json (it only belongs in app.json)
- Set architecture only in app.json root level

### 5. 413 Upload Errors
**Symptom**: Image/file uploads fail with "Request Entity Too Large"

**Solution**:
- Backend: Express body limits set to 50MB
- NGINX: `client_max_body_size 50M;` in nginx.conf
- Frontend: No changes needed

### 6. Database "Column Does Not Exist"
**Symptom**: Activity feed fails with SQL errors

**Solution**:
- Check column names: `visual_type` (not `type`)
- Check column names: `total_steps` (not `total_slots`)

## Environment Variables Required

```
EXPO_PUBLIC_API_URL=https://api.snapngrasp.com
EXPO_PUBLIC_BACKEND_URL=https://api.snapngrasp.com
EXPO_PUBLIC_AGENT_MODE=private
SENTRY_DSN=<your-sentry-dsn>
```

## iOS Permissions Required

```xml
NSMicrophoneUsageDescription - Voice chat
NSCameraUsageDescription - Photo uploads
UIBackgroundModes - ["audio", "voip"]
NSAppTransportSecurity - Allow local HTTP for dev
```

## Debugging Steps

### For Production Crashes:
1. Check Sentry dashboard for stack traces
2. Look for TurboModule-related crashes → disable New Architecture
3. Check for permission-related crashes → verify infoPlist

### For Build Errors:
1. Validate eas.json: `eas build:configure`
2. Clear caches: `--clear-cache` flag
3. Check projectId matches expo.dev

### For Development:
1. Use development client: `eas build --profile development`
2. Connect to Metro: `npx expo start --dev-client`
3. Real-time errors appear in terminal

## Critical Files to Check

```
app.json - Architecture, Hermes, permissions
eas.json - Build profiles, env vars
VoiceAgentScreen.tsx - Permission flow
App.js - ErrorBoundary, Sentry init
src/config/api.js - Environment validation
```

## Build Commands

```bash
# Preview Build (TestFlight)
eas build --platform ios --profile preview --clear-cache

# Development Build (with Metro)
eas build --platform ios --profile development

# Production Build
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios --latest
```

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `performVoidMethodInvocation` | New Architecture bug | Set newArchEnabled: false |
| `Entity not authorized` | Wrong EAS project | Update projectId in app.config.js |
| `Duplicate identifier 'Audio'` | Multiple imports | Remove duplicate import |
| `SIGABRT on launch` | Native exception | Check permissions + architecture |

## Key Architectural Decisions

1. **Permission Flow**: Manual button → request permission → start WebRTC (iOS requirement)
2. **Private Mode**: Backend generates tokens, not public agent ID
3. **Legacy Architecture**: New Architecture disabled due to TurboModule crash
4. **Hermes Forced**: Ensures consistent behavior dev vs production
5. **ErrorBoundary**: Wraps entire app to catch React errors

## Support Links

- EAS Project: https://expo.dev/accounts/abdulcoder59/projects/snapngraspp
- Sentry: https://sentry.io/organizations/snagngrasp/projects/react-native
- Backend API: https://api.snapngrasp.com

---

**Last Updated**: January 7, 2026  
**Build Version**: 1.0.0 (Build 2)
