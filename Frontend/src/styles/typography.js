// Common typography styles with Poppins font family
export const typography = {
  h1: {
    fontFamily: 'Poppins',
    fontSize: 24,
    fontWeight: '700',
  },
  h2: {
    fontFamily: 'Poppins',
    fontSize: 20,
    fontWeight: '600',
  },
  h3: {
    fontFamily: 'Poppins',
    fontSize: 18,
    fontWeight: '600',
  },
  body: {
    fontFamily: 'Poppins',
    fontSize: 16,
    fontWeight: '400',
  },
  bodySmall: {
    fontFamily: 'Poppins',
    fontSize: 14,
    fontWeight: '400',
  },
  caption: {
    fontFamily: 'Poppins',
    fontSize: 12,
    fontWeight: '400',
  },
  button: {
    fontFamily: 'Poppins',
    fontSize: 16,
    fontWeight: '600',
  },
};

// Helper to add Poppins to any text style
export const withPoppins = (style = {}) => ({
  fontFamily: 'Poppins',
  ...style,
});