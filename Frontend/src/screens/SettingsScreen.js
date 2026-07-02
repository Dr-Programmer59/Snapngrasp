import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import BottomNavigation from '../components/BottomNavigation';
import { getProfile as fetchUserProfile, updateProfile as updateUserProfile, uploadAvatar, removeAvatar } from '../api/profile';
import { logoutAPI, deleteAccountAPI } from '../api/auth';
import { getCurrentSubscription } from '../api/subscription';
import * as ImagePicker from 'expo-image-picker';
import { BACKEND_API_URL } from '../config/api';

// Mock data for demonstration
const mockLeaders = [
  { id: '1', name: 'John Smith', role: 'Team Lead', avatar: 'https://picsum.photos/seed/leader1/50/50.jpg' },
  { id: '2', name: 'Sarah Johnson', role: 'Project Manager', avatar: 'https://picsum.photos/seed/leader2/50/50.jpg' },
  { id: '3', name: 'Michael Brown', role: 'Department Head', avatar: 'https://picsum.photos/seed/leader3/50/50.jpg' },
];

const mockStudents = [
  { id: '1', name: 'Emma Wilson', grade: 'Grade 10', avatar: 'https://picsum.photos/seed/student1/50/50.jpg' },
  { id: '2', name: 'Oliver Davis', grade: 'Grade 11', avatar: 'https://picsum.photos/seed/student2/50/50.jpg' },
  { id: '3', name: 'Sophia Martinez', grade: 'Grade 9', avatar: 'https://picsum.photos/seed/student3/50/50.jpg' },
  { id: '4', name: 'Liam Anderson', grade: 'Grade 12', avatar: 'https://picsum.photos/seed/student4/50/50.jpg' },
];

// API placeholder functions
const api = {
  getProfile: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          name: 'Warren Daniel',
          email: 'warren@mail.com',
          phone: '+1234567890',
          bio: 'Software Developer',
          avatar: 'https://picsum.photos/seed/profile/100/100.jpg',
        });
      }, 500);
    });
  },
  updateProfile: (profileData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 500);
    });
  },
  getSettings: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          notifications: true,
          darkMode: false,
          autoSave: true,
          location: false,
        });
      }, 500);
    });
  },
  updateSettings: (settingsData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 500);
    });
  },
  getLeaders: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockLeaders);
      }, 500);
    });
  },
  getStudents: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockStudents);
      }, 500);
    });
  },
};

