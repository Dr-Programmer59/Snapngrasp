import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_API_URL } from '../config/api';

// Backend API base URL is now imported from config
// Update src/config/api.js to match your development environment

/**
 * Platform-specific storage wrapper
 * Web doesn't support SecureStore, so we use AsyncStorage
 */
const storage = {
  async setItem(key, value) {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  
  async getItem(key) {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },
  
  async removeItem(key) {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

/**
 * Save access and refresh tokens to secure storage
 */
async function saveTokens({ access_token, refresh_token }) {
  try {
    console.log('💾 Saving tokens to storage...');
    if (access_token) {
      await storage.setItem('access_token', access_token);
      console.log('✅ Access token saved');
    }
    if (refresh_token) {
      await storage.setItem('refresh_token', refresh_token);
      console.log('✅ Refresh token saved');
    }
  } catch (error) {
    console.error('❌ Error saving tokens:', error);
    throw error;
  }
}

/**
 * Get access token from secure storage
 */
export async function getAccessToken() {
  try {
    return await storage.getItem('access_token');
  } catch (error) {
    console.error('❌ Error getting access token:', error);
    return null;
  }
}

/**
 * Get refresh token from secure storage
 */
export async function getRefreshToken() {
  try {
    return await storage.getItem('refresh_token');
  } catch (error) {
    console.error('❌ Error getting refresh token:', error);
    return null;
  }
}

/**
 * Email login - POST /api/auth/email/login
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<object>} { access_token, refresh_token, user }
 */
export async function loginAPI(email, password) {
  try {
    console.log('🔐 Attempting login...');
    console.log('📧 Email:', email);
    console.log('📱 Platform:', Platform.OS);
    console.log('🌐 API URL:', `${BACKEND_API_URL}/api/auth/email/login`);
    
    const response = await fetch(`${BACKEND_API_URL}/api/auth/email/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('📡 Response status:', response.status);
    const body = await response.json();
    console.log('📦 Response body:', body);

    if (!response.ok) {
      throw new Error(body?.message || 'Login failed');
    }

    // Save tokens to secure storage
    await saveTokens({
      access_token: body.data.access_token,
      refresh_token: body.data.refresh_token,
    });

    // Save user data to AsyncStorage (for feedbacks and other features)
    if (body.data.user) {
      await AsyncStorage.setItem('user', JSON.stringify(body.data.user));
      console.log('✅ User data saved');
    }

    console.log('✅ Login successful!');
    return body.data;
  } catch (error) {
    console.error('❌ Login API error:', error);
    console.error('❌ Error details:', error.message);
    if (error.message.includes('Network request failed')) {
      console.error('❌ NETWORK ERROR: Cannot reach backend server');
      console.error('💡 Make sure:');
      console.error('   1. Backend is running on port 8080');
      console.error('   2. Both devices are on same WiFi network');
      console.error('   3. Windows Firewall allows port 8080');
      console.error('   4. Backend URL is:', BACKEND_API_URL);
    }
    throw error;
  }
}

/**
 * Email signup - POST /api/auth/email/signup
 * @param {string} email 
 * @param {string} password 
 * @param {string} display_name 
 * @returns {Promise<object>} { user_id, email }
 */
export async function signupAPI(email, password, display_name) {
  try {
    console.log('📝 Attempting signup...');
    console.log('📧 Email:', email);
    console.log('👤 Display name:', display_name);
    console.log('📱 Platform:', Platform.OS);
    console.log('🌐 API URL:', `${BACKEND_API_URL}/api/auth/email/signup`);
    
    const response = await fetch(`${BACKEND_API_URL}/api/auth/email/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, display_name }),
    });

    console.log('📡 Response status:', response.status);
    const body = await response.json();
    console.log('📦 Response body:', body);

    if (!response.ok) {
      throw new Error(body?.message || 'Signup failed');
    }

    console.log('✅ Signup successful!');
    return body.data;
  } catch (error) {
    console.error('❌ Signup API error:', error);
    console.error('❌ Error details:', error.message);
    if (error.message.includes('Network request failed')) {
      console.error('❌ NETWORK ERROR: Cannot reach backend server');
      console.error('💡 Make sure:');
      console.error('   1. Backend is running on port 8080');
      console.error('   2. Both devices are on same WiFi network (192.168.100.x)');
      console.error('   3. Windows Firewall allows port 8080');
      console.error('   4. Backend URL is:', BACKEND_API_URL);
    }
    throw error;
  }
}

