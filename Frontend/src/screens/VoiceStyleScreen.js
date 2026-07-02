import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { withPoppins } from '../styles/typography';
import { updateVoiceStyle } from '../api/voiceStyle';

export default function VoiceStyleScreen() {
  const navigation = useNavigation();
  const [selected, setSelected] = useState("Chill");
  const [saving, setSaving] = useState(false);

  const voices = [
    { name: "Chill", img: require("../assets/images/Chill.png") },
    { name: "Fast Cram", img: require("../assets/images/FastCram.png") },
    { name: "Teacher-Style", img: require("../assets/images/TeacherStyle.png") },
  ];

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log("💾 Saving Voice Style:", selected);
      
      await updateVoiceStyle(selected);
      
      console.log("✅ Voice style saved successfully");
      Alert.alert(
        "Success",
        `Voice style set to ${selected}! Your AI tutor will use this voice.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("❌ Error saving voice style:", error);
      Alert.alert(
        "Error",
        "Failed to save voice style. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSelectVoice = (voice) => {
    console.log("🎙️ Selected voice:", voice.name);
    setSelected(voice.name);
  };

  const handlePreview = (voice) => {
    navigation.navigate("VoiceStylePreview", {
      voiceName: voice.name,
      image: voice.img,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Voice Style</Text>
        </View>

        {/* MASCOT + SPEECH BUBBLE */}
        <View style={styles.mascotSection}>
          <View style={styles.mascotRow}>
            <Image
              source={require("../assets/images/mascot.png")}
              style={styles.mascot}
            />
            <View style={styles.speechBubble}>
              <Text style={styles.speechText}>
                Choose your preferred voice style!
              </Text>
            </View>
          </View>
        </View>

        {/* VOICE CARDS */}
        <ScrollView
          contentContainerStyle={styles.voiceGrid}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Row - Two Cards */}
          <View style={styles.topRow}>
            {voices.slice(0, 2).map((voice) => (
              <TouchableOpacity
                key={voice.name}
                style={[
                  styles.voiceCard,
                  selected === voice.name && styles.selectedCard,
                ]}
                onPress={() => handleSelectVoice(voice)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.avatarWrapper,
                    selected === voice.name && styles.selectedAvatarWrapper,
                  ]}
                >
                  <Image source={voice.img} style={styles.avatar} />
                </View>

                <Text
                  style={[
                    styles.voiceName,
                    selected === voice.name && styles.selectedVoiceName,
                  ]}
                >
                  {voice.name}
                </Text>

                <View style={styles.iconsRow}>
                  <Ionicons 
                    name="volume-mute" 
                    size={20} 
                    color={selected === voice.name ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.4)"} 
                  />
                  <TouchableOpacity onPress={() => handlePreview(voice)}>
                    <Ionicons 
                      name="open-outline" 
                      size={20} 
                      color={selected === voice.name ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.4)"} 
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bottom Row - One Card Centered */}
          <View style={styles.bottomRow}>
            {voices.slice(2).map((voice) => (
              <TouchableOpacity
                key={voice.name}
                style={[
                  styles.voiceCard,
                  selected === voice.name && styles.selectedCard,
                ]}
                onPress={() => handleSelectVoice(voice)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.avatarWrapper,
                    selected === voice.name && styles.selectedAvatarWrapper,
                  ]}
                >
                  <Image source={voice.img} style={styles.avatar} />
                </View>

                <Text
                  style={[
                    styles.voiceName,
                    selected === voice.name && styles.selectedVoiceName,
                  ]}
                >
                  {voice.name}
                </Text>

                <View style={styles.iconsRow}>
                  <Ionicons 
                    name="volume-mute" 
                    size={20} 
                    color={selected === voice.name ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.4)"} 
                  />
                  <TouchableOpacity onPress={() => handlePreview(voice)}>
                    <Ionicons 
                      name="open-outline" 
                      size={20} 
                      color={selected === voice.name ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.4)"} 
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* SAVE BUTTON */}
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0E1225" },
  container: {
    flex: 1,
    backgroundColor: "#0E1225",
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#2A2F4F",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    ...withPoppins({
      flex: 1,
      color: "#fff",
      fontSize: 18,
      fontWeight: "600",
      textAlign: "center",
      marginRight: 36,
    })
  },
  mascotSection: {
    alignItems: "center",
    marginTop: 10,
  },
  mascotRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  mascot: {
    width: 60,
    height: 60,
    resizeMode: "contain",
  },
  speechBubble: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginLeft: 10,
    width: 250,
  },
  speechText: {
    ...withPoppins({
      color: "#333",
      fontSize: 14,
      textAlign: "center",
    })
  },
  voiceGrid: {
    paddingTop: 30,
    paddingBottom: 120,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginBottom: 20,
    gap: 15,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  voiceCard: {
    width: 160,
    alignItems: "center",
    backgroundColor: "#E8E8F0",
    borderRadius: 80,
    paddingVertical: 25,
    paddingHorizontal: 15,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  selectedCard: {
    backgroundColor: "#7C6FFF",
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#7C6FFF",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  selectedAvatarWrapper: {
    borderColor: "#fff",
  },
  avatar: {
    width: 95,
    height: 95,
    resizeMode: "contain",
  },
  voiceName: {
    ...withPoppins({
      fontSize: 16,
      fontWeight: "600",
      marginTop: 12,
      color: "#1a1a1a",
    })
  },
  selectedVoiceName: {
    color: "#FFD966",
  },
  iconsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    gap: 15,
  },
  saveButton: {
    backgroundColor: "#A991FF",
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: "center",
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    width: "90%",
    shadowColor: "#A991FF",
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#8B7ACC",
    opacity: 0.6,
  },
  saveText: {
    ...withPoppins({
      color: "#fff",
      fontSize: 17,
      fontWeight: "600",
    })
  },
});