// Settings Screen
export default function SettingsScreen({ navigation }) {
  const { isDarkMode, toggleTheme, theme } = useTheme();
  const { setIsLoggedIn } = useAuth();
  const route = useRoute();
  
  // Expo Vector Icons components with theme awareness
  const UserIcon = () => <Ionicons name="person-outline" size={22} color={theme.isDark ? '#9CA3AF' : '#555'} />;
  const BookIcon = () => <Ionicons name="book-outline" size={22} color={theme.isDark ? '#9CA3AF' : '#555'} />;
  const TargetIcon = () => <Ionicons name="list-outline" size={22} color={theme.isDark ? '#9CA3AF' : '#555'} />;
  const NoteIcon = () => <Ionicons name="create-outline" size={22} color={theme.isDark ? '#9CA3AF' : '#555'} />;
  const MicIcon = () => <Ionicons name="mic-outline" size={22} color={theme.isDark ? '#9CA3AF' : '#555'} />;
  const PaintIcon = () => <Ionicons name="color-palette-outline" size={22} color={theme.isDark ? '#9CA3AF' : '#555'} />;
  const MailIcon = () => <Ionicons name="mail-outline" size={22} color={theme.isDark ? '#9CA3AF' : '#555'} />;
  const LockIcon = () => <Ionicons name="lock-closed-outline" size={22} color={theme.isDark ? '#9CA3AF' : '#555'} />;
  
  const { selectedGoals } = route.params || {};
  const [profile, setProfile] = useState({
    name: 'User',
    email: '',
    avatar: 'https://picsum.photos/seed/profile/100/100.jpg',
  });
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    // Load real user profile and subscription
    loadUserProfile();
    loadSubscription();
  }, []);

  // Reload subscription when coming back from SubscriptionScreen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadSubscription();
    });
    return unsubscribe;
  }, [navigation]);

  const loadSubscription = async () => {
    try {
      const result = await getCurrentSubscription();
      if (result?.status === 'success') {
        setSubscription(result.data);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const result = await fetchUserProfile();
      if (result?.data?.profile) {
        const avatarUrl = result.data.profile.avatar_url 
          ? `${BACKEND_API_URL}${result.data.profile.avatar_url}` 
          : null;
        
        setProfile({
          name: result.data.profile.display_name || result.data.profile.full_name || 'User',
          email: result.data.profile.email || '',
          avatar: avatarUrl,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDarkModeToggle = () => {
    toggleTheme();
    api.updateSettings({ darkMode: !isDarkMode }).then((response) => {
      if (response.success) {
        Alert.alert('Success', 'Dark mode setting updated');
      }
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
            try {
              console.log('🚪 Logging out...');
              // Call logout API to clear tokens and notify backend
              await logoutAPI();
              console.log('✅ Tokens cleared from storage');
              
              // Update auth state to false - this will trigger navigation to auth screens
              setIsLoggedIn(false);
              console.log('✅ Auth state updated');
              
              // Show success message
              Alert.alert('Success', 'You have been logged out successfully');
            } catch (error) {
              console.error('❌ Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account Permanently',
      'This action cannot be undone. All your data, including uploads, notes, flashcards, and progress will be permanently deleted. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Show another confirmation to prevent accidental deletion
            Alert.alert(
              'Confirm Account Deletion',
              'Type "DELETE" to confirm permanent account deletion:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      console.log('🗑️ Deleting account permanently...');
                      await deleteAccountAPI();
                      console.log('✅ Account deleted successfully');
                      
                      // Clear auth state and return to login
                      setIsLoggedIn(false);
                      Alert.alert('Account Deleted', 'Your account has been permanently deleted. We hope to see you again!');
                    } catch (error) {
                      console.error('❌ Account deletion error:', error);
                      Alert.alert('Error', error?.message || 'Failed to delete account. Please try again.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.primaryBackground }}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primaryBackground }]} edges={['top']}>
        {/* Header */}
        <View style={[styles.topHeader, { backgroundColor: theme.colors.headerBackground }]}>
          <Text style={[styles.topHeaderTitle, { color: theme.colors.headerText }]}>Me</Text>
        </View>

        <ScrollView 
          style={[styles.scrollContent, { backgroundColor: theme.colors.primaryBackground }]} 
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.colors.secondaryBackground, shadowColor: theme.colors.border }]}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.profileAvatar} />
          ) : (
            <View style={[styles.profileAvatar, styles.avatarPlaceholder, { backgroundColor: theme.colors.primaryButton }]}>
              <Text style={styles.avatarInitial}>{profile.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.colors.primaryText }]}>{profile.name}</Text>
            <Text style={[styles.profileEmail, { color: theme.colors.secondaryText }]}>{profile.email}</Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* Subscription & Credits Card */}
        {subscription && (
          <View style={[styles.subscriptionCard, { backgroundColor: theme.colors.secondaryBackground, shadowColor: theme.colors.border }]}>
            {/* Plan Header Row */}
            <View style={styles.subCardHeader}>
              <View style={styles.subPlanInfo}>
                <Ionicons 
                  name={
                    subscription.subscription?.plan_id === 'pro_plus' ? 'diamond' :
                    subscription.subscription?.plan_id === 'pro' || subscription.subscription?.plan_id === 'pro_annual' ? 'rocket' :
                    'sparkles'
                  } 
                  size={20} 
                  color={
                    subscription.subscription?.plan_id === 'pro_plus' ? '#F59E0B' :
                    subscription.subscription?.plan_id === 'pro' || subscription.subscription?.plan_id === 'pro_annual' ? '#6C4CFD' :
                    '#6B7280'
                  } 
                />
                <Text style={[styles.subPlanName, { color: theme.colors.primaryText }]}>
                  {subscription.subscription?.plan_id === 'free' ? 'SNG Free' :
                   subscription.subscription?.plan_id === 'pro' ? 'SNG Pro' :
                   subscription.subscription?.plan_id === 'pro_annual' ? 'SNG Pro Annual' :
                   subscription.subscription?.plan_id === 'pro_plus' ? 'SNG Pro+' : 'Free Plan'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => navigation.navigate('SubscriptionScreen', { 
                  fromSettings: true, 
                  currentPlanId: subscription.subscription?.plan_id 
                })}
              >
                <Text style={styles.upgradeButtonText}>
                  {subscription.subscription?.plan_id === 'free' ? 'Upgrade' : 'Change'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Credits Usage */}
            {subscription.credits && (
              <View style={styles.creditsContainer}>
                {/* Uploads */}
                <View style={styles.creditRow}>
                  <View style={styles.creditLabelRow}>
                    <Ionicons name="cloud-upload-outline" size={14} color={theme.colors.secondaryText} />
                    <Text style={[styles.creditLabel, { color: theme.colors.secondaryText }]}>Uploads</Text>
                    <Text style={[styles.creditCount, { color: theme.colors.primaryText }]}>
                      {subscription.credits.uploads_used}/{subscription.credits.uploads_limit}
                    </Text>
                  </View>
                  <View style={[styles.progressBarBg, { backgroundColor: theme.isDark ? '#374151' : '#E5E7EB' }]}>
                    <View style={[
                      styles.progressBarFill, 
                      { 
                        width: `${Math.min(100, (subscription.credits.uploads_used / Math.max(1, subscription.credits.uploads_limit)) * 100)}%`,
                        backgroundColor: subscription.credits.uploads_used >= subscription.credits.uploads_limit ? '#EF4444' : '#6C4CFD',
                      }
                    ]} />
                  </View>
                </View>

                {/* Diagrams */}
                <View style={styles.creditRow}>
                  <View style={styles.creditLabelRow}>
                    <Ionicons name="image-outline" size={14} color={theme.colors.secondaryText} />
                    <Text style={[styles.creditLabel, { color: theme.colors.secondaryText }]}>Diagrams</Text>
                    <Text style={[styles.creditCount, { color: theme.colors.primaryText }]}>
                      {subscription.credits.diagrams_used}/{subscription.credits.diagrams_limit}
                    </Text>
                  </View>
                  <View style={[styles.progressBarBg, { backgroundColor: theme.isDark ? '#374151' : '#E5E7EB' }]}>
                    <View style={[
                      styles.progressBarFill, 
                      { 
                        width: `${Math.min(100, (subscription.credits.diagrams_used / Math.max(1, subscription.credits.diagrams_limit)) * 100)}%`,
                        backgroundColor: subscription.credits.diagrams_used >= subscription.credits.diagrams_limit ? '#EF4444' : '#10B981',
                      }
                    ]} />
                  </View>
                </View>

                {/* Voice Minutes */}
                <View style={styles.creditRow}>
                  <View style={styles.creditLabelRow}>
                    <Ionicons name="mic-outline" size={14} color={theme.colors.secondaryText} />
                    <Text style={[styles.creditLabel, { color: theme.colors.secondaryText }]}>Voice</Text>
                    <Text style={[styles.creditCount, { color: theme.colors.primaryText }]}>
                      {subscription.credits.voice_minutes_used}/{subscription.credits.voice_minutes_limit} min
                    </Text>
                  </View>
                  <View style={[styles.progressBarBg, { backgroundColor: theme.isDark ? '#374151' : '#E5E7EB' }]}>
                    <View style={[
                      styles.progressBarFill, 
                      { 
                        width: `${Math.min(100, (subscription.credits.voice_minutes_used / Math.max(1, subscription.credits.voice_minutes_limit)) * 100)}%`,
                        backgroundColor: subscription.credits.voice_minutes_used >= subscription.credits.voice_minutes_limit ? '#EF4444' : '#F59E0B',
                      }
                    ]} />
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.colors.secondaryBackground, shadowColor: theme.colors.border }]}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.iconBackground }]}>
              <UserIcon />
            </View>
            <Text style={[styles.menuItemText, { color: theme.colors.primaryText }]}>Your Profile</Text>
            <Text style={[styles.menuItemArrow, { color: theme.colors.secondaryText }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.colors.secondaryBackground, shadowColor: theme.colors.border }]}
            onPress={() => navigation.navigate('SelectLearningStyleScreen')}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.iconBackground }]}>
              <BookIcon />
            </View>
            <Text style={[styles.menuItemText, { color: theme.colors.primaryText }]}>Learning Preferences</Text>
            <Text style={[styles.menuItemArrow, { color: theme.colors.secondaryText }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.colors.secondaryBackground, shadowColor: theme.colors.border }]}
            onPress={() => navigation.navigate('SelectStudyGoalScreen')}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.iconBackground }]}>
              <TargetIcon />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, { color: theme.colors.primaryText }]}>Study Goal</Text>
              {selectedGoals && selectedGoals.length > 0 && (
                <Text style={[styles.selectedGoalsText, { color: theme.colors.secondaryText }]}>
                  {selectedGoals.length} selected
                </Text>
              )}
            </View>
            <Text style={[styles.menuItemArrow, { color: theme.colors.secondaryText }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.colors.secondaryBackground, shadowColor: theme.colors.border }]}
            onPress={() => navigation.navigate('FoldersScreen')}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.iconBackground }]}>
              <Ionicons name="folder-outline" size={24} color="#6C63FF" />
            </View>
            <Text style={[styles.menuItemText, { color: theme.colors.primaryText }]}>Notes</Text>
            <Text style={[styles.menuItemArrow, { color: theme.colors.secondaryText }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.colors.secondaryBackground, shadowColor: theme.colors.border }]}
            onPress={() => navigation.navigate('MilestonesScreen')}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.iconBackground }]}>
              <Ionicons name="trophy-outline" size={24} color="#F59E0B" />
            </View>
            <Text style={[styles.menuItemText, { color: theme.colors.primaryText }]}>Milestones & Badges</Text>
            <Text style={[styles.menuItemArrow, { color: theme.colors.secondaryText }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.colors.secondaryBackground, shadowColor: theme.colors.border }]}
            onPress={() => navigation.navigate('VoiceStyleScreen')}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.iconBackground }]}>
              <MicIcon />
            </View>
            <Text style={[styles.menuItemText, { color: theme.colors.primaryText }]}>Voice Style</Text>
            <Text style={[styles.menuItemArrow, { color: theme.colors.secondaryText }]}>›</Text>
          </TouchableOpacity>

          <View style={[styles.menuItem, { backgroundColor: theme.colors.secondaryBackground, shadowColor: theme.colors.border }]}>
            <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.iconBackground }]}>
              <PaintIcon />
            </View>
            <Text style={[styles.menuItemText, { color: theme.colors.primaryText }]}>Dark/Light Mode</Text>
            <Switch
              value={isDarkMode}
              onValueChange={handleDarkModeToggle}
              trackColor={{ false: '#E5E7EB', true: '#818CF8' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E5E7EB"
            />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.colors.secondaryBackground }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" style={styles.logoutIcon} />
          <Text style={[styles.logoutText, { color: theme.colors.primaryText }]}>Logout</Text>
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity style={[styles.deleteButton, { backgroundColor: theme.colors.secondaryBackground }]} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={22} color="#DC2626" style={styles.deleteIcon} />
          <Text style={[styles.deleteText, { color: '#DC2626' }]}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
      </SafeAreaView>

      <BottomNavigation activeTab="profile" />
    </View>
  );
};

