// src/api/chat.js
import { BACKEND_API_URL } from '../config/api';
import { getAccessToken } from './auth';

const API_URL = BACKEND_API_URL;

// Platform-specific storage wrapper
const storage = {
  async getItem(key) {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key, value) {
    if (Platform.OS === 'web') {
      return AsyncStorage.setItem(key, value);
    }
    return SecureStore.setItemAsync(key, value);
  },
};

/**
 * Send chat message to AI tutor
 * @param {string} message - User's message
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {Promise<Object>} AI response
 */
export const sendChatMessage = async (message, conversationHistory = []) => {
  console.log('💬 [Chat API] Sending message...');

  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Please login first');
    }

    console.log('📡 [Chat API] API URL:', `${API_URL}/api/chat/message`);
    
    const response = await fetch(`${API_URL}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationHistory,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.message || 'Failed to send message');
    }

    const data = await response.json();
    console.log('✅ [Chat API] Response received');
    return data.data;

  } catch (error) {
    console.error('❌ [Chat API] Error:', error.message);
    throw error;
  }
};

/**
 * Get chat history
 * @param {number} limit - Number of messages to fetch
 * @returns {Promise<Array>} Chat history
 */
export const getChatHistory = async (limit = 50) => {
  console.log('📜 [Chat API] Fetching chat history...');

  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Please login first');
    }

    const response = await fetch(`${API_URL}/api/chat/history?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.message || 'Failed to fetch history');
    }

    const data = await response.json();
    console.log('✅ [Chat API] History fetched:', data.data?.messages?.length || 0, 'messages');
    return data.data;

  } catch (error) {
    console.error('❌ [Chat API] History error:', error.message);
    throw error;
  }
};

export default {
  sendChatMessage,
  getChatHistory,
};
