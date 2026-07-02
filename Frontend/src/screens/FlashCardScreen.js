import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// If you already made ChatIconButton component (glowing one), use it:
import ChatIconButton from "../components/ChatIconButton";

const { width, height } = Dimensions.get("window");

const FlashcardPracticeScreen = ({ navigation, route }) => {
  // Normalize flashcards input
  const raw = route.params?.flashcards;
  let flashcards = [];
  if (Array.isArray(raw)) flashcards = raw;
  else if (Array.isArray(raw?.flashcards)) flashcards = raw.flashcards;
  else if (Array.isArray(raw?.data?.flashcards)) flashcards = raw.data.flashcards;

  const total = flashcards.length;

  // Title like your screenshot: "Biology – Cell Structure"
  const screenTitle =
    route.params?.screenTitle ||
    route.params?.title ||
    route.params?.topicTitle ||
    "Flashcards";

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Tutor (bottom sheet modal)
  const [tutorVisible, setTutorVisible] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { id: "1", from: "bot", text: "Hi — I'm Snap Tutor. How can I help?" },
  ]);

  const tutorScale = useRef(new Animated.Value(0.92)).current;
  const tutorOpacity = useRef(new Animated.Value(0)).current;

  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    // Reset flip on index change
    setFlipped(false);
    flipAnim.setValue(0);
  }, [index]);

  if (!flashcards || total === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No flashcards available</Text>
        <TouchableOpacity style={styles.backToPrev} onPress={() => navigation.goBack()}>
          <Text style={styles.backToPrevText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentCard = flashcards[index] || {};

  // Support different fields
  const questionText =
    currentCard.front ?? currentCard.question ?? currentCard.prompt ?? "";
  const answerText =
    currentCard.back ?? currentCard.answer ?? currentCard.response ?? "";

  const frontRotate = useMemo(
    () =>
      flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "180deg"],
      }),
    [flipAnim]
  );

  const backRotate = useMemo(
    () =>
      flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["180deg", "360deg"],
      }),
    [flipAnim]
  );

  const doFlip = () => {
    Animated.timing(flipAnim, {
      toValue: flipped ? 0 : 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setFlipped((p) => !p));
  };

  const goNext = () => {
    if (index >= total - 1) return;
    setIndex((p) => Math.min(p + 1, total - 1));
  };

  const goPrev = () => {
    if (index <= 0) return;
    setIndex((p) => Math.max(p - 1, 0));
  };

  const openTutor = () => {
    setTutorVisible(true);
    tutorScale.setValue(0.92);
    tutorOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(tutorOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(tutorScale, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto add explanation request like your earlier "Explain: ..."
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { id: Date.now().toString(), from: "user", text: `Explain: ${questionText}` },
      ]);
      setTimeout(() => {
        setMessages((m) => [
          ...m,
          { id: (Date.now() + 1).toString(), from: "bot", text: answerText || "Here’s a clear explanation..." },
        ]);
      }, 700);
    }, 250);
  };

  const closeTutor = () => {
    Animated.parallel([
      Animated.timing(tutorOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }),
      Animated.timing(tutorScale, {
        toValue: 0.92,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => setTutorVisible(false));
  };

  const sendChat = () => {
    if (!input.trim()) return;
    const newMsg = { id: Date.now().toString(), from: "user", text: input.trim() };
    setMessages((m) => [...m, newMsg]);
    setInput("");

    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: (Date.now() + 1).toString(),
          from: "bot",
          text: "Got it — let me explain that simply…",
        },
      ]);
    }, 700);
  };

  return (
    <View style={styles.container}>
      {/* Header (dark rounded like screenshot) */}
      <LinearGradient colors={["#0B0F1F", "#141A2E"]} style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text numberOfLines={1} style={styles.headerTitle}>
          {screenTitle}
        </Text>

        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Row: Flashcards pill + star */}
      <View style={styles.topRow}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Flashcards</Text>
        </View>

        <TouchableOpacity style={styles.starBtn} onPress={() => setBookmarked((p) => !p)}>
          <Ionicons
            name={bookmarked ? "star" : "star-outline"}
            size={22}
            color={bookmarked ? "#F5B700" : "#F5B700"}
          />
        </TouchableOpacity>
      </View>

      {/* Progress like screenshot */}
      <View style={styles.progressWrap}>
        <Text style={styles.progressFraction}>
          {index + 1}/{total}
        </Text>

        <View style={styles.progressBar}>
          {Array.from({ length: total }).map((_, i) => {
            const active = i <= index;
            return <View key={i} style={[styles.segment, active ? styles.segmentActive : styles.segmentInactive]} />;
          })}
        </View>
      </View>

      {/* Card */}
      <View style={styles.cardShell}>
        <Pressable onPress={doFlip} style={styles.cardPressable}>
          {/* Front */}
          <Animated.View
            style={[
              styles.cardFace,
              {
                transform: [{ perspective: 1000 }, { rotateY: frontRotate }],
              },
            ]}
          >
            <TouchableOpacity style={styles.smallIconBtn} onPress={() => {}} activeOpacity={0.8}>
              <Ionicons name="shuffle" size={18} color="#6C63FF" />
            </TouchableOpacity>

            <View style={styles.cardCenter}>
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator
              >
                <Text style={styles.cardText}>
                  {questionText || "No question text"}
                </Text>
              </ScrollView>
            </View>

            <View style={styles.cardBottomBar}>
              <Text style={styles.cardBottomText}>Click to view answer</Text>
            </View>
          </Animated.View>

          {/* Back */}
          <Animated.View
            style={[
              styles.cardFace,
              styles.cardBackFace,
              {
                transform: [{ perspective: 1000 }, { rotateY: backRotate }],
              },
            ]}
          >
            <TouchableOpacity style={styles.smallIconBtn} onPress={() => {}} activeOpacity={0.8}>
              <Ionicons name="shuffle" size={18} color="#6C63FF" />
            </TouchableOpacity>

            <View style={styles.cardCenter}>
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator
              >
                <Text style={styles.cardText}>
                  {answerText || "No answer text"}
                </Text>
              </ScrollView>
            </View>

            <View style={styles.cardBottomBar}>
              <Text style={styles.cardBottomText}>Click to view question</Text>
            </View>
          </Animated.View>
        </Pressable>
      </View>

      {/* Bottom navigation like screenshot */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navPill, styles.prevPill, index === 0 && styles.disabled]}
          onPress={goPrev}
          disabled={index === 0}
          activeOpacity={0.85}
        >
          <View style={styles.circleIconGrey}>
            <Ionicons name="arrow-back" size={18} color="#6C63FF" />
          </View>
          <Text style={styles.prevText}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navPill, styles.nextPill, index === total - 1 && styles.disabled]}
          onPress={goNext}
          disabled={index === total - 1}
          activeOpacity={0.85}
        >
          <Text style={styles.nextText}>Next</Text>
          <View style={styles.circleIconWhite}>
            <Ionicons name="arrow-forward" size={18} color="#6C63FF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Floating Chat Icon (like screenshot) */}
      <View style={styles.fab}>
        <ChatIconButton size={70} onPress={openTutor} />
      </View>

      {/* Tutor Modal */}
      {tutorVisible && (
        <Animated.View
          style={[
            styles.tutorModal,
            {
              opacity: tutorOpacity,
              transform: [{ scale: tutorScale }],
            },
          ]}
        >
          <View style={styles.tutorHeader}>
            <Text style={styles.tutorTitle}>Snap Tutor</Text>
            <TouchableOpacity onPress={closeTutor}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            style={styles.chatList}
            contentContainerStyle={{ paddingBottom: 10 }}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.chatBubble,
                  item.from === "user" ? styles.userBubble : styles.botBubble,
                ]}
              >
                <Text style={styles.chatText}>{item.text}</Text>
              </View>
            )}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.inputContainer}
          >
            <TextInput
              style={styles.input}
              placeholder="Ask a question..."
              placeholderTextColor="#999"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendChat}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={sendChat}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Animated.View>
      )}
    </View>
  );
};

