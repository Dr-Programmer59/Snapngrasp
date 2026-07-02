import { BACKEND_API_URL } from '../config/api';
import { getAccessToken } from './auth';

const API_URL = BACKEND_API_URL;

// Helper to get token with better error handling
const getAuthToken = async () => {
  try {
    const token = await getAccessToken();
    console.log('🔑 [Activity API] Token retrieved:', token ? `exists (${token.substring(0, 20)}...)` : 'missing');
    if (!token) {
      console.log('🔍 [Activity API] Token is null or undefined - user may not be logged in');
    }
    return token;
  } catch (error) {
    console.error('❌ [Activity API] Error getting token:', error);
    return null;
  }
};

/**
 * Get recent activity for dashboard
 */
export const getRecentActivity = async () => {
  try {
    console.log('\n🎯 [Activity API] ========== GET RECENT ACTIVITY ==========');
    const token = await getAuthToken();
    
    if (!token) {
      console.warn('⚠️ [Activity API] No token found, skipping activity fetch');
      console.log('🎯 [Activity API] ========== END (NO TOKEN) ==========\n');
      return { activities: [], hasData: false };
    }

    console.log('📡 [Activity API] API URL:', API_URL);
    console.log('📡 [Activity API] Full endpoint:', `${API_URL}/api/activity/recent`);
    console.log('📡 [Activity API] Token (first 20 chars):', token.substring(0, 20) + '...');

    const response = await fetch(`${API_URL}/api/activity/recent`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 [Activity API] Response status:', response.status);
    console.log('📡 [Activity API] Response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ [Activity API] Error response:', errorData);
      console.log('🎯 [Activity API] ========== END (ERROR) ==========\n');
      throw new Error(errorData.error || 'Failed to fetch recent activity');
    }

    const data = await response.json();
    console.log('✅ [Activity API] Recent activity fetched:', data.activities?.length || 0, 'items');
    console.log('✅ [Activity API] Has data:', data.hasData);
    if (data.activities && data.activities.length > 0) {
      console.log('✅ [Activity API] Activities:', data.activities.map(a => ({ type: a.type, title: a.title, percent: a.percent })));
    }
    console.log('🎯 [Activity API] ========== END (SUCCESS) ==========\n');
    return data;
  } catch (error) {
    console.error('❌ [Activity API] Error fetching recent activity:', error);
    console.error('❌ [Activity API] Error message:', error.message);
    console.log('🎯 [Activity API] ========== END (EXCEPTION) ==========\n');
    // Return empty data instead of throwing to prevent UI crashes
    return { activities: [], hasData: false };
  }
};

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async () => {
  try {
    console.log('\n📊 [Activity API] ========== GET DASHBOARD STATS ==========');
    const token = await getAuthToken();
    
    if (!token) {
      console.warn('⚠️ [Activity API] No token found, skipping stats fetch');
      console.log('📊 [Activity API] ========== END (NO TOKEN) ==========\n');
      return { flashcards: 0, streak: 0, accuracy: 0, quizzes: 0 };
    }

    console.log('📡 [Activity API] API URL:', API_URL);
    console.log('📡 [Activity API] Full endpoint:', `${API_URL}/api/activity/stats`);
    console.log('📡 [Activity API] Token (first 20 chars):', token.substring(0, 20) + '...');

    const response = await fetch(`${API_URL}/api/activity/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 [Activity API] Response status:', response.status);
    console.log('📡 [Activity API] Response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ [Activity API] Error response:', errorData);
      console.log('📊 [Activity API] ========== END (ERROR) ==========\n');
      throw new Error(errorData.error || 'Failed to fetch dashboard stats');
    }

    const data = await response.json();
    console.log('✅ [Activity API] Dashboard stats fetched:', data);
    console.log('📊 [Activity API] ========== END (SUCCESS) ==========\n');
    return data;
  } catch (error) {
    console.error('❌ [Activity API] Error fetching dashboard stats:', error);
    console.error('❌ [Activity API] Error message:', error.message);
    console.log('📊 [Activity API] ========== END (EXCEPTION) ==========\n');
    // Return default stats instead of throwing
    return { flashcards: 0, streak: 0, accuracy: 0, quizzes: 0 };
  }
};
