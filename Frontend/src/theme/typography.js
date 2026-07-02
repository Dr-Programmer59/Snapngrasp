import { StyleSheet } from 'react-native';

// Default text styles with Poppins
export const defaultTextStyle = {
  fontFamily: 'Poppins',
};

// Helper to apply Poppins to any style object
export const withPoppins = (style = {}) => ({
  ...defaultTextStyle,
  ...style,
});

// Predefined text styles
export const typography = StyleSheet.create({
  h1: {
    ...defaultTextStyle,
    fontSize: 24,
    fontWeight: '700',
  },
  h2: {
    ...defaultTextStyle,
    fontSize: 20,
    fontWeight: '600',
  },
  h3: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
  },
  body: {
    ...defaultTextStyle,
    fontSize: 16,
  },
  bodySmall: {
    ...defaultTextStyle,
    fontSize: 14,
  },
  caption: {
    ...defaultTextStyle,
    fontSize: 12,
  },
  button: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
  },
});