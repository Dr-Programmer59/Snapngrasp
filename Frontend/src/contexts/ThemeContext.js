import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'react-native';
import * as Sentry from '@sentry/react-native';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Safe AsyncStorage wrapper with error handling
const safeAsyncStorage = {
  async getItem(key) {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`❌ AsyncStorage.getItem failed for ${key}:`, error);
      if (typeof Sentry !== 'undefined' && Sentry.captureException) {
        Sentry.captureException(error);
      }
      return null;
    }
  },
  async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`❌ AsyncStorage.setItem failed for ${key}:`, error);
      if (typeof Sentry !== 'undefined' && Sentry.captureException) {
        Sentry.captureException(error);
      }
    }
  }
};

const lightTheme = {
  isDark: false,
  colors: {
    // Backgrounds
    primaryBackground: '#F5F7FA', // Light gray background
    secondaryBackground: '#FFFFFF', // White cards
    headerBackground: '#191B2F', // Dark header background
    containerBackground: '#191B2F', // Dark for top sections

    // Text
    primaryText: '#1F2937', // Dark gray text
    secondaryText: '#4B5563', // Medium gray text
    headerText: '#FFFFFF', // White header text
    placeholderText: '#9CA3AF', // Light gray placeholders

    // Borders and dividers
    border: '#E5E7EB', // Light border
    divider: '#E5E7EB', // Light divider

    // Interactive elements
    primaryButton: '#6C4CFD', // Purple button
    primaryButtonText: '#FFFFFF', // White button text
    secondaryButton: '#F9FAFB', // Light gray secondary button
    accent: '#6C4CFD', // Purple accent

    // StatusBar
    statusBarStyle: 'light-content',
    statusBarBackground: '#191B2F',

    // Icons and special elements
    iconBackground: '#F9FAFB', // Light icon background
    selectedItem: '#EDE9FE', // Light purple selected
    selectedBorder: '#6C4CFD', // Purple border for selected
    checkmarkBackground: '#6C4CFD', // Purple checkmark
    checkmarkText: '#FFFFFF', // White checkmark text

    // Loading and error
    loadingIndicator: '#6C4CFD', // Purple loading
    errorText: '#EF4444', // Red error text
    successText: '#10B981', // Green success text
  },
};

const darkTheme = {
  isDark: true,
  colors: {
    // Backgrounds
    primaryBackground: '#0C1421', // Darkest background
    secondaryBackground: '#191B2F', // Cards background
    headerBackground: '#382F74', // Purple header background
    containerBackground: '#191B2F', // Dark for top sections

    // Text
    primaryText: '#FFFFFF', // White text
    secondaryText: '#9CA3AF', // Gray text
    headerText: '#FFFFFF', // White header text
    placeholderText: '#6B7280', // Dark gray placeholders

    // Borders and dividers
    border: '#252b3d', // Dark border
    divider: '#252b3d', // Dark divider

    // Interactive elements
    primaryButton: '#6C4CFD', // Purple button (same for both themes)
    primaryButtonText: '#FFFFFF', // White button text
    secondaryButton: '#252b3d', // Dark secondary button
    accent: '#8B7FD9', // Light purple accent

    // StatusBar
    statusBarStyle: 'light-content',
    statusBarBackground: '#0C1421',

    // Icons and special elements
    iconBackground: '#252b3d', // Dark icon background
    selectedItem: '#252b3d', // Dark selected
    selectedBorder: '#8B7FD9', // Purple border for selected
    checkmarkBackground: '#8B7FD9', // Purple checkmark
    checkmarkText: '#FFFFFF', // White checkmark text

    // Loading and error
    loadingIndicator: '#8B7FD9', // Purple loading
    errorText: '#EF4444', // Red error text
    successText: '#10B981', // Green success text
  },
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from AsyncStorage on app start
  useEffect(() => {
    const loadTheme = async () => {
      try {
        console.log('📱 Loading theme from storage...');
        const storedTheme = await safeAsyncStorage.getItem('theme');
        if (storedTheme !== null) {
          console.log('✅ Theme loaded:', storedTheme);
          setIsDarkMode(JSON.parse(storedTheme));
        } else {
          console.log('ℹ️ No saved theme, using default');
        }
      } catch (error) {
        console.error('❌ Error loading theme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Delay theme load to avoid blocking startup
    const timer = setTimeout(loadTheme, 150);
    return () => clearTimeout(timer);
  }, []);

  // Save theme to AsyncStorage whenever it changes
  const toggleTheme = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    try {
      await safeAsyncStorage.setItem('theme', JSON.stringify(newTheme));
      console.log('💾 Theme saved:', newTheme);
    } catch (error) {
      console.error('❌ Error saving theme:', error);
    }
  };

  // Update StatusBar when theme changes
  useEffect(() => {
    const theme = isDarkMode ? darkTheme : lightTheme;
    StatusBar.setBarStyle(theme.colors.statusBarStyle);
    StatusBar.setBackgroundColor(theme.colors.statusBarBackground);
  }, [isDarkMode]);

  const theme = isDarkMode ? darkTheme : lightTheme;

  const value = {
    isDarkMode,
    theme,
    toggleTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
