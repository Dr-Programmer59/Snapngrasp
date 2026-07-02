import React from 'react';
import { Text as RNText } from 'react-native';
import { defaultTextStyle } from '../theme/typography';

export default function Text({ style, ...props }) {
  return (
    <RNText 
      style={[defaultTextStyle, style]} 
      {...props}
    />
  );
}