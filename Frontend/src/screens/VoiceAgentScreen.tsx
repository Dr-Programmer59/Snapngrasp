/**
 * VoiceAgentScreen — UI matches provided design
 * - Dark rounded header with centered title
 * - Purple gradient background + subtle circular glow behind avatar
 * - Bottom dark bar with mic + end-call buttons
 * - Auto-connect on open (to match screenshot)
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useConversation } from "@elevenlabs/react-native";
import { AudioSession, AndroidAudioTypePresets } from "@livekit/react-native";
import { useNavigation } from "@react-navigation/native";
import { Audio } from "expo-av";

import { getAccessToken } from "../api/auth";
import { getProfile } from "../api/profile";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const AGENT_MODE = process.env.EXPO_PUBLIC_AGENT_MODE || "private";
const PUBLIC_AGENT_ID = process.env.EXPO_PUBLIC_AGENT_ID;

// Voice style avatar mapping
const VOICE_AVATARS = {
  Chill: require("../assets/images/Chill.png"),
  "Fast Cram": require("../assets/images/FastCram.png"),
  "Teacher-Style": require("../assets/images/TeacherStyle.png"),
};

export default function VoiceAgentScreen() {
  const navigation = useNavigation();

  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isMicrophoneMuted, setIsMicrophoneMuted] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const [voiceStyle, setVoiceStyle] = useState("Chill");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const didAutoConnectRef = useRef(false);

  // Subtle pulsing background glow animation (like screenshot)
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Fetch user's voice style
  useEffect(() => {
    const fetchVoiceStyle = async () => {
      try {
        const profile = await getProfile();
        const style = profile?.data?.profile?.voice_style;
        if (style && VOICE_AVATARS[style]) setVoiceStyle(style);
      } catch (e) {
        // keep default
      } finally {
        setIsLoadingProfile(false);
      }
    };
    fetchVoiceStyle();
  }, []);

  const conversation = useConversation({
    onConnect: () => {
      setIsConnected(true);
      setError(null);
    },
    onDisconnect: () => {
      setIsConnected(false);
    },
    onError: (err) => {
      setError(err?.message || "Conversation error occurred");
    },
  });

  // Keep mic muted by default after connect (push-to-talk style)
  useEffect(() => {
    if (conversation.status === "connected") {
      setIsMicrophoneMuted(true);
      conversation.setMicMuted(true);
    }
  }, [conversation.status]);

  // Cleanup audio session
  useEffect(() => {
    return () => {
      AudioSession.stopAudioSession().catch(() => undefined);
    };
  }, []);

  /**
   * Start conversation with ElevenLabs agent
   */
  const startConversation = async () => {
    if (conversation.status !== "disconnected" || isStarting) return;

    setError(null);
    setIsStarting(true);

    try {
      // Request mic permission (iOS required)
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert(
          "Microphone Permission Required",
          "Please enable microphone access in Settings to use voice chat."
        );
        setIsStarting(false);
        return;
      }

      await AudioSession.configureAudio({
        android: {
          audioTypeOptions: AndroidAudioTypePresets.communication,
          preferredOutputList: ["earpiece", "bluetooth", "speaker"],
        },
      });
      await AudioSession.startAudioSession();

      if (AGENT_MODE === "public") {
        if (!PUBLIC_AGENT_ID) {
          throw new Error("Set EXPO_PUBLIC_AGENT_ID in .env when using public agent mode");
        }
        await conversation.startSession({ agentId: PUBLIC_AGENT_ID });
      } else {
        if (!BACKEND_URL) {
          throw new Error("Set EXPO_PUBLIC_BACKEND_URL in frontend .env");
        }

        const token = await getAccessToken();
        if (!token) throw new Error("No access token found. Please login again.");

        const response = await fetch(`${BACKEND_URL}/api/elevenlabs/conversation-token`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error(`Backend error: ${response.status}`);

        const conversationToken = await response.text();
        if (!conversationToken) throw new Error("Empty conversation token from backend");

        await conversation.startSession({ conversationToken });
      }
    } catch (err) {
      setError(err?.message || "Failed to start conversation");
    } finally {
      setIsStarting(false);
    }
  };

  /**
   * Auto-connect once profile is loaded (to match screenshot flow)
   */
  useEffect(() => {
    if (isLoadingProfile) return;
    if (didAutoConnectRef.current) return;
    didAutoConnectRef.current = true;

    // Auto connect on open
    startConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingProfile]);

  /**
   * End conversation and go back
   */
  const endConversation = async () => {
    try {
      await conversation.endSession();
      await AudioSession.stopAudioSession();
    } catch (e) {
      // ignore
    } finally {
      navigation.goBack();
    }
  };

  /**
   * Toggle mic
   */
  const toggleMic = () => {
    if (conversation.status !== "connected") return;

    const next = !isMicrophoneMuted;
    setIsMicrophoneMuted(next);
    conversation.setMicMuted(next);
  };

  // Glow transforms
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.18] });

  const showOverlay = isStarting || conversation.status === "connecting";

  return (
    <View style={styles.root}>
      {/* Main purple background */}
      <LinearGradient
        colors={["#7C6FFF", "#6B5CE0", "#5A4BC7"]}
        style={styles.container}
      >
        {/* Header */}
        <LinearGradient
          colors={["#0B0F1F", "#141A2E"]}
          style={styles.header}
        >
          <View style={styles.headerInner}>
            <View style={{ width: 44 }} />
            <View style={styles.headerTitleWrap}>
              <TextLike style={styles.headerTitle}>AI Voice Tutor</TextLike>
            </View>
            <View style={{ width: 44 }} />
          </View>
        </LinearGradient>

        {/* Center content */}
        <View style={styles.center}>
          {/* Soft glow circle behind avatar */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glowCircle,
              {
                transform: [{ scale: glowScale }],
                opacity: glowOpacity,
              },
            ]}
          />
          <View pointerEvents="none" style={styles.glowCircle2} />

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {isLoadingProfile ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#fff" />
                <TextLike style={styles.loadingText}>Loading...</TextLike>
              </View>
            ) : (
              <Image
                source={VOICE_AVATARS[voiceStyle]}
                style={styles.avatarImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>

        {/* Bottom bar */}
        <LinearGradient colors={["#0B0F1F", "#141A2E"]} style={styles.bottomBar}>
          <View style={styles.controlsRow}>
            {/* Mic button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.controlBtn,
                styles.micBtn,
                (conversation.status !== "connected") && styles.controlDisabled,
                !isMicrophoneMuted && styles.micBtnActive,
              ]}
              onPress={toggleMic}
              disabled={conversation.status !== "connected"}
            >
              <Ionicons
                name={isMicrophoneMuted ? "mic-off" : "mic"}
                size={22}
                color="#fff"
              />
            </TouchableOpacity>

            {/* End call */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.controlBtn,
                styles.endBtn,
                (conversation.status === "disconnected") && styles.controlDisabled,
              ]}
              onPress={endConversation}
              disabled={conversation.status === "disconnected"}
            >
              <Ionicons name="call" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Connecting overlay */}
        {showOverlay && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#fff" />
            <TextLike style={styles.overlayText}>Connecting...</TextLike>
          </View>
        )}

        {/* Optional: error (kept hidden by default to match screenshot)
            If you want it visible, tell me and I’ll add a tiny toast style.
        */}
        {/* {error ? <TextLike style={styles.errorText}>{error}</TextLike> : null} */}
      </LinearGradient>
    </View>
  );
}

