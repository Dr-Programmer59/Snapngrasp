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
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { sendChatMessage } from "../api/chat";
import { updateFlashcardSetTitle, deleteFlashcardSet } from "../api/studyMaterial";

// If you already made ChatIconButton component (glowing one), use it:
import ChatIconButton from "../components/ChatIconButton";

const { width, height } = Dimensions.get("window");

const FlashcardPracticeScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  
  // Normalize flashcards input
  const raw = route.params?.flashcards;
  let flashcards = [];
  if (Array.isArray(raw)) flashcards = raw;
  else if (Array.isArray(raw?.flashcards)) flashcards = raw.flashcards;
  else if (Array.isArray(raw?.data?.flashcards)) flashcards = raw.data.flashcards;

  const total = flashcards.length;
  
  // Get set ID for title updates
  const setId = route.params?.setId || route.params?.set_id;

  // Title like your screenshot: "Biology – Cell Structure"
  const initialTitle =
    route.params?.screenTitle ||
    route.params?.title ||
    route.params?.topicTitle ||
    "Flashcards";
  
  const [screenTitle, setScreenTitle] = useState(initialTitle);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Tutor (bottom sheet modal)
  const [tutorVisible, setTutorVisible] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
  const explanationText =
    currentCard.explanation ?? null;

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

  const openTutor = async () => {
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

    // Auto-send explanation request for current flashcard
    setTimeout(async () => {
      // If flashcard has explanation, show it directly
      if (explanationText) {
        const botMessage = {
          id: `bot-${Date.now()}`,
          text: `🧠 **Let me help you understand this...**\n\n${explanationText}\n\n---\n\n💡 **Teaching Approach:** Instead of just memorizing "${answerText}", understanding the reasoning behind it will help you remember it naturally and apply it in different contexts!`,
          from: "bot",
        };
        
        setMessages(prev => [...prev, botMessage]);
        return;
      }

      // Fallback: If no explanation, ask AI tutor
      const userMessage = { 
        id: Date.now().toString(), 
        text: `Help me understand why this is the answer`, 
        from: "user" 
      };
      
      const thinkingId = `thinking-${Date.now()}`;
      const thinkingMessage = { 
        id: thinkingId, 
        text: "thinking", 
        from: "bot" 
      };
      
      setMessages(prev => [...prev, userMessage, thinkingMessage]);
      setIsLoading(true);

      try {
        // Build conversation history for context
        const conversationHistory = messages
          .filter(msg => msg.text !== "thinking")
          .map(msg => ({
            sender: msg.from,
            text: msg.text,
          }));

        // Add flashcard context with specific pedagogical instruction
        const contextMessage = `Context: We are studying flashcards. Current flashcard:
Question: "${questionText}"
Answer: "${answerText}"

🎯 IMPORTANT - PEDAGOGICAL APPROACH REQUIRED:
The student clicked "I don't know" because they don't understand this concept yet. Your goal is to TEACH them, not just tell them the answer.

Please provide a comprehensive, educational explanation that includes:

1. 🧠 **Conceptual Understanding**: Start by explaining the underlying concept in simple terms
2. 🔍 **Reasoning & Logic**: Walk through WHY this answer makes sense (not just WHAT it is)
3. 📚 **Background Context**: Provide relevant context or prerequisites they need to know
4. 🛠️ **Methodology**: Show the step-by-step thought process to arrive at this answer
5. 💡 **Memory Aids**: Include analogies, examples, or mnemonics to help them remember
6. 🎯 **Practical Application**: Explain where/how this knowledge is used or why it matters

CRITICAL RULES:
- DO NOT just state the answer directly at the beginning
- DO explain the reasoning that LEADS to the answer
- DO use analogies, real-world examples, and relatable concepts
- DO break down complex ideas into simpler parts
- DO explain the "why" behind each step
- Focus on TEACHING and UNDERSTANDING, not just memorization

Example of GOOD explanation style:
"Let's think about this step by step. First, consider what happens when... This is important because... Think of it like... Now, putting this together, we can see that... That's why the answer is..."

Example of BAD explanation style:
"The answer is X. This is correct because it's defined as X."`;
        
        // Send to AI tutor API
        const response = await sendChatMessage(
          contextMessage,
          conversationHistory
        );

        // Replace thinking message with actual response
        const botResponse = {
          id: `bot-${Date.now()}`,
          text: response.message,
          from: "bot",
        };

        setMessages(prev => 
          prev.map(msg => msg.id === thinkingId ? botResponse : msg)
        );

      } catch (error) {
        console.error('Chat error:', error);
        
        // Remove thinking message and show error
        setMessages(prev => prev.filter(msg => msg.id !== thinkingId));
        
        Alert.alert(
          'Error',
          'Failed to get explanation from AI tutor. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsLoading(false);
      }
    }, 300);
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

  const sendChat = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { 
      id: Date.now().toString(), 
      text: input.trim(), 
      from: "user" 
    };
    
    const thinkingId = `thinking-${Date.now()}`;
    const thinkingMessage = { 
      id: thinkingId, 
      text: "thinking", 
      from: "bot" 
    };
    
    setMessages(prev => [...prev, userMessage, thinkingMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build conversation history for context - include flashcard info
      const conversationHistory = messages
        .filter(msg => msg.text !== "thinking") // Exclude thinking messages
        .map(msg => ({
          sender: msg.from,
          text: msg.text,
        }));

      // Add flashcard context to help AI understand what we're studying
      const contextMessage = `Context: We are studying flashcards. Current flashcard - Question: "${questionText}", Answer: "${answerText}". Please help explain or clarify.`;
      
      // Send to AI tutor API with context
      const response = await sendChatMessage(
        `${contextMessage}\n\nUser question: ${userMessage.text}`,
        conversationHistory
      );

      // Replace thinking message with actual response
      const botResponse = {
        id: `bot-${Date.now()}`,
        text: response.message,
        from: "bot",
      };

      setMessages(prev => 
        prev.map(msg => msg.id === thinkingId ? botResponse : msg)
      );

    } catch (error) {
      console.error('Chat error:', error);
      
      // Remove thinking message and show error
      setMessages(prev => prev.filter(msg => msg.id !== thinkingId));
      
      Alert.alert(
        'Error',
        'Failed to get response from AI tutor. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle edit title
  const handleEditTitle = () => {
    if (!setId) {
      Alert.alert('Error', 'Cannot edit title: Set ID not found');
      return;
    }
    
    Alert.prompt(
      'Edit Title',
      'Enter a new title for this flashcard set:',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Save',
          onPress: async (newTitle) => {
            if (!newTitle || newTitle.trim().length === 0) {
              Alert.alert('Error', 'Title cannot be empty');
              return;
            }
            
            try {
              await updateFlashcardSetTitle(setId, newTitle.trim());
              setScreenTitle(newTitle.trim());
              Alert.alert('Success', 'Title updated successfully');
            } catch (error) {
              console.error('Update title error:', error);
              Alert.alert('Error', 'Failed to update title. Please try again.');
            }
          }
        }
      ],
      'plain-text',
      screenTitle
    );
  };
  
  // Handle delete set
  const handleDeleteSet = () => {
    if (!setId) {
      Alert.alert('Error', 'Cannot delete: Set ID not found');
      return;
    }
    
    Alert.alert(
      'Delete Flashcard Set',
      `Are you sure you want to delete "${screenTitle}"? This will remove all flashcards in this set.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFlashcardSet(setId);
              Alert.alert('Success', 'Flashcard set deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack()
                }
              ]);
            } catch (error) {
              console.error('Delete set error:', error);
              Alert.alert('Error', 'Failed to delete flashcard set. Please try again.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.isDark ? '#0C1421' : '#F9F9F9' }]}>
      {/* Header (dark rounded like screenshot) */}
      <LinearGradient colors={theme.isDark ? ['#382F74', '#22234C'] : ['rgba(60,54,135,0.95)', 'rgba(20,22,45,0.95)']} style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {screenTitle}
          </Text>
          {setId && (
            <TouchableOpacity 
              style={styles.editTitleBtn} 
              onPress={handleEditTitle}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {setId && (
          <TouchableOpacity 
            style={styles.headerBtn} 
            onPress={handleDeleteSet}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color="#ff5a5f" />
          </TouchableOpacity>
        )}
        {!setId && <View style={{ width: 40 }} />}
      </LinearGradient>

      {/* Row: Flashcards pill + star */}
      <View style={styles.topRow}>
        <View style={[styles.pill, { backgroundColor: theme.isDark ? '#fff' : '#fff' }]}>
          <Text style={[styles.pillText, { color: theme.isDark ? '#0B0D16' : '#1B1F3B' }]}>Flashcards</Text>
        </View>

        <TouchableOpacity style={[styles.starBtn, { backgroundColor: theme.isDark ? '#fff' : '#fff' }]} onPress={() => setBookmarked((p) => !p)}>
          <Ionicons
            name={bookmarked ? "star" : "star-outline"}
            size={22}
            color={bookmarked ? "#F5B700" : "#F5B700"}
          />
        </TouchableOpacity>
      </View>

      {/* Progress like screenshot */}
      <View style={styles.progressWrap}>
        <Text style={[styles.progressFraction, { color: theme.isDark ? 'rgba(255,255,255,0.18)' : '#1B1F3B' }]}>
          {index + 1}/{total}
        </Text>

        <View style={styles.progressBar}>
          {Array.from({ length: total }).map((_, i) => {
            const active = i <= index;
            return <View key={i} style={[styles.segment, { backgroundColor: active ? '#6C63FF' : (theme.isDark ? 'rgba(255,255,255,0.12)' : '#D6D8DE') }]} />;
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
                backgroundColor: theme.isDark ? 'rgba(18, 20, 40, 0.72)' : '#fff',
                borderColor: theme.isDark ? 'rgba(255,255,255,0.18)' : 'transparent',
                borderWidth: theme.isDark ? 1 : 0,
                transform: [{ perspective: 1000 }, { rotateY: frontRotate }],
              },
            ]}
          >
            <TouchableOpacity style={[styles.smallIconBtn, { backgroundColor: theme.isDark ? 'rgba(108,99,255,0.15)' : '#EEF0FF' }]} onPress={() => {}} activeOpacity={0.8}>
              <Ionicons name="shuffle" size={18} color="#6C63FF" />
            </TouchableOpacity>

            <View style={styles.cardCenter}>
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator
              >
                <Text style={[styles.cardText, { color: theme.isDark ? '#fff' : '#1B1F3B' }]}>
                  {questionText || "No question text"}
                </Text>
              </ScrollView>
            </View>

            <View style={[styles.cardBottomBar, { backgroundColor: theme.isDark ? '#14172B' : '#14172B' }]}>
              <Text style={styles.cardBottomText}>Click to view answer</Text>
            </View>
          </Animated.View>

          {/* Back */}
          <Animated.View
            style={[
              styles.cardFace,
              styles.cardBackFace,
              {
                backgroundColor: theme.isDark ? 'rgba(18, 20, 40, 0.72)' : '#fff',
                borderColor: theme.isDark ? 'rgba(255,255,255,0.18)' : 'transparent',
                borderWidth: theme.isDark ? 1 : 0,
                transform: [{ perspective: 1000 }, { rotateY: backRotate }],
              },
            ]}
          >
            <TouchableOpacity style={[styles.smallIconBtn, { backgroundColor: theme.isDark ? 'rgba(108,99,255,0.15)' : '#EEF0FF' }]} onPress={() => {}} activeOpacity={0.8}>
              <Ionicons name="shuffle" size={18} color="#6C63FF" />
            </TouchableOpacity>

            <View style={styles.cardCenter}>
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator
              >
                <Text style={[styles.cardText, { color: theme.isDark ? '#fff' : '#1B1F3B' }]}>
                  {answerText || "No answer text"}
                </Text>
              </ScrollView>
            </View>

            <View style={[styles.cardBottomBar, { backgroundColor: theme.isDark ? '#14172B' : '#14172B' }]}>
              <Text style={styles.cardBottomText}>Click to view question</Text>
            </View>
          </Animated.View>
        </Pressable>
      </View>

      {/* "I know" / "I don't know" buttons - Only show when flipped (showing answer) */}
      {flipped && (
        <View style={styles.confidenceButtons}>
          <TouchableOpacity
            style={[styles.confidenceBtn, styles.dontKnowBtn, { backgroundColor: theme.isDark ? 'rgba(255,90,95,0.15)' : '#FFF0F0', borderColor: theme.isDark ? 'rgba(255,90,95,0.3)' : '#FFD6D8' }]}
            onPress={() => {
              // Open chat tutor for explanation
              openTutor();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color="#FF5A5F" />
            <Text style={[styles.confidenceBtnText, { color: '#FF5A5F' }]}>I don't know</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confidenceBtn, styles.knowBtn, { backgroundColor: theme.isDark ? 'rgba(37,209,159,0.15)' : '#E8FDF7', borderColor: theme.isDark ? 'rgba(37,209,159,0.3)' : '#C1F5E5' }]}
            onPress={() => {
              // Mark as known and go to next card
              goNext();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle" size={20} color="#25D19F" />
            <Text style={[styles.confidenceBtnText, { color: '#25D19F' }]}>I know this</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom navigation like screenshot */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navPill, styles.prevPill, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : '#EFEFF3', borderWidth: theme.isDark ? 1 : 0, borderColor: theme.isDark ? 'rgba(255,255,255,0.18)' : 'transparent' }, index === 0 && styles.disabled]}
          onPress={goPrev}
          disabled={index === 0}
          activeOpacity={0.85}
        >
          <View style={[styles.circleIconGrey, { backgroundColor: theme.isDark ? 'transparent' : '#fff', borderWidth: theme.isDark ? 1 : 0, borderColor: theme.isDark ? 'rgba(255,255,255,0.18)' : 'transparent' }]}>
            <Ionicons name="arrow-back" size={18} color={theme.isDark ? 'rgba(255,255,255,0.75)' : '#6C63FF'} />
          </View>
          <Text style={[styles.prevText, { color: theme.isDark ? 'rgba(255,255,255,0.70)' : '#6B7280' }]}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navPill, styles.nextPill, { backgroundColor: '#6C63FF' }, index === total - 1 && styles.disabled]}
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
        <ChatIconButton size={65} onPress={openTutor} />
      </View>

      {/* Tutor Modal */}
      {tutorVisible && (
        <Animated.View
          style={[
            styles.tutorModal,
            {
              backgroundColor: theme.isDark ? 'rgba(18, 20, 40, 0.96)' : '#fff',
              borderColor: theme.isDark ? 'rgba(255,255,255,0.16)' : 'transparent',
              opacity: tutorOpacity,
              transform: [{ scale: tutorScale }],
            },
          ]}
        >
          <LinearGradient
            colors={theme.isDark ? ['#6C63FF', 'rgba(18, 20, 40, 0.0)'] : ['#6C63FF', '#6C63FF']}
            style={styles.tutorHeader}
          >
            <Text style={styles.tutorTitle}>Snap Tutor</Text>
            <TouchableOpacity onPress={closeTutor}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            style={styles.chatList}
            contentContainerStyle={{ paddingBottom: 10 }}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.chatBubble,
                  item.from === "user" 
                    ? styles.userBubble 
                    : [styles.botBubble, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.10)' : '#EEF0F4' }],
                ]}
              >
                {item.text === "thinking" ? (
                  <View style={styles.thinkingDots}>
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                  </View>
                ) : (
                  <Text style={[styles.chatText, { color: item.from === "user" ? '#fff' : (theme.isDark ? '#FFFFFF' : '#1B1F3B') }]}>{item.text}</Text>
                )}
              </View>
            )}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.inputContainer, { 
              backgroundColor: theme.isDark ? 'rgba(18, 20, 40, 0.96)' : '#fff',
              borderTopColor: theme.isDark ? 'rgba(255,255,255,0.12)' : '#ECEEF3'
            }]}
          >
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F7',
                color: theme.isDark ? '#fff' : '#111827'
              }]}
              placeholder="Ask a question..."
              placeholderTextColor={theme.isDark ? 'rgba(255,255,255,0.5)' : '#999'}
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
  },

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
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
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  editTitleBtn: {
    marginLeft: 8,
    padding: 4,
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
    height: "90%",
    borderRadius: 18,
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
    textAlign: "center",
    lineHeight: 32,
  },

  cardBottomBar: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBottomText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    opacity: 0.95,
  },

  confidenceButtons: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 12,
  },
  confidenceBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dontKnowBtn: {},
  knowBtn: {},
  confidenceBtnText: {
    fontSize: 15,
    fontWeight: "700",
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
  prevPill: {},
  nextPill: {},
  prevText: {
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
    bottom: 60, // sits above bottom nav like screenshot
  },

  // Tutor modal
  tutorModal: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.6,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
    borderWidth: 1,
  },
  tutorHeader: {
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
  },
  chatText: {
    fontSize: 14,
    fontWeight: "600",
  },
  thinkingDots: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#999",
    marginHorizontal: 3,
  },

  inputContainer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 14,
    fontWeight: "600",
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
