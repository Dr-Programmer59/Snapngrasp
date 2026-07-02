import React from 'react';
import { Image } from 'react-native';

// Icon components that accept size and color props
export const GroupIcon = ({ size = 24, color = '#000' }) => (
  <Image 
    source={require('../assets/icons/group.png')} 
    style={{ width: size, height: size, tintColor: color }} 
  />
);

export const BookIcon = ({ size = 24, color = '#000' }) => (
  <Image 
    source={require('../assets/icons/book.png')} 
    style={{ width: size, height: size, tintColor: color }} 
  />
);

export const AddSquareIcon = ({ size = 24, color = '#000' }) => (
  <Image 
    source={require('../assets/icons/add-square.png')} 
    style={{ width: size, height: size, tintColor: color }} 
  />
);

export const MessageIcon = ({ size = 24, color = '#000' }) => (
  <Image 
    source={require('../assets/icons/message.png')} 
    style={{ width: size, height: size, tintColor: color }} 
  />
);

export const UserIcon = ({ size = 24, color = '#000' }) => (
  <Image 
    source={require('../assets/icons/user.png')} 
    style={{ width: size, height: size, tintColor: color }} 
  />
);

export const SoundIcon = ({ size = 24, color = '#000' }) => (
  <Image 
    source={require('../assets/icons/sound.png')} 
    style={{ width: size, height: size, tintColor: color }} 
  />
);

export const SendIcon = ({ size = 24, color = '#000' }) => (
  <Image 
    source={require('../assets/icons/send.png')} 
    style={{ width: size, height: size, tintColor: color }} 
  />
);
