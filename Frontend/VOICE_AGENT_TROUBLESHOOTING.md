# Voice Agent Troubleshooting Guide

## Issue: Constant Mode Switching (Listening ↔ Speaking)

### Symptoms
- Logs show rapid alternation between "listening" and "speaking" modes
- Agent seems to interrupt itself constantly
- Conversation doesn't flow naturally

### Root Causes

#### 1. **Audio Echo/Feedback Loop** (Most Common)
The device speaker plays agent audio → microphone picks it up → agent thinks you're talking → interrupts itself

**Solutions:**
- **Use headphones/earbuds** - This is the #1 fix for most echo issues
- Reduce device volume when using speaker
- Ensure echo cancellation is enabled in device settings

#### 2. **Background Noise**
Microphone is too sensitive and picks up ambient noise as speech

**Solutions:**
- Test in a quiet environment
- Check Android audio permissions are granted properly
- Verify microphone isn't blocked or faulty

#### 3. **Audio Session Configuration (Android)**
React Native apps need proper audio configuration for real-time voice

**Check these settings in your Android device:**
- Settings → Apps → Your App → Permissions → Microphone (Allow)
- Settings → Apps → Your App → Permissions → Phone (if required)
- During call: Use "Speaker" mode or headphones, NOT earpiece mode

### Testing Steps

1. **Test with Headphones First**
   ```
   - Connect wired or Bluetooth headphones
   - Start conversation
   - If it works perfectly → it's an echo issue
   ```

2. **Test in Silent Environment**
   ```
   - Go to very quiet room
   - Turn off fans, AC, background music
   - Test again
   ```

3. **Test Volume Levels**
   ```
   - Start with device volume at 30-40%
   - Gradually increase if agent is hard to hear
   - Too loud = more likely to create echo
   ```

4. **Test Microphone Mute**
   ```
   - Start conversation
   - Immediately tap "Mute"
   - Let agent finish speaking
   - Unmute and respond
   - If this works better → echo issue confirmed
   ```

### Code-Level Checks

✅ **Already Implemented:**
- Proper callback order (onModeChange first)
- Error handling
- Token-based authentication
- WebRTC via LiveKit

🔍 **To Verify:**
1. ElevenLabs Agent Configuration (on elevenlabs.io dashboard):
   - Go to your agent settings
   - Check "Interruption Sensitivity" - set to Medium or Low
   - Check "Turn Detection" - ensure it's properly configured
   - Check "Voice Activity Detection (VAD)" settings

2. Android Manifest Permissions:
   ```xml
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
   <uses-permission android:name="android.permission.BLUETOOTH" />
   ```

3. LiveKit Audio Settings (already configured in app.json):
   ```json
   "plugins": [
     "@livekit/react-native-expo-plugin",
     "@config-plugins/react-native-webrtc"
   ]
   ```

### ElevenLabs Agent Settings to Adjust

Login to elevenlabs.io → Your Agent → Settings:

1. **Interruption Sensitivity: Low or Medium**
   - "Low" = harder to interrupt (less false positives)
   - "High" = easier to interrupt (more false positives causing the issue)

2. **Stability: Increase to 0.7-0.8**
   - More stable voice, less likely to glitch

3. **Response Delay: Increase slightly**
   - Gives more time before agent responds
   - Reduces chance of echo being interpreted as speech

### Environment Variables Check

Verify `.env` configuration:

```bash
# Frontend (SnapnGraspp/.env)
EXPO_PUBLIC_API_URL=http://192.168.100.6:8080
EXPO_PUBLIC_BACKEND_URL=http://192.168.100.6:8080
EXPO_PUBLIC_AGENT_MODE=private
EXPO_PUBLIC_AGENT_ID=

# Backend (Backend/.env)
ELEVENLABS_API_KEY=sk_your_key_here
ELEVENLABS_AGENT_ID=agent_your_id_here
```

### Known Working Configuration

The attached working example (from `elevenlab testing app`) works because:
- Same SDK versions
- Same token flow
- Same callback structure
- Likely tested with **headphones** or in **quiet environment**

### Quick Fix Checklist

- [ ] Use headphones or earbuds
- [ ] Test in quiet room
- [ ] Lower device volume to 30-40%
- [ ] Check agent settings on elevenlabs.io
- [ ] Adjust "Interruption Sensitivity" to Low
- [ ] Grant all audio permissions in Android settings
- [ ] Restart app after permission changes

### Still Not Working?

Try this debugging sequence:

1. **Verify backend is working:**
   ```bash
   curl http://192.168.100.6:8080/api/elevenlabs/health
   curl http://192.168.100.6:8080/api/elevenlabs/conversation-token
   ```

2. **Check Metro bundler logs:**
   - Look for WebRTC errors
   - Check for permission denial errors

3. **Test the standalone working app:**
   - Run the `elevenlab testing app` on same device
   - If that works but yours doesn't → compare network/config differences

4. **Rebuild with clean cache:**
   ```bash
   npx expo prebuild --clean
   npx expo run:android
   ```

### Hardware-Specific Issues

**Samsung Devices:**
- Some Samsung phones have aggressive audio processing
- Disable "Adapt sound" in Settings → Sounds and Vibration

**Xiaomi/MIUI:**
- Check Battery Saver isn't limiting microphone
- Settings → Apps → Manage apps → Your App → Battery saver → No restrictions

**Huawei:**
- May need to manually grant Phone permission
- Settings → Privacy → Permission manager → Phone → Your App

---

## Success Indicators

✅ **It's Working When:**
- Mode changes are deliberate (when you actually speak)
- Agent completes full responses without self-interruption
- You can have natural back-and-forth conversation
- Mute/unmute works smoothly

---

**Bottom Line:** The most common cause of constant mode switching is **audio echo**. The #1 fix is **using headphones**. If it still doesn't work with headphones in a quiet room, then check agent settings on elevenlabs.io dashboard.