/**
 * Small helper so we don’t rely on your custom Text component here.
 * If you want to use your "../components/Text", replace TextLike with that.
 */
function TextLike({ style, children }) {
  // eslint-disable-next-line react-native/no-inline-styles
  return <Animated.Text style={style}>{children}</Animated.Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0F1F" },

  container: { flex: 1 },

  header: {
    paddingTop: Platform.OS === "ios" ? 50 : 34,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  headerTitleWrap: { flex: 1, alignItems: "center" },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.4,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 30,
  },

  glowCircle: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#FFFFFF",
  },
  glowCircle2: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "#FFFFFF",
    opacity: 0.06,
  },

  avatarWrap: {
    width: 320,
    height: 320,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 300,
    height: 300,
  },

  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },

  bottomBar: {
    paddingTop: 18,
    paddingBottom: 34,
    paddingHorizontal: 22,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },

  controlBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },

  micBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  micBtnActive: {
    backgroundColor: "rgba(255,255,255,0.30)",
  },

  endBtn: {
    backgroundColor: "#FF5A5F",
  },

  controlDisabled: { opacity: 0.45 },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },

  errorText: {
    position: "absolute",
    top: Platform.OS === "ios" ? 110 : 90,
    left: 18,
    right: 18,
    color: "#fff",
    backgroundColor: "rgba(255,90,95,0.35)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
});
