import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateFeedback, formatMCQAnswers, formatVisualAnswers, formatFlashcardSessions } from '../api/feedback';
import { getAccessToken } from '../api/auth';

/**
 * Helper to extract user ID from JWT token
 */
const getUserIdFromToken = (token) => {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.sub || decoded.user_id;
  } catch (error) {
    console.error('❌ Error decoding token:', error);
    return null;
  }
};

/**
 * Helper to get user ID from storage or token
 */
const getUserId = async () => {
  try {
    // Try to get user data from AsyncStorage first
    const userDataString = await AsyncStorage.getItem('user');
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      if (userData?.id) {
        return userData.id;
      }
    }

    // Fallback: extract user ID from JWT token
    const token = await getAccessToken();
    if (token) {
      const userId = getUserIdFromToken(token);
      if (userId) {
        console.log('✅ User ID extracted from token:', userId);
        // Save it for future use
        await AsyncStorage.setItem('user', JSON.stringify({ id: userId }));
        return userId;
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Error getting user ID:', error);
    return null;
  }
};

/**
 * Helper to generate and navigate to feedback after MCQ quiz
 */
export const generateMCQFeedback = async (navigation, mcqs, userAnswers, uploadId = null) => {
  try {
    console.log('🎯 Generating MCQ feedback...');
    
    // Get user ID from storage or token
    const userId = await getUserId();

    if (!userId) {
      console.error('❌ No user ID found');
      // Fallback to basic feedback screen
      const correctCount = userAnswers.filter((ans, idx) => {
        const correctOpt = mcqs[idx]?.options?.find(opt => opt.is_correct);
        return ans === correctOpt?.option_text;
      }).length;
      
      navigation.navigate('feedback_screen', {
        feedbackData: {
          overall_score: {
            correct: correctCount,
            total: mcqs.length,
            percentage: Math.round((correctCount / mcqs.length) * 100),
          },
          strong_areas: [],
          weak_areas: [],
          personalized_message: `You scored ${correctCount}/${mcqs.length}. Keep practicing!`,
          next_steps: ['Review your mistakes', 'Try more questions'],
        },
      });
      return;
    }

    // Format MCQ answers
    const formattedAnswers = formatMCQAnswers(mcqs, userAnswers);

    // Generate AI feedback
    const response = await generateFeedback({
      user_id: userId,
      session_type: 'mcq',
      mcq_answers: formattedAnswers,
      upload_id: uploadId,
    });

    console.log('✅ Feedback generated:', response.data);

    // Navigate to feedback screen with AI feedback
    navigation.navigate('feedback_screen', {
      feedbackData: response.data,
    });

  } catch (error) {
    console.error('❌ Error generating MCQ feedback:', error);
    
    // Fallback to basic feedback
    const correctCount = userAnswers.filter((ans, idx) => {
      const correctOpt = mcqs[idx]?.options?.find(opt => opt.is_correct);
      return ans === correctOpt?.option_text;
    }).length;
    
    navigation.navigate('feedback_screen', {
      feedbackData: {
        overall_score: {
          correct: correctCount,
          total: mcqs.length,
          percentage: Math.round((correctCount / mcqs.length) * 100),
        },
        strong_areas: [],
        weak_areas: [],
        personalized_message: `You scored ${correctCount}/${mcqs.length}. Keep practicing!`,
        next_steps: ['Review your mistakes', 'Try more questions'],
      },
    });
  }
};

/**
 * Helper to generate and navigate to feedback after Visual practice
 */
export const generateVisualFeedback = async (navigation, visuals, userAnswers, uploadId = null) => {
  try {
    console.log('🎯 Generating Visual feedback...');
    
    // Get user ID
    const userId = await getUserId();

    if (!userId) {
      console.error('❌ No user ID found');
      return;
    }

    // Format visual answers
    const formattedAnswers = formatVisualAnswers(visuals, userAnswers);

    // Calculate basic stats
    let totalCorrect = 0;
    let totalSlots = 0;
    formattedAnswers.forEach(visual => {
      totalCorrect += visual.slot_answers.filter(a => a.is_correct).length;
      totalSlots += visual.slot_answers.length;
    });

    // Generate AI feedback
    const response = await generateFeedback({
      user_id: userId,
      session_type: 'visual',
      visual_answers: formattedAnswers,
      upload_id: uploadId,
    });

    console.log('✅ Feedback generated:', response.data);

    // Navigate to feedback screen
    navigation.navigate('feedback_screen', {
      feedbackData: response.data,
    });

  } catch (error) {
    console.error('❌ Error generating Visual feedback:', error);
  }
};

/**
 * Helper to generate and navigate to feedback after Flashcard session
 */
export const generateFlashcardFeedback = async (navigation, flashcards, confidenceLevels, uploadId = null) => {
  try {
    console.log('🎯 Generating Flashcard feedback...');
    
    // Get user ID
    const userId = await getUserId();

    if (!userId) {
      console.error('❌ No user ID found');
      return;
    }

    // Format flashcard sessions
    const formattedSessions = formatFlashcardSessions(flashcards, confidenceLevels);

    // Calculate basic stats
    const easyCount = confidenceLevels.filter(c => c === 'easy').length;
    const mediumCount = confidenceLevels.filter(c => c === 'medium').length;
    const hardCount = confidenceLevels.filter(c => c === 'hard').length;

    // Generate AI feedback
    const response = await generateFeedback({
      user_id: userId,
      session_type: 'flashcard',
      flashcard_sessions: formattedSessions,
      upload_id: uploadId,
    });

    console.log('✅ Feedback generated:', response.data);

    // Navigate to feedback screen
    navigation.navigate('feedback_screen', {
      feedbackData: response.data,
    });

  } catch (error) {
    console.error('❌ Error generating Flashcard feedback:', error);
  }
};

/**
 * Helper to generate mixed feedback from multiple session types
 */
export const generateMixedFeedback = async (navigation, sessionData, uploadId = null) => {
  try {
    console.log('🎯 Generating Mixed feedback...');
    
    // Get user ID
    const userId = await getUserId();

    if (!userId) {
      console.error('❌ No user ID found');
      return;
    }

    const { mcqs = [], mcqAnswers = [], visuals = [], visualAnswers = {}, flashcards = [], confidenceLevels = [] } = sessionData;

    // Format all data
    const formattedMCQs = mcqs.length > 0 ? formatMCQAnswers(mcqs, mcqAnswers) : [];
    const formattedVisuals = visuals.length > 0 ? formatVisualAnswers(visuals, visualAnswers) : [];
    const formattedFlashcards = flashcards.length > 0 ? formatFlashcardSessions(flashcards, confidenceLevels) : [];

    // Generate AI feedback
    const response = await generateFeedback({
      user_id: userId,
      session_type: 'mixed',
      mcq_answers: formattedMCQs,
      visual_answers: formattedVisuals,
      flashcard_sessions: formattedFlashcards,
      upload_id: uploadId,
    });

    console.log('✅ Feedback generated:', response.data);

    // Navigate to feedback screen
    navigation.navigate('feedback_screen', {
      feedbackData: response.data,
    });

  } catch (error) {
    console.error('❌ Error generating Mixed feedback:', error);
  }
};
