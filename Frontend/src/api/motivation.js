import { BACKEND_API_URL } from '../config/api';
import { getAccessToken } from './auth';

/**
 * Generate AI motivational message based on user stats
 */
export const generateMotivationalMessage = async (stats) => {
  try {
    console.log('📤 Requesting motivational message with stats:', stats);
    
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/motivation/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        accuracy: stats.accuracy || 0,
        quizzes: stats.quizzes || 0,
        flashcards: stats.flashcards || 0,
        streak: stats.streak || 0,
        checkInStatus: stats.checkInStatus || 'returning',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Motivational message received:', data);
    
    return data;
  } catch (error) {
    console.error('❌ Error generating motivational message:', error);
    
    // Return fallback message on error
    return {
      success: false,
      data: {
        message: 'Ready to learn something new today? 🎯',
        fallback: true,
      },
    };
  }
};
