import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { getUserStreak } from '../api/progressApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function MilestonesScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [streakData, setStreakData] = useState(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [newlyUnlockedBadge, setNewlyUnlockedBadge] = useState(null);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const hasCheckedBadges = useRef(false);

  // Badge definitions
  const STREAK_BADGES = [
    { id: 1, name: 'Rookie', days: 3, icon: '🏅', color: '#F59E0B' },
    { id: 2, name: 'Getting Serious', days: 10, icon: '💪', color: '#EF4444' },
    { id: 3, name: 'Locked In', days: 50, icon: '🔥', color: '#8B5CF6' },
    { id: 4, name: 'Triple Threat', days: 100, icon: '⚡', color: '#3B82F6' },
    { id: 5, name: 'No Days Off', days: 365, icon: '👑', color: '#10B981' },
    { id: 6, name: 'Immortal', days: 1000, icon: '💎', color: '#6366F1' },
  ];

  const ACTIVITY_BADGES = [
    { id: 7, name: 'First Steps', count: 5, icon: '🎯', color: '#EC4899', type: 'flashcards' },
    { id: 8, name: 'Quiz Master', count: 50, icon: '🧠', color: '#14B8A6', type: 'mcqs' },
    { id: 9, name: 'Visual Learner', count: 100, icon: '🎨', color: '#F97316', type: 'visuals' },
    { id: 10, name: 'Knowledge Builder', count: 500, icon: '📚', color: '#8B5CF6', type: 'flashcards' },
  ];

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!hasCheckedBadges.current && isMounted) {
        await loadStreakData();
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const loadStreakData = async () => {
    try {
      const data = await getUserStreak();
      setStreakData(data);
      
      // Check for newly unlocked badges
      await checkNewlyUnlockedBadges(data);
    } catch (error) {
      console.error('Error loading streak data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNewlyUnlockedBadges = async (data) => {
    // Prevent double execution - return immediately if already checked
    if (hasCheckedBadges.current) {
      console.log('Badge check already executed, skipping...');
      return;
    }
    
    console.log('Executing badge check...');
    hasCheckedBadges.current = true;
    
    try {
      const currentStreak = data?.current_streak || 0;
      
      // Get previously shown badges from AsyncStorage
      const shownBadgesStr = await AsyncStorage.getItem('shownBadges');
      const shownBadges = shownBadgesStr ? JSON.parse(shownBadgesStr) : [];
      
      // Find the highest unlocked badge that hasn't been shown
      const unlockedBadges = STREAK_BADGES.filter(badge => currentStreak >= badge.days);
      const newBadge = unlockedBadges.find(badge => !shownBadges.includes(badge.id));
      
      if (newBadge) {
        // IMPORTANT: Mark as shown BEFORE showing modal (prevents StrictMode double-show)
        const updatedShownBadges = [...shownBadges, newBadge.id];
        await AsyncStorage.setItem('shownBadges', JSON.stringify(updatedShownBadges));
        
        // Now show the modal
        setNewlyUnlockedBadge(newBadge);
        setShowBadgeModal(true);
        setConfettiVisible(true);
        
        // Hide confetti after animation
        setTimeout(() => setConfettiVisible(false), 3000);
      }
    } catch (error) {
      console.error('Error checking newly unlocked badges:', error);
    }
  };

  const isBadgeEarned = (badge) => {
    if (!streakData) return false;
    
    if (badge.days !== undefined) {
      // Streak badge
      return streakData.current_streak >= badge.days;
    }
    
    // For activity badges, you'd need to check actual stats
    // For now, we'll mark the first few as earned
    return badge.id <= 8;
  };

  const getEarnedBadgesCount = () => {
    const allBadges = [...STREAK_BADGES, ...ACTIVITY_BADGES];
    return allBadges.filter(badge => isBadgeEarned(badge)).length;
  };

  const BadgeCard = ({ badge }) => {
    const earned = isBadgeEarned(badge);
    const backgroundColor = earned ? `${badge.color}15` : theme.isDark ? '#1F2937' : '#F3F4F6';
    const borderColor = earned ? badge.color : theme.isDark ? '#374151' : '#E5E7EB';
    
    return (
      <View style={[styles.badgeCard, { backgroundColor, borderColor }]}>
        {/* Hexagonal badge icon */}
        <View style={styles.badgeIconContainer}>
          <View style={[
            styles.hexagon,
            { 
              backgroundColor: earned ? badge.color : theme.isDark ? '#374151' : '#D1D5DB',
              opacity: earned ? 1 : 0.4 
            }
          ]}>
            <Text style={styles.badgeIcon}>{badge.icon}</Text>
          </View>
        </View>
        
        {/* Badge info */}
        <Text style={[
          styles.badgeName,
          { 
            color: earned ? (theme.isDark ? '#FFFFFF' : '#111827') : (theme.isDark ? '#6B7280' : '#9CA3AF'),
            opacity: earned ? 1 : 0.6
          }
        ]}>
          {badge.name}
        </Text>
        
        <Text style={[
          styles.badgeRequirement,
          { color: theme.isDark ? '#9CA3AF' : '#6B7280' }
        ]}>
          {badge.days ? `${badge.days} days` : `${badge.count} ${badge.type}`}
        </Text>

        {!earned && (
          <View style={styles.lockedOverlay}>
            <Ionicons name="lock-closed" size={16} color={theme.isDark ? '#6B7280' : '#9CA3AF'} />
          </View>
        )}
      </View>
    );
  };

  const ConfettiPiece = ({ delay, duration, startX }) => {
    const colors = ['#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#10B981', '#EC4899'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    return (
      <View
        style={[
          styles.confettiPiece,
          {
            left: startX,
            backgroundColor: color,
            opacity: confettiVisible ? 1 : 0,
          },
        ]}
      />
    );
  };

  const BadgeUnlockModal = () => {
    if (!newlyUnlockedBadge || !showBadgeModal) return null;

    return (
      <Modal
        visible={showBadgeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBadgeModal(false)}
      >
        <LinearGradient
          colors={theme.isDark ? ['#382F74', '#22234C', '#191B2F'] : ['#6C4CFD', '#8B7FD9', '#A78BFA']}
          style={styles.modalOverlay}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          {/* Celebration Lottie Animation */}
          <LottieView
            source={require('../assets/animations/congratulation.json')}
            autoPlay
            loop={false}
            style={styles.lottieAnimation}
            resizeMode="cover"
            onAnimationFinish={() => console.log('Animation finished')}
          />

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButtonTop}
            onPress={() => setShowBadgeModal(false)}
          >
            <Ionicons name="close" size={28} color="rgba(255, 255, 255, 0.8)" />
          </TouchableOpacity>

          <View style={styles.modalContent}>
            {/* App Logo with message */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/images/mascot.png')}
                style={styles.mascotLogo}
                resizeMode="contain"
              />
            </View>

            {/* Large Badge Display */}
            <View style={styles.largeBadgeContainer}>
              <View style={styles.hexagonWrapper}>
                <LinearGradient
                  colors={theme.isDark ? ['#191B2F', '#252b3d'] : ['#FFFFFF', '#F3F4F6']}
                  style={styles.largeBadgeHexagon}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                >
                  <Text style={styles.largeBadgeEmoji}>{newlyUnlockedBadge.icon}</Text>
                  <Text style={styles.largeBadgeNumber}>{newlyUnlockedBadge.days}</Text>
                  <Text style={styles.largeBadgeText}>STREAK</Text>
                  {/* <View style={styles.appleIcon}>
                    <Text style={styles.appleEmoji}>🍎</Text>
                  </View> */}
                </LinearGradient>
              </View>
            </View>

            <Text style={styles.badgeUnlockedText}>Badge Unlocked</Text>
            <Text style={styles.badgeUnlockedName}>{newlyUnlockedBadge.name}</Text>
            <Text style={styles.badgeUnlockedDescription}>
              {newlyUnlockedBadge.days} day streak
            </Text>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => {
                // TODO: Implement share functionality
                console.log('Share badge');
              }}
            >
              <Ionicons name="share-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.shareButtonText}>Share Your Badge</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => setShowBadgeModal(false)}
            >
              <Ionicons name="medal-outline" size={20} color="#374151" style={{ marginRight: 8 }} />
              <Text style={styles.viewAllButtonText}>View All Badges</Text>
            </TouchableOpacity>

            <Text style={styles.disableText}>Not enjoying badge celebrations?</Text>
          </View>
        </LinearGradient>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.isDark ? '#0C1421' : '#F5F7FA' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C4CFD" />
        </View>
      </SafeAreaView>
    );
  }

  const currentStreak = streakData?.current_streak || 0;
  const earnedCount = getEarnedBadgesCount();
  const totalCount = STREAK_BADGES.length + ACTIVITY_BADGES.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.isDark ? '#0C1421' : '#F5F7FA' }]} edges={['top']}>
      {/* Badge Unlock Modal */}
      <BadgeUnlockModal />

      {/* Header */}
      <LinearGradient
        colors={theme.isDark ? ['#382F74', '#22234C'] : ['#191B2F', '#0C1421']}
        style={styles.header}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Milestones</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Current Streak Card */}
        <View style={styles.streakCardContainer}>
          <LinearGradient
            colors={['#6E61CA', '#5A4DB5']}
            style={styles.streakCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.streakContent}>
              <Text style={styles.streakLabel}>Day Streak</Text>
              <View style={styles.streakValueContainer}>
                <Text style={styles.fireEmoji}>🔥</Text>
                <Text style={styles.streakValue}>{currentStreak}</Text>
              </View>
              <Text style={styles.streakSubtext}>Keep it going!</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Badges Progress Card */}
        <View style={[
          styles.progressCard,
          { backgroundColor: theme.isDark ? '#191B2F' : '#FFFFFF' }
        ]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: theme.isDark ? '#FFFFFF' : '#111827' }]}>
              Badges Earned
            </Text>
            <Text style={[styles.progressCount, { color: '#6C4CFD' }]}>
              {earnedCount}/{totalCount}
            </Text>
          </View>
          
          {/* Progress bar */}
          <View style={[styles.progressBarContainer, { backgroundColor: theme.isDark ? '#252b3d' : '#E5E7EB' }]}>
            <LinearGradient
              colors={['#6C4CFD', '#8B7FD9']}
              style={[styles.progressBarFill, { width: `${(earnedCount / totalCount) * 100}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>

        {/* Streak Badges Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.isDark ? '#FFFFFF' : '#111827' }]}>
            Streak Milestones
          </Text>
          <View style={styles.badgesGrid}>
            {STREAK_BADGES.map(badge => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </View>
        </View>

        {/* Activity Badges Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.isDark ? '#FFFFFF' : '#111827' }]}>
            Activity Achievements
          </Text>
          <View style={styles.badgesGrid}>
            {ACTIVITY_BADGES.map(badge => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  
  // Streak Card
  streakCardContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  streakCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  streakContent: {
    alignItems: 'center',
  },
  streakLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E9D5FF',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },
  streakValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fireEmoji: {
    fontSize: 48,
    marginRight: 8,
  },
  streakValue: {
    fontSize: 64,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
  },
  streakSubtext: {
    fontSize: 14,
    color: '#E9D5FF',
    fontFamily: 'Poppins',
  },

  // Progress Card
  progressCard: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  progressCount: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Badges Section
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    fontFamily: 'Poppins',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeCard: {
    width: '31.5%',
    marginBottom: 12,
    aspectRatio: 0.85,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeIconContainer: {
    marginBottom: 8,
  },
  hexagon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '0deg' }],
  },
  badgeIcon: {
    fontSize: 32,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  badgeRequirement: {
    fontSize: 10,
    textAlign: 'center',
    fontFamily: 'Poppins',
  },
  lockedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  bottomSpacer: {
    height: 40,
  },

  // Badge Unlock Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieAnimation: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  closeButtonTop: {
    position: 'absolute',
    top: 50,
    left: 24,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 22,
    zIndex: 10,
  },
  modalContent: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 2,
  },
  logoContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  mascotLogo: {
    width: 80,
    height: 80,
  },
  largeBadgeContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  hexagonWrapper: {
    padding: 6,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  largeBadgeHexagon: {
    width: 240,
    height: 240,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  largeBadgeEmoji: {
    fontSize: 56,
    marginBottom: 4,
  },
  largeBadgeNumber: {
    fontSize: 80,
    fontWeight: '700',
    color: '#6C4CFD',
    fontFamily: 'Poppins',
    textShadowColor: 'rgba(108, 76, 253, 0.3)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  largeBadgeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#8B7FD9',
    fontFamily: 'Poppins',
    letterSpacing: 3,
    textShadowColor: 'rgba(139, 127, 217, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  appleIcon: {
    position: 'absolute',
    bottom: 16,
    backgroundColor: '#6C4CFD',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appleEmoji: {
    fontSize: 20,
  },
  badgeUnlockedText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },
  badgeUnlockedName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  badgeUnlockedDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Poppins',
    marginBottom: 40,
  },
  shareButton: {
    width: '90%',
    backgroundColor: '#2D2D2D',
    paddingVertical: 18,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  viewAllButton: {
    width: '90%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 18,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  viewAllButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  disableText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Poppins',
    textAlign: 'center',
  },
});
