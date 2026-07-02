import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ElevenLabsProvider } from "@elevenlabs/react-native";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import AppNavigator from "./src/navigation/AppNavigator";
import SplashScreen from "./src/screens/SplashScreen";
import { ThemeProvider, useTheme } from "./src/contexts/ThemeContext";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import * as SplashScreenExpo from "expo-splash-screen";
import * as Sentry from '@sentry/react-native';
import { configureRevenueCat } from './src/api/revenuecat';

// Log app startup
console.log('🚀 App starting...');
console.log('📱 Environment:', __DEV__ ? 'Development' : 'Production');

// Initialize Sentry with error handling to prevent crashes
try {
  Sentry.init({
    dsn: 'https://cad9a222c70f964b46c507305afe818e@o4510662827573248.ingest.us.sentry.io/4510662833602560',

    // Adds more context data to events (IP address, cookies, user, etc.)
    sendDefaultPii: true,

    // Enable Logs
    enableLogs: true,

    // Configure Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
    integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

    // Disable in dev to avoid conflicts
    enabled: !__DEV__,
  });
  console.log('✅ Sentry initialized');
} catch (error) {
  console.error('❌ Sentry initialization failed:', error);
  // Don't crash the app if Sentry fails
}

export default Sentry.wrap(function App() {
  const [showSplash, setShowSplash] = useState(true);

  // Skip font loading - use system fonts for now
  const fontsLoaded = true; // Bypass font loading completely

  // Keep native splash until fonts are ready
  useEffect(() => {
    async function prepare() {
      try {
        console.log('🎨 Preparing splash screen...');
        await SplashScreenExpo.preventAutoHideAsync();
        console.log('✅ Splash screen prepared');
      } catch (e) {
        console.error('❌ Splash screen error:', e);
        Sentry.captureException(e);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    console.log('📝 Fonts loaded:', fontsLoaded);
    const timer = setTimeout(() => {
      if (fontsLoaded) {
        console.log('✅ Hiding splash screen...');
        setShowSplash(false);
        SplashScreenExpo.hideAsync().catch((e) => {
          console.error('❌ Error hiding splash:', e);
        });
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ElevenLabsWrapper>
          <AuthProvider>
            <ThemeProvider>
              <AppContent />
            </ThemeProvider>
          </AuthProvider>
        </ElevenLabsWrapper>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
});

// Separate wrapper to catch ElevenLabs initialization errors
function ElevenLabsWrapper({ children }) {
  const [elevenLabsError, setElevenLabsError] = useState(null);

  useEffect(() => {
    // Validate environment before initializing ElevenLabs
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
    if (!apiUrl && !__DEV__) {
      const error = 'ElevenLabs: Missing EXPO_PUBLIC_API_URL or EXPO_PUBLIC_BACKEND_URL';
      console.error('❌', error);
      setElevenLabsError(error);
      if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
        Sentry.captureMessage(error, 'error');
      }
    }
  }, []);

  if (elevenLabsError) {
    console.warn('⚠️ ElevenLabs disabled due to configuration error:', elevenLabsError);
    // Return children without ElevenLabsProvider if there's an error
    return <>{children}</>;
  }

  try {
    return <ElevenLabsProvider>{children}</ElevenLabsProvider>;
  } catch (error) {
    console.error('❌ ElevenLabsProvider initialization failed:', error);
    if (typeof Sentry !== 'undefined' && Sentry.captureException) {
      Sentry.captureException(error);
    }
    // Return children without provider if initialization fails
    return <>{children}</>;
  }
}

function AppContent() {
  const { theme } = useTheme();
  const { isLoggedIn, userId, setIsLoggedIn, authChecked } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    configureRevenueCat(userId || null).catch((error) => {
      console.error('❌ RevenueCat initialization failed:', error?.message || error);
    });
  }, [userId]);

  const linking = {
    prefixes: ['snapngrasp://'],
    config: {
      screens: {
        SubscriptionSuccess: 'subscription-success',
        SubscriptionCancel: 'subscription-cancel',
      },
    },
  };

  console.log('🔐 Auth checked:', authChecked, 'Logged in:', isLoggedIn);

  if (!authChecked) {
    console.log('⏳ Waiting for auth check...');
    return <SplashScreen />;
  }

  console.log('✅ Rendering app content...');

  const navTheme = {
    dark: theme.isDark,
    colors: {
      // this is the global app background (behind everything)
      background: theme.colors.primaryBackground,

      // keep primary + notification from your theme
      primary: theme.colors.accent,
      notification: theme.colors.accent,

      // make nav "cards" transparent so your own screens
      // and bottom nav shapes control what you see
      card: "transparent",
      border: "transparent",

      // text color
      text: theme.colors.primaryText,
    },
    fonts: {
      regular: {
        fontFamily: 'System',
        fontWeight: '400',
      },
      medium: {
        fontFamily: 'System',
        fontWeight: '500',
      },
      bold: {
        fontFamily: 'System',
        fontWeight: '700',
      },
      heavy: {
        fontFamily: 'System',
        fontWeight: '900',
      },
    },
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme} linking={linking}>
        <AppNavigator isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}