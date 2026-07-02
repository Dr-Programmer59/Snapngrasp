import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ChatIconButton from "../components/ChatIconButton";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Modal,
} from "react-native";
import { submitMCQAnswer, updateMCQSetTitle, deleteMCQSet } from "../api/studyMaterial";
import { useTheme } from "../contexts/ThemeContext";
import { generateMCQFeedback } from "../utils/feedbackHelper";
import { sendChatMessage } from "../api/chat";

const { height } = Dimensions.get("window");

export default function MCQQuizScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { mcqs: mcqData, title: routeTitle } = route.params || {};

  // Extract MCQs array from the data object
  const quizData = mcqData?.mcqs || mcqData?.data?.mcqs || [];
  const total = quizData.length;
  
  console.log('\n📱 [MCQQuizScreen] Received data:');
  console.log('  Total questions:', total);
  if (quizData.length > 0) {
    const types = quizData.reduce((acc, q) => {
      acc[q.question_type || 'unknown'] = (acc[q.question_type || 'unknown'] || 0) + 1;
      return acc;
    }, {});
    console.log('  Question types in MCQQuizScreen:', types);
    console.log('  First question sample:', {
      type: quizData[0]?.question_type,
      question: quizData[0]?.question?.substring(0, 50),
      hasOptions: !!quizData[0]?.options,
      optionsLength: quizData[0]?.options?.length,
      hasCorrectAnswerText: !!quizData[0]?.correct_answer_text
    });
  }
  console.log('');
  
  // Get set ID for title updates
  const setId = route.params?.setId || route.params?.set_id;
  
  // Title state
  const initialTitle = routeTitle || "Biology – Cell Structure";
  const [screenTitle, setScreenTitle] = useState(initialTitle);

  const palette = useMemo(() => {
    const primary = theme?.colors?.primary ?? "#6C5CE7";
    const isDark = theme?.isDark;
    return {
      primary,
      // Card colors
      card: isDark ? "rgba(18, 20, 40, 0.72)" : "#FFFFFF",
      cardBorder: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.08)",
      // Option colors
      optionBg: isDark ? "rgba(255,255,255,0.09)" : "#F5F6FA",
      optionBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      // Text colors
      text: isDark ? "#FFFFFF" : "#1B1F3B",
      muted: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)",
      muted2: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)",
      // Progress
      segmentOff: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
      progressText: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.25)",
      // Feedback colors
      green: "#25D19F",
      red: "#FF5A5F",
      star: "#F4B000",
      // Button colors
      quizPillBg: isDark ? "#fff" : "#fff",
      quizPillText: isDark ? "#0B0D16" : "#0B0D16",
      starBtnBg: isDark ? "#fff" : "#fff",
      // I don't know button
      idkBtnBg: isDark ? "rgba(108,92,231,0.12)" : "rgba(108,92,231,0.08)",
      idkBtnBorder: isDark ? "rgba(160,140,255,0.55)" : "rgba(108,92,231,0.35)",
      // Navigation
      navOutlineBg: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
      navOutlineBorder: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)",
      navOutlineText: isDark ? "rgba(255,255,255,0.70)" : "rgba(0,0,0,0.65)",
      navOutlineIcon: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.70)",
      navIconBorder: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)",
    };
  }, [theme]);

  // Initialize answered array with previous answers
  const initializeAnswered = () => {
    const initialAnswered = [];
    let initialScore = 0;

    quizData.forEach((question, idx) => {
      if (question.user_answer) {
        initialAnswered[idx] = {
          questionId: question.id,
          isCorrect: !!question.user_answer.is_correct,
          selectedOption: question.user_answer.selected_answer,
        };
        if (question.user_answer.is_correct) initialScore++;
      }
    });

    return { initialAnswered, initialScore };
  };

  const { initialAnswered, initialScore } = initializeAnswered();

  const findFirstUnanswered = () => {
    for (let i = 0; i < quizData.length; i++) {
      if (!initialAnswered[i]) return i;
    }
    return 0;
  };

  const [index, setIndex] = useState(findFirstUnanswered());
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(initialAnswered);
  const [score, setScore] = useState(initialScore);
  const [textAnswer, setTextAnswer] = useState(''); // For fill-in-the-blank questions

  const scoreRef = useRef(initialScore);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  // Tutor mini chat visible
  const [tutorVisible, setTutorVisible] = useState(false);
  const [messages, setMessages] = useState([
    { id: "1", from: "bot", text: "Hi — I'm Snap Tutor. How can I help?" },
  ]);
  const [input, setInput] = useState("");

  // Tutor animation values
  const tutorScale = useRef(new Animated.Value(0.8)).current;
  const tutorOpacity = useRef(new Animated.Value(0)).current;
  const chatListRef = useRef(null);

  if (!quizData || total === 0) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: palette.bgBottom }]}>
        <Text style={[styles.errorText, { color: palette.text }]}>No MCQs available</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: palette.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQuestion = quizData[index];

  // keep selection when moving between questions (so card matches screenshot when revisiting)
  useEffect(() => {
    const prev = answered[index];
    setSelected(prev ? prev.selectedOption : null);
    setTextAnswer(prev?.answerText || ''); // Restore text answer for fill-blank
  }, [index, answered]);

  const navigateToFeedback = async (finalScore = scoreRef.current) => {
    // Show loading screen
    navigation.navigate("feedback_screen", {
      isLoading: true,
    });

    // Generate AI feedback with actual MCQ data
    await generateMCQFeedback(
      navigation, 
      quizData, 
      Object.values(answered).map(a => a.selectedOption),
      mcqData?.upload_id || null
    );
  };

  const goNext = () => {
    if (index >= total - 1) {
      navigateToFeedback();
      return;
    }
    setIndex((prev) => Math.min(prev + 1, total - 1));
  };

  const goPrev = () => {
    setIndex((prev) => Math.max(prev - 1, 0));
  };

  const onSkip = () => {
    if (index >= total - 1) {
      navigateToFeedback();
      return;
    }
    setIndex((prev) => Math.min(prev + 1, total - 1));
  };

  const selectOption = async (optionIndex) => {
    if (answered[index]) return; // already answered (locked)
    if (selected !== null) return; // lock after selection
    setSelected(optionIndex);

    const isCorrect = optionIndex === currentQuestion.correct_answer;

    // Track this answer locally
    setAnswered((prev) => {
      const copy = [...prev];
      copy[index] = {
        questionId: currentQuestion.id,
        isCorrect,
        selectedOption: optionIndex,
      };
      return copy;
    });

    // Update score once
    if (isCorrect) {
      setScore((prev) => {
        const next = prev + 1;
        scoreRef.current = next;
        return next;
      });
    }

    // Submit answer to backend (non-blocking UX)
    try {
      await submitMCQAnswer(currentQuestion.id, optionIndex, null);
      console.log("✅ Answer submitted for question:", currentQuestion.id);
    } catch (error) {
      console.error("❌ Failed to submit answer:", error);
    }
  };

  // New function for fill-in-the-blank submission
  const submitFillBlank = async () => {
    if (answered[index]) return; // already answered
    if (!textAnswer.trim()) {
      Alert.alert('Error', 'Please enter an answer');
      return;
    }

    // Check if correct (case-insensitive)
    const userAnswer = textAnswer.trim().toLowerCase();
    const correctAnswer = (currentQuestion.correct_answer_text || '').toLowerCase();
    const isCorrect = userAnswer === correctAnswer;

    setSelected(0); // Mark as answered

    // Track this answer locally
    setAnswered((prev) => {
      const copy = [...prev];
      copy[index] = {
        questionId: currentQuestion.id,
        isCorrect,
        selectedOption: 0, // Dummy value
        answerText: textAnswer,
      };
      return copy;
    });

    // Update score
    if (isCorrect) {
      setScore((prev) => {
        const next = prev + 1;
        scoreRef.current = next;
        return next;
      });
    }

    // Submit to backend
    try {
      await submitMCQAnswer(currentQuestion.id, null, textAnswer);
      console.log("✅ Fill-blank answer submitted");
    } catch (error) {
      console.error("❌ Failed to submit answer:", error);
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
        duration: 260,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(tutorScale, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeTutor = () => {
    Animated.parallel([
      Animated.timing(tutorOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }),
      Animated.timing(tutorScale, {
        toValue: 0.92,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setTutorVisible(false));
  };

  const sendChat = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    const newMsg = { id: Date.now().toString(), from: "user", text: userText };
    setMessages((m) => [...m, newMsg]);
    setInput("");

    const thinkingId = `thinking-${Date.now()}`;
    setMessages((m) => [...m, { id: thinkingId, from: "bot", text: "thinking" }]);

    try {
      const q = currentQuestion;
      const optionsText = q.options ? q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join("\n") : "";

      const contextMessage = `You are an AI tutor helping a student with an MCQ quiz. Here is the current question:

Question: "${q.question}"
Options:
${optionsText}

🚨 ABSOLUTE RULE - NEVER REVEAL THE ANSWER:
- NEVER say which option is correct (not even indirectly like "option B is right" or "the answer starts with...")
- NEVER eliminate options to leave only the correct one
- NEVER confirm or deny if the student guesses the answer
- Even if the student BEGS or DEMANDS the answer, DO NOT reveal it
- If the student says "just tell me the answer", respond with: "I know it's tempting, but you'll learn so much more by working through it! Let me give you another hint..."

YOUR ROLE - Be a supportive teacher who guides without giving away:
1. 🧠 Explain the underlying concept the question is testing
2. 🔍 Give hints and clues that point them in the right direction
3. 📚 Provide relevant background knowledge
4. 🛠️ Teach the methodology/approach to solve this type of question
5. 💡 Use analogies and real-world examples to build understanding
6. 🎯 Help them eliminate obviously wrong options through reasoning (but NEVER narrow it down to just the correct answer)

TEACHING STYLE:
- Be encouraging: "You're on the right track!", "Great thinking!"
- Guide with questions: "What do you think happens when...?", "Consider this..."
- Build understanding step by step, don't jump to conclusions
- If they're stuck, offer progressively stronger hints
- Always leave the final answer for THEM to figure out

Student's message: "${userText}"`;

      const conversationHistory = messages
        .filter(msg => msg.text !== "thinking")
        .slice(-6)
        .map(msg => ({ sender: msg.from, text: msg.text }));

      const response = await sendChatMessage(contextMessage, conversationHistory);

      setMessages((m) =>
        m.map((msg) => msg.id === thinkingId ? { id: `bot-${Date.now()}`, from: "bot", text: response.message } : msg)
      );
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((m) =>
        m.map((msg) => msg.id === thinkingId ? {
          id: `bot-${Date.now()}`,
          from: "bot",
          text: "Let me help you think through this! What concept do you think this question is testing? Try breaking it down step by step.",
        } : msg)
      );
    }
  };

  const handleIDontKnow = () => {
    openTutor();
    setTimeout(async () => {
      const q = currentQuestion;
      const optionsText = q.options ? q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join("\n") : "";

      setMessages((m) => [
        ...m,
        {
          id: Date.now().toString(),
          from: "user",
          text: `I don't understand this question and need help figuring it out`,
        },
      ]);

      const thinkingId = `thinking-${Date.now()}`;
      setMessages((m) => [...m, { id: thinkingId, from: "bot", text: "thinking" }]);

      try {
        const contextMessage = `You are an AI tutor helping a student who clicked "I don't know" on an MCQ quiz question.

Question: "${q.question}"
Options:
${optionsText}

🚨 ABSOLUTE RULE - NEVER REVEAL THE ANSWER:
- NEVER say which option is correct
- NEVER say "the answer is..." or "the correct option is..."
- NEVER eliminate all wrong options to leave only the correct one
- NEVER confirm or deny any specific option
- Your job is to TEACH, not to give answers

The student doesn't know the answer. Help them figure it out themselves by:

1. 🧠 **Start with the concept**: Explain what topic/concept this question is testing in simple terms
2. 🔍 **Give a strong hint**: Point them toward the right direction without naming the answer
3. 📚 **Provide context**: Share relevant background knowledge they need
4. 🛠️ **Teach the approach**: Show them HOW to think about this type of question
5. 💡 **Use an analogy**: Make it relatable with a real-world example
6. ❌ **Help eliminate**: Guide them to rule out 1-2 obviously wrong options through reasoning (but NEVER narrow it to just the correct answer)

IMPORTANT TONE:
- Be warm and encouraging: "Don't worry, let's work through this together!"
- Make them feel smart: "Here's a great way to approach this..."
- Build confidence: "Once you understand this concept, this becomes much easier"
- End with a guiding question that nudges them toward the answer: "Now, with this in mind, which option do you think fits best?"

Remember: The goal is that the student has an "aha!" moment and selects the answer themselves. That's 10x more powerful than being told the answer.`;

        const response = await sendChatMessage(contextMessage, []);

        setMessages((m) =>
          m.map((msg) => msg.id === thinkingId ? { id: `bot-${Date.now()}`, from: "bot", text: response.message } : msg)
        );
      } catch (error) {
        console.error("Chat error:", error);
        // Fallback hint without revealing answer
        const q = currentQuestion;
        const fallbackHint = `🧠 Let's work through this together!\n\nThis question is about: **${q.question.split(" ").slice(0, 5).join(" ")}...**\n\n💡 **Here's how to approach it:**\n1. Think about what concept this question is testing\n2. Look at each option and ask yourself "does this make sense?"\n3. Try to eliminate options that seem clearly wrong first\n4. Consider what you already know about this topic\n\n🎯 You've got this! Take your time and think it through. What do you think the answer might be?`;

        setMessages((m) =>
          m.map((msg) => msg.id === thinkingId ? { id: `bot-${Date.now()}`, from: "bot", text: fallbackHint } : msg)
        );
      }
    }, 150);
  };
  
  // Handle edit title
  const handleEditTitle = () => {
    if (!setId) {
      Alert.alert('Error', 'Cannot edit title: Set ID not found');
      return;
    }
    
    Alert.prompt(
      'Edit Title',
      'Enter a new title for this MCQ set:',
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
              await updateMCQSetTitle(setId, newTitle.trim());
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
      'Delete Quiz Set',
      `Are you sure you want to delete "${screenTitle}"? This will remove all questions in this set.`,
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
              await deleteMCQSet(setId);
              Alert.alert('Success', 'Quiz set deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack()
                }
              ]);
            } catch (error) {
              console.error('Delete set error:', error);
              Alert.alert('Error', 'Failed to delete quiz set. Please try again.');
            }
          }
        }
      ]
    );
  };

  const isPrevDisabled = index === 0;
  const isNextDisabled = selected === null && !answered[index]; // enable Next only after answer (like screenshot)

  return (
    <View style={[styles.container, { backgroundColor: theme.isDark ? '#0C1421' : '#F9F9F9' }]}>
      {/* Header */}
      <LinearGradient
        colors={["rgba(60,54,135,0.95)", "rgba(20,22,45,0.95)"]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.headerBack} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{screenTitle}</Text>
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
            style={styles.headerBack} 
            onPress={handleDeleteSet}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color="#ff5a5f" />
          </TouchableOpacity>
        )}
        {!setId && <View style={{ width: 44 }} />}
      </LinearGradient>

      {/* Top actions row */}
      <View style={styles.topActions}>
        <TouchableOpacity style={[styles.quizPill, { backgroundColor: palette.quizPillBg }]} activeOpacity={0.9}>
          <Text style={[styles.quizPillText, { color: palette.quizPillText }]}>Quiz</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.starBtn, { backgroundColor: palette.starBtnBg }]} activeOpacity={0.9}>
          <Ionicons name="star-outline" size={22} color={palette.star} />
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={styles.progressWrap}>
        <Text style={[styles.fractionText, { color: palette.progressText }]}>
          {index + 1}/{total}
        </Text>

        <View style={styles.segmentsRow}>
          {Array.from({ length: total }).map((_, i) => {
            const active = i <= index;
            return (
              <View
                key={i}
                style={[
                  styles.segment,
                  {
                    backgroundColor: active ? palette.primary : palette.segmentOff,
                    opacity: active ? 0.95 : 0.7,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Quiz Card (matches screenshot structure) */}
      <View style={[styles.quizCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
        {theme.isDark && (
          <LinearGradient
            colors={["rgba(108,92,231,0.00)", "rgba(108,92,231,0.18)"]}
            style={styles.cardBottomGlow}
            pointerEvents="none"
          />
        )}

        {/* Question Type Badge */}
        {currentQuestion.question_type && (
          <View style={[styles.typeBadge, { 
            backgroundColor: 
              currentQuestion.question_type === 'mcq' ? 'rgba(108,92,231,0.1)' : 
              currentQuestion.question_type === 'fill_blank' ? 'rgba(37,209,159,0.1)' : 
              'rgba(244,176,0,0.1)'
          }]}>
            <Text style={[styles.typeText, { 
              color: 
                currentQuestion.question_type === 'mcq' ? palette.primary : 
                currentQuestion.question_type === 'fill_blank' ? palette.green : 
                palette.star
            }]}>
              {currentQuestion.question_type === 'mcq' ? '📝 Multiple Choice' : 
               currentQuestion.question_type === 'fill_blank' ? '✍️ Fill in the Blank' : 
               '✓ True/False'}
            </Text>
          </View>
        )}

        <Text style={[styles.questionText, { color: palette.text }]}>{currentQuestion.question}</Text>

        {/* Render based on question type */}
        {currentQuestion.question_type === 'fill_blank' ? (
          /* Fill in the Blank Input */
          <View style={styles.fillBlankContainer}>
            <TextInput
              style={[styles.fillBlankInput, { 
                backgroundColor: palette.optionBg,
                borderColor: answered[index] ? 
                  (answered[index].isCorrect ? palette.green : palette.red) : 
                  palette.optionBorder,
                color: palette.text
              }]}
              placeholder="Type your answer here..."
              placeholderTextColor={palette.muted2}
              value={textAnswer}
              onChangeText={setTextAnswer}
              editable={!answered[index]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            {!answered[index] && (
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: palette.primary }]}
                onPress={submitFillBlank}
                activeOpacity={0.8}
              >
                <Text style={styles.submitButtonText}>Submit Answer</Text>
              </TouchableOpacity>
            )}
            
            {answered[index] && (
              <View style={[styles.fillBlankFeedback, { 
                backgroundColor: answered[index].isCorrect ? 
                  'rgba(37,209,159,0.1)' : 'rgba(255,90,95,0.1)',
                borderColor: answered[index].isCorrect ? palette.green : palette.red
              }]}>
                <Ionicons 
                  name={answered[index].isCorrect ? 'checkmark-circle' : 'close-circle'} 
                  size={20} 
                  color={answered[index].isCorrect ? palette.green : palette.red} 
                />
                <Text style={[styles.feedbackText, { 
                  color: answered[index].isCorrect ? palette.green : palette.red 
                }]}>
                  {answered[index].isCorrect ? 
                    '✓ Correct!' : 
                    `✗ Incorrect. Answer: ${currentQuestion.correct_answer_text}`
                  }
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* Multiple Choice or True/False Options */
          <View style={styles.optionsWrap}>
            {currentQuestion.options?.map((option, idx) => {
              const showFeedback = selected !== null;
              const isSelected = selected === idx;
              const isCorrect = idx === currentQuestion.correct_answer;

              let bg = palette.optionBg;
              let border = palette.optionBorder;
              let rightNode = (
                <View style={[styles.radioOuter, { 
                  borderColor: theme.isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)" 
                }]}>
                  <View style={styles.radioInner} />
                </View>
              );

              if (showFeedback) {
                if (isCorrect) {
                  bg = theme.isDark ? "rgba(255,255,255,0.16)" : "rgba(37,209,159,0.08)";
                  border = "rgba(37, 209, 159, 0.65)";
                  rightNode = (
                    <View style={[styles.checkPill, { backgroundColor: palette.green }]}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  );
                } else if (isSelected && !isCorrect) {
                  bg = theme.isDark ? "rgba(255,255,255,0.12)" : "rgba(255,90,95,0.06)";
                  border = "rgba(255, 90, 95, 0.70)";
                  rightNode = (
                    <View style={[styles.checkPill, { backgroundColor: palette.red }]}>
                      <Ionicons name="close" size={14} color="#fff" />
                    </View>
                  );
                }
              }

              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.optionRow, { backgroundColor: bg, borderColor: border }]}
                  activeOpacity={0.88}
                  onPress={() => selectOption(idx)}
                  disabled={selected !== null || !!answered[index]}
                >
                  <View style={styles.letterBox}>
                    <Text style={[styles.letterText, { color: palette.text }]}>{String.fromCharCode(65 + idx)}</Text>
                  </View>

                  <View style={[styles.optionDivider, { backgroundColor: theme.isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)" }]} />

                  <Text style={[styles.optionText, { color: palette.text }]}>{option}</Text>

                  {rightNode}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Card footer */}
        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={[styles.idkBtn, { 
              backgroundColor: palette.idkBtnBg, 
              borderColor: palette.idkBtnBorder 
            }]} 
            activeOpacity={0.9} 
            onPress={handleIDontKnow}
          >
            <Text style={[styles.idkText, { color: palette.text }]}>I don't Know</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onSkip} activeOpacity={0.8}>
            <Text style={[styles.skipText, { color: palette.muted }]}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tutor floating button */}
      <TouchableOpacity style={styles.tutorFab} activeOpacity={0.9} onPress={openTutor}>
        <ChatIconButton size={60} />
      </TouchableOpacity>

      {/* Bottom navigation (matches screenshot buttons) */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.pillBtn, styles.pillBtnOutline, {
            backgroundColor: palette.navOutlineBg,
            borderColor: palette.navOutlineBorder
          }, isPrevDisabled && styles.pillDisabled]}
          onPress={goPrev}
          disabled={isPrevDisabled}
          activeOpacity={0.85}
        >
          <View style={[styles.iconBubbleOutline, { borderColor: palette.navIconBorder }]}>
            <Ionicons name="arrow-back" size={18} color={palette.navOutlineIcon} />
          </View>
          <Text style={[styles.pillTextOutline, { color: palette.navOutlineText }]}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pillBtn, styles.pillBtnPrimary, { backgroundColor: palette.primary }, isNextDisabled && styles.pillDisabled]}
          onPress={goNext}
          disabled={isNextDisabled}
          activeOpacity={0.85}
        >
          <Text style={styles.pillTextPrimary}>Next</Text>
          <View style={styles.iconBubblePrimary}>
            <Ionicons name="arrow-forward" size={18} color={palette.primary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Tutor Modal */}
      <Modal
        visible={tutorVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeTutor}
      >
        <View style={styles.tutorOverlay}>
          <TouchableOpacity style={styles.tutorOverlayBg} activeOpacity={1} onPress={closeTutor} />
          <View style={[styles.tutorModal, { backgroundColor: "rgba(18, 20, 40, 0.98)", borderColor: "rgba(255,255,255,0.16)" }]}>
            <LinearGradient colors={[palette.primary, "rgba(18, 20, 40, 0.0)"]} style={styles.tutorHeader}>
              <View style={styles.tutorHeaderContent}>
                <View style={styles.tutorMascot}>
                  <ChatIconButton size={30} />
                </View>
                <Text style={styles.tutorTitle}>Snap Tutor</Text>
              </View>
              <TouchableOpacity onPress={closeTutor} activeOpacity={0.8}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView
              ref={chatListRef}
              style={styles.chatList}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              bounces={true}
              onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.chatBubble,
                    item.from === "user" ? styles.chatUser : styles.chatBot,
                    item.from === "user" ? { backgroundColor: palette.primary } : { backgroundColor: "rgba(255,255,255,0.10)" },
                  ]}
                >
                  <Text style={[styles.chatText, { color: item.from === "user" ? "#fff" : palette.text }]}>
                    {item.text === "thinking" ? "Thinking..." : item.text}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.inputRow}
            >
              <TextInput
                style={styles.input}
                placeholder="Ask a question..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={input}
                onChangeText={setInput}
                onSubmitEditing={sendChat}
              />
              <TouchableOpacity style={[styles.sendBtn, { backgroundColor: palette.primary }]} onPress={sendChat} activeOpacity={0.85}>
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  glowTop: {
    position: "absolute",
    top: -140,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.18,
  },
  glowBottom: {
    position: "absolute",
    bottom: -180,
    right: -120,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "#2B1B68",
    opacity: 0.22,
  },

  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 18, marginBottom: 20 },
  backButton: { paddingHorizontal: 30, paddingVertical: 12, borderRadius: 20 },
  backButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  header: {
    paddingTop: Platform.OS === "android" ? 44 : 54,
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  headerBack: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    textAlign: "center",
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  editTitleBtn: {
    marginLeft: 8,
    padding: 4,
  },

  topActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    marginTop: 14,
  },
  quizPill: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  quizPillText: {
    fontSize: 16,
    fontWeight: "700",
  },
  starBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  progressWrap: {
    paddingHorizontal: 18,
    marginTop: 10,
  },
  fractionText: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  segmentsRow: {
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: 10,
  },

  /* Quiz Card (matches screenshot structure) */
  quizCard: {
    marginTop: 16,
    marginHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardBottomGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  questionText: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: 10,
    marginBottom: 14,
  },

  optionsWrap: { marginTop: 6 },
  optionRow: {
    height: 54,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  letterBox: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  letterText: {
    fontWeight: "800",
  },
  optionDivider: {
    width: 1,
    height: 22,
    marginHorizontal: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },

  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "transparent",
  },
  checkPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 10,
  },
  idkBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  idkText: {
    fontSize: 14,
    fontWeight: "700",
  },
  skipText: {
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 4,
  },

  tutorFab: {
    position: "absolute",
    right: 18,
    bottom: 70,
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  tutorFabInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 29,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  tutorEmoji: { fontSize: 22 },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    gap: 14,
  },
  pillBtn: {
    flex: 1,
    height: 56,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  pillBtnOutline: {
    borderWidth: 1,
  },
  pillTextOutline: {
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 10,
  },
  iconBubbleOutline: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  pillBtnPrimary: {
    borderWidth: 0,
  },
  pillTextPrimary: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    marginRight: 10,
  },
  iconBubblePrimary: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  pillDisabled: {
    opacity: 0.35,
  },

  tutorOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  tutorOverlayBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  tutorModal: {
    marginHorizontal: 14,
    marginBottom: 12,
    height: height * 0.75,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "column",
  },
  tutorHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tutorHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tutorMascot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  tutorMascotEmoji: {
    fontSize: 24,
  },
  tutorTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  chatList: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  chatBubble: {
    maxWidth: "84%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 10,
  },
  chatUser: { alignSelf: "flex-end" },
  chatBot: { alignSelf: "flex-start" },
  chatText: { fontSize: 13.5, lineHeight: 18 },

  inputRow: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    paddingHorizontal: 12,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    marginLeft: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  
  // Fill-in-the-blank styles
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  fillBlankContainer: {
    marginTop: 16,
  },
  fillBlankInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Poppins',
    marginBottom: 12,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  fillBlankFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Poppins',
    flex: 1,
  },
});
