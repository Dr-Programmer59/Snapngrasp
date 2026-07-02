import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useConversation } from '@elevenlabs/react-native';
import { AudioSession, AndroidAudioTypePresets } from '@livekit/react-native';
import { Audio } from 'expo-av';
import { getAccessToken } from '../api/auth';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function VoiceStylePreviewScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  // receive from previous screen (name, image)
  const { voiceName = "Chill", image = require("../assets/images/Chill.png") } =
    route.params || {};

  const [isConnected, setIsConnected] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Connected to ElevenLabs demo');
      setIsConnected(true);
    },
    onDisconnect: () => {
      console.log('🔌 Disconnected from ElevenLabs demo');
      setIsConnected(false);
    },
    onError: (err) => {
      console.error('❌ Conversation error:', err);
      Alert.alert('Voice Demo Error', err?.message || 'Failed to connect to voice demo');
    },
  });

  // Auto-start demo when component mounts
  useEffect(() => {
    startDemo();
    return () => {
      conversation.endSession().catch(() => undefined);
      AudioSession.stopAudioSession().catch(() => undefined);
    };
  }, []);

  const startDemo = async () => {
    if (conversation.status !== 'disconnected') {
      return;
    }

    try {
      console.log('🎤 Requesting microphone permission...');
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Microphone Permission Required',
          'Please enable microphone access to try the voice demo.',
          [{ text: 'OK' }]
        );
        setIsStarting(false);
        return;
      }

      await AudioSession.configureAudio({
        android: {
          audioTypeOptions: AndroidAudioTypePresets.communication,
          preferredOutputList: ['earpiece', 'bluetooth', 'speaker'],
        },
      });
      await AudioSession.startAudioSession();

      console.log('📡 Fetching demo conversation token...');
      
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const response = await fetch(`${BACKEND_URL}/api/elevenlabs/conversation-token`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const conversationToken = await response.text();
      if (!conversationToken) {
        throw new Error('Received empty conversation token from backend');
      }

      console.log('✅ Starting demo session...');
      await conversation.startSession({ conversationToken });
    } catch (err) {
      console.error('Failed to start demo:', err);
    }
  };



  const handleSave = () => {
    console.log("Voice Style confirmed:", voiceName);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{voiceName}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* MAIN CONTENT */}
      <View style={styles.contentContainer}>
        {/* AVATAR SECTION */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            <Image source={image} style={styles.avatar} />
          </View>
        </View>

        {/* SAVE BUTTON */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1a1f3a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1f3a",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 48,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  avatarContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  avatarCircle: {
    width: 320,
    height: 500,
    borderRadius: 160,
    backgroundColor: "#7c6fd6",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 40,
  },
  avatar: {
    width: "60%",
    height: "60%",
    resizeMode: "cover",
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  saveButton: {
    backgroundColor: "#7c6fd6",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#7c6fd6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});