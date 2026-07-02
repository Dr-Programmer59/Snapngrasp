import { BACKEND_API_URL } from '../config/api';
import { getAccessToken } from './auth';

/**
 * Generate AI-powered feedback for a learning session
 */
export const generateFeedback = async (feedbackData) => {
  try {
    console.log('🤖 Generating AI feedback...');
    console.log('📊 Feedback data:', JSON.stringify(feedbackData, null, 2));

    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/feedback/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(feedbackData),
    });

    console.log('📡 Feedback response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate feedback');
    }

    const result = await response.json();
    console.log('✅ Feedback generated successfully');
    console.log('📊 Feedback:', result.data);

    return result;
  } catch (error) {
    console.error('❌ Error generating feedback:', error);
    throw error;
  }
};

/**
 * Get feedback history for the current user
 */
export const getFeedbackHistory = async (userId, limit = 10) => {
  try {
    console.log('📜 Fetching feedback history...');

    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(
      `${BACKEND_API_URL}/api/feedback/history/${userId}?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log('📡 History response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch feedback history');
    }

    const result = await response.json();
    console.log('✅ Feedback history fetched:', result.data?.length || 0, 'records');

    return result;
  } catch (error) {
    console.error('❌ Error fetching feedback history:', error);
    throw error;
  }
};

/**
 * Helper to format MCQ answers for feedback
 */
export const formatMCQAnswers = (questions, userAnswers) => {
  return questions.map((q, index) => ({
    question_id: q.id,
    question_text: q.question,
    user_answer: userAnswers[index] || '',
    correct_answer: q.correct_answer || q.options?.find(opt => opt.is_correct)?.option_text || '',
    is_correct: userAnswers[index] === (q.correct_answer || q.options?.find(opt => opt.is_correct)?.option_text),
    topic: q.topic || 'General',
    subject: q.subject || 'Unknown',
  }));
};

/**
 * Helper to format visual answers for feedback
 */
export const formatVisualAnswers = (visuals, userAnswers) => {
  return visuals.map(visual => {
    const visualAnswers = userAnswers[visual.id] || {};
    
    return {
      visual_id: visual.id,
      visual_title: visual.title || visual.question_text || 'Visual Question',
      slot_answers: (visual.slots || []).map(slot => {
        const userAnswer = visualAnswers[slot.slot_id];
        const correctLabel = visual.labels?.find(l => l.label_id === slot.correct_label_id);
        
        return {
          slot_id: slot.slot_id,
          user_answer: userAnswer || '',
          correct_answer: correctLabel?.text || '',
          is_correct: userAnswer === correctLabel?.text,
        };
      }),
      subject: visual.subject || 'Unknown',
      topic: visual.topic || 'General',
    };
  });
};

/**
 * Helper to format flashcard sessions for feedback
 */
export const formatFlashcardSessions = (flashcards, confidenceLevels) => {
  return flashcards.map((card, index) => ({
    flashcard_id: card.id,
    question: card.question,
    confidence_level: confidenceLevels[index] || 'medium',
    topic: card.topic || 'General',
    subject: card.subject || 'Unknown',
  }));
};
