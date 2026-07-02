import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

export const wp = p => (width * p) / 100;
export const hp = p => (height * p) / 100;
