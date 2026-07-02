import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { refreshAccessToken } from './auth';

const storage = {
  async getItem(key) {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(key);
    }

    return await SecureStore.getItemAsync(key);
  },
};

const getValidToken = async () => {
  let token = await storage.getItem('access_token');

  if (!token) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      token = refreshed.access_token;
    }
  }

  return token;
};

export const authenticatedFetch = async (url, options = {}) => {
  let token = await getValidToken();
  const response = await fetch(url, {
    ...options,
    cache: options.cache || 'no-store',
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      token = refreshed.access_token;
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  return response;
};