/**
 * Validate token and get user profile - GET /api/auth/validate
 * @returns {Promise<object|null>} User profile or null if invalid
 */
export async function validateToken() {
  try {
    const token = await getAccessToken();
    
    if (!token) {
      return null;
    }

    const response = await fetch(`${BACKEND_API_URL}/api/auth/validate`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const body = await response.json();
    return body.data;
  } catch (error) {
    console.error('Validate token error:', error);
    return null;
  }
}

/**
 * Logout - clear local tokens
 * Also calls backend logout endpoint
 */
export async function logoutAPI() {
  try {
    console.log('🚪 Logging out...');
    // Call backend logout endpoint
    const token = await getAccessToken();
    if (token) {
      await fetch(`${BACKEND_API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }

    // Clear local tokens
    await storage.removeItem('access_token');
    await storage.removeItem('refresh_token');
    await AsyncStorage.removeItem('user');
    console.log('✅ Logged out successfully');
  } catch (error) {
    console.error('❌ Logout error:', error);
    // Still clear tokens even if backend call fails
    await storage.removeItem('access_token');
    await storage.removeItem('refresh_token');
    await AsyncStorage.removeItem('user');
  }
}

/**
 * Delete account permanently - POST /api/auth/delete-account
 * This will delete the user account and all associated data from the database
 * @returns {Promise<object>} { status, message }
 */
export async function deleteAccountAPI() {
  try {
    console.log('🗑️ Requesting account deletion...');
    const token = await getAccessToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/auth/delete-account`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body?.message || 'Failed to delete account');
    }

    // Clear local tokens after successful deletion
    await storage.removeItem('access_token');
    await storage.removeItem('refresh_token');
    await AsyncStorage.removeItem('user');
    console.log('✅ Account deleted successfully');

    return body.data || { status: 'success', message: 'Account deleted' };
  } catch (error) {
    console.error('❌ Account deletion error:', error);
    throw error;
  }
}

/**
 * Refresh access token using refresh token - POST /api/auth/refresh
 * @returns {Promise<object|null>} New tokens or null if refresh failed
 */
export async function refreshAccessToken() {
  try {
    const refresh_token = await getRefreshToken();
    
    if (!refresh_token) {
      return null;
    }

    const response = await fetch(`${BACKEND_API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token }),
    });

    if (!response.ok) {
      return null;
    }

    const body = await response.json();
    
    // Save new tokens
    await saveTokens({
      access_token: body.data.access_token,
      refresh_token: body.data.refresh_token,
    });

    return body.data;
  } catch (error) {
    console.error('Refresh token error:', error);
    return null;
  }
}

/**
 * Get OAuth URL for social login - GET /api/auth/oauth/url
 * @param {string} provider - 'google' or 'apple'
 * @param {string} redirect_to - Optional redirect URL
 * @returns {Promise<object>} { url, provider }
 */
export async function getOAuthUrl(provider, redirect_to) {
  try {
    const params = new URLSearchParams({ provider });
    if (redirect_to) {
      params.append('redirect_to', redirect_to);
    }

    const response = await fetch(`${BACKEND_API_URL}/api/auth/oauth/url?${params}`, {
      method: 'GET',
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body?.message || 'Failed to get OAuth URL');
    }

    return body.data;
  } catch (error) {
    console.error('OAuth URL error:', error);
    throw error;
  }
}

/**
 * Check if user is authenticated (has valid token)
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  const userData = await validateToken();
  return userData !== null;
}
