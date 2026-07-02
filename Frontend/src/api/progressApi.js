import axios from 'axios';
import { getAccessToken } from './auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.18.20:8080';

/**
 * Get authentication token
 */
const getAuthToken = async () => {
  try {
    const token = await getAccessToken();
    console.log('🔑 [Progress API] Token retrieved:', token ? `exists (${token.substring(0, 20)}...)` : 'missing');
    if (!token) {
      console.log('🔍 [Progress API] Token is null or undefined - user may not be logged in');
    }
    return token;
  } catch (error) {
    console.error('❌ [Progress API] Error getting token:', error);
    return null;
  }
};

/**
 * Log user progress after completing an activity
 */
export const logProgress = async (activityData) => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.post(
      `${API_URL}/api/progress/log`,
      activityData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('❌ [Progress API] Error logging progress:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get user's overall statistics
 */
export const getUserStats = async () => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(`${API_URL}/api/progress/stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data.data;
  } catch (error) {
    console.error('❌ [Progress API] Error getting stats:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get user's current streak
 */
export const getUserStreak = async () => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(`${API_URL}/api/progress/streak`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data.data;
  } catch (error) {
    console.error('❌ [Progress API] Error getting streak:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Check in user for today (maintains streak)
 */
export const dailyCheckIn = async () => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.post(
      `${API_URL}/api/progress/check-in`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('❌ [Progress API] Error checking in:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get personalized AI greeting
 */
export const getAIGreeting = async () => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    console.log('🤖 [Progress API] Fetching AI greeting...');

    const response = await axios.get(`${API_URL}/api/progress/greeting`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 15000, // 15 second timeout for AI greeting
    });

    console.log('✅ [Progress API] AI greeting received:', response.data.data.message.substring(0, 50));
    return response.data.data;
  } catch (error) {
    console.error('❌ [Progress API] Error getting AI greeting:', error.response?.data || error.message);
    
    // Return fallback greeting if API fails
    return {
      message: "Welcome back! Ready to learn something new today? 🚀",
      type: 'welcome',
      emoji: '👋',
      stats: null,
    };
  }
};
