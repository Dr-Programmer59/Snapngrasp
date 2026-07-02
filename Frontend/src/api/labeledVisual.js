import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.100.11:8080';

/**
 * Generate interactive labeled visual
 */
export const generateLabeledVisual = async (uploadId, subject, topic = null, count = 1) => {
  try {
    console.log('🎨 [API] Generating labeled visual...', { uploadId, subject, topic, count });

    // Get token
    let token;
    if (Platform.OS === 'web') {
      token = await AsyncStorage.getItem('access_token');
    } else {
      token = await SecureStore.getItemAsync('access_token');
    }

    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.post(
      `${API_URL}/api/labeled-visuals/generate/${uploadId}`,
      { subject, topic, count },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ [API] Labeled visual generated:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [API] Failed to generate labeled visual:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get labeled visuals for an upload
 */
export const getLabeledVisuals = async (uploadId) => {
  try {
    console.log('📊 [API] Fetching labeled visuals for upload:', uploadId);

    let token;
    if (Platform.OS === 'web') {
      token = await AsyncStorage.getItem('access_token');
    } else {
      token = await SecureStore.getItemAsync('access_token');
    }

    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(
      `${API_URL}/api/visuals/upload/${uploadId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          visual_type: 'labeled_diagram',
        },
      }
    );

    console.log('✅ [API] Labeled visuals fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [API] Failed to fetch labeled visuals:', error.response?.data || error.message);
    throw error;
  }
};
