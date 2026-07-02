/**
 * API Configuration
 * 
 * Update .env file with EXPO_PUBLIC_API_URL to change the backend URL
 * 
 * iOS Simulator:
 *   - Use: http://localhost:8080
 * 
 * Android Emulator:
 *   - Use: http://10.0.2.2:8080
 *   - 10.0.2.2 is a special alias to your host loopback interface (127.0.0.1)
 * 
 * Physical Device (on same network):
 *   - Find your machine's LAN IP address:
 *     Windows: ipconfig (look for IPv4 Address)
 *     Mac/Linux: ifconfig (look for inet address)
 *   - Use: http://192.168.x.x:8080 (replace with your actual IP)
 *   - Ensure your firewall allows connections on port 8080
 * 
 * Production:
 *   - Use your production API URL with HTTPS
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Log startup config
console.log('📡 API Config initializing...');
console.log('📱 Platform:', Platform.OS);
console.log('🔧 __DEV__:', __DEV__);

// Get API URL from environment variable with safe fallback
const ENV_API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL;

console.log('🌐 ENV_API_URL:', ENV_API_URL);
console.log('🔑 Constants.expoConfig?.extra:', Constants.expoConfig?.extra);

// Validate environment variable in production
if (!__DEV__ && !ENV_API_URL) {
  const error = '❌ CRITICAL: EXPO_PUBLIC_API_URL is not set in production build!';
  console.error(error);
  console.error('This will cause the app to crash. Please check your EAS environment variables.');
  console.error('Expected: EXPO_PUBLIC_API_URL in EAS environment variables');
  console.error('Make sure environment variable visibility is set correctly in expo.dev');
  // Don't throw error, just log to Sentry if available
  try {
    if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
      Sentry.captureMessage(error, 'error');
    }
  } catch (e) {
    console.error('Failed to log to Sentry:', e);
  }
}

// Development configuration (fallback if .env not set)
const DEV_CONFIG = {
  // iOS uses localhost
  ios: ENV_API_URL || 'https://api.snapngrasp.com',
  
  // Android: Use environment variable or fallback
  android: ENV_API_URL || 'https://api.snapngrasp.com',
  
  // For web/other platforms
  web: ENV_API_URL || 'https://api.snapngrasp.com',
};

// Production configuration - ENV_API_URL MUST be set
const PROD_CONFIG = {
  ios: ENV_API_URL || 'https://api.snapngrasp.com',
  android: ENV_API_URL || 'https://api.snapngrasp.com',
  web: ENV_API_URL || 'https://api.snapngrasp.com',
};

// Select config based on environment
const config = __DEV__ ? DEV_CONFIG : PROD_CONFIG;

// Export the appropriate URL for the current platform
export const BACKEND_API_URL = config[Platform.OS] || config.ios;

export default {
  BACKEND_API_URL,
};
