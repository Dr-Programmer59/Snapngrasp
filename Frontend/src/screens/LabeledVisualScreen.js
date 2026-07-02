import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import ChatIconButton from '../components/ChatIconButton';
import Constants from 'expo-constants';
import { generateVisualFeedback } from '../utils/feedbackHelper';

const { width } = Dimensions.get('window');
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://api.snapngrasp.com';

const LabeledVisualScreen = ({ route, navigation }) => {
  const { visual } = route.params;
  const { theme } = useTheme();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);

  // Parse visual data and construct full image URL
  const {
    title,
    instruction_text,
    image_url,
    all_labels = [],
    questions = [],
  } = visual;

  // Convert relative image URL to absolute URL
  const fullImageUrl = image_url?.startsWith('http') 
    ? image_url 
    : `${API_URL}${image_url}`;

  const totalQuestions = questions.length;
  const visibleLabels = all_labels.filter(label => !label.is_hidden);
  const hiddenLabels = all_labels.filter(label => label.is_hidden);

  const palette = useMemo(() => {
    const primary = theme?.colors?.primary ?? "#6C5CE7";
    const isDark = theme?.isDark;
    return {
      primary,
      card: isDark ? "rgba(18, 20, 40, 0.72)" : "#FFFFFF",
      cardBorder: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.08)",
      optionBg: isDark ? "rgba(255,255,255,0.09)" : "#F5F6FA",
      optionBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      text: isDark ? "#FFFFFF" : "#1B1F3B",
      muted: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)",
      segmentOff: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
      progressText: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.25)",
      green: "#25D19F",
      red: "#FF5A5F",
      star: "#F4B000",
      navOutlineBg: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
      navOutlineBorder: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)",
      navOutlineText: isDark ? "rgba(255,255,255,0.70)" : "rgba(0,0,0,0.65)",
      navOutlineIcon: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.70)",
      navIconBorder: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)",
    };
  }, [theme]);

  useEffect(() => {
    console.log('🎨 [Labeled Visual] Screen loaded');
    console.log('📊 Total labels:', all_labels.length);
    console.log('👁️ Visible labels:', visibleLabels.length);
    console.log('❓ Hidden labels (questions):', hiddenLabels.length);
    console.log('🖼️ Image URL:', fullImageUrl);
  }, []);

  const handleOptionSelect = (questionIndex, option) => {
    console.log('🎯 Option selected:', { questionIndex, option });
    if (showResults) {
      console.log('⚠️ Results already shown, ignoring selection');
      return;
    }
    setSelectedAnswers({
      ...selectedAnswers,
      [questionIndex]: option,
    });
    console.log('✅ Answer saved');
  };

  const goNext = () => {
    if (currentQuestionIndex >= totalQuestions - 1) return;
    setCurrentQuestionIndex(prev => Math.min(prev + 1, totalQuestions - 1));
  };

  const goPrev = () => {
    if (currentQuestionIndex <= 0) return;
    setCurrentQuestionIndex(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (Object.keys(selectedAnswers).length < totalQuestions) {
      Alert.alert(
        'Incomplete',
        'Please answer all questions before submitting.',
        [{ text: 'OK' }]
      );
      return;
    }

    let correctCount = 0;
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correct_answer) {
        correctCount++;
      }
    });

    setScore(correctCount);
    setShowResults(true);

    // Show loading screen
    navigation.navigate('feedback_screen', {
      isLoading: true,
    });

    // Prepare visual data in the format expected by the API
    const visualWithAnswers = {
      id: visual.id || 'visual-' + Date.now(),
      title: title,
      slots: questions.map((q, idx) => ({
        slot_id: `slot-${idx}`,
        correct_label_id: q.label_number,
      })),
      labels: all_labels.map(label => ({
        label_id: label.label_number,
        text: label.part_name,
      })),
      topic: visual.topic || 'Visual Learning',
      subject: visual.subject || 'General',
    };

    const userAnswers = {
      [visualWithAnswers.id]: Object.fromEntries(
        questions.map((q, idx) => [`slot-${idx}`, selectedAnswers[idx]])
      ),
    };

    // Generate AI feedback
    await generateVisualFeedback(
      navigation,
      [visualWithAnswers],
      userAnswers,
      visual.upload_id || null
    );
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setShowResults(false);
    setScore(0);
    setCurrentQuestionIndex(0);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isPrevDisabled = currentQuestionIndex === 0;
  const isNextDisabled = currentQuestionIndex >= totalQuestions - 1;

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
        <Text style={styles.headerTitle}>{title || "Visual Learning"}</Text>
        <View style={{ width: 44 }} />
      </LinearGradient>

      {/* Top actions row */}
      <View style={styles.topActions}>
        <TouchableOpacity style={[styles.visualPill, { backgroundColor: theme.isDark ? '#fff' : '#fff' }]} activeOpacity={0.9}>
          <Text style={[styles.pillText, { color: theme.isDark ? '#0B0D16' : '#0B0D16' }]}>Visual</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.starBtn, { backgroundColor: theme.isDark ? '#fff' : '#fff' }]} 
          onPress={() => setBookmarked(p => !p)}
          activeOpacity={0.9}
        >
          <Ionicons name={bookmarked ? "star" : "star-outline"} size={22} color={palette.star} />
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={styles.progressWrap}>
        <Text style={[styles.fractionText, { color: palette.progressText }]}>
          {currentQuestionIndex + 1}/{totalQuestions}
        </Text>
        <View style={styles.segmentsRow}>
          {Array.from({ length: totalQuestions }).map((_, i) => {
            const active = i <= currentQuestionIndex;
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

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        scrollEnabled={true}
      >
        {/* Diagram Image */}
        <View style={[styles.imageCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Image
            source={{ uri: fullImageUrl }}
            style={styles.diagramImage}
            resizeMode="contain"
          />
          
          {/* Visible Labels Legend */}
          {visibleLabels.length > 0 && (
            <View style={[styles.legendCard, { backgroundColor: theme.isDark ? 'rgba(108,92,231,0.08)' : '#F5F6FA' }]}>
              <Text style={[styles.legendTitle, { color: palette.muted }]}>Reference Labels:</Text>
              {visibleLabels.map((label) => (
                <View key={label.label_number} style={styles.legendItem}>
                  <View style={[styles.labelNumber, { backgroundColor: palette.primary }]}>
                    <Text style={styles.labelNumberText}>{label.label_number}</Text>
                  </View>
                  <Text style={[styles.legendText, { color: palette.text }]}>{label.part_name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Current Question Card */}
        {currentQuestion && (
          <View style={[styles.questionCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            {theme.isDark && (
              <LinearGradient
                colors={["rgba(108,92,231,0.00)", "rgba(108,92,231,0.18)"]}
                style={styles.cardBottomGlow}
                pointerEvents="none"
              />
            )}

            <View style={styles.questionHeader}>
              <View style={[styles.labelBadge, { backgroundColor: '#FF9800' }]}>
                <Text style={styles.labelBadgeText}>{currentQuestion.label_number}</Text>
              </View>
              <Text style={[styles.questionText, { color: palette.text }]}>
                {currentQuestion.question}
              </Text>
            </View>

            {/* Options */}
            <View style={styles.optionsWrap}>
              {currentQuestion.options?.map((option, idx) => {
                const showFeedback = selectedAnswers[currentQuestionIndex] !== undefined;
                const isSelected = selectedAnswers[currentQuestionIndex] === option;
                const isCorrect = option === currentQuestion.correct_answer;

                let bg = palette.optionBg;
                let border = palette.optionBorder;
                let rightNode = (
                  <View style={[styles.radioOuter, { 
                    borderColor: theme.isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)" 
                  }]}>
                    <View style={[styles.radioInner, isSelected && !showResults && {
                      backgroundColor: palette.primary,
                      transform: [{ scale: 1 }]
                    }]} />
                  </View>
                );

                // Show selected state before submission
                if (isSelected && !showResults) {
                  bg = theme.isDark ? "rgba(108,92,231,0.12)" : "rgba(108,92,231,0.08)";
                  border = palette.primary;
                }

                if (showFeedback && showResults) {
                  if (isCorrect) {
                    bg = theme.isDark ? "rgba(37,209,159,0.16)" : "rgba(37,209,159,0.08)";
                    border = "rgba(37, 209, 159, 0.65)";
                    rightNode = (
                      <View style={[styles.checkPill, { backgroundColor: palette.green }]}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      </View>
                    );
                  } else if (isSelected && !isCorrect) {
                    bg = theme.isDark ? "rgba(255,90,95,0.12)" : "rgba(255,90,95,0.06)";
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
                    onPress={() => handleOptionSelect(currentQuestionIndex, option)}
                    disabled={showResults}
                    hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                  >
                    <View style={styles.letterBox}>
                      <Text style={[styles.letterText, { color: palette.text }]}>
                        {String.fromCharCode(65 + idx)}
                      </Text>
                    </View>

                    <View style={[styles.optionDivider, { 
                      backgroundColor: theme.isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)" 
                    }]} />

                    <Text style={[styles.optionTextStyle, { color: palette.text }]}>{option}</Text>

                    {rightNode}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Explanation */}
            {showResults && (
              <View style={[styles.explanation, { backgroundColor: theme.isDark ? 'rgba(108,92,231,0.08)' : '#F0F4FF' }]}>
                <Ionicons name="bulb" size={20} color="#FFA500" />
                <Text style={[styles.explanationText, { color: palette.text }]}>
                  {currentQuestion.explanation}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Submit/Reset Button */}
      {!showResults && Object.keys(selectedAnswers).length === totalQuestions && (
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: palette.primary }]}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          <Text style={styles.submitText}>Submit All Answers</Text>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Tutor floating button */}
      <TouchableOpacity 
        style={styles.tutorFab} 
        activeOpacity={0.9} 
        onPress={() => {
          console.log('🤖 Chat icon pressed');
          navigation.navigate('ChatScreen', {
            context: 'visual_practice',
            visualId: visual.id,
            visualTitle: title
          });
        }}
      >
        <ChatIconButton size={60} />
      </TouchableOpacity>

      {/* Bottom navigation */}
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
    </View>
  );
};

export default LabeledVisualScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },

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
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  topActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    marginTop: 14,
  },
  visualPill: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pillText: {
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

  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 160,
  },

  imageCard: {
    marginHorizontal: 18,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  diagramImage: {
    width: "100%",
    height: width * 0.8,
    borderRadius: 12,
  },
  legendCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
    gap: 10,
  },
  labelNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  labelNumberText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  legendText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },

  questionCard: {
    marginTop: 14,
    marginHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    paddingTop: 16,
    paddingBottom: 16,
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
    height: 100,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  labelBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  labelBadgeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
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
  optionTextStyle: {
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

  explanation: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  explanationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },

  submitBtn: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 80,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  tutorFab: {
    position: "absolute",
    right: 18,
    bottom: 90,
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    gap: 14,
    zIndex: 10,
  },
  pillBtn: {
    flex: 1,
    height: 56,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginHorizontal: 7,
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
});