// Profile Screen
const ProfileScreen = ({ navigation }) => {
  const { theme } = useTheme();
  
  // Icon components with theme awareness
  const UserIcon = () => <Ionicons name="person-outline" size={22} color={theme.isDark ? '#9CA3AF' : '#555'} />;
  const MailIcon = () => <Ionicons name="mail-outline" size={22} color={theme.isDark ? '#9CA3AF' : '#555'} />;
  const LockIcon = () => <Ionicons name="lock-closed-outline" size={22} color={theme.isDark ? '#9CA3AF' : '#555'} />;
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    password: '',
    confirmPassword: '',
    avatar: 'https://picsum.photos/seed/profile/100/100.jpg',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load real user profile
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const result = await fetchUserProfile();
      if (result?.data?.profile) {
        const avatarUrl = result.data.profile.avatar_url 
          ? `${BACKEND_API_URL}${result.data.profile.avatar_url}` 
          : null;
        
        setProfile({
          name: result.data.profile.display_name || result.data.profile.full_name || '',
          email: result.data.profile.email || '',
          phone: result.data.profile.phone_number || '',
          bio: result.data.profile.bio || '',
          password: '',
          confirmPassword: '',
          avatar: avatarUrl,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (profile.password && profile.password !== profile.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    try {
      setSaving(true);
      
      const updateData = {
        display_name: profile.name,
        phone_number: profile.phone,
        bio: profile.bio,
      };
      
      await updateUserProfile(updateData);
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Upload avatar
        setSaving(true);
        const uploadResult = await uploadAvatar(imageUri);
        
        if (uploadResult?.data?.avatar_url) {
          // Construct full URL
          const fullAvatarUrl = `${BACKEND_API_URL}${uploadResult.data.avatar_url}`;
          setProfile({ ...profile, avatar: fullAvatarUrl });
          Alert.alert('Success', 'Profile photo updated successfully');
          
          // Reload profile to get updated data
          await loadUserProfile();
        }
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', error.message || 'Failed to upload profile photo');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAvatar = async () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await removeAvatar();
              setProfile({ ...profile, avatar: null }); // Set to null instead of placeholder
              Alert.alert('Success', 'Profile photo removed');
              await loadUserProfile();
            } catch (error) {
              console.error('Error removing avatar:', error);
              Alert.alert('Error', error.message || 'Failed to remove profile photo');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.profileContainer, { backgroundColor: theme.colors.headerBackground }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.profileHeader, { backgroundColor: theme.colors.headerBackground }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.isDark ? '#334155' : '#E5E7EB' }]}>
          <Text style={[styles.backArrow, { color: theme.colors.headerText }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.profileHeaderTitle, { color: theme.colors.headerText }]}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={[styles.profileContent, { backgroundColor: theme.colors.primaryBackground }]} 
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Image */}
        <View style={styles.profileImageContainer}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.avatarPlaceholder, { backgroundColor: theme.colors.primaryButton }]}>
              <Text style={styles.avatarInitialLarge}>
                {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
          <TouchableOpacity 
            style={[styles.editIconButton, { backgroundColor: theme.colors.secondaryBackground, borderColor: theme.colors.primaryBackground }]}
            onPress={handlePickImage}
            disabled={saving}
          >
            <Text style={styles.editIconText}>✏️</Text>
          </TouchableOpacity>
          {profile.avatar && (
            <TouchableOpacity
              style={[styles.removeAvatarButton, { backgroundColor: '#EF4444' }]}
              onPress={handleRemoveAvatar}
              disabled={saving}
            >
              <Ionicons name="trash-outline" size={16} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
        
        {saving && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={[styles.uploadingText, { color: theme.colors.secondaryText }]}>
              Updating photo...
            </Text>
          </View>
        )}
        
        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.primaryText }]}>Full Name</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.colors.secondaryBackground, borderColor: theme.colors.border }]}>
            <UserIcon />
            <TextInput
              style={[styles.profileInput, { color: theme.colors.primaryText }]}
              value={profile.name}
              onChangeText={(text) => setProfile({ ...profile, name: text })}
              placeholder="Full Name"
              placeholderTextColor={theme.isDark ? '#6B7280' : '#9CA3AF'}
            />
          </View>
        </View>
        
        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.primaryText }]}>Email</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.colors.secondaryBackground, borderColor: theme.colors.border }]}>
            <MailIcon />
            <TextInput
              style={[styles.profileInput, { color: theme.colors.primaryText }]}
              value={profile.email}
              editable={false}
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor={theme.isDark ? '#6B7280' : '#9CA3AF'}
            />
          </View>
          <Text style={[styles.helperText, { color: theme.colors.secondaryText }]}>Email cannot be changed here</Text>
        </View>
        
        {/* Phone Number */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.primaryText }]}>Phone Number</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.colors.secondaryBackground, borderColor: theme.colors.border }]}>
            <Ionicons name="call-outline" size={22} color={theme.isDark ? '#9CA3AF' : '#555'} />
            <TextInput
              style={[styles.profileInput, { color: theme.colors.primaryText }]}
              value={profile.phone}
              onChangeText={(text) => setProfile({ ...profile, phone: text })}
              keyboardType="phone-pad"
              placeholder="+1 234 567 8900"
              placeholderTextColor={theme.isDark ? '#6B7280' : '#9CA3AF'}
            />
          </View>
        </View>
        
        {/* Bio */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.primaryText }]}>Bio</Text>
          <View style={[styles.inputWrapper, styles.textAreaWrapper, { backgroundColor: theme.colors.secondaryBackground, borderColor: theme.colors.border }]}>
            <TextInput
              style={[styles.profileInput, styles.textArea, { color: theme.colors.primaryText }]}
              value={profile.bio}
              onChangeText={(text) => setProfile({ ...profile, bio: text })}
              placeholder="Tell us about yourself..."
              placeholderTextColor={theme.isDark ? '#6B7280' : '#9CA3AF'}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
        
        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.primaryText }]}>Password (Optional)</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.colors.secondaryBackground, borderColor: theme.colors.border }]}>
            <LockIcon />
            <TextInput
              style={[styles.profileInput, { color: theme.colors.primaryText }]}
              value={profile.password}
              onChangeText={(text) => setProfile({ ...profile, password: text })}
              secureTextEntry={!showPassword}
              placeholder="Leave blank to keep current"
              placeholderTextColor={theme.isDark ? '#6B7280' : '#9CA3AF'}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Confirm Password */}
        {profile.password.length > 0 && (
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.primaryText }]}>Confirm Password</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.colors.secondaryBackground, borderColor: theme.colors.border }]}>
            <LockIcon />
            <TextInput
              style={[styles.profileInput, { color: theme.colors.primaryText }]}
              value={profile.confirmPassword}
              onChangeText={(text) => setProfile({ ...profile, confirmPassword: text })}
              secureTextEntry={!showConfirmPassword}
              placeholder="Confirm Password"
              placeholderTextColor={theme.isDark ? '#6B7280' : '#9CA3AF'}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        )}

        {/* Save Button */}
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// Select Leader Screen
const SelectLeaderScreen = ({ navigation }) => {
  const [leaders, setLeaders] = useState([]);
  const [selectedLeader, setSelectedLeader] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLeaders().then((data) => {
      setLeaders(data);
      setLoading(false);
    });
  }, []);

  const handleSelectLeader = (leader) => {
    setSelectedLeader(leader);
  };

  const handleDone = () => {
    if (selectedLeader) {
      Alert.alert('Success', `Leader ${selectedLeader.name} selected successfully`);
      navigation.goBack();
    } else {
      Alert.alert('Error', 'Please select a leader');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Leader</Text>
        <TouchableOpacity onPress={handleDone}>
          <Text style={styles.headerButton}>Done</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <FlatList
          data={leaders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.listItem,
                selectedLeader?.id === item.id && styles.selectedItem,
              ]}
              onPress={() => handleSelectLeader(item)}
            >
              <Image source={{ uri: item.avatar }} style={styles.listItemImage} />
              <View style={styles.listItemContent}>
                <Text style={styles.listItemName}>{item.name}</Text>
                <Text style={styles.listItemRole}>{item.role}</Text>
              </View>
              {selectedLeader?.id === item.id && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
};

// Select Student Screen
const SelectStudentScreen = ({ navigation }) => {
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStudents().then((data) => {
      setStudents(data);
      setLoading(false);
    });
  }, []);

  const handleToggleStudent = (student) => {
    const isSelected = selectedStudents.some((s) => s.id === student.id);
    if (isSelected) {
      setSelectedStudents(selectedStudents.filter((s) => s.id !== student.id));
    } else {
      setSelectedStudents([...selectedStudents, student]);
    }
  };

  const handleDone = () => {
    if (selectedStudents.length > 0) {
      Alert.alert(
        'Success',
        `${selectedStudents.length} student(s) selected successfully`
      );
      navigation.goBack();
    } else {
      Alert.alert('Error', 'Please select at least one student');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Student</Text>
        <TouchableOpacity onPress={handleDone}>
          <Text style={styles.headerButton}>Done</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedStudents.some((s) => s.id === item.id);
            return (
              <TouchableOpacity
                style={[
                  styles.listItem,
                  isSelected && styles.selectedItem,
                ]}
                onPress={() => handleToggleStudent(item)}
              >
                <Image source={{ uri: item.avatar }} style={styles.listItemImage} />
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemName}>{item.name}</Text>
                  <Text style={styles.listItemRole}>{item.grade}</Text>
                </View>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  // Common Styles
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  

  
  // Settings/Me Screen Styles
  topHeader: {
    paddingTop: 5,
    paddingBottom: 20,
    alignItems: 'center',
  },
  topHeaderTitle: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  scrollContent: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 25,
    paddingHorizontal: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  profileAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarInitialLarge: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },
  editButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    fontSize: 20,
  },
  // Subscription Card styles
  subscriptionCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  subPlanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subPlanName: {
    fontSize: 16,
    fontWeight: '700',
  },
  upgradeButton: {
    backgroundColor: '#6C4CFD',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  creditsContainer: {
    gap: 10,
  },
  creditRow: {
    gap: 5,
  },
  creditLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creditLabel: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  creditCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  menuContainer: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  menuItemContent: {
    flex: 1,
  },
  selectedGoalsText: {
    fontSize: 12,
    marginTop: 2,
  },
  menuItemArrow: {
    fontSize: 24,
    fontWeight: '300',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  logoutIcon: {
    fontSize: 22,
    marginRight: 15,
    color: '#EF4444',
  },
  logoutText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 30,
    borderWidth: 1.5,
    borderColor: '#DC2626',
  },
  deleteIcon: {
    marginRight: 15,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Profile Screen Styles
  profileContainer: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 24,
  },
  profileHeaderTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  profileContent: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
    paddingHorizontal: 20,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  editIconButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editIconText: {
    fontSize: 18,
  },
  removeAvatarButton: {
    position: 'absolute',
    bottom: 0,
    left: '35%',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  uploadingText: {
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  profileInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    marginLeft: 12,
  },
  textArea: {
    marginLeft: 0,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  eyeIcon: {
    fontSize: 20,
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  
  // Select Screens Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerButton: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedItem: {
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  listItemImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  listItemContent: {
    flex: 1,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  listItemRole: {
    fontSize: 14,
    color: '#6B7280',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

});

export { ProfileScreen, SelectLeaderScreen, SelectStudentScreen };