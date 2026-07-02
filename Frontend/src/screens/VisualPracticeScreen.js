import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getVisualById, submitVisualAnswer } from '../api/studyMaterial';
import { BACKEND_API_URL } from '../config/api';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = BACKEND_API_URL;

const VisualPracticeScreen = ({ navigation, route }) => {
  const { visual: visualData } = route.params || {};
  
  console.log('🎬 VisualPracticeScreen mounted');
  console.log('📦 Initial visual data:', JSON.stringify(visualData, null, 2));
  
  // Helper function to convert old format to new slot-based format
  const convertOldVisualFormat = (oldVisual) => {
    if (!oldVisual) {
      console.log('⚠️ No visual data to convert');
      return null;
    }
    
    console.log('🔍 Checking if conversion needed...');
    console.log('   - Has slots:', !!oldVisual.slots, 'Count:', oldVisual.slots?.length || 0);
    console.log('   - Has labels:', !!oldVisual.labels, 'Count:', oldVisual.labels?.length || 0);
    
    // Check if already has slots
    if (oldVisual.slots && oldVisual.slots.length > 0) {
      console.log('✅ Visual already has slots, no conversion needed');
      return oldVisual;
    }
    
    // Check if has old labels to convert
    if (!oldVisual.labels || oldVisual.labels.length === 0) {
      console.log('⚠️ No labels to convert');
      return oldVisual;
    }
    
    console.log('🔄 Converting old visual format on mount...');
    
    const convertedLabels = oldVisual.labels.map((oldLabel, index) => ({
      id: oldLabel.id,
      label_id: `label_${index + 1}`,
      text: oldLabel.name || oldLabel.text || `Label ${index + 1}`,
      hint: oldLabel.description || 'No description available',
      short_hint: oldLabel.name || `Label ${index + 1}`,
    }));
    
    const convertedSlots = oldVisual.labels.map((oldLabel, index) => {
      const angle = (index / oldVisual.labels.length) * Math.PI * 2;
      const radius = 0.4;
      const x = 0.5 + Math.cos(angle) * radius;
      const y = 0.5 + Math.sin(angle) * radius;
      
      return {
        id: oldLabel.id,
        slot_id: `slot_${index + 1}`,
        x: Math.max(0.1, Math.min(0.9, x)),
        y: Math.max(0.1, Math.min(0.9, y)),
        correct_label_id: `label_${index + 1}`,
        is_pre_labeled: false,
        is_required: true,
      };
    });
    
    console.log('✅ Converted labels:', convertedLabels);
    console.log('✅ Converted slots:', convertedSlots);
    
    return {
      ...oldVisual,
      labels: convertedLabels,
      slots: convertedSlots,
    };
  };
  
  const [visual, setVisual] = useState(convertOldVisualFormat(visualData));
  
  console.log('🎯 Initial visual state:', visual ? 'SET' : 'NULL');
  console.log('🎯 Visual has slots:', visual?.slots?.length || 0);
  console.log('🎯 Visual has labels:', visual?.labels?.length || 0);
  const [loading, setLoading] = useState(!visualData?.id);
  const [activeSlotId, setActiveSlotId] = useState(null);
  const [slotAnswers, setSlotAnswers] = useState({}); // slotId -> { labelId, isCorrect }
  const [usedLabelIds, setUsedLabelIds] = useState(new Set());
  const [score, setScore] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps] = useState(2); // Can be dynamic
  
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visual?.id && visualData?.id) {
      loadVisualDetails();
    }
  }, []);

  useEffect(() => {
    console.log('🔄 Active slot ID changed to:', activeSlotId);
  }, [activeSlotId]);

  const loadVisualDetails = async () => {
    try {
      setLoading(true);
      const response = await getVisualById(visualData.id);
      
      if (response.status === 'success' && response.data) {
        console.log('📊 Visual data loaded:', JSON.stringify(response.data, null, 2));
        console.log('📍 Slots count:', response.data.slots?.length || 0);
        console.log('🏷️ Labels count:', response.data.labels?.length || 0);
        
        // BACKWARD COMPATIBILITY: Convert old visual format to new slot-based format
        let visualWithSlots = { ...response.data };
        
        // Check if this is an old visual (has visual_labels but no slots)
        const hasNoSlots = !visualWithSlots.slots || visualWithSlots.slots.length === 0;
        const hasLabels = visualWithSlots.labels && visualWithSlots.labels.length > 0;
        
        console.log('🔍 Conversion check:', { hasNoSlots, hasLabels, shouldConvert: hasNoSlots && hasLabels });
        
        if (hasNoSlots && hasLabels) {
          
          console.log('🔄 Converting old visual format to slot-based format...');
          
          // Convert old labels to new format
          const convertedLabels = visualWithSlots.labels.map((oldLabel, index) => ({
            id: oldLabel.id,
            label_id: `label_${index + 1}`,
            text: oldLabel.name || oldLabel.text || `Label ${index + 1}`,
            hint: oldLabel.description || 'No description available',
            short_hint: oldLabel.name || `Label ${index + 1}`,
          }));
          
          // Create slots from old labels
          const convertedSlots = visualWithSlots.labels.map((oldLabel, index) => {
            // Calculate positions around the image (evenly distributed)
            const angle = (index / visualWithSlots.labels.length) * Math.PI * 2;
            const radius = 0.4;
            const x = 0.5 + Math.cos(angle) * radius;
            const y = 0.5 + Math.sin(angle) * radius;
            
            return {
              id: oldLabel.id,
              slot_id: `slot_${index + 1}`,
              x: Math.max(0.1, Math.min(0.9, x)),
              y: Math.max(0.1, Math.min(0.9, y)),
              correct_label_id: `label_${index + 1}`,
              is_pre_labeled: false, // All interactive for old visuals
              is_required: true,
            };
          });
          
          visualWithSlots.labels = convertedLabels;
          visualWithSlots.slots = convertedSlots;
          
          console.log('✅ Converted labels:', convertedLabels);
          console.log('✅ Converted slots:', convertedSlots);
        }
        
        setVisual(visualWithSlots);
      }
    } catch (error) {
      console.error('❌ Failed to load visual:', error);
      Alert.alert('Error', 'Failed to load visual content');
    } finally {
      setLoading(false);
    }
  };

  // Get slots from visual data
  const slots = visual?.slots || [];
  const labels = visual?.labels || [];
  const imageUrl = visual?.image_url ? `${API_BASE_URL}${visual.image_url}` : null;

  // Calculate progress
  const requiredSlots = slots.filter(s => s.is_required && !s.is_pre_labeled);
  const correctCount = requiredSlots.filter(s => slotAnswers[s.slot_id || s.id]?.isCorrect).length;
  const progress = requiredSlots.length > 0 ? correctCount / requiredSlots.length : 0;

  // Handle slot selection
  const handleSlotPress = (slot) => {
    const slotId = slot.slot_id || slot.id;
    console.log('🎯 Slot pressed:', slot);
    console.log('🆔 Slot ID:', slotId);
    console.log('🔒 Is pre-labeled:', slot.is_pre_labeled);
    console.log('✅ Already correct:', slotAnswers[slotId]?.isCorrect);
    
    if (slot.is_pre_labeled || slotAnswers[slotId]?.isCorrect) {
      // Cannot interact with pre-labeled or correctly answered slots
      console.log('⛔ Slot not interactive');
      return;
    }
    
    console.log('✨ Setting active slot ID to:', slotId);
    setActiveSlotId(slotId);
    
    // Bounce animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  // Handle chip/label selection
  const handleLabelChipPress = async (label) => {
    console.log('🎯 Label chip pressed:', label);
    
    if (!activeSlotId) {
      console.log('⚠️ No active slot selected');
      Alert.alert('Select a slot', 'Please tap an empty label box on the diagram first');
      return;
    }

    const activeSlot = slots.find(s => (s.slot_id || s.id) === activeSlotId);
    if (!activeSlot) {
      console.log('⚠️ Active slot not found');
      return;
    }

    const isCorrect = activeSlot.correct_label_id === label.label_id;

    console.log('🎯 Checking answer:', {
      slotId: activeSlotId,
      labelId: label.label_id,
      labelText: label.text,
      correctLabelId: activeSlot.correct_label_id,
      isCorrect
    });

    // Update slot answer
    const newSlotAnswers = {
      ...slotAnswers,
      [activeSlotId]: {
        labelId: label.label_id,
        isCorrect,
        text: label.text,
      }
    };
    
    console.log('📝 Updated slot answers:', newSlotAnswers);
    setSlotAnswers(newSlotAnswers);

    if (isCorrect) {
      setScore(score + 1);
      setUsedLabelIds(new Set([...usedLabelIds, label.label_id]));
      setActiveSlotId(null); // Deselect after correct answer
      
      // Submit to API
      try {
        await submitVisualAnswer(visual.id, null, label.text, 0, activeSlotId);
        console.log('✅ Answer submitted:', { slotId: activeSlotId, labelText: label.text });
      } catch (error) {
        console.error('❌ Failed to submit answer:', error);
      }
    } else {
      // Show error feedback
      Alert.alert('Incorrect', 'Try again!', [{ text: 'OK' }]);
      
      // Clear incorrect answer after brief delay
      setTimeout(() => {
        const clearedAnswers = { ...newSlotAnswers };
        delete clearedAnswers[activeSlotId];
        setSlotAnswers(clearedAnswers);
      }, 1000);
    }
  };

  // Get label for a slot
  const getSlotLabel = (slot) => {
    const slotId = slot.slot_id || slot.id;
    
    if (slot.is_pre_labeled) {
      const label = labels.find(l => l.label_id === slot.correct_label_id);
      return label?.text || '';
    }
    
    const answer = slotAnswers[slotId];
    const labelText = answer?.text || '';
    
    console.log('🏷️ Getting slot label:', {
      slotId,
      hasAnswer: !!answer,
      answerText: answer?.text,
      isCorrect: answer?.isCorrect,
      returning: labelText
    });
    
    return labelText;
  };

  // Get slot border color
  const getSlotBorderColor = (slot) => {
    const slotId = slot.slot_id || slot.id;
    const isActive = slotId === activeSlotId;
    const answer = slotAnswers[slotId];
    
    if (isActive) {
      console.log('🟣 Slot is ACTIVE:', slotId);
      return '#6e61ca'; // Purple for selected
    }
    
    if (answer?.isCorrect) return '#4CAF50'; // Green for correct
    if (answer && !answer.isCorrect) return '#F44336'; // Red for incorrect
    
    return slot.is_pre_labeled ? '#9E9E9E' : '#BDBDBD'; // Grey for pre-labeled, light grey for empty
  };

  const handleNext = () => {
    if (progress >= 1) {
      // All required slots completed
      navigation.goBack();
    } else {
      Alert.alert('Not Complete', 'Please fill all required labels before continuing');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6e61ca" />
        <Text style={styles.loadingText}>Loading visual...</Text>
      </View>
    );
  }

  if (!visual) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
        <Text style={styles.errorText}>Visual not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerSubtitle}>{visual.subject || 'Biology'}</Text>
          <Text style={styles.headerTitle}>{visual.title}</Text>
        </View>
        
        <TouchableOpacity style={styles.headerFavoriteBtn}>
          <Ionicons name="star-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tab Segment + Progress */}
      <View style={styles.progressSection}>
        <View style={styles.tabSegment}>
          <View style={[styles.tabItem, styles.tabItemActive]}>
            <Text style={styles.tabTextActive}>Visual</Text>
          </View>
          <View style={styles.tabItem}>
            <Text style={styles.tabText}>Practice</Text>
          </View>
        </View>
        
        <View style={styles.stepRow}>
          <Text style={styles.stepText}>{currentStep}/{totalSteps}</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        scrollEnabled={true}
      >
        {/* Diagram with Slots */}
        <View style={styles.diagramContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.diagramImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={64} color="#ccc" />
              <Text style={styles.placeholderText}>No image available</Text>
            </View>
          )}
          
          {/* Render all slots */}
          {slots.map(slot => {
            const slotId = slot.slot_id || slot.id;
            return (
            <TouchableOpacity
              key={slotId}
              style={[
                styles.slotBox,
                {
                  left: `${slot.x * 100}%`,
                  top: `${slot.y * 100}%`,
                  borderColor: getSlotBorderColor(slot),
                  borderWidth: slotId === activeSlotId ? 3 : 2,
                  backgroundColor: slot.is_pre_labeled ? '#F5F5F5' : '#FFFFFF',
                }
              ]}
              onPress={() => handleSlotPress(slot)}
              disabled={slot.is_pre_labeled || slotAnswers[slotId]?.isCorrect}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.slotText,
                { color: getSlotLabel(slot) ? '#333' : '#999' }
              ]}>
                {getSlotLabel(slot) || '?'}
              </Text>
              
              {/* Connector line to image */}
              <View style={styles.connectorLine} />
            </TouchableOpacity>
            );
          })}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Labels</Text>
            <Text style={styles.statValue}>{correctCount}/{requiredSlots.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Score</Text>
            <Text style={styles.statValue}>{score}</Text>
          </View>
        </View>

        {/* Label Elements Section */}
        <View style={styles.labelsSection}>
          <Text style={styles.labelsSectionTitle}>Label Elements</Text>
          <Text style={styles.labelsSectionSubtitle}>
            {activeSlotId 
              ? 'Select the correct label for the highlighted slot' 
              : 'Tap an empty slot on the diagram to begin'}
          </Text>
          
          <View style={styles.labelChipsContainer}>
            {labels.map((label, index) => {
              const isUsed = usedLabelIds.has(label.label_id);
              console.log(`🏷️ Rendering label ${index}:`, { 
                id: label.id, 
                label_id: label.label_id, 
                text: label.text,
                isUsed 
              });
              
              return (
                <TouchableOpacity
                  key={label.id || label.label_id || `label_${index}`}
                  style={[
                    styles.labelChip,
                    isUsed && styles.labelChipUsed
                  ]}
                  onPress={() => {
                    console.log('🖱️ TouchableOpacity onPress fired for:', label.text);
                    handleLabelChipPress(label);
                  }}
                  disabled={isUsed}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text 
                    style={[
                      styles.labelChipText,
                      isUsed && styles.labelChipTextUsed
                    ]}
                  >
                    {label.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.previousBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.previousBtnText}>Previous</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.nextBtn,
            progress < 1 && styles.nextBtnDisabled
          ]}
          onPress={handleNext}
          disabled={progress < 1}
        >
          <Text style={styles.nextBtnText}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Floating Helper Button */}
      <TouchableOpacity 
        style={styles.floatingHelper}
        onPress={() => console.log('Helper button pressed')}
      >
        <Image
          source={require('../assets/images/mascot.png')}
          style={styles.helperAvatar}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  backButton: {
    marginTop: 24,
    backgroundColor: '#6e61ca',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  
  // Header
  header: {
    backgroundColor: '#191B2F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 6,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#B8A7FF',
    fontFamily: 'Poppins-Regular',
  },
  headerTitle: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  headerFavoriteBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Progress Section
  progressSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  tabSegment: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabItemActive: {
    backgroundColor: '#6e61ca',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins-Medium',
  },
  tabTextActive: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins-Medium',
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6e61ca',
    borderRadius: 4,
  },
  
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  
  // Diagram
  diagramContainer: {
    width: width - 32,
    height: width * 1.2,
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    position: 'relative',
  },
  diagramImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    fontFamily: 'Poppins-Regular',
  },
  
  // Slot Box
  slotBox: {
    position: 'absolute',
    minWidth: 80,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#BDBDBD',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  slotText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
  },
  connectorLine: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    width: 2,
    height: 8,
    backgroundColor: '#BDBDBD',
  },
  
  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    marginHorizontal: 6,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  statValue: {
    fontSize: 24,
    color: '#6e61ca',
    fontFamily: 'Poppins-Bold',
    marginTop: 4,
  },
  
  // Labels Section
  labelsSection: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },
  labelsSectionTitle: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 4,
  },
  labelsSectionSubtitle: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Poppins-Regular',
    marginBottom: 16,
  },
  labelChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginVertical: -4,
  },
  labelChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F0EBFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6e61ca',
    margin: 4,
    minHeight: 40,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelChipUsed: {
    backgroundColor: '#E0E0E0',
    borderColor: '#9E9E9E',
  },
  labelChipText: {
    fontSize: 14,
    color: '#6e61ca',
    fontFamily: 'Poppins-Medium',
  },
  labelChipTextUsed: {
    color: '#9E9E9E',
    textDecorationLine: 'line-through',
  },
  
  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    justifyContent: 'space-between',
  },
  previousBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 6,
  },
  previousBtnText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins-SemiBold',
  },
  nextBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#6e61ca',
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 6,
  },
  nextBtnDisabled: {
    backgroundColor: '#BDBDBD',
  },
  nextBtnText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  
  // Floating Helper
  floatingHelper: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 60,
    height: 60,
    backgroundColor: '#FFD54F',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  helperAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
});

export default VisualPracticeScreen;
