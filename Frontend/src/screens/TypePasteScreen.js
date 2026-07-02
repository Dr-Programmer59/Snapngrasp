import { useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import LeftChatBubble from "../components/LeftChatBubble";
import { withPoppins } from '../styles/typography';
import { uploadText } from '../api/upload';

const { width } = Dimensions.get('window');

export default function TypePasteScreen({ navigation }) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!text.trim()) {
      Alert.alert('Empty Content', 'Please enter or paste some text before continuing.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please provide a title for your notes.');
      return;
    }

    if (!subject.trim()) {
      Alert.alert('Missing Subject', 'Please specify the subject/topic.');
      return;
    }

    setLoading(true);

    try {
      // Upload text to backend
      console.log('📤 Uploading text to backend...');
      const response = await uploadText(text.trim(), title.trim(), subject.trim());
      
      const uploadId = response.data.upload_id;
      console.log('✅ Text uploaded, upload ID:', uploadId);

      // Navigate to AnalyzingScreen to generate study materials
      navigation.navigate('AnalyzingScreen', {
        uploadId,
        subject: subject.trim(),
      });

    } catch (error) {
      console.error('❌ Text upload error:', error);
      Alert.alert(
        'Upload Failed',
        error.message || 'Failed to upload text. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Type/Paste Text</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Chat Bubble */}
        <View style={styles.chatSection}>
          <LeftChatBubble message="Paste your notes here and I'll create study materials for you!" />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="e.g., Photosynthesis Notes"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Subject Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject *</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="e.g., Biology"
              placeholderTextColor="#999"
              value={subject}
              onChangeText={setSubject}
              maxLength={50}
            />
          </View>

          {/* Text Input */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Your Notes *</Text>
              <Text style={styles.wordCount}>{wordCount} words</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Type or paste your study material here..."
              placeholderTextColor="#999"
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#6e61ca" />
            <Text style={styles.infoText}>
              Paste notes from any source. The AI will generate MCQs, flashcards, and visual aids.
            </Text>
          </View>
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueBtn,
              (loading || !text.trim() || !title.trim() || !subject.trim()) && styles.continueBtnDisabled
            ]}
            onPress={handleContinue}
            disabled={loading || !text.trim() || !title.trim() || !subject.trim()}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.continueText}>Uploading...</Text>
              </>
            ) : (
              <>
                <Text style={styles.continueText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    paddingTop: 50,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#191B2F",
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
  title: {
    ...withPoppins({
      fontSize: 18,
      fontWeight: "600",
      color: "#fff",
    })
  },
  chatSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    ...withPoppins({
      fontSize: 14,
      fontWeight: "600",
      color: "#333",
    }),
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wordCount: {
    ...withPoppins({
      fontSize: 12,
      color: "#6e61ca",
    })
  },
  titleInput: {
    ...withPoppins({
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 12,
      fontSize: 14,
      color: '#333',
    }),
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textInput: {
    ...withPoppins({
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 12,
      fontSize: 14,
      color: '#333',
    }),
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0EBFF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'flex-start',
    gap: 10,
  },
  infoText: {
    ...withPoppins({
      flex: 1,
      fontSize: 12,
      color: '#555',
    })
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    backgroundColor: '#F7F7F7',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  continueBtn: {
    backgroundColor: '#6e61ca',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: width * 0.9,
    justifyContent: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: '#CCCCCC',
  },
  continueText: {
    ...withPoppins({
      color: "#fff",
      fontWeight: "600",
      fontSize: 16
    })
  },
});
