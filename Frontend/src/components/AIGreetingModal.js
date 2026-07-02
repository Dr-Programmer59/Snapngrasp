import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getAIGreeting, getUserStreak } from '../api/progressApi';

const { width } = Dimensions.get('window');

const AIGreetingModal = ({ visible, onClose, theme }) => {
  const [greeting, setGreeting] = useState(null);
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    if (visible) {
      loadGreeting();
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible]);

  const loadGreeting = async () => {
    try {
      setLoading(true);
      const [greetingData, streakData] = await Promise.all([
        getAIGreeting(),
        getUserStreak(),
      ]);
      setGreeting(greetingData);
      setStreak(streakData);
    } catch (error) {
      console.error('Error loading greeting:', error);
      // Set fallback greeting
      setGreeting({
        message: "Welcome back! Let's make today count! 🚀",
        emoji: '👋',
        type: 'welcome',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#6C5CE7', '#4834D4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>

            {/* Emoji/Icon */}
            <View style={styles.emojiContainer}>
              <Text style={styles.emoji}>{greeting?.emoji || '👋'}</Text>
            </View>

            {/* Greeting Message */}
            <Text style={styles.greetingText}>
              {loading ? 'Loading...' : greeting?.message || 'Welcome back!'}
            </Text>

            {/* Streak Display */}
            {streak && streak.current_streak > 0 && (
              <View style={styles.streakContainer}>
                <View style={styles.streakBadge}>
                  <Ionicons name="flame" size={20} color="#FF6B35" />
                  <Text style={styles.streakText}>
                    {streak.current_streak} Day Streak!
                  </Text>
                </View>
                {streak.longest_streak > streak.current_streak && (
                  <Text style={styles.longestStreak}>
                    🏆 Best: {streak.longest_streak} days
                  </Text>
                )}
              </View>
            )}

            {/* Stats Preview */}
            {greeting?.stats && (
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {greeting.stats.totalActivities}
                  </Text>
                  <Text style={styles.statLabel}>Activities</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {greeting.stats.averageScore.toFixed(0)}%
                  </Text>
                  <Text style={styles.statLabel}>Avg Score</Text>
                </View>
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleClose}
            >
              <Text style={styles.actionButtonText}>Let's Go! 🚀</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  gradient: {
    padding: 30,
    paddingTop: 40,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    padding: 5,
  },
  emojiContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 40,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 28,
    paddingHorizontal: 10,
  },
  streakContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 6,
  },
  longestStreak: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  actionButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    width: '100%',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6C5CE7',
    textAlign: 'center',
  },
});

export default AIGreetingModal;
