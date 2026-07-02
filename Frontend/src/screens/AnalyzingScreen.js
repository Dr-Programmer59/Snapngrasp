import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateAllMaterials } from '../api/studyMaterial';
import { showCreditLimitPopup } from '../utils/creditError';

export default function AnalyzingScreen({ navigation, route }) {
  const { uploadId, subject = 'General' } = route.params || {};
  
  const [stage, setStage] = useState(0);
  const [error, setError] = useState(null);

  const stages = [
    { text: 'Analyzing your notes...', emoji: '📚' },
    { text: 'Generating MCQs...', emoji: '📝' },
    { text: 'Creating flashcards...', emoji: '🃏' },
    { text: 'Designing visual diagrams...', emoji: '🎨' },
    { text: 'Almost done...', emoji: '✨' },
  ];

  useEffect(() => {
    if (!uploadId) {
      setError('No upload ID provided');
      return;
    }

    generateAllMaterialsFn();
  }, [uploadId]);

  const generateAllMaterialsFn = async () => {
    try {
      // Stage 1: Analyzing
      setStage(0);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Stage 2: Generate all in one request
      setStage(1);
      console.log('🚀 Calling generate-all endpoint...');

      const result = await generateAllMaterials(uploadId, { subject });

      const mcqData = result.data?.mcqs?.status === 'success' ? result.data.mcqs.data : null;
      const flashcardData = result.data?.flashcards?.status === 'success' ? result.data.flashcards.data : null;
      const visualData = result.data?.visuals?.status === 'success' ? result.data.visuals.data : null;

      console.log('✅ MCQs:', mcqData?.count || 0);
      console.log('✅ Flashcards:', flashcardData?.count || 0);
      console.log('✅ Visuals:', visualData?.visuals?.length || 0);

      // Stage 5: Finalizing
      setStage(4);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Navigate to Study Material Screen
      console.log('✅ All materials generated, navigating...');
      navigation.replace('StudyMaterialScreen', {
        uploadId,
        mcqs: mcqData,
        flashcards: flashcardData,
        visuals: visualData,
      });

    } catch (err) {
      console.error('❌ Error generating materials:', err);

      // Credit limit error — show upgrade popup and go back
      if (err.statusCode === 403 && (err.code === 'CREDIT_EXHAUSTED' || err.code === 'CREDIT_UNAVAILABLE')) {
        showCreditLimitPopup(err, navigation);
        navigation.goBack();
        return;
      }

      setError(err.message || 'Failed to generate study materials');
      
      // Navigate anyway after 3 seconds
      setTimeout(() => {
        navigation.replace('StudyMaterialScreen', { uploadId });
      }, 3000);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with proper spacing */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analyzing</Text>
      </View>
      
      <View style={styles.content}>
        {/* Emoji Animation */}
        <Text style={styles.emoji}>{stages[stage].emoji}</Text>

        {/* Stage Text */}
        <Text style={styles.stageText}>{stages[stage].text}</Text>

        {/* Error Message */}
        {error && (
          <Text style={styles.errorText}>⚠️ {error}</Text>
        )}

        {/* Loading Indicator */}
        <ActivityIndicator size="large" color="#6e61ca" style={styles.loader} />

        {/* Progress Text */}
        <Text style={styles.progressText}>
          {stage + 1} of {stages.length} steps
        </Text>

        {/* Dots Progress */}
        <View style={styles.dotsContainer}>
          {stages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index <= stage && styles.dotActive,
              ]}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#191B2F',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 30,
  },
  stageText: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#191B2F',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#E53935',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  loader: {
    marginTop: 20,
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginBottom: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  dotActive: {
    backgroundColor: '#6e61ca',
    width: 24,
  },
});
