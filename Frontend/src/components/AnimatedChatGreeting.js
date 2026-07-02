import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Easing } from 'react-native';
import ChatIconButton from './ChatIconButton';

const AnimatedChatGreeting = ({ 
  message = "Hey! Ready to learn something new today? 🎯",
  visible = false,
  onClose,
  autoHideDuration = 5000,
  iconSize = 60,
  theme = 'light'
}) => {
  const [showBubble, setShowBubble] = useState(false);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const iconBounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Step 1: Bounce the icon
      Animated.sequence([
        Animated.timing(iconBounceAnim, {
          toValue: 1.2,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(iconBounceAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Step 2: Show bubble with animation
        setShowBubble(true);
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });

      // Auto hide after duration
      if (autoHideDuration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoHideDuration);
        return () => clearTimeout(timer);
      }
    } else {
      // Reset animations when not visible
      setShowBubble(false);
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
      iconBounceAnim.setValue(1);
    }
  }, [visible]);

  const handleClose = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowBubble(false);
      if (onClose) onClose();
    });
  };

  const isDark = theme === 'dark';
  const bubbleStyle = isDark ? styles.bubbleDark : styles.bubbleLight;
  const textStyle = isDark ? styles.textDark : styles.textLight;

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Chat Icon with bounce animation */}
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: iconBounceAnim }],
          },
        ]}
      >
        <ChatIconButton size={iconSize} />
      </Animated.View>

      {/* Message Bubble */}
      {showBubble && (
        <Animated.View
          style={[
            styles.bubbleContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim },
              ],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleClose}
            style={[styles.bubble, bubbleStyle]}
          >
            {/* Triangle pointer */}
            <View style={[styles.triangle, isDark ? styles.triangleDark : styles.triangleLight]} />
            
            {/* Message text */}
            <Text style={[styles.messageText, textStyle]}>
              {message}
            </Text>
            
            {/* Close hint */}
            <Text style={styles.closeHint}>Tap to dismiss</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'flex-end',
    zIndex: 1000,
  },
  iconContainer: {
    marginBottom: 10,
  },
  bubbleContainer: {
    position: 'absolute',
    bottom: 100,
    right: 0,
    width: 320,
    maxWidth: 320,
  },
  bubble: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    minHeight: 70,
  },
  bubbleLight: {
    backgroundColor: '#FFFFFF',
  },
  bubbleDark: {
    backgroundColor: '#2C2C2E',
  },
  triangle: {
    position: 'absolute',
    bottom: -8,
    right: 30,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  triangleLight: {
    borderTopColor: '#FFFFFF',
  },
  triangleDark: {
    borderTopColor: '#2C2C2E',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    flexWrap: 'wrap',
  },
  textLight: {
    color: '#1C1C1E',
  },
  textDark: {
    color: '#FFFFFF',
  },
  closeHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default AnimatedChatGreeting;
