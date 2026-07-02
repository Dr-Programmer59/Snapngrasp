// src/components/LeftChatBubble.js
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const MASCOT_AVATAR = require('../assets/logo.png');

const LeftChatBubble = ({ message }) => {
  const { theme } = useTheme();
  const [displayedText, setDisplayedText] = useState('');

  // 👇 you can centralize bubble color here
  const bubbleColor = theme.isDark ? '#191B2F' : '#FFFFFF';
  const textColor = theme.isDark ? '#FFFFFF' : '#111827';

  // Typing effect for smooth message display
  useEffect(() => {
    if (message) {
      setDisplayedText('');
      let index = 0;
      const interval = setInterval(() => {
        setDisplayedText(prev => {
          if (index < message.length) {
            return prev + message[index++];
          } else {
            clearInterval(interval);
            return prev;
          }
        });
      }, 25);
      return () => clearInterval(interval);
    }
  }, [message]);

  return (
    <View style={styles.container}>
      {/* 🧸 Mascot Avatar */}
      <View style={styles.avatarContainer}>
        <Image
          source={MASCOT_AVATAR}
          style={styles.avatar}
          resizeMode="contain"
        />
      </View>

      {/* 💬 Chat Bubble (pure code, no image) */}
      <View style={styles.bubbleWrapper}>
        <View style={[styles.bubbleBox, { backgroundColor: bubbleColor }]}>
          <Text style={[styles.messageText, { color: textColor }]}>
            {displayedText}
          </Text>
        </View>

        {/* Tail */}
        <View
          style={[
            styles.bubbleTail,
            {
              backgroundColor: bubbleColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    marginVertical: 8,
  },
  avatarContainer: {
    marginRight: 6,
    zIndex: 2,
  },
  avatar: {
    width: 68,
    height: 68,
  },

  // wrapper so tail can be absolutely positioned relative to bubble
  bubbleWrapper: {
    maxWidth: '78%',
    position: 'relative',
    marginBottom: 34, // roughly center of mascot (68 / 2)
  },

  // main rounded rectangle
  bubbleBox: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
  },

  // little circular tail on bottom-left (like your PNG)
  bubbleTail: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    left: -4,   // nudges outside the bubble
    bottom: 4,  // attach to lower edge
  },

  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Poppins',
  },
});

export default LeftChatBubble;
