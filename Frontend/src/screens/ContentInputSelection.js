
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo } from 'react';
import {
  Animated,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import LeftChatBubble from '../components/LeftChatBubble';


const ContentInputSelection = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const bubbleAnimation = useMemo(() => new Animated.Value(0), []);
  const fadeAnim = useMemo(() => new Animated.Value(0), []);


  useEffect(() => {
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.spring(bubbleAnimation, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [bubbleAnimation, fadeAnim]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSnapPicture = () => {
    navigation.navigate('CameraCaptureScreen');
  };

  const handleUploadFile = () => {
    navigation.navigate('FilePickerScreen');
  };

  const handleTypePasteText = () => {
    navigation.navigate('TypePasteScreen');
  };

  const handleUploadVisuals = () => {
    navigation.navigate('VisualUploadScreen');
  };
  
  const handleUseExistingNotes = () => {
    navigation.navigate('NotesSelectionScreen');
  };



  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.isDark ? '#0C1421' : '#F7F8FA' }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.isDark ? '#382F74' : '#243D66'} />

      {/* Header with Bubble */}
      <LinearGradient
        colors={theme.isDark ? ['#382F74', '#22234C'] : ['#191B2F', '#0C1421']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7} underlayColor="#8B5CF6">
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upload</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.chatBubbleContainer}>
          <LeftChatBubble message="Welcome to Snap Tutor! Upload your first document to get started." />
        </View>
      </LinearGradient>

      {/* Options */}
      <ScrollView
        style={styles.mainContent}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={[styles.optionCard, { backgroundColor: theme.isDark ? '#191B2F' : '#fff' }]} onPress={handleSnapPicture}>
          <Image
            source={require('../assets/images/camera.png')} // 🟢 Replace with your PNG
            style={styles.optionIcon}
          />
          <Text style={[styles.optionTitle, { color: theme.isDark ? '#FFFFFF' : '#1F2937' }]}>Snap a Picture</Text>
          <Text style={[styles.optionSubtitle, { color: theme.isDark ? '#9CA3AF' : '#6B7280' }]}>Capture notes instantly</Text>
        </TouchableOpacity>

        {/* Option 2 – Upload File */}
        <TouchableOpacity style={[styles.optionCard, { backgroundColor: theme.isDark ? '#191B2F' : '#fff' }]} onPress={handleUploadFile}>
          <Image
            source={require('../assets/images/Uploads.png')} // 🟢 Replace with your PNG
            style={styles.optionIcon}
          />
          <Text style={[styles.optionTitle, { color: theme.isDark ? '#FFFFFF' : '#1F2937' }]}>Upload File</Text>
          <Text style={[styles.optionSubtitle, { color: theme.isDark ? '#9CA3AF' : '#6B7280' }]}>PDFs or images from device</Text>
        </TouchableOpacity>

        {/* Option 3 – Type/Paste Text */}
        <TouchableOpacity style={[styles.optionCard, { backgroundColor: theme.isDark ? '#191B2F' : '#fff' }]} onPress={handleTypePasteText}>
          <Image
            source={require('../assets/images/Pen.png')} // 🟢 Replace with your PNG
            style={styles.optionIcon}
          />
          <Text style={[styles.optionTitle, { color: theme.isDark ? '#FFFFFF' : '#1F2937' }]}>Type/Paste Text</Text>
          <Text style={[styles.optionSubtitle, { color: theme.isDark ? '#9CA3AF' : '#6B7280' }]}>Write or paste content</Text>
        </TouchableOpacity>

        {/* Option 4 – Upload Visuals */}
        <TouchableOpacity style={[styles.optionCard, { backgroundColor: theme.isDark ? '#191B2F' : '#fff' }]} onPress={handleUploadVisuals}>
          <Image
            source={require('../assets/images/visual.png')} // 🟢 Replace with your PNG
            style={styles.optionIcon}
          />
          <Text style={[styles.optionTitle, { color: theme.isDark ? '#FFFFFF' : '#1F2937' }]}>Upload Visuals</Text>
          <Text style={[styles.optionSubtitle, { color: theme.isDark ? '#9CA3AF' : '#6B7280' }]}>Diagram, chart or images</Text>
        </TouchableOpacity>

        {/* Option 5 – Use Existing Notes */}
        <TouchableOpacity style={[styles.optionCard, { backgroundColor: theme.isDark ? '#191B2F' : '#fff' }]} onPress={handleUseExistingNotes}>
          <Image
            source={require('../assets/images/Pen.png')} // 🟢 Using pen icon for notes
            style={styles.optionIcon}
          />
          <Text style={[styles.optionTitle, { color: theme.isDark ? '#FFFFFF' : '#1F2937' }]}>Use Existing Notes</Text>
          <Text style={[styles.optionSubtitle, { color: theme.isDark ? '#9CA3AF' : '#6B7280' }]}>Generate from saved notes</Text>
        </TouchableOpacity>
      </ScrollView>


    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  header: {
    backgroundColor: '#191B2F',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingBottom: 25,
    elevation: 6,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128, 128, 128, 0.3)',
    borderRadius: 8,
  },
  backIcon: {
    fontSize: 22,
    color: '#FFFFFFCC',
    fontFamily: 'Poppins-Regular',
  },
  headerTitle: {
    fontSize: 18,
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    marginHorizontal: 18,
  },
  chatBubbleContainer: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  mascotContainer: {
    width: 48,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mascotImage: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  speechBubble: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    flex: 1,
    position: 'relative',
  },
  bubbleText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Poppins-Regular',
  },
  bubbleTail: {
    position: 'absolute',
    left: -10,
    top: 20,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderRightWidth: 12,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightColor: '#fff',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  mainContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 13,
    marginBottom: 15,
    fontFamily: 'Poppins-Medium',
  },
  optionCard: {
    borderRadius: 16,
    paddingVertical: 25,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
  },
  optionIcon: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  optionSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
  },
});

export default ContentInputSelection;
