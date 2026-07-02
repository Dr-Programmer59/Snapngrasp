import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import React, { useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNavigation from '../components/BottomNavigation';
import { useTheme } from '../contexts/ThemeContext';
import { sendChatMessage } from '../api/chat';
import { SoundIcon, SendIcon } from '../components/CustomIcons';

const ChatScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [speakingId, setSpeakingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { 
      id: Date.now().toString(), 
      text: input.trim(), 
      sender: 'user' 
    };
    
    const thinkingId = `thinking-${Date.now()}`;
    const thinkingMessage = { 
      id: thinkingId, 
      text: 'thinking', 
      sender: 'bot' 
    };
    
    setMessages(prev => [...prev, userMessage, thinkingMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map(msg => ({
        sender: msg.sender,
        text: msg.text,
      }));

      // Send to AI tutor API
      const response = await sendChatMessage(userMessage.text, conversationHistory);

      // Replace thinking message with actual response
      const botResponse = {
        id: `bot-${Date.now()}`,
        text: response.message,
        sender: 'bot',
      };

      setMessages(prev => 
        prev.map(msg => msg.id === thinkingId ? botResponse : msg)
      );

    } catch (error) {
      console.error('Chat error:', error);
      
      // Remove thinking message and show error
      setMessages(prev => prev.filter(msg => msg.id !== thinkingId));
      
      Alert.alert(
        'Error',
        'Failed to get response from AI tutor. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    await Clipboard.setStringAsync(text);
  };

  const speakMessage = async (text, id) => {
    if (speakingId === id) {
      // Stop speaking
      Speech.stop();
      setSpeakingId(null);
      return;
    }

    setSpeakingId(id);
    Speech.speak(text, {
      language: 'en',
      pitch: 1.0,
      rate: 0.95,
      onDone: () => setSpeakingId(null),
    });
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageRow,
        item.sender === 'user' ? styles.userRow : styles.botRow,
      ]}
    >
      {item.sender === 'bot' && (
        <Image
          source={require('./assets/logo.png')}
          style={styles.avatar}
        />
      )}

      <View
        style={[
          styles.messageBubble,
          item.sender === 'user' ? styles.userBubble : [styles.botBubble, { backgroundColor: theme.isDark ? '#191B2F' : '#fff' }],
        ]}
      >
        {item.text === 'thinking' ? (
          <View style={styles.thinkingDots}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        ) : (
          <Text
            style={[
              styles.messageText,
              { color: item.sender === 'user' ? '#fff' : (theme.isDark ? '#FFFFFF' : '#000') },
            ]}
          >
            {item.text}
          </Text>
        )}

        {item.sender === 'bot' && item.text !== 'thinking' && (
          <View style={styles.messageActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => speakMessage(item.text, item.id)}
            >
              <Ionicons
                name={
                  speakingId === item.id ? 'volume-mute' : 'volume-high'
                }
                size={18}
                color={theme.isDark ? '#9CA3AF' : '#000'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => copyToClipboard(item.text)}
            >
              <Ionicons name="copy-outline" size={18} color={theme.isDark ? '#9CA3AF' : '#000'} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {item.sender === 'user' && (
        <Image
          source={require('./assets/user.jpg')}
          style={styles.avatar}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.isDark ? '#382F74' : '#191B2F' }]} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: theme.isDark ? '#0C1421' : '#F7F8FA' }}>
        {/* Header */}
        <LinearGradient
          colors={theme.isDark ? ['#382F74', '#22234C'] : ['#191B2F', '#0C1421']}
          style={styles.header}
        >
        <Image source={require('./assets/logo.png')} style={styles.logo} />
        <Text style={styles.headerText}>Snap Tutor</Text>
        
        {/* Voice Agent Button */}
        
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        {/* Chat Section */}
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Image
              source={require('./assets/logo.png')}
              style={styles.mascot}
            />
            <Text style={[styles.helpText, { color: theme.isDark ? '#D1D5DB' : '#333' }]}>What can I help you with?</Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatContainer}
          />
        )}



        {/* Input Box */}
        <View style={styles.inputWrapper}>
          <View style={[styles.inputContainer, { backgroundColor: theme.isDark ? '#1F2937' : '#F3F4F6' }]}>
            <TextInput
              style={[styles.input, { color: theme.isDark ? '#FFFFFF' : '#333' }]}
              placeholder="Start typing here..."
              placeholderTextColor={theme.isDark ? '#9CA3AF' : '#9CA3AF'}
              value={input}
              onChangeText={setInput}
            />
            
            {/* Waveform/Voice Icon */}
            <TouchableOpacity 
              style={styles.waveIconButton} 
              onPress={() => navigation.navigate('VoiceAgentScreen')}
            >
              <SoundIcon size={22} color={theme.isDark ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
            
            {/* Send Button */}
            <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
              <SendIcon size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <BottomNavigation activeTab="tutor" />
      </View>
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },

  keyboardAvoid: { flex: 1 },

  header: {
    height:90,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingBottom: 10,
  },
  voiceAgentButton: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: { width: 40, height: 40, marginRight: 10 },
  headerText: { color: '#fff', fontSize: 20, fontFamily: 'Poppins-Bold' },

  chatContainer: { padding: 16, paddingBottom: 100 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mascot: { width: 130, height: 130, marginBottom: 20 },
  helpText: { fontSize: 18, fontFamily: 'Poppins-SemiBold' },

  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 6,
  },
  botRow: { justifyContent: 'flex-start' },
  userRow: { justifyContent: 'flex-end' },

  avatar: { width: 34, height: 34, borderRadius: 17, marginHorizontal: 6 },

  messageBubble: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '70%',
  },
  userBubble: { backgroundColor: '#6C63FF', borderBottomRightRadius: 6 },
  botBubble: { borderBottomLeftRadius: 6 },

  messageText: { fontSize: 15, fontFamily: 'Poppins-Regular' },
  userText: { color: '#fff', fontFamily: 'Poppins-Regular' },

  messageActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  actionBtn: { marginLeft: 12 },

  // Thinking animation
  thinkingContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginLeft: 50,
    marginBottom: 10,
  },
  thinkingDots: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginLeft: 0,
    marginBottom: 0,
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#999',
    marginHorizontal: 3,
  },

  // Input area
  inputWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  input: { 
    flex: 1, 
    fontSize: 15, 
    fontFamily: 'Poppins-Regular', 
    paddingVertical: 0,
    outlineStyle: 'none',
  },
  waveIconButton: {
    marginLeft: 8,
    marginRight: 8,
    padding: 4,
  },
  sendBtn: {
    backgroundColor: '#6C63FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
