// QuizScreen.js
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function QuizScreen({ navigation }) {
  // Mock quiz data
  const quizData = [
    {
      question: "Which gas is essential for photosynthesis?",
      options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"],
      correct: "Carbon Dioxide",
    },
    {
      question: "What is the powerhouse of the cell?",
      options: ["Nucleus", "Ribosome", "Mitochondria", "Chloroplast"],
      correct: "Mitochondria",
    },
  ];

  const total = quizData.length;
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  // Tutor mini chat visible
  const [tutorVisible, setTutorVisible] = useState(false);
  // Chat messages (mock)
  const [messages, setMessages] = useState([
    { id: "1", from: "bot", text: "Hi — I'm Snap Tutor. How can I help?" },
  ]);
  const [input, setInput] = useState("");

  // Combined popup animated values
  const popupScale = useRef(new Animated.Value(0.6)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;

  // Tutor animation values
  const tutorScale = useRef(new Animated.Value(0.8)).current;
  const tutorOpacity = useRef(new Animated.Value(0)).current;

  // show combined popup when correct
  const showCorrectPopup = () => {
    popupScale.setValue(0.6);
    popupOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(popupOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.spring(popupScale, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Auto hide after 2 seconds and advance
      setTimeout(() => {
        Animated.timing(popupOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          // move to next question automatically
          goNext();
        });
      }, 2000);
    });
  };

  // Dismiss popup manually
  const dismissPopup = () => {
    Animated.timing(popupOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      goNext();
    });
  };

  const selectOption = (option) => {
    if (selected) return; // lock after selection
    setSelected(option);
    const correct = quizData[index].correct;
    if (option === correct) {
      // correct: show popup then advance
      showCorrectPopup();
    } else {
      // wrong: keep selection (user can press next)
      // optionally show red highlight (handled in render)
    }
  };

  const goNext = () => {
    setSelected(null);
    const newIndex = Math.min(index + 1, total - 1);
    setIndex(newIndex);
    if (newIndex === total - 1) {
      // Last question done, navigate to feedback
      setTimeout(() => {
        navigation.navigate('feedback_screen');
      }, 500);
    }
  };

  const goPrev = () => {
    setSelected(null);
    setIndex((prev) => Math.max(prev - 1, 0));
  };

  const onSkip = () => {
    setSelected(null);
    if (index < total - 1) {
      setIndex(index + 1);
    } else {
      // Last question skipped, navigate to feedback
      setTimeout(() => {
        navigation.navigate('feedback_screen');
      }, 500);
    }
  };

  // Tutor open/close animations
  const openTutor = () => {
    setTutorVisible(true);
    tutorScale.setValue(0.8);
    tutorOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(tutorOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(tutorScale, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeTutor = () => {
    Animated.parallel([
      Animated.timing(tutorOpacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }),
      Animated.timing(tutorScale, {
        toValue: 0.8,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start(() => setTutorVisible(false));
  };

  const sendChat = () => {
    if (!input.trim()) return;
    const newMsg = { id: Date.now().toString(), from: "user", text: input.trim() };
    setMessages((m) => [...m, newMsg]);
    setInput("");
    // Mock bot reply
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: (Date.now() + 1).toString(),
          from: "bot",
          text: "No worries! Let me explain the full process step by step...",
        },
      ]);
    }, 900);
  };

  // When I don't know is pressed -> open tutor and send a mock request
  const handleIDontKnow = () => {
    openTutor();
    // optionally push a question message into tutor
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: (Date.now() + 2).toString(),
          from: "user",
          text: `Explain: ${quizData[index].question}`,
        },
      ]);
      setTimeout(() => {
        setMessages((m) => [
          ...m,
          {
            id: (Date.now() + 3).toString(),
            from: "bot",
            text: "The nucleus controls the cell's occlusions, but the organelle responsible for energy is different. Think about ATP production.",
          },
        ]);
      }, 700);
    }, 300);
  };

  // Render option item
  const renderOption = (option, idx) => {
    const isSelected = selected === option;
    const correct = quizData[index].correct;
    const isCorrect = option === correct;
    // Visual states:
    // - if selected & correct => green
    // - if selected & wrong => red
    // - else white
    let styleExtra = {};
    if (selected) {
      if (isSelected && isCorrect) {
        styleExtra = { borderColor: "#3CCB6C", backgroundColor: "#EAF9F0" };
      } else if (isSelected && !isCorrect) {
        styleExtra = { borderColor: "#FF6B6B", backgroundColor: "#FFECEC" };
      } else if (isCorrect && selected && selected !== correct) {
        // show correct after an incorrect selection (optional highlight)
        styleExtra = { borderColor: "#3CCB6C" };
      }
    }

    return (
      <TouchableOpacity
        key={idx}
        activeOpacity={0.9}
        onPress={() => selectOption(option)}
        style={[styles.option, styleExtra]}
      >
        <View style={styles.optionLeft}>
          <Text style={styles.optionLetter}>{String.fromCharCode(65 + idx)}</Text>
        </View>
        <Text style={styles.optionText}>{option}</Text>
        {isSelected && (
          <Ionicons
            name={isCorrect ? "checkmark-circle" : "close-circle"}
            size={20}
            color={isCorrect ? "#3CCB6C" : "#FF6B6B"}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Biology – Cell Structure</Text>
        <TouchableOpacity>
          <Ionicons name="star-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Quiz Title & Progress */}
      <View style={styles.titleRow}>
        <Text style={styles.quizTitle}>Quiz</Text>
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {index + 1}/{total}
        </Text>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressFill,
              { width: `${((index + 1) / total) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Question card */}
      <View style={styles.card}>
        <Text style={styles.questionText}>{quizData[index].question}</Text>

        <View style={{ marginTop: 18 }}>
          {quizData[index].options.map((opt, i) => renderOption(opt, i))}
        </View>

        {/* Bottom small action row inside card */}
        <View style={styles.cardButtonsRow}>
          <TouchableOpacity style={styles.idkBtn} onPress={handleIDontKnow}>
            <Text style={styles.idkText}>I dont know</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Prev/Next nav */}
      <View style={styles.navRow}>
        <TouchableOpacity onPress={goPrev} disabled={index === 0} style={[styles.navBtn, index === 0 ? styles.navBtnDisabled : styles.navBtnActive]}>
          <Text style={[styles.navText, { color: index === 0 ? "#D1D1D6" : "#fff" }]}>Prev <Ionicons name="arrow-back" size={12} color={index === 0 ? "#D1D1D6" : "#fff"} /></Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goNext}
          disabled={index === total - 1}
          style={[styles.navBtn, index === total - 1 ? styles.navBtnDisabled : styles.navBtnActive]}
        >
          <Text style={[styles.navText, { color: index === total - 1 ? "#D1D1D6" : "#fff" }]}>Next <Ionicons name="arrow-forward" size={12} color={index === total - 1 ? "#D1D1D6" : "#fff"} /></Text>
        </TouchableOpacity>
      </View>

      {/* Floating mascot button */}
      <TouchableOpacity style={styles.fab} onPress={openTutor}>
        <Image source={require("../assets/logo.png")} style={styles.fabImage} />
      </TouchableOpacity>

      {/* Combined popup (centered) */}
      <View style={styles.popupWrapper}>
        <Animated.View
          pointerEvents="auto"
          style={[
            styles.popup,
            {
              opacity: popupOpacity,
              transform: [{ scale: popupScale }],
            },
          ]}
        >
          <TouchableOpacity onPress={dismissPopup} style={styles.popupClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.fire}>🔥</Text>
          <Text style={styles.popupTitle}>Great job!</Text>
          <Text style={styles.popupAdd}>+1</Text>
          <Text style={styles.streakMessage}>Streak unlocked! Keep going—your learning journey is leveling up!</Text>
        </Animated.View>
      </View>

      {/* Tutor mini chat (centered on screen) */}
      {tutorVisible && (
        <View style={styles.tutorWrapper}>
          <Animated.View
            style={[
              styles.tutorOverlay,
              {
                opacity: tutorOpacity,
                transform: [{ scale: tutorScale }],
              },
            ]}
          >
            <View style={styles.tutorHeader}>
              <TouchableOpacity onPress={() => navigation.navigate('ChatScreen')}>
                <Ionicons name="expand" size={32} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.tutorChatArea}>
              <FlatList
                data={messages}
                keyExtractor={(it) => it.id}
                renderItem={({ item }) => (
                  <View
                    style={[
                      item.from === "bot" ? styles.botMessageRow : styles.userMessageRow,
                    ]}
                  >
                    {item.from === "bot" && (
                      <Image source={require("../assets/logo.png")} style={styles.msgAvatar} />
                    )}
                    <View
                      style={[
                        styles.msgBubble,
                        item.from === "bot" ? styles.msgBot : styles.msgUser,
                      ]}
                    >
                      <Text style={item.from === "bot" ? styles.msgTextBot : styles.msgTextUser}>
                        {item.text}
                      </Text>
                    </View>
                    {item.from === "user" && (
                      <Image source={require("../assets/images/user.jpg")} style={styles.msgAvatar} />
                    )}
                  </View>
                )}
                showsVerticalScrollIndicator={false}
              />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View style={styles.tutorInputRow}>
                <TextInput
                  placeholder="Start typing here..."
                  placeholderTextColor="#9AA0A6"
                  value={input}
                  onChangeText={setInput}
                  style={styles.tutorInput}
                />
                <TouchableOpacity style={styles.tutorSend} onPress={sendChat}>
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>

          <TouchableOpacity style={styles.closeButton} onPress={closeTutor}>
            <View style={styles.closeCircle}>
              <Ionicons name="close" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7F7" },
  header: {
    height: 62,
    backgroundColor: "#1C1C1E",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTitle: { color: "#fff", fontFamily: "Poppins-SemiBold", fontSize: 15 },
  titleRow: { paddingHorizontal: 18, paddingTop: 12 },
  quizTitle: { fontSize: 18, fontFamily: "Poppins-Bold", color: "#111" },

  progressRow: { paddingHorizontal: 18, marginTop: 12 },
  progressText: { color: "#333", fontFamily: "Poppins-SemiBold", marginBottom: 8 },
  progressBarBackground: {
    height: 8,
    backgroundColor: "#E8E8E8",
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    backgroundColor: "#6C63FF",
    borderRadius: 10,
  },

  card: {
    marginHorizontal: 18,
    marginTop: 18,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    // card shadow
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  questionText: { fontSize: 17, fontFamily: "Poppins-Bold", color: "#111" },

  option: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  optionLeft: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F3F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionLetter: { fontFamily: "Poppins-Bold", color: "#333" },
  optionText: { flex: 1, color: "#222", fontSize: 15, fontFamily: "Poppins-Regular" },

  cardButtonsRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  idkBtn: {
    backgroundColor: "#1C1C1E",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    flex: 1,
    marginRight: 12,
    alignItems: "center",
  },
  idkText: { color: "#fff", fontFamily: "Poppins-SemiBold" },
  skipBtn: {
    backgroundColor: "#F0F0F0",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 92,
  },
  skipText: { color: "#111", fontFamily: "Poppins-SemiBold" },

  navRow: {
    marginTop: 18,
    marginHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  navBtn: { alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  navBtnDisabled: { backgroundColor: 'white' },
  navBtnActive: { backgroundColor: '#6C63FF' },
  navText: { fontSize: 12, fontWeight: "600" },

  fab: {
    position: "absolute",
    bottom: 92,
    right: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  fabImage: { width: 44, height: 44, resizeMode: "contain" },

  /* popup */
  popupWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
  popup: {
    borderRadius: 14,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  popupClose: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  fire: { fontSize: 32, marginBottom: 6 },
  popupTitle: { fontSize: 18, fontFamily: "Poppins-Bold", color: "#333" },
  popupAdd: { fontSize: 16, fontFamily: "Poppins-Bold", color: "#FF7A00", marginTop: 6 },
  streakMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 10,
    fontFamily: "Poppins-Regular"
  },

  /* tutor overlay - centered with scale animation */
  tutorOverlay: {
    position: "absolute",
    top: (height - 500) / 2,
    left: 20,
    right: 20,
    height: 500,
    borderRadius: 20,
    backgroundColor: "#fff",
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    overflow: "hidden",
  },
  tutorHeader: {
    backgroundColor: "#6C63FF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  tutorLogo: { width: 32, height: 32, marginRight: 12, borderRadius: 8 },
  tutorTitle: { color: "#fff", fontFamily: "Poppins-Bold", fontSize: 18 },
  enlargedIcon: { width: 32, height: 32, borderRadius: 16 },

  tutorChatArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },

  botMessageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  userMessageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  msgAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  msgBubble: {
    maxWidth: "80%",
    padding: 14,
    borderRadius: 16,
  },
  msgBot: {
    backgroundColor: "#F3F6FB",
    marginLeft: 4,
    borderBottomLeftRadius: 4,
  },
  msgUser: {
    backgroundColor: "#1C1C1E",
    borderBottomRightRadius: 4,
  },
  msgTextBot: { 
    color: "#111",
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Poppins-Regular"
  },
  msgTextUser: { 
    color: "#fff",
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Poppins-Regular"
  },

  tutorInputRow: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#EFEFEF",
    backgroundColor: "#fff",
  },
  tutorInput: {
    flex: 1,
    backgroundColor: "#F4F6F8",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 12,
    color: "#222",
    fontSize: 15,
    fontFamily: "Poppins-Regular"
  },
  tutorSend: {
    backgroundColor: "#6C63FF",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  tutorWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    bottom: 20, // at the bottom of the screen
    right: 20, // right edge
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#6C63FF",
    justifyContent: "center",
    alignItems: "center",
  },
});