export default FlashcardPracticeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F6F7FB",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  backToPrev: {
    backgroundColor: "#6C63FF",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 16,
  },
  backToPrevText: {
    color: "#fff",
    fontWeight: "700",
  },

  header: {
    paddingTop: Platform.OS === "android" ? 44 : 54,
    paddingBottom: 18,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    marginTop: 16,
  },
  pill: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  pillText: {
    color: "#1B1F3B",
    fontWeight: "800",
    fontSize: 14,
  },
  starBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },

  progressWrap: {
    paddingHorizontal: 18,
    marginTop: 14,
  },
  progressFraction: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1B1F3B",
    marginBottom: 10,
  },
  progressBar: {
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: "#6C63FF",
  },
  segmentInactive: {
    backgroundColor: "#D6D8DE",
  },

  cardShell: {
    paddingHorizontal: 18,
    marginTop: 18,
    flex: 1,
  },
  cardPressable: {
    flex: 1,
    minHeight: 360,
  },
  cardFace: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 18,
    backgroundColor: "#fff",
    overflow: "hidden",
    backfaceVisibility: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  cardBackFace: {
    // same style, just separate face
  },

  smallIconBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EEF0FF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },

  cardCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  scrollArea: {
    width: "100%",
    maxHeight: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 22,
  },
  cardText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1B1F3B",
    textAlign: "center",
    lineHeight: 32,
  },

  cardBottomBar: {
    height: 52,
    backgroundColor: "#14172B",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBottomText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    opacity: 0.95,
  },

  bottomNav: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    justifyContent: "space-between",
  },
  navPill: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  prevPill: {
    backgroundColor: "#EFEFF3",
  },
  nextPill: {
    backgroundColor: "#6C63FF",
  },
  prevText: {
    color: "#6B7280",
    fontWeight: "800",
    fontSize: 15,
  },
  nextText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
  circleIconGrey: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  circleIconWhite: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.35,
  },

  fab: {
    position: "absolute",
    right: 18,
    bottom: 92, // sits above bottom nav like screenshot
  },

  // Tutor modal
  tutorModal: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.6,
    backgroundColor: "#fff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
  tutorHeader: {
    backgroundColor: "#6C63FF",
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tutorTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  chatList: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  chatBubble: {
    maxWidth: "82%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#6C63FF",
  },
  botBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF0F4",
  },
  chatText: {
    color: "#1B1F3B",
    fontSize: 14,
    fontWeight: "600",
  },

  inputContainer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#ECEEF3",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#F3F4F7",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
});
