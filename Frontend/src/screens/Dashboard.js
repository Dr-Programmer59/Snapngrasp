// src/screens/Dashboard.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import BottomNavigation from '../components/BottomNavigation';
import AIGreetingModal from '../components/AIGreetingModal';
import AnimatedChatGreeting from '../components/AnimatedChatGreeting';
import { validateToken } from '../api/auth';
import { getRecentActivity, getDashboardStats } from '../api/activity';
import { getFlashcardSetById, getMCQSetById } from '../api/studyMaterial';
import { getVisualById } from '../api/studyMaterial';
import { getUserStreak, dailyCheckIn } from '../api/progressApi';
import { generateMotivationalMessage } from '../api/motivation';
import { getWelcomeBanner, getAIChatMessage } from '../utils/welcomeMessages';

export default function Dashboard({ navigation }) {
  const { theme, toggleTheme } = useTheme();
  const [userProfile, setUserProfile] = useState({ name: 'User' });
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({
    flashcards: 0,
    streak: 0,
    accuracy: 0,
    quizzes: 0,
  });
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showGreetingModal, setShowGreetingModal] = useState(false);
  const [userStreak, setUserStreak] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showChatBubble, setShowChatBubble] = useState(false);
  const [chatMessage, setChatMessage] = useState('Hey! Ready to learn something new today? 🎯');
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState(null);
  const [loadingActivityId, setLoadingActivityId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [welcomeBanner, setWelcomeBanner] = useState(null);
  const [isFirstCheckIn, setIsFirstCheckIn] = useState(false);
  
  // Animation for theme toggle pill
  const pillPosition = useRef(new Animated.Value(theme.isDark ? 1 : 0)).current;

  // Animate pill when theme changes
  useEffect(() => {
    Animated.spring(pillPosition, {
      toValue: theme.isDark ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [theme.isDark]);

  // Fetch user profile and validate authentication on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        console.log('📊 Dashboard: Fetching user profile...');
        const profile = await validateToken();
        if (profile) {
          console.log('✅ Dashboard: User profile loaded:', profile);
          setUserProfile(profile);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('❌ Dashboard: Error fetching profile:', error);
        setIsAuthenticated(false);
      }
    }
    fetchProfile();
  }, []);

  // Check in user and show greeting modal (only after authentication)
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('⏳ Dashboard: Waiting for authentication before check-in...');
      return;
    }

    const checkInAndGreet = async () => {
      try {
        console.log('🎯 Dashboard: Starting check-in and greeting...');
        
        // Daily check-in for streak
        const checkInResult = await dailyCheckIn();
        console.log('✅ Dashboard: Check-in result:', checkInResult);
        
        // Fetch streak data
        const streakData = await getUserStreak();
        setUserStreak(streakData);
        
        // Update stats with streak
        setStats(prevStats => ({
          ...prevStats,
          streak: streakData.current_streak || 0,
        }));
        
        // Track if this is first check-in
        const firstCheckIn = !checkInResult.data?.alreadyCheckedIn;
        setIsFirstCheckIn(firstCheckIn);
        console.log('✅ First check-in of day:', firstCheckIn);
        
        // Show full modal only on first check-in of the day
        if (firstCheckIn) {
          setTimeout(() => setShowGreetingModal(true), 7000); // Show modal after chat bubble
        }
      } catch (error) {
        console.error('❌ Dashboard: Error with check-in/greeting:', error);
        // Don't block the app if check-in fails - user can still use it
      }
    };
    
    checkInAndGreet();
  }, [isAuthenticated]);

  // Fetch dashboard data (only after authentication)
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('⏸️ Dashboard: Skipping data fetch - not authenticated yet');
      return;
    }

    fetchDashboardData();
  }, [isAuthenticated, retryCount]); // Re-fetch when retry count changes

  // Function to fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('📊 Dashboard: Fetching activity data... (attempt #' + (retryCount + 1) + ')');
      console.log('📊 Dashboard: isAuthenticated:', isAuthenticated);
      
      // Fetch recent activity and stats in parallel
      const [activityData, statsData] = await Promise.all([
        getRecentActivity(),
        getDashboardStats(),
      ]);

      console.log('📊 Dashboard: Activity data received:', activityData);
      console.log('📊 Dashboard: Stats data received:', statsData);

      // Validate activity data
      if (activityData) {
        const validActivities = activityData.activities || [];
        console.log('📊 Dashboard: Valid activities:', validActivities.length);
        setActivities(validActivities);
        setHasData(activityData.hasData || validActivities.length > 0);
        console.log('✅ Dashboard: Activities set:', validActivities.length, 'hasData:', activityData.hasData || validActivities.length > 0);
      } else {
        console.warn('⚠️ Dashboard: activityData is null/undefined');
        setActivities([]);
        setHasData(false);
      }

      // Validate stats data
      if (statsData) {
        setStats(prevStats => ({
          ...statsData,
          streak: prevStats.streak, // Keep streak from check-in
        }));
        console.log('✅ Dashboard: Stats set:', statsData);
      } else {
        console.warn('⚠️ Dashboard: statsData is null/undefined');
      }

      console.log('✅ Dashboard data loaded successfully');
      
      // Generate AI chat message with full context
      if (activityData && statsData) {
        const aiMessage = getAIChatMessage(
          statsData,
          activityData.activities || [],
          userStreak,
          isFirstCheckIn
        );
        console.log('🤖 AI Chat Message generated:', aiMessage);
        setChatMessage(aiMessage);
        
        // Show chat bubble after brief delay
        setTimeout(() => setShowChatBubble(true), 1500);
        
        // Generate welcome banner with contextual message
        const banner = getWelcomeBanner(
          statsData,
          activityData.activities || [],
          userStreak
        );
        setWelcomeBanner(banner);
        console.log('✅ Welcome banner generated:', banner?.type);
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      console.error('❌ Error details:', error.message, error.stack);
      setError('Failed to load dashboard data');
      // Keep default empty state
      setActivities([]);
      setHasData(false);
    } finally {
      setLoading(false);
      setLoadingStats(false);
    }
  };

  // Pull to refresh handler
  const onRefresh = async () => {
    console.log('🔄 Dashboard: Pull-to-refresh triggered');
    setRefreshing(true);
    try {
      await fetchDashboardData();
    } finally {
      setRefreshing(false);
    }
  };

  const data = stats;

  const displayName = userProfile?.profile?.display_name || 'User';

  // Colors for stats card
  const statsBackground = theme.isDark ? '#191B2F' : '#FFFFFF';
  const statsDivider = theme.isDark ? '#252b3d' : '#E5E7EB';

  // Circular progress for recent activity cards
  const CircularProgress = ({ progress, size = 72, strokeWidth = 8 }) => {
    const trackColor = theme.isDark ? '#252b3d' : '#E5E7EB';
    const progressColor = theme.isDark ? '#8B7FD9' : '#6C4CFD';
    const textColor = theme.isDark ? '#FFFFFF' : '#111827';

    return (
      <View style={[styles.progressCircle, { width: size, height: size }]}>
        {/* Background circle */}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: trackColor,
            position: 'absolute',
          }}
        />
        
        {/* Progress circle using conic gradient simulation */}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            position: 'absolute',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: progressColor,
              borderRightColor: progress >= 25 ? progressColor : trackColor,
              borderBottomColor: progress >= 50 ? progressColor : trackColor,
              borderLeftColor: progress >= 75 ? progressColor : trackColor,
              transform: [{ rotate: '-90deg' }],
              position: 'absolute',
            }}
          />
          {progress < 100 && (
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: strokeWidth,
                borderColor: 'transparent',
                borderTopColor: trackColor,
                borderRightColor: progress < 25 ? trackColor : 'transparent',
                borderBottomColor: progress < 50 ? trackColor : 'transparent',
                borderLeftColor: progress < 75 ? trackColor : 'transparent',
                transform: [{ rotate: `${-90 + (progress * 3.6)}deg` }],
                position: 'absolute',
              }}
            />
          )}
        </View>

        {/* Center text */}
        <View style={styles.progressCenter}>
          <Text style={[styles.progressText, { color: textColor }]}>
            {progress}%
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.isDark ? '#382F74' : '#191B2F' }]}
      edges={['top']}
    >
      <View style={{ flex: 1, backgroundColor: theme.isDark ? '#0C1421' : '#F5F7FA' }}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.isDark ? '#8B7FD9' : '#6C4CFD'}
              colors={[theme.isDark ? '#8B7FD9' : '#6C4CFD']}
            />
          }
        >
          {/* Header with Gradient */}
          <LinearGradient
            colors={theme.isDark ? ['#382F74', '#22234C'] : ['#191B2F', '#0C1421']}
            style={styles.header}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          <View style={styles.headerTop}>
            <View style={styles.userInfo}>
              <View style={[styles.avatar, { backgroundColor: '#7C3AED' }]}>
                <Text style={styles.avatarText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.greeting}>Good Morning,</Text>
                <Text style={styles.userName}>
                  {displayName}
                </Text>
              </View>
            </View>

            {/* Glassy theme toggle */}
            <TouchableOpacity
              style={styles.themeToggle}
              onPress={toggleTheme}
              activeOpacity={0.9}
            >
              {/* glass gradient background */}
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.25)',
                  'rgba(15,23,42,0.8)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.themeToggleBackground}
              />

              {/* purple active pill with animation */}
              <Animated.View
                style={[
                  styles.themeActivePill,
                  {
                    transform: [{
                      translateX: pillPosition.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-18, 18], // light mode (sun/left) to dark mode (moon/right) - reversed
                      })
                    }]
                  }
                ]}
              />

              {/* icons */}
              <View style={styles.themeToggleContent}>
                <Ionicons
                  name="sunny"
                  size={18}
                  color={theme.isDark ? '#E5E7EB' : '#FFFFFF'}
                />
                <Ionicons
                  name="moon"
                  size={18}
                  color={theme.isDark ? '#FFFFFF' : '#E5E7EB'}
                />
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Let's make today a learning win!</Text>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={[
                styles.actionButton,
                { backgroundColor: theme.isDark ? '#191B2F' : '#FFFFFF' }
              ]}
              onPress={() => navigation.navigate('Play', { initialTab: 'flashcards' })}
              activeOpacity={0.7}
            >
              <Image
                source={require('../assets/images/flashC.png')}
                style={styles.actionImage}
                resizeMode="contain"
              />
              <Text style={[
                styles.actionText,
                { color: theme.isDark ? '#FFFFFF' : '#1F2937' }
              ]}>Flashcards</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.actionButton,
                { backgroundColor: theme.isDark ? '#191B2F' : '#FFFFFF' }
              ]}
              onPress={() => navigation.navigate('Play', { initialTab: 'visuals' })}
              activeOpacity={0.7}
            >
              <Image
                source={require('../assets/images/VisualD.png')}
                style={styles.actionImage}
                resizeMode="contain"
              />
              <Text style={[
                styles.actionText,
                { color: theme.isDark ? '#FFFFFF' : '#1F2937' }
              ]}>Visuals</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.actionButton,
                { backgroundColor: theme.isDark ? '#191B2F' : '#FFFFFF' }
              ]}
              onPress={() => navigation.navigate('Play', { initialTab: 'mcqs' })}
              activeOpacity={0.7}
            >
              <Image
                source={require('../assets/images/QuizD.png')}
                style={styles.actionImage}
                resizeMode="contain"
              />
              <Text style={[
                styles.actionText,
                { color: theme.isDark ? '#FFFFFF' : '#1F2937' }
              ]}>Quiz</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Snap & Study Card */}
          <LinearGradient
            colors={['#6E61CA', '#5A4DB5']}
            style={styles.snapCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.snapContent}>
              <Image
                source={require('../assets/images/mascot.png')}
                style={styles.mascotImage}
                resizeMode="contain"
              />
              <View style={styles.snapText}>
                <Text style={styles.snapTitle}>Snap & Study</Text>
                <Text style={styles.snapDescription}>
                  Drop it here, I'll turn it into flashcards & quizzes
                </Text>
                <TouchableOpacity style={styles.uploadButton}>
                  <Text style={styles.uploadButtonText}>Upload Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* Toggle Button for mock data */}
          
        </View>

        {/* Progress & Streak */}
        <View style={styles.section}>
          <Text
            style={[styles.sectionTitle, { color: theme.isDark ? '#FFFFFF' : '#1F2937' }]}
          >
            Progress & Streak
          </Text>

          <View
            style={[
              styles.statsGrid,
              {
                backgroundColor: statsBackground,
                borderColor: statsDivider,
              },
            ]}
          >
            {/* Top row */}
            <View
              style={[
                styles.statRow,
                { borderBottomWidth: 1, borderBottomColor: statsDivider },
              ]}
            >
              {/* Flashcards */}
              <View
                style={[
                  styles.statCell,
                  { borderRightWidth: 1, borderRightColor: statsDivider },
                ]}
              >
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.isDark ? '#FFFFFF' : '#4B5563' },
                  ]}
                >
                  Flashcards
                </Text>
                {loadingStats ? (
                  <View style={styles.skeletonContainer}>
                    <View style={[
                      styles.skeletonBox,
                      styles.skeletonValue,
                      { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }
                    ]} />
                    <View style={[
                      styles.skeletonBox,
                      styles.skeletonDescription,
                      { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }
                    ]} />
                  </View>
                ) : (
                  <>
                    <Text
                      style={[
                        styles.statValue,
                        { color: theme.isDark ? '#FFFFFF' : '#111827' },
                      ]}
                    >
                      {data.flashcards}
                    </Text>
                    <Text
                      style={[
                        styles.statDescription,
                        { color: theme.isDark ? '#9CA3AF' : '#9CA3AF' },
                      ]}
                    >
                      Total flashcards created
                    </Text>
                  </>
                )}
              </View>

              {/* Streak */}
              <TouchableOpacity 
                style={styles.statCell}
                onPress={() => navigation.navigate('MilestonesScreen')}
                activeOpacity={0.7}
                disabled={loadingStats}
              >
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.isDark ? '#FFFFFF' : '#4B5563' },
                  ]}
                >
                  Your Streak
                </Text>
                {loadingStats ? (
                  <View style={styles.skeletonContainer}>
                    <View style={[
                      styles.skeletonBox,
                      styles.skeletonValue,
                      { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }
                    ]} />
                    <View style={[
                      styles.skeletonBox,
                      styles.skeletonDescription,
                      { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }
                    ]} />
                  </View>
                ) : (
                  <>
                    <View style={styles.statValueRow}>
                      <Text style={styles.fireEmoji}>🔥</Text>
                      <Text
                        style={[
                          styles.statValue,
                          { color: theme.isDark ? '#FFFFFF' : '#111827' },
                        ]}
                      >
                        {data.streak}
                      </Text>
                      <Text
                        style={[
                          styles.statUnit,
                          { color: theme.isDark ? '#9CA3AF' : '#9CA3AF' },
                        ]}
                      >
                        {' '}
                        Days
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.statDescription,
                        { color: theme.isDark ? '#9CA3AF' : '#9CA3AF' },
                      ]}
                    >
                      Keep your streak alive
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Bottom row */}
            <View style={styles.statRow}>
              {/* Accuracy */}
              <View
                style={[
                  styles.statCell,
                  { borderRightWidth: 1, borderRightColor: statsDivider },
                ]}
              >
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.isDark ? '#FFFFFF' : '#4B5563' },
                  ]}
                >
                  Accuracy
                </Text>
                {loadingStats ? (
                  <View style={styles.skeletonContainer}>
                    <View style={[
                      styles.skeletonBox,
                      styles.skeletonValue,
                      { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }
                    ]} />
                    <View style={[
                      styles.skeletonBox,
                      styles.skeletonDescription,
                      { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }
                    ]} />
                  </View>
                ) : (
                  <>
                    <Text
                      style={[
                        styles.statValue,
                        { color: theme.isDark ? '#FFFFFF' : '#111827' },
                      ]}
                    >
                      {data.accuracy}%
                    </Text>
                    <Text
                      style={[
                        styles.statDescription,
                        { color: theme.isDark ? '#9CA3AF' : '#9CA3AF' },
                      ]}
                    >
                      Quiz &amp; Card Score
                    </Text>
                  </>
                )}
              </View>

              {/* Quizzes */}
              <View style={styles.statCell}>
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.isDark ? '#FFFFFF' : '#4B5563' },
                  ]}
                >
                  Quizzes
                </Text>
                {loadingStats ? (
                  <View style={styles.skeletonContainer}>
                    <View style={[
                      styles.skeletonBox,
                      styles.skeletonValue,
                      { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }
                    ]} />
                    <View style={[
                      styles.skeletonBox,
                      styles.skeletonDescription,
                      { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }
                    ]} />
                  </View>
                ) : (
                  <>
                    <Text
                      style={[
                        styles.statValue,
                        { color: theme.isDark ? '#FFFFFF' : '#111827' },
                      ]}
                    >
                      {data.quizzes}
                    </Text>
                    <Text
                      style={[
                        styles.statDescription,
                        { color: theme.isDark ? '#9CA3AF' : '#9CA3AF' },
                      ]}
                    >
                      Quizzes you&apos;ve created
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <Text
              style={[styles.sectionTitle, { color: theme.isDark ? '#FFFFFF' : '#1F2937' }]}
            >
              Recent Activity
            </Text>
            {hasData && (
              <TouchableOpacity>
                <Text style={[styles.viewAllText, { color: theme.isDark ? '#8B7FD9' : '#a78bfa' }]}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: theme.isDark ? '#191B2F' : theme.colors.secondaryBackground },
              ]}
            >
              <ActivityIndicator size="large" color={theme.isDark ? '#8B7FD9' : '#6C4CFD'} />
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.isDark ? '#E5E7EB' : theme.colors.secondaryText, marginTop: 12 },
                ]}
              >
                Loading your activities...
              </Text>
            </View>
          ) : error ? (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: theme.isDark ? '#191B2F' : theme.colors.secondaryBackground },
              ]}
            >
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: theme.isDark ? '#252b3d' : theme.colors.iconBackground },
                ]}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={24}
                  color={theme.isDark ? '#EF4444' : '#DC2626'}
                />
              </View>
              <Text
                style={[styles.emptyText, { color: theme.isDark ? '#E5E7EB' : theme.colors.secondaryText }]}
              >
                {error}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  console.log('🔄 Dashboard: Manual retry triggered');
                  setRetryCount(prev => prev + 1);
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : !hasData ? (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: theme.isDark ? '#191B2F' : theme.colors.secondaryBackground },
              ]}
            >
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: theme.isDark ? '#252b3d' : theme.colors.iconBackground },
                ]}
              >
                <Ionicons
                  name="book-outline"
                  size={24}
                  color={theme.isDark ? '#9CA3AF' : theme.colors.secondaryText}
                />
              </View>
              <Text
                style={[styles.emptyText, { color: theme.isDark ? '#E5E7EB' : theme.colors.secondaryText }]}
              >
                No activities yet
              </Text>
              <Text
                style={[
                  styles.emptySubtext,
                  { color: theme.isDark ? '#9CA3AF' : theme.colors.secondaryText },
                ]}
              >
                Start learning to see your progress here
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { marginTop: 12 }]}
                onPress={() => {
                  console.log('🔄 Dashboard: Manual refresh triggered');
                  setRetryCount(prev => prev + 1);
                }}
              >
                <Ionicons name="refresh-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.retryButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activityScrollContent}
            >
              {activities.map(activity => (
                <TouchableOpacity
                  key={activity.id}
                  style={[
                    styles.activityCard,
                    {
                      backgroundColor: theme.isDark ? '#191B2F' : '#FFFFFF',
                      opacity: loadingActivityId === activity.id ? 0.6 : 1,
                    },
                  ]}
                  disabled={loadingActivityId === activity.id}
                  onPress={async () => {
                    try {
                      console.log('🎯 Activity card clicked:', activity.type, activity.id);
                      setLoadingActivityId(activity.id);
                      
                      // Add small delay to show loading state
                      await new Promise(resolve => setTimeout(resolve, 300));
                      
                      // Navigate based on activity type
                      if (activity.type === 'flashcard') {
                        // Fetch flashcard set with all flashcards
                        console.log('📚 Fetching flashcard set:', activity.id);
                        const data = await getFlashcardSetById(activity.id);
                        console.log('✅ Flashcard set data:', data);
                        
                        if (!data || !data.data || !data.data.flashcards) {
                          throw new Error('Invalid flashcard data received');
                        }
                        
                        navigation.navigate('FlashcardPracticeScreen', { 
                          flashcards: data.data.flashcards 
                        });
                      } else if (activity.type === 'mcq') {
                        // Fetch MCQ set with all questions
                        console.log('📝 Fetching MCQ set:', activity.id);
                        const data = await getMCQSetById(activity.id);
                        console.log('✅ MCQ set data:', data);
                        
                        if (!data || !data.data || !data.data.mcqs) {
                          throw new Error('Invalid MCQ data received');
                        }
                        
                        navigation.navigate('MCQQuizScreen', { 
                          mcqs: { mcqs: data.data.mcqs } 
                        });
                      } else if (activity.type === 'visual') {
                        // Fetch visual with all details
                        console.log('🎨 Fetching visual:', activity.id);
                        const data = await getVisualById(activity.id);
                        console.log('✅ Visual data:', data);
                        
                        if (!data || !data.data) {
                          throw new Error('Invalid visual data received');
                        }
                        
                        navigation.navigate('LabeledVisualScreen', { 
                          visual: data.data 
                        });
                      }
                    } catch (error) {
                      console.error('❌ Error navigating to activity:', error);
                      console.error('❌ Error details:', error.message, error.stack);
                      Alert.alert(
                        'Error', 
                        error.message || 'Failed to load activity. Please try again.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Retry', 
                            onPress: () => {
                              // Retry by clicking again
                              console.log('🔄 Retrying activity load...');
                              setLoadingActivityId(null);
                            }
                          }
                        ]
                      );
                    } finally {
                      setLoadingActivityId(null);
                    }
                  }}
                >
                  <View style={styles.activityTopRow}>
                    {loadingActivityId === activity.id ? (
                      <View style={styles.progressCircle}>
                        <ActivityIndicator size="large" color={theme.isDark ? '#8B7FD9' : '#6C4CFD'} />
                      </View>
                    ) : (
                      <CircularProgress progress={activity.percent} />
                    )}
                    <Ionicons
                      name={activity.starred ? 'star' : 'star-outline'}
                      size={20}
                      color={
                        activity.starred
                          ? '#fbbf24'
                          : theme.colors.secondaryText
                      }
                    />
                  </View>

                  <View style={styles.activityTag}>
                    <Text style={styles.activityTagText}>{activity.label}</Text>
                  </View>

                  <Text
                    style={[
                      styles.activityTitle,
                      { color: theme.isDark ? '#FFFFFF' : theme.colors.primaryText },
                    ]}
                    numberOfLines={2}
                  >
                    {activity.title}
                  </Text>

                  <View style={styles.activityStats}>
                    {activity.stats.map((stat, index) => (
                      <View key={index} style={styles.statItemActivity}>
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: stat.color },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statTextActivity,
                            { color: theme.isDark ? '#D1D5DB' : theme.colors.secondaryText },
                          ]}
                        >
                          {stat.label}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.activityFooter}>
                    <Ionicons name="open-outline" size={18} color={theme.isDark ? '#8B7FD9' : '#6C4CFD'} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="home" />
      
      {/* Animated Chat Greeting */}
      <AnimatedChatGreeting
        visible={showChatBubble}
        message={chatMessage}
        onClose={() => {
          setShowChatBubble(false);
          // Optionally show full modal after chat bubble closes
          // setTimeout(() => setShowGreetingModal(true), 500);
        }}
        autoHideDuration={5000}
        theme={theme.isDark ? 'dark' : 'light'}
        iconSize={65}
      />

      {/* AI Greeting Modal */}
      <AIGreetingModal
        visible={showGreetingModal}
        onClose={() => setShowGreetingModal(false)}
        theme={theme}
      />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 100,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  quickActionsContainer: {
    paddingHorizontal: 24,
    marginTop: -40,
    marginBottom: 32,
  },
  contentSection: {
    paddingHorizontal: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#a855f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  greeting: {
    fontSize: 13,
    color: '#9CA3AF',
    fontFamily: 'Poppins',
    marginBottom: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
  },

  // Glassy theme toggle
  themeToggle: {
    width: 80,
    height: 37,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeToggleBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  themeActivePill: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6C4CFD',
    shadowColor: '#6C4CFD',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  themeToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 14,
  },

  title: {
    fontSize: 30,
    fontWeight: '600',
    marginBottom: 0,
    color: '#FFFFFF',
    fontFamily: 'Poppins',
    lineHeight: 30,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Poppins',
  },
  actionImage: {
    width: 36,
    height: 36,
  },
  snapCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  snapContent: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  mascotImage: { width: 65, height: 65 },
  snapText: { flex: 1 },
  snapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    fontFamily: 'Poppins',
  },
  snapDescription: {
    fontSize: 13,
    color: '#e9d5ff',
    marginBottom: 10,
    fontFamily: 'Poppins',
    lineHeight: 18,
  },
  uploadButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  toggleButton: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  toggleButtonText: { fontSize: 14, fontWeight: '500', fontFamily: 'Poppins' },

  section: { paddingHorizontal: 24, marginBottom: 24 },
  lastSection: { paddingBottom: 40 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    fontFamily: 'Poppins',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    color: '#a78bfa',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Poppins',
  },

  // Progress & Streak card
  statsGrid: {
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    marginTop: 8,
  },
  statRow: {
    flexDirection: 'row',
  },
  statCell: {
    flex: 1,
    paddingVertical: 26,
    paddingHorizontal: 22,
  },
  statLabel: {
    fontSize: 16,
    fontFamily: 'Poppins',
    fontWeight: '500',
    marginBottom: 10,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 40,
    fontWeight: '700',
    fontFamily: 'Poppins',
    lineHeight: 44,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fireEmoji: {
    fontSize: 32,
    marginRight: 4,
  },
  statUnit: {
    fontSize: 18,
    fontFamily: 'Poppins',
    fontWeight: '500',
  },
  statDescription: {
    fontSize: 13,
    fontFamily: 'Poppins',
    fontWeight: '400',
    fontStyle: 'italic',
    marginTop: 6,
  },

  emptyState: { borderRadius: 16, padding: 32, alignItems: 'center' },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: { fontSize: 14, marginBottom: 4, fontFamily: 'Poppins' },
  emptySubtext: { fontSize: 12, textAlign: 'center', fontFamily: 'Poppins' },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#6C4CFD',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#6C4CFD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },

  // Recent Activity
  activityScrollContent: {
    paddingRight: 24,
  },
  activityCard: {
    width: 220,
    borderRadius: 20,
    padding: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  activityTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressCircle: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins',
  },
  activityTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(108,76,253,0.06)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  activityTagText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Poppins',
    color: '#6C4CFD',
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: 'Poppins',
  },
  activityStats: {
    marginBottom: 10,
  },
  statItemActivity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statTextActivity: { fontSize: 12, fontFamily: 'Poppins' },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  // Skeleton loading styles
  skeletonContainer: {
    marginTop: 8,
    gap: 8,
  },
  skeletonBox: {
    borderRadius: 8,
    overflow: 'hidden',
    height: 20,
  },
  skeletonValue: {
    height: 36,
    width: '60%',
    marginBottom: 8,
  },
  skeletonDescription: {
    height: 16,
    width: '90%',
  },
  
  // Welcome Banner
  welcomeBanner: {
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bannerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(108, 76, 253, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bannerIcon: {
    fontSize: 24,
  },
  bannerContent: {
    flex: 1,
    marginRight: 8,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  bannerMessage: {
    fontSize: 13,
    fontFamily: 'Poppins',
    lineHeight: 18,
  },
  bannerArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(108, 76, 253, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
