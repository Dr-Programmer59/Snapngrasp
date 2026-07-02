import React from 'react';
import { View, StyleSheet, Platform, Alert, Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_API_URL } from '../config/api';

// Only import Apple Authentication on iOS to avoid Android resolution errors
let AppleAuthentication = null;
if (Platform.OS === 'ios') {
  try {
    AppleAuthentication = require('@invertase/react-native-apple-authentication').default;
  } catch (e) {
    console.warn('Apple Authentication module not available');
  }
}

const AppleSignInButton = ({ onSuccess, onError }) => {
  // Only show on iOS with native module available
  if (Platform.OS !== 'ios' || !AppleAuthentication) {
    return null;
  }

  const handleAppleSignIn = async () => {
    try {
      console.log('🍎 Starting Apple Sign-In...');

      // Perform Apple Sign-In
      const appleAuthRequestResponse = await AppleAuthentication.performRequest({
        requestedOperation: AppleAuthentication.Operation.LOGIN,
        requestedScopes: [
          AppleAuthentication.Scope.EMAIL,
          AppleAuthentication.Scope.FULL_NAME,
        ],
      });

      console.log('✅ Apple Sign-In response received');

      const { identityToken, authorizationCode, user } = appleAuthRequestResponse;

      if (!identityToken || !authorizationCode) {
        throw new Error('No identity token or authorization code received from Apple');
      }

      // Send to backend for verification
      console.log('📤 Sending to backend...');
      const response = await fetch(`${BACKEND_API_URL}/api/auth/apple/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: authorizationCode,
          id_token: identityToken,
          user: user ? {
            name: {
              firstName: user.givenName,
              lastName: user.familyName,
            },
            email: user.email,
          } : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Apple Sign-In failed');
      }

      console.log('✅ Backend authentication successful');

      // Store tokens
      const { access_token, refresh_token, user: userData } = data.data;

      if (Platform.OS === 'web') {
        await AsyncStorage.setItem('access_token', access_token);
        await AsyncStorage.setItem('refresh_token', refresh_token);
      } else {
        await SecureStore.setItemAsync('access_token', access_token);
        await SecureStore.setItemAsync('refresh_token', refresh_token);
      }

      console.log('✅ Tokens stored successfully');

      // Call success callback
      onSuccess(userData);

    } catch (error) {
      console.error('❌ Apple Sign-In error:', error);

      if (error.code === 'ERR_CANCELED') {
        // User cancelled the sign-in
        console.log('User cancelled Apple Sign-In');
        return;
      }

      Alert.alert(
        'Sign-In Failed',
        error.message || 'Unable to sign in with Apple. Please try again.'
      );

      if (onError) {
        onError(error);
      }
    }
  };

  return (
    <View style={styles.container}>
      {AppleAuthentication && AppleAuthentication.AppleAuthenticationButton ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.ButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.ButtonStyle.BLACK}
          cornerRadius={12}
          style={styles.button}
          onPress={handleAppleSignIn}
        />
      ) : (
        <Text style={styles.unavailableText}>Apple Sign-In requires native build</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  button: {
    width: '100%',
    height: 50,
  },
  unavailableText: {
    color: '#888',
    textAlign: 'center',
    fontSize: 12,
    padding: 10,
  },
});

export default AppleSignInButton;
