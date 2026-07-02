import { BACKEND_API_URL } from '../config/api';
import { getAccessToken } from './auth';

const API_URL = BACKEND_API_URL;

// Helper to get auth headers
const getAuthHeaders = async () => {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

/**
 * Get all favorites for the current user
 */
export const getFavorites = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/favorites`, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Error fetching favorites:', error);
    throw error;
  }
};

/**
 * Add an activity to favorites
 */
export const addFavorite = async (activityType, activityId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/favorites`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        activity_type: activityType,
        activity_id: activityId,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Error adding favorite:', error);
    throw error;
  }
};

/**
 * Remove an activity from favorites
 */
export const removeFavorite = async (activityType, activityId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/favorites`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({
        activity_type: activityType,
        activity_id: activityId,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Error removing favorite:', error);
    throw error;
  }
};

/**
 * Check if an activity is favorited
 */
export const checkFavorite = async (activityType, activityId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/favorites/check?activity_type=${activityType}&activity_id=${activityId}`, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Error checking favorite:', error);
    throw error;
  }
};
