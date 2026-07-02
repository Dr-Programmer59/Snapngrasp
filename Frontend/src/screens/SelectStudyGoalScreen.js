import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { completeOnboarding } from "../api/onboarding";

export default function SelectStudyGoalScreen({ navigation, route }) {
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(10)).current;
  const { checkAuth } = useAuth();
  
  const { learningStyles, isOnboarding, userEmail, userName } = route.params || {};

  const goals = [
    {
      id: "quiz-prep",
      title: "Quiz Prep",
      description: "Ace your quizzes with smart practice questions.",
      image: require("../assets/images/QuizPrep.png"),
    },
    {
      id: "concept-understanding",
      title: "Concept Understanding",
      description: "Get clear explanations and examples for tricky topics.",
      image: require("../assets/images/Concept.png"),
    },
    {
      id: "assignment-help",
      title: "Assignment Help",
      description:
        "Receive guidance and tips to finish your assignments faster.",
      image: require("../assets/images/Assignment.png"),
    },
    {
      id: "flashcards",
      title: "Flashcards",
      description: "Revise efficiently with interactive flashcards.",
      image: require("../assets/images/flashcards.png"),
    },
  ];

  useEffect(() => {
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
    Animated.timing(textTranslate, {
      toValue: 0,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  const toggleGoal = (goalId) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId]
    );
  };

  const handleContinue = async () => {
    if (selectedGoals.length > 0) {
      if (isOnboarding) {
        // Complete onboarding flow
        try {
          setLoading(true);
          
          // Get primary learning style (first selected)
          const primaryLearningStyle = learningStyles && learningStyles.length > 0 
            ? learningStyles[0] 
            : 'visual';
          
          await completeOnboarding(
            primaryLearningStyle,
            selectedGoals,
            userName
          );
          
          // Re-check auth to trigger navigation to MainAppStack
          await checkAuth();
          
          setLoading(false);
        } catch (error) {
          console.error('Error completing onboarding:', error);
          setLoading(false);
          Alert.alert('Error', error.message || 'Failed to complete setup');
        }
      } else {
        // Just navigate to Settings
        navigation.navigate("Settings", { selectedGoals });
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* 🟣 Top Gradient Section */}
      <LinearGradient colors={["#0E0C2D", "#1A1647"]} style={styles.topGradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.progressBar}>
            <View style={[styles.progressSegment, styles.progressActive]} />
            <View style={[styles.progressSegment, styles.progressActive]} />
            <View style={[styles.progressSegment, styles.progressInactive]} />
          </View>
        </View>

        {/* Mascot and Message */}
        <View style={styles.mascotContainer}>
          <Image
            source={require("../assets/images/mascot.png")}
            style={styles.mascotImage}
            resizeMode="contain"
          />
          <Animated.View
            style={[
              styles.messageBubble,
              {
                opacity: textOpacity,
                transform: [{ translateY: textTranslate }],
              },
            ]}
          >
            <Text style={styles.messageTitle}>What’s Your Goal?</Text>
            <Text style={styles.messageText}>
              Tell me why you’re here, and I’ll set up SnapNGrasp just for you.
            </Text>
          </Animated.View>
        </View>
      </LinearGradient>

      {/* Main Scroll Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 80, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Study Goals */}
        <View style={styles.goalsContainer}>
          {goals.map((goal) => {
            const isSelected = selectedGoals.includes(goal.id);
            return (
              <TouchableOpacity
                key={goal.id}
                style={[styles.goalCard, isSelected && styles.goalCardSelected]}
                onPress={() => toggleGoal(goal.id)}
                activeOpacity={0.9}
              >
                <Image
                  source={goal.image}
                  style={styles.goalImage}
                  resizeMode="contain"
                />
                <View style={styles.textContainer}>
                  <Text
                    style={[
                      styles.goalTitle,
                      isSelected && { color: "#FFD84D" },
                    ]}
                  >
                    {goal.title}
                  </Text>
                  <Text
                    style={[
                      styles.goalDescription,
                      isSelected && { color: "#FFFFFF" },
                    ]}
                  >
                    {goal.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          disabled={selectedGoals.length === 0 || loading}
          activeOpacity={0.8}
          onPress={handleContinue}
        >
          <LinearGradient
            colors={
              selectedGoals.length > 0 && !loading
                ? ["#7C3AED", "#5B21B6"]
                : ["#E2E8F0", "#E2E8F0"]
            }
            style={[
              styles.continueButton,
              (selectedGoals.length === 0 || loading) && styles.continueButtonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.continueButtonText,
                  selectedGoals.length === 0 &&
                    styles.continueButtonTextDisabled,
                ]}
              >
                {isOnboarding ? 'Complete Setup' : 'Save Changes'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Main container **/
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA", // 🌤 Light gray background
  },

  /** Gradient top section **/
  topGradient: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 30,
  },

  /** Header **/
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#2D2B4C",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { color: "#FFFFFF", fontSize: 20 },
  progressBar: { flex: 1, flexDirection: "row", gap: 8 },
  progressSegment: { flex: 1, height: 8, borderRadius: 4 },
  progressActive: { backgroundColor: "#A68BFF" },
  progressInactive: { backgroundColor: "#3E3A63" },

  /** Mascot **/
  mascotContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  mascotImage: {
    width: 80,
    height: 80,
  },
  messageBubble: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderTopLeftRadius: 4,
    padding: 16,
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E1E2D",
    marginBottom: 6,
  },
  messageText: {
    fontSize: 14,
    color: "#666A7A",
    lineHeight: 20,
  },

  /** Goals **/
  goalsContainer: { paddingHorizontal: 24, marginTop: 8, gap: 16 },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB", // subtle border
  },
  goalCardSelected: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
    shadowOpacity: 0.15,
  },
  goalImage: {
    width: 70,
    height: 70,
    marginRight: 16,
  },
  textContainer: { flex: 1 },
  goalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1E2D",
    marginBottom: 4,
  },
  goalDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  /** Button **/
  buttonContainer: { paddingHorizontal: 24, paddingVertical: 24 },
  continueButton: {
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonDisabled: { opacity: 0.6 },
  continueButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  continueButtonTextDisabled: { color: "#9CA3AF" },
});