import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';

// Try to import Google Sign-In, but it may not be available in Expo Go
let GoogleSignin;
let statusCodes;
try {
  const googleSigninModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSigninModule.GoogleSignin;
  statusCodes = googleSigninModule.statusCodes;
} catch (e) {
  console.warn('Google Sign-In module not available');
}

const GoogleSignInButton = ({ onSuccess, onError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    // Check if credentials are configured
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    
    // Don't configure if credentials not set yet
    if (!webClientId || webClientId.trim() === '') {
      console.log('[Google Sign-In] Credentials not configured yet - button will be hidden');
      setIsAvailable(false);
      return;
    }

    // Only configure if the module is available
    if (GoogleSignin) {
      try {
        GoogleSignin.configure({
          webClientId: webClientId,
          offlineAccess: true, // If you need to access Google APIs on behalf of the user
          hostedDomain: '', // Optional: restrict to specific domain
          forceCodeForRefreshToken: true, // For refresh token
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, // Optional: iOS-specific client ID
        });
        setIsAvailable(true);
        console.log('[Google Sign-In] Configured successfully');
      } catch (error) {
        console.warn('[Google Sign-In] Failed to configure:', error);
        setIsAvailable(false);
      }
    }
  }, []);

  // Don't render if module not available or credentials not configured
  if (!GoogleSignin || !isAvailable) {
    return null;
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);

      // Check if Google Play Services are available (Android only)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      // Sign in and get user info
      const userInfo = await GoogleSignin.signIn();
      
      // Get the ID token
      const idToken = userInfo.idToken;

      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      console.log('[Google Sign-In] ID Token received, sending to backend...');

      // Send the ID token to your backend
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api.snapngrasp.com';
      const response = await axios.post(
        `${apiUrl}/api/auth/google/callback`,
        {
          id_token: idToken,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const { access_token, refresh_token, user } = response.data;

      console.log('[Google Sign-In] Authentication successful:', user);

      // Store tokens securely
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem('access_token', access_token);
        await AsyncStorage.setItem('refresh_token', refresh_token);
      } else {
        await SecureStore.setItemAsync('access_token', access_token);
        await SecureStore.setItemAsync('refresh_token', refresh_token);
      }

      // Call the success callback
      if (onSuccess) {
        onSuccess(user);
      }

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('[Google Sign-In] Error:', error);

      // Handle specific error codes
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('[Google Sign-In] User cancelled the sign-in');
        // Don't show an alert for cancellation
        return;
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Sign-In In Progress', 'A sign-in operation is already in progress.');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Google Play Services', 'Google Play Services are not available on this device.');
      } else {
        const errorMessage = error.response?.data?.error || error.message || 'An unknown error occurred';
        Alert.alert('Google Sign-In Failed', errorMessage);
      }

      if (onError) {
        onError(error);
      }
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleGoogleSignIn}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Icon name="google" size={20} color="#fff" style={styles.icon} />
          <Text style={styles.buttonText}>Sign in with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DB4437', // Google red
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 8,
    width: '100%',
  },
  icon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GoogleSignInButton;
