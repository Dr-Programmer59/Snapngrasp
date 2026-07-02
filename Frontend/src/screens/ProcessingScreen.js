import React, { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import LeftChatBubble from "../components/LeftChatBubble";
import { uploadImage } from "../api/upload";
import { generateAllMaterials } from '../api/studyMaterial';
import { showCreditLimitPopup } from '../utils/creditError';

const progressAnim = new Animated.Value(0);

export default function ProcessingScreen({ navigation, route }) {
  const { image, isGeneratingMaterials, uploadId, subject, isVisualUpload } = route.params || {};
  const [progress, setProgress] = useState(0);
  const [bubbleText, setBubbleText] = useState(
    isVisualUpload
      ? "Analyzing your visual with AI... This won't take long! 🎨"
      : isGeneratingMaterials 
        ? "Creating your study materials... This won't take long! 📚"
        : "Hang on a moment… I am converting your uploaded item into editable text"
  );
  const [uploadError, setUploadError] = useState(null);
  const [stage, setStage] = useState(isGeneratingMaterials ? 'analyzing' : 'uploading'); // uploading, processing, complete, analyzing, generating

  useEffect(() => {
    console.log('🔍 [ProcessingScreen] Route params:', { 
      uploadId, 
      isGeneratingMaterials, 
      isVisualUpload,
      hasImage: !!image 
    });

    // Handle study material generation mode (for both text and visual uploads)
    if (isGeneratingMaterials && uploadId) {
      console.log('✅ [ProcessingScreen] Skipping upload - directly generating materials');
      generateStudyMaterials();
      return;
    }

    // Handle image upload mode (only for text extraction uploads)
    if (!uploadId && image) {
      console.log('🚀 [ProcessingScreen] Starting image upload for text extraction...');
      handleImageUpload();
      return;
    }

    // Invalid state
    console.log('❌ [ProcessingScreen] Invalid state - no uploadId or image');
    Alert.alert('Error', 'Invalid parameters');
    navigation.goBack();
  }, [uploadId, isGeneratingMaterials, isVisualUpload]);

  const handleImageUpload = () => {
    // Validate image URI
    if (!image) {
      console.log('❌ [ProcessingScreen] No image provided');
      Alert.alert('Error', 'No image to process');
      navigation.goBack();
      return;
    }

    console.log('🖼️ [ProcessingScreen] Image URI:', image);

    // Timeout warning after 90 seconds
    const timeoutWarning = setTimeout(() => {
      if (stage === 'processing') {
        setBubbleText("Still processing... Large images take longer ⏳");
      }
    }, 90000); // 90 seconds

    // Start upload process
    uploadImage(image, (uploadProgress) => {
      // Update progress from upload (0-70%)
      const normalizedProgress = Math.min(uploadProgress * 0.7, 70);
      setProgress(normalizedProgress);
      
      if (uploadProgress >= 100) {
        setStage('processing');
        setBubbleText("Processing with AI... This may take a moment ⏳");
        setProgress(80); // Show we're processing
      }
    })
      .then((response) => {
        clearTimeout(timeoutWarning);
        console.log('✅ [ProcessingScreen] Upload successful!');
        console.log('📊 [ProcessingScreen] Response:', response);

        setStage('complete');
        // Set progress to 100%
        setProgress(100);
        setBubbleText("Processing Complete! ✨");

        // Navigate to results after brief delay
        setTimeout(() => {
          console.log('📍 [ProcessingScreen] Navigating to OCRResultScreen');
          navigation.navigate("OCRResultScreen", {
            processedText: response.data.extracted_text,
            confidence: response.data.confidence,
            uploadId: response.data.upload_id,
            fileUrl: response.data.file_url,
            metadata: response.data.metadata,
          });
        }, 1000);
      })
      .catch((error) => {
        clearTimeout(timeoutWarning);
        console.log('❌ [ProcessingScreen] Upload failed:', error.message);
        setUploadError(error.message);
        setBubbleText("Oops! Something went wrong 😞");

        // Credit limit error — show upgrade popup
        if (error.statusCode === 403 && (error.code === 'CREDIT_EXHAUSTED' || error.code === 'CREDIT_UNAVAILABLE')) {
          showCreditLimitPopup(error, navigation);
          return;
        }
        
        // Show error alert
        Alert.alert(
          'Upload Failed',
          error.message || 'Failed to process image. Please try again.',
          [
            {
              text: 'Retry',
              onPress: () => navigation.goBack(),
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => navigation.navigate('Dashboard'),
            },
          ]
        );
      });
  };

  const generateStudyMaterials = async () => {
    try {
      // Stage 1: Analyzing
      setStage('analyzing');
      setBubbleText(isVisualUpload ? 'Analyzing your visual with AI... 🎨' : 'Analyzing your notes... 📚');
      setProgress(10);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Stage 2: Generate all materials in one request (backend runs them in parallel)
      setStage('generating');
      setBubbleText('Generating study materials... 📝🃏🎨');
      setProgress(30);

      console.log('🚀 Calling generate-all endpoint...');
      const result = await generateAllMaterials(uploadId, { subject: subject || 'General' });
      
      const mcqData = result.data?.mcqs?.status === 'success' ? result.data.mcqs.data : null;
      const flashcardData = result.data?.flashcards?.status === 'success' ? result.data.flashcards.data : null;
      const visualData = result.data?.visuals?.status === 'success' ? result.data.visuals.data : null;

      console.log('✅ MCQs:', mcqData?.count || 0);
      console.log('✅ Flashcards:', flashcardData?.count || 0);
      console.log('✅ Visuals:', visualData?.visuals?.length || 0);

      setProgress(95);

      // Complete
      setStage('complete');
      setProgress(100);
      setBubbleText('All done! Your study materials are ready ✨');

      // Navigate to Study Material Screen
      setTimeout(() => {
        console.log('✅ All materials generated, navigating...');
        navigation.replace('StudyMaterialScreen', {
          uploadId,
          mcqs: mcqData,
          flashcards: flashcardData,
          visuals: visualData,
        });
      }, 1500);

    } catch (err) {
      console.error('❌ Error generating materials:', err);
      setUploadError(err.message || 'Failed to generate study materials');
      setBubbleText('Oops! Something went wrong 😞');
      
      // Navigate anyway after 3 seconds
      setTimeout(() => {
        navigation.replace('StudyMaterialScreen', { uploadId });
      }, 3000);
    }
  };



  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeHeader} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          underlayColor="#8B5CF6"
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Analysing</Text>
        <View style={{ width: 40 }} />
      </View>
      </SafeAreaView>

      {/* Chat Bubble */}
      <View style={styles.chatSection}>
        <View style={styles.chatContainer}>
          <LeftChatBubble message={bubbleText} />
        </View>
      </View>

      {/* Processing Animation */}
      <View style={styles.progressSection}>
        <Image
          source={require("./assets/scan_document.gif")} // replace with your animated gif
          style={styles.docImage}
        />

        <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
        <Text style={styles.progressText}>
          {uploadError 
            ? '❌ Upload failed' 
            : stage === 'uploading' 
              ? 'Uploading image...' 
              : stage === 'processing'
                ? 'Extracting text with AI magic ✨'
                : stage === 'analyzing'
                  ? 'Analyzing your notes... 📚'
                  : stage === 'generating'
                    ? 'Creating study materials... 🎯'
                    : 'Complete! ✅'
          }
        </Text>
        
        {uploadError && (
          <Text style={styles.errorText}>{uploadError}</Text>
        )}
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  safeHeader: {
    backgroundColor: "#191B2F",
  },
  header: {
    backgroundColor: "#191B2F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 6,
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
  title: {
    fontSize: 18,
    color: "#fff",
    fontFamily: 'Poppins-SemiBold',
  },

  bubbleContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 120,
  },
  mascot: {
    width: 85,
    height: 85, // slightly bigger
    marginRight: 10,
    marginBottom: -10,
  },
  bubble: {
    backgroundColor: "#F5F5F5",
    padding: 14,
    borderRadius: 16,
    borderTopLeftRadius: 0,
    maxWidth: "65%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  bubbleText: {
    color: "#333",
    fontSize: 15,
  },

  chatSection: {
    marginTop: 0,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  chatContainer: {
    width: "100%",
    alignItems: "center",
  },
  progressSection: {
    marginTop: 90,
    alignItems: "center",
  },
  docImage: {
    width: Dimensions.get('window').width * 0.8,
    height: Dimensions.get('window').width * 0.8,
    resizeMode: "contain",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#6C63FF",
    borderRadius: 5,
    marginTop: 15,
    width: "0%",
  },
  progressPercent: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
  },
  progressText: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: "#FF6B6B",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 20,
  },

  continueBtn: {
    position: "absolute",
    bottom: 30,
    backgroundColor: "#6C63FF",
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 30,
  },
  continueText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
