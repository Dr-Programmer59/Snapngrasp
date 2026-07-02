import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { refreshAccessToken } from './auth';
import { BACKEND_API_URL } from '../config/api';

const API_URL = `${BACKEND_API_URL}/api`;

// Credit error helper — creates an error with credit info attached
function createApiError(data, fallbackMessage) {
  const err = new Error(data?.message || fallbackMessage);
  err.code = data?.code || null;
  err.creditType = data?.creditType || null;
  err.used = data?.used ?? null;
  err.limit = data?.limit ?? null;
  err.statusCode = data?.statusCode || null;
  return err;
}

/**
 * Platform-specific storage (matches auth.js)
 */
const storage = {
  async getItem(key) {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },
};

/**
 * Get valid access token (refresh if needed)
 */
const getValidToken = async () => {
  let token = await storage.getItem('access_token');
  
  if (!token) {
    console.log('⚠️ No access token found, attempting refresh...');
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      token = refreshed.access_token;
    }
  }
  
  return token;
};

/**
 * Make authenticated API request with auto token refresh
 */
const authenticatedFetch = async (url, options = {}) => {
  let token = await getValidToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });

  // If 401, try to refresh token once
  if (response.status === 401) {
    console.log('🔄 Token expired, refreshing...');
    const refreshed = await refreshAccessToken();
    
    if (refreshed) {
      token = refreshed.access_token;
      
      // Retry request with new token
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
        },
      });
      
      return retryResponse;
    }
  }
  
  return response;
};

/**
 * Generate MCQs from uploaded text
 */
export const generateMCQs = async (uploadId, count = 10, difficulty = 'medium') => {
  try {
    console.log('\n🔵 [FRONTEND] Requesting MCQ generation...');
    console.log('  Upload ID:', uploadId);
    console.log('  Count:', count);
    console.log('  Difficulty:', difficulty);
    
    const response = await authenticatedFetch(`${API_URL}/mcqs/generate/${uploadId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ count, difficulty })
    });

    const data = await response.json();
    
    if (!response.ok) {
      const err = createApiError(data, 'Failed to generate MCQs');
      err.statusCode = response.status;
      throw err;
    }

    console.log('\n✅ [FRONTEND] Received MCQ response from backend:');
    console.log('  Status:', data.status);
    console.log('  Total MCQs:', data.data?.mcqs?.length || 0);
    console.log('  Set ID:', data.data?.set_id);
    
    if (data.data?.mcqs) {
      const questionTypes = data.data.mcqs.reduce((acc, q) => {
        const type = q.question_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      console.log('  Question types breakdown:', questionTypes);
      
      console.log('\n  Sample questions received:');
      data.data.mcqs.slice(0, 3).forEach((q, i) => {
        console.log(`    ${i+1}. [${q.question_type}] ${q.question?.substring(0, 60)}...`);
        if (q.question_type === 'fill_blank') {
          console.log(`       Answer: ${q.correct_answer_text}`);
        }
      });
    }
    console.log('');

    return data;
  } catch (error) {
    console.error('❌ [MCQ API] Generate MCQs error:', error);
    throw error;
  }
};

/**
 * Get MCQs for a specific upload
 */
export const getMCQsByUpload = async (uploadId) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/mcqs/upload/${uploadId}`);

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get MCQs');
    }

    return data;
  } catch (error) {
    console.error('❌ [MCQ API] Get MCQs error:', error);
    throw error;
  }
};

/**
 * Get MCQs by set ID (for activity/play screen)
 */
export const getMCQsById = async (setId) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/mcqs/set/${setId}`);

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get MCQs');
    }

    return data;
  } catch (error) {
    console.error('❌ [MCQ API] Get MCQs by ID error:', error);
    throw error;
  }
};

/**
 * Generate flashcards from uploaded text
 */
export const generateFlashcards = async (uploadId, count = 10, difficulty = 'medium') => {
  try {
    const response = await authenticatedFetch(`${API_URL}/flashcards/generate/${uploadId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ count, difficulty })
    });

    const data = await response.json();
    
    if (!response.ok) {
      const err = createApiError(data, 'Failed to generate flashcards');
      err.statusCode = response.status;
      throw err;
    }

    return data;
  } catch (error) {
    console.error('❌ [Flashcard API] Generate flashcards error:', error);
    throw error;
  }
};

/**
 * Get flashcards for a specific upload
 */
