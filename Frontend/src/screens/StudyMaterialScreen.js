import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import LeftChatBubble from '../components/LeftChatBubble';
import { useTheme } from '../contexts/ThemeContext';
import { getMCQsByUpload, getFlashcardsByUpload, getVisualsByUpload } from '../api/studyMaterial';
import { getFavorites, addFavorite, removeFavorite } from '../api/favorites';

const StudyMaterialScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { uploadId, mcqs: initialMCQs, flashcards: initialFlashcards, visuals: initialVisuals } = route.params || {};
  const [loading, setLoading] = useState(!initialMCQs && !initialFlashcards && !initialVisuals);
  const [materials, setMaterials] = useState([]);
  const [error, setError] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(new Set());

  useEffect(() => {
    fetchFavorites();
    if (initialMCQs && initialFlashcards && initialVisuals) {
      // Use data from AnalyzingScreen
      loadInitialData();
    } else if (uploadId) {
      // Fetch from API
      fetchMaterials();
    }
  }, [uploadId]);

  const fetchFavorites = async () => {
    try {
      const data = await getFavorites();
      if (data && data.favorites) {
        // Create a Set of favorite IDs in format "type:id"
        const favSet = new Set(
          data.favorites.map(fav => `${fav.activity_type}:${fav.activity_id}`)
        );
        setFavoriteIds(favSet);
        console.log('⭐ Favorites loaded:', favSet.size);
      }
    } catch (error) {
      console.error('❌ Error fetching favorites:', error);
    }
  };

  const toggleBookmark = async (item) => {
    const favoriteKey = `${item.type}:${item.id.replace(/^(mcq_|flashcard_|visual_)/, '')}`;
    const isFavorited = favoriteIds.has(favoriteKey);

    try {
      const activityId = item.id.replace(/^(mcq_|flashcard_|visual_)/, '');
      
      if (isFavorited) {
        // Remove from favorites
        await removeFavorite(item.type, activityId);
        const newFavorites = new Set(favoriteIds);
        newFavorites.delete(favoriteKey);
        setFavoriteIds(newFavorites);
        console.log('✅ Removed from favorites:', item.subject);
      } else {
        // Add to favorites
        await addFavorite(item.type, activityId);
        const newFavorites = new Set(favoriteIds);
        newFavorites.add(favoriteKey);
        setFavoriteIds(newFavorites);
        console.log('✅ Added to favorites:', item.subject);
      }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
    }
  };

  const loadInitialData = () => {
    const items = [];

    // Add MCQs
    if (initialMCQs?.mcqs?.length > 0) {
      items.push({
        id: `mcq_${uploadId}`,
        subject: 'MCQ Quiz',
        topic: `${initialMCQs.count} Multiple Choice Questions`,
        progress: 0,
        correct: 0,
        incorrect: 0,
        type: 'mcq',
        data: initialMCQs,
      });
    }

    // Add Flashcards
    if (initialFlashcards?.flashcards?.length > 0) {
      items.push({
        id: `flashcard_${uploadId}`,
        subject: 'Flashcards',
        topic: `${initialFlashcards.count} Flash Cards`,
        progress: 0,
        correct: 0,
        incorrect: 0,
        type: 'flashcard',
        data: initialFlashcards,
      });
    }

    // Add Visuals
    if (initialVisuals?.visuals?.length > 0) {
      initialVisuals.visuals.forEach((visual, index) => {
        items.push({
          id: `visual_${visual.id}`,
          subject: visual.subject || 'Visual',
          topic: visual.title,
          progress: 0,
          correct: 0,
          incorrect: 0,
          type: 'visual',
          data: visual,
        });
      });
    }

    setMaterials(items);
    setLoading(false);
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      
      // Fetch all materials in parallel
      const [mcqResponse, flashcardResponse, visualResponse] = await Promise.all([
        getMCQsByUpload(uploadId).catch(() => null),
        getFlashcardsByUpload(uploadId).catch(() => null),
        getVisualsByUpload(uploadId).catch(() => null),
      ]);

      const items = [];

      // Add MCQs
      if (mcqResponse?.data?.mcqs?.length > 0) {
        items.push({
          id: `mcq_${uploadId}`,
          subject: 'MCQ Quiz',
          topic: `${mcqResponse.data.count} Multiple Choice Questions`,
          progress: 0,
          correct: 0,
          incorrect: 0,
          type: 'mcq',
          data: mcqResponse.data,
        });
      }

      // Add Flashcards
      if (flashcardResponse?.data?.flashcards?.length > 0) {
        items.push({
          id: `flashcard_${uploadId}`,
          subject: 'Flashcards',
          topic: `${flashcardResponse.data.count} Flash Cards`,
          progress: 0,
          correct: 0,
          incorrect: 0,
          type: 'flashcard',
          data: flashcardResponse.data,
        });
      }

      // Add Visuals
      if (visualResponse?.data?.visuals?.length > 0) {
        console.log('📊 Visual response:', JSON.stringify(visualResponse.data, null, 2));
        
        visualResponse.data.visuals.forEach((visual) => {
          console.log('🎨 Adding visual:', {
            id: visual.id,
            title: visual.title,
            labelsCount: visual.labels?.length || 0,
            slotsCount: visual.slots?.length || 0,
            hasOptions: !!visual.options
          });
          
          items.push({
            id: `visual_${visual.id}`,
            subject: visual.subject || 'Visual',
            topic: visual.title,
            progress: 0,
            correct: 0,
            incorrect: 0,
            type: 'visual',
            data: visual, // This includes labels, slots, and options (if any)
          });
        });
      }

      setMaterials(items);
      
      if (items.length === 0) {
        setError('No study materials found. Try generating them again.');
      }

    } catch (err) {
      console.error('❌ Error fetching materials:', err);
      setError(err.message || 'Failed to load study materials');
    } finally {
      setLoading(false);
    }
  };

  const handleCardPress = (item) => {
    console.log('📱 Opening:', item.type, item.subject);
    
    if (item.type === 'mcq') {
      // Navigate to MCQ Quiz Screen
      navigation.navigate('MCQQuizScreen', { mcqs: item.data });
    } else if (item.type === 'flashcard') {
      // Navigate to Flashcard Practice Screen
      navigation.navigate('FlashcardPracticeScreen', { flashcards: item.data });
    } else if (item.type === 'visual') {
      // Navigate to Labeled Visual Screen
      navigation.navigate('LabeledVisualScreen', { visual: item.data });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.isDark ? '#0C1421' : '#F9F9F9' }]} edges={['top']}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={[styles.loadingText, { color: theme.isDark ? '#9CA3AF' : '#666' }]}>Loading study materials...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: theme.isDark ? '#0C1421' : '#F9F9F9' }]} edges={['top']}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            fetchMaterials();
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.isDark ? '#382F74' : '#191B2F' }]} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: theme.isDark ? '#0C1421' : '#F9F9F9' }}>
        {/* Top Header with Gradient */}
        <LinearGradient
          colors={theme.isDark ? ['#382F74', '#22234C'] : ['#191B2F', '#0C1421']}
          style={styles.topHeader}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Study Materials</Text>
            <TouchableOpacity>
              <Ionicons name="create-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.chatRow}>
            <LeftChatBubble message="flash cards, quizzes and visuals from your document" />
          </View>
        </LinearGradient>

        {/* Spacer */}
        <View style={{ height: 6, backgroundColor: theme.isDark ? '#0C1421' : '#F9F9F9' }} />

        {/* Main Content */}
        <ScrollView contentContainerStyle={styles.filesContainer}>
          {materials.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.isDark ? '#9CA3AF' : '#555' }]}>No study materials available</Text>
            </View>
          ) : (
            materials.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, { backgroundColor: theme.isDark ? '#191B2F' : '#fff' }]}
                onPress={() => handleCardPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.leftSection}>
                  <View style={styles.progressCircle}>
                    <Text style={styles.progressText}>{item.progress}%</Text>
                  </View>
                </View>

                <View style={styles.centerSection}>
                  <Text style={[styles.subject, { color: theme.isDark ? '#FFFFFF' : '#243D66' }]}>{item.subject}</Text>
                  <Text style={[styles.topic, { color: theme.isDark ? '#D1D5DB' : '#666' }]}>{item.topic}</Text>
                  <Text style={styles.typeText}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
                  <View style={styles.statsRow}>
                    <Text style={styles.correct}>✅ {item.correct} Correct</Text>
                    <Text style={styles.incorrect}>❌ {item.incorrect} Incorrect</Text>
                  </View>
                </View>

                <View style={styles.rightSection}>
                  <TouchableOpacity 
                    style={[styles.starBox, { backgroundColor: theme.isDark ? '#252b3d' : '#f0f0f0' }]}
                    onPress={() => toggleBookmark(item)}
                  >
                    <Ionicons 
                      name={
                        favoriteIds.has(`${item.type}:${item.id.replace(/^(mcq_|flashcard_|visual_)/, '')}`)
                          ? 'star'
                          : 'star-outline'
                      }
                      size={22} 
                      color="#F9BD09" 
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default StudyMaterialScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#E53935',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  topHeader: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128, 128, 128, 0.3)',
    borderRadius: 8,
  },
  backArrow: {
    fontSize: 22,
    color: '#FFFFFFCC',
    fontFamily: 'Poppins-Regular',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600', fontFamily: 'Poppins-SemiBold' },
  chatRow: { marginTop: 15 },
  chatSection: {
    marginTop: 20,
    paddingLeft: 20,
    paddingRight: 60,
    alignItems: "center",
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#F9F9F9',
  },
  textTabsBox: {
    flexDirection: 'row',
    backgroundColor: '#000',
    borderRadius: 20,
    padding: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tabButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    marginHorizontal: 2,
    backgroundColor: 'transparent',
  },
  activeTabButton: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  tabText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
  },
  iconTabButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
  },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyImage: { width: 180, height: 180, marginBottom: 20 },
  emptyText: { color: '#555', textAlign: 'center', marginBottom: 20 },
  uploadButton: {
    backgroundColor: '#736BEE',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 10,
  },
  uploadButtonText: { color: '#fff', fontWeight: '600' },
  filesContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
  },
  leftSection: { marginRight: 12 },
  progressCircle: {
    width: 55,
    height: 55,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: { color: '#6C63FF', fontWeight: '700', fontSize: 13 },
  centerSection: { flex: 1 },
  subject: { fontWeight: '700', color: '#243D66', fontSize: 15 },
  topic: { color: '#666', fontSize: 13 },
  typeText: { color: '#6C63FF', fontSize: 12, fontWeight: '600', marginTop: 2 },
  statsRow: { flexDirection: 'row', marginTop: 5, gap: 10 },
  correct: { color: '#4CAF50', fontSize: 12 },
  incorrect: { color: '#E53935', fontSize: 12 },
  starBox: { padding: 8, borderRadius: 50 },
  rightSection: { marginLeft: 12 },
});