export const getFlashcardsByUpload = async (uploadId) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/flashcards/upload/${uploadId}`);

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get flashcards');
    }

    return data;
  } catch (error) {
    console.error('❌ [Flashcard API] Get flashcards error:', error);
    throw error;
  }
};

/**
 * Get flashcards by set ID (for activity/play screen)
 */
export const getFlashcardsById = async (setId) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/flashcards/set/${setId}`);

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get flashcards');
    }

    return data;
  } catch (error) {
    console.error('❌ [Flashcard API] Get flashcards by ID error:', error);
    throw error;
  }
};

/**
 * Review a flashcard (update mastery level)
 */
export const reviewFlashcard = async (flashcardId, isCorrect, timeTaken) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/flashcards/${flashcardId}/review`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        is_correct: isCorrect,
        time_taken_seconds: timeTaken
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to review flashcard');
    }

    return data;
  } catch (error) {
    console.error('❌ [Flashcard API] Review flashcard error:', error);
    throw error;
  }
};

/**
 * Generate labeled visual diagrams with MCQ questions from uploaded text
 */
export const generateVisuals = async (uploadId, subject = 'General', count = 1) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/labeled-visuals/generate/${uploadId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ subject, topic: null, count })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to generate visuals');
    }

    return data;
  } catch (error) {
    console.error('❌ [Visual API] Generate visuals error:', error);
    throw error;
  }
};

/**
 * Get labeled visual diagrams for a specific upload
 */
export const getVisualsByUpload = async (uploadId) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/visuals/upload/${uploadId}?visual_type=labeled_diagram`);

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get visuals');
    }

    return data;
  } catch (error) {
    console.error('❌ [Visual API] Get visuals error:', error);
    throw error;
  }
};

/**
 * Get a specific visual by ID
 */
export const getVisualById = async (visualId) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/visuals/${visualId}`);

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get visual');
    }

    return data;
  } catch (error) {
    console.error('❌ [Visual API] Get visual error:', error);
    throw error;
  }
};

/**
 * Submit answer for a visual label
 */
export const submitVisualAnswer = async (visualId, labelId, selectedOption, timeTaken, slotId = null) => {
  try {
    const body = {
      selected_option: selectedOption,
      time_taken_seconds: timeTaken
    };
    
    // Support both old (label_id) and new (slot_id) systems
    if (slotId) {
      body.slot_id = slotId;
    } else if (labelId) {
      body.label_id = labelId;
    }
    
    const response = await authenticatedFetch(`${API_URL}/visuals/${visualId}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to submit answer');
    }

    return data;
  } catch (error) {
    console.error('❌ [Visual API] Submit answer error:', error);
    throw error;
  }
};

/**
 * Get flashcard set by ID with all flashcards
 */
export const getFlashcardSetById = async (setId) => {
  try {
    console.log('🃏 [Flashcard API] Fetching flashcard set:', setId);
    
    const response = await authenticatedFetch(`${API_URL}/flashcards/set/${setId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get flashcard set');
    }

    console.log('✅ [Flashcard API] Flashcard set retrieved:', data);
    return data;
  } catch (error) {
    console.error('❌ [Flashcard API] Get flashcard set error:', error);
    throw error;
  }
};

/**
 * Get MCQ set by ID with all questions
 */
export const getMCQSetById = async (setId) => {
  try {
    console.log('📝 [MCQ API] Fetching MCQ set:', setId);
    
    const response = await authenticatedFetch(`${API_URL}/mcqs/set/${setId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get MCQ set');
    }

    console.log('✅ [MCQ API] MCQ set retrieved:', data);
    return data;
  } catch (error) {
    console.error('❌ [MCQ API] Get MCQ set error:', error);
    throw error;
  }
};

/**
 * Submit answer for an MCQ question
 * Supports MCQ, Fill-in-the-Blank, and True/False question types
 */
export const submitMCQAnswer = async (mcqId, selectedAnswer, answerText = null, timeTaken = 0) => {
  try {
    console.log('📝 [MCQ API] Submitting answer for MCQ:', mcqId);
    console.log('📝 [MCQ API] Selected answer:', selectedAnswer, 'Answer text:', answerText);
    
    const response = await authenticatedFetch(`${API_URL}/mcqs/${mcqId}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        selected_answer: selectedAnswer,
        answer_text: answerText,
        time_taken_seconds: timeTaken
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ [MCQ API] Response not OK:', response.status, data);
      throw new Error(data.message || 'Failed to submit answer');
    }

    console.log('✅ [MCQ API] Answer submitted:', data);
    return data;
  } catch (error) {
    console.error('❌ [MCQ API] Submit answer error:', error);
    throw error;
  }
};

/**
 * Update flashcard set title
 */
export const updateFlashcardSetTitle = async (setId, title) => {
  try {
    console.log('✏️ [Flashcard API] Updating title for set:', setId);
    
    const response = await authenticatedFetch(`${API_URL}/flashcards/set/${setId}/title`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update title');
    }

    console.log('✅ [Flashcard API] Title updated:', data);
    return data;
  } catch (error) {
    console.error('❌ [Flashcard API] Update title error:', error);
    throw error;
  }
};

/**
 * Update MCQ set title
 */
export const updateMCQSetTitle = async (setId, title) => {
  try {
    console.log('✏️ [MCQ API] Updating title for set:', setId);
    
    const response = await authenticatedFetch(`${API_URL}/mcqs/set/${setId}/title`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update title');
    }

    console.log('✅ [MCQ API] Title updated:', data);
    return data;
  } catch (error) {
    console.error('❌ [MCQ API] Update title error:', error);
    throw error;
  }
};

/**
 * Delete flashcard set with all flashcards
 */
export const deleteFlashcardSet = async (setId) => {
  try {
    console.log('🗑️ [Flashcard API] Deleting set:', setId);
    
    const response = await authenticatedFetch(`${API_URL}/flashcards/set/${setId}`, {
      method: 'DELETE'
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete flashcard set');
    }

    console.log('✅ [Flashcard API] Set deleted:', data);
    return data;
  } catch (error) {
    console.error('❌ [Flashcard API] Delete set error:', error);
    throw error;
  }
};

/**
 * Delete MCQ set with all questions
 */
export const deleteMCQSet = async (setId) => {
  try {
    console.log('🗑️ [MCQ API] Deleting set:', setId);
    
    const response = await authenticatedFetch(`${API_URL}/mcqs/set/${setId}`, {
      method: 'DELETE'
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete MCQ set');
    }

    console.log('✅ [MCQ API] Set deleted:', data);
    return data;
  } catch (error) {
    console.error('❌ [MCQ API] Delete set error:', error);
    throw error;
  }
};

/**
 * Update visual title
 * @param {string} visualId - Visual ID
 * @param {string} title - New title
 * @returns {Promise<Object>} Updated visual data
 */
export const updateVisualTitle = async (visualId, title) => {
  try {
    console.log('✏️ [Visual API] Updating title:', visualId, title);
    
    const response = await authenticatedFetch(`${API_URL}/visuals/${visualId}/title`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update visual title');
    }

    console.log('✅ [Visual API] Title updated:', data);
    return data;
  } catch (error) {
    console.error('❌ [Visual API] Update title error:', error);
    throw error;
  }
};

/**
 * Delete visual
 * @param {string} visualId - Visual ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteVisual = async (visualId) => {
  try {
    console.log('🗑️ [Visual API] Deleting visual:', visualId);
    
    const response = await authenticatedFetch(`${API_URL}/visuals/${visualId}`, {
      method: 'DELETE'
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete visual');
    }

    console.log('✅ [Visual API] Visual deleted:', data);
    return data;
  } catch (error) {
    console.error('❌ [Visual API] Delete visual error:', error);
    throw error;
  }
};

/**
 * Generate ALL study materials (MCQs, Flashcards, Visuals) in a single request
 * Backend runs all 3 in parallel — much faster than 3 separate calls
 */
export const generateAllMaterials = async (uploadId, { mcqCount = 10, flashcardCount = 10, visualCount = 1, difficulty = 'medium', subject = 'General' } = {}) => {
  try {
    console.log('\n🚀 [FRONTEND] Requesting parallel generation of ALL materials...');
    console.log('  Upload ID:', uploadId);

    const response = await authenticatedFetch(`${API_URL}/generate-all/${uploadId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mcqCount, flashcardCount, visualCount, difficulty, subject }),
    });

    const data = await response.json();

    if (!response.ok) {
      const err = createApiError(data, 'Failed to generate materials');
      err.statusCode = response.status;
      throw err;
    }

    console.log('✅ [FRONTEND] All materials generated in single request');
    return data;
  } catch (error) {
    console.error('❌ [FRONTEND] Generate all materials error:', error);
    throw error;
  }
};
