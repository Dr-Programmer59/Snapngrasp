// screens/VisualLabelingScreen.js
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput // Added TextInput import
    ,

    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

const VisualLabelingScreen = ({ navigation }) => {
  // Mock data for visual labeling quiz
  const quizData = [
    {
      id: 1,
      title: "Human Brain Anatomy",
      image: require('../assets/images/brain.png'),
      labels: [
        { id: 'cerebrum', name: 'Cerebrum', x: 50, y: 25, options: ['Cerebrum', 'Cerebellum', 'Brainstem', 'Spinal Cord'] },
        { id: 'cerebellum', name: 'Cerebellum', x: 50, y: 65, options: ['Cerebellum', 'Frontal Lobe', 'Temporal Lobe', 'Brainstem'] },
        { id: 'brainstem', name: 'Brainstem', x: 50, y: 85, options: ['Brainstem', 'Spinal Cord', 'Cerebrum', 'Limbic System'] },
        { id: 'frontal', name: 'Frontal Lobe', x: 25, y: 40, options: ['Frontal Lobe', 'Parietal Lobe', 'Occipital Lobe', 'Temporal Lobe'] },
        { id: 'temporal', name: 'Temporal Lobe', x: 75, y: 60, options: ['Temporal Lobe', 'Frontal Lobe', 'Occipital Lobe', 'Cerebellum'] },
        { id: 'parietal', name: 'Parietal Lobe', x: 50, y: 50, options: ['Parietal Lobe', 'Frontal Lobe', 'Temporal Lobe', 'Occipital Lobe'] },
        { id: 'occipital', name: 'Occipital Lobe', x: 80, y: 45, options: ['Occipital Lobe', 'Parietal Lobe', 'Temporal Lobe', 'Frontal Lobe'] }
      ],
      totalQuestions: 7
    }
  ];

  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [showPopup, setShowPopup] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [tutorMessages, setTutorMessages] = useState([
    { id: '1', type: 'bot', text: "Hi! I'm Snap Tutor. Need help with brain anatomy labeling?" }
  ]);
  const [tutorInput, setTutorInput] = useState('');
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [popupMessage, setPopupMessage] = useState('');

  const currentQuiz = quizData[currentQuizIndex];
  const totalQuizzes = quizData.length;

  // Animation values
  const popupScale = useRef(new Animated.Value(0)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const tutorTranslateY = useRef(new Animated.Value(height)).current;

  // Handle answer selection
  const handleAnswerSelect = (labelId, selectedAnswer) => {
    const isCorrect = selectedAnswer === currentQuiz.labels.find(l => l.id === labelId).name;
    
    const newAnswers = {
      ...userAnswers,
      [labelId]: {
        answer: selectedAnswer,
        isCorrect: isCorrect
      }
    };
    setUserAnswers(newAnswers);

    // Show popup for feedback
    showAnswerPopup(isCorrect);

    // Check if all labels are filled
    const allFilled = currentQuiz.labels.every(label => newAnswers[label.id]);
    
    if (allFilled) {
      setTimeout(() => {
        showCompletionPopup();
      }, 1500);
    }
  };

  // Show answer feedback popup
  const showAnswerPopup = (isCorrect) => {
    setPopupMessage(isCorrect ? 'Correct! +1 Point' : 'Incorrect! Try again');
    setShowPopup(true);
    
    Animated.parallel([
      Animated.spring(popupScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(popupOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      hidePopup();
    }, 1500);
  };

  // Show completion popup
  const showCompletionPopup = () => {
    setPopupMessage('Great Job! All labels completed!');
    setShowPopup(true);
    
    Animated.parallel([
      Animated.spring(popupScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(popupOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      hidePopup();
      // Navigate to feedback after completion
      setTimeout(() => {
        navigation.navigate('FeedbackScreen', {
          score: calculateScore(),
          total: currentQuiz.labels.length,
          type: 'visual-labeling',
          correctAnswers: getCorrectAnswersCount()
        });
      }, 1000);
    }, 2000);
  };

  const hidePopup = () => {
    Animated.parallel([
      Animated.spring(popupScale, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(popupOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowPopup(false));
  };

  // Calculate score
  const calculateScore = () => {
    let correct = 0;
    currentQuiz.labels.forEach(label => {
      if (userAnswers[label.id]?.isCorrect) {
        correct++;
      }
    });
    return Math.round((correct / currentQuiz.labels.length) * 100);
  };

  const getCorrectAnswersCount = () => {
    return currentQuiz.labels.filter(label => userAnswers[label.id]?.isCorrect).length;
  };

  // Tutor functions
  const openTutor = () => {
    setShowTutor(true);
    Animated.timing(tutorTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeTutor = () => {
    Animated.timing(tutorTranslateY, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowTutor(false));
  };

  const sendTutorMessage = () => {
    if (!tutorInput.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      type: 'user',
      text: tutorInput
    };
    setTutorMessages(prev => [...prev, newMessage]);
    setTutorInput('');

    // Simulate AI response
    setTimeout(() => {
      const botResponse = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: getTutorResponse(tutorInput)
      };
      setTutorMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  const getTutorResponse = (question) => {
    const responses = {
      'cerebrum': "The cerebrum is the largest part of the brain, responsible for higher functions like thinking, learning, and consciousness.",
      'cerebellum': "The cerebellum coordinates voluntary movements, posture, balance, and coordination.",
      'brainstem': "The brainstem controls basic life functions like breathing, heart rate, and blood pressure.",
      'frontal': "The frontal lobe is involved in planning, reasoning, emotions, and problem-solving.",
      'temporal': "The temporal lobe processes auditory information and is important for memory.",
      'parietal': "The parietal lobe handles sensory information and spatial awareness.",
      'occipital': "The occipital lobe is dedicated to visual processing and interpretation.",
      'default': "I can help you with brain anatomy! Ask me about specific parts like cerebrum, cerebellum, brainstem, or the different lobes."
    };

    const lowerQuestion = question.toLowerCase();
    for (const [key, response] of Object.entries(responses)) {
      if (lowerQuestion.includes(key)) {
        return response;
      }
    }
    return responses.default;
  };

  // Render label points on image
  const renderLabelPoints = () => {
    return currentQuiz.labels.map((label) => (
      <TouchableOpacity
        key={label.id}
        style={[
          styles.labelPoint,
          {
            left: `${label.x}%`,
            top: `${label.y}%`,
            backgroundColor: userAnswers[label.id] 
              ? (userAnswers[label.id].isCorrect ? '#4CAF50' : '#FF6B6B')
              : '#6C63FF',
          }
        ]}
        onPress={() => setSelectedLabel(label.id)}
      >
        <Text style={styles.labelPointText}>
          {userAnswers[label.id] ? '✓' : '?'}
        </Text>
      </TouchableOpacity>
    ));
  };

  // Render answer options
  const renderAnswerOptions = () => {
    if (!selectedLabel) return null;

    const label = currentQuiz.labels.find(l => l.id === selectedLabel);
    
    return (
      <View style={styles.answerOptionsContainer}>
        <Text style={styles.answerOptionsTitle}>
          Select the correct label for this part:
        </Text>
        <View style={styles.optionsGrid}>
          {label.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionBox,
                userAnswers[selectedLabel]?.answer === option && 
                styles.selectedOptionBox
              ]}
              onPress={() => handleAnswerSelect(selectedLabel, option)}
            >
              <Text style={[
                styles.optionText,
                userAnswers[selectedLabel]?.answer === option && 
                styles.selectedOptionText
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity 
          style={styles.closeOptionsButton}
          onPress={() => setSelectedLabel(null)}
        >
          <Text style={styles.closeOptionsText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render progress summary
  const renderProgressSummary = () => {
    const answered = Object.keys(userAnswers).length;
    const correct = getCorrectAnswersCount();
    
    return (
      <View style={styles.progressSummary}>
        <View style={styles.progressItem}>
          <Text style={styles.progressNumber}>{answered}</Text>
          <Text style={styles.progressLabel}>Answered</Text>
        </View>
        <View style={styles.progressItem}>
          <Text style={styles.progressNumber}>{correct}</Text>
          <Text style={styles.progressLabel}>Correct</Text>
        </View>
        <View style={styles.progressItem}>
          <Text style={styles.progressNumber}>{currentQuiz.labels.length - answered}</Text>
          <Text style={styles.progressLabel}>Remaining</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Biology – Cell Structure</Text>
        <TouchableOpacity onPress={openTutor} style={styles.tutorButton}>
          <Ionicons name="help-circle" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Visual {currentQuizIndex + 1}/{totalQuizzes}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentQuizIndex + 1) / totalQuizzes) * 100}%` }
            ]}
          />
        </View>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => {}} disabled={true} style={styles.navBtn}>
          <Text style={[styles.navText, { color: "#D1D1D6" }]}>Prev <Ionicons name="arrow-back" size={12} color="#D1D1D6" /></Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => {}} disabled={true} style={styles.navBtn}>
          <Text style={[styles.navText, { color: "#D1D1D6" }]}>Next <Ionicons name="arrow-forward" size={12} color="#D1D1D6" /></Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quiz Title */}
        <Text style={styles.quizTitle}>{currentQuiz.title}</Text>

        {/* Progress Summary */}
        {renderProgressSummary()}

        {/* Image with Labels */}
        <View style={styles.imageContainer}>
          <Image
            source={currentQuiz.image}
            style={styles.diagramImage}
            resizeMode="contain"
          />
          {renderLabelPoints()}
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>How to Play:</Text>
          <Text style={styles.instructionsText}>
            • Tap on the colored circles on the diagram{'\n'}
            • Select the correct label from the options{'\n'}
            • Green = Correct, Red = Incorrect{'\n'}
            • Complete all labels to finish
          </Text>
        </View>

        {/* Answer Options */}
        {renderAnswerOptions()}

        {/* Label Status */}
        <View style={styles.labelsStatus}>
          <Text style={styles.labelsStatusTitle}>Label Status:</Text>
          {currentQuiz.labels.map((label) => (
            <View key={label.id} style={styles.labelStatusItem}>
              <View style={[
                styles.statusIndicator,
                { 
                  backgroundColor: userAnswers[label.id] 
                    ? (userAnswers[label.id].isCorrect ? '#4CAF50' : '#FF6B6B')
                    : '#E6E6E6'
                }
              ]} />
              <Text style={styles.labelStatusText}>
                {label.name}: {userAnswers[label.id] 
                  ? (userAnswers[label.id].isCorrect ? 'Correct' : 'Incorrect') 
                  : 'Not answered'}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Floating Tutor Button */}
      <TouchableOpacity style={styles.floatingTutor} onPress={openTutor}>
        <Image 
          source={require('../assets/logo.png')} 
          style={styles.tutorLogo}
        />
      </TouchableOpacity>

      {/* Feedback Popup */}
      <Animated.View 
        style={[
          styles.popup,
          {
            opacity: popupOpacity,
            transform: [{ scale: popupScale }]
          }
        ]}
        pointerEvents="none"
      >
        <Text style={styles.popupEmoji}>
          {popupMessage.includes('Correct') ? '🎉' : '💡'}
        </Text>
        <Text style={styles.popupTitle}>
          {popupMessage.includes('Correct') ? 'Great Job!' : 'Try Again!'}
        </Text>
        <Text style={[
          styles.popupSubtitle,
          { color: popupMessage.includes('Correct') ? '#4CAF50' : '#FF6B6B' }
        ]}>
          {popupMessage}
        </Text>
      </Animated.View>

      {/* Snap Tutor Modal */}
      <Modal
        visible={showTutor}
        animationType="none"
        transparent={true}
        onRequestClose={closeTutor}
      >
        <View style={styles.tutorModal}>
          <Animated.View 
            style={[
              styles.tutorContent,
              { transform: [{ translateY: tutorTranslateY }] }
            ]}
          >
            {/* Tutor Header */}
            <View style={styles.tutorHeader}>
              <View style={styles.tutorHeaderLeft}>
                <Image 
                  source={require('../assets/logo.png')} 
                  style={styles.tutorHeaderLogo}
                />
                <Text style={styles.tutorHeaderTitle}>Snap Tutor</Text>
              </View>
              <TouchableOpacity onPress={closeTutor}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Chat Messages */}
            <FlatList
              data={tutorMessages}
              keyExtractor={(item) => item.id}
              style={styles.chatContainer}
              contentContainerStyle={styles.chatContent}
              renderItem={({ item }) => (
                <View style={[
                  styles.messageBubble,
                  item.type === 'user' ? styles.userMessage : styles.botMessage
                ]}>
                  <Text style={[
                    styles.messageText,
                    item.type === 'user' ? styles.userMessageText : styles.botMessageText
                  ]}>
                    {item.text}
                  </Text>
                </View>
              )}
            />

            {/* Input Area */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.tutorInput}
                placeholder="Ask about brain anatomy..."
                value={tutorInput}
                onChangeText={setTutorInput}
                multiline
              />
              <TouchableOpacity 
                style={styles.sendButton}
                onPress={sendTutorMessage}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 10 : StatusBar.currentHeight + 10,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tutorButton: {
    padding: 4,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 3,
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 16,
    color: '#1C1C1E',
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
  },
  progressSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6C63FF',
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  imageContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  diagramImage: {
    width: '100%',
    height: width * 0.6,
  },
  labelPoint: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  labelPointText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  instructions: {
    backgroundColor: '#E8F4FD',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  answerOptionsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  answerOptionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1C1C1E',
    textAlign: 'center',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  optionBox: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  selectedOptionBox: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'center',
  },
  selectedOptionText: {
    color: '#fff',
  },
  closeOptionsButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeOptionsText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  labelsStatus: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  labelsStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1C1C1E',
  },
  labelStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  labelStatusText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  floatingTutor: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tutorLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  popup: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    backgroundColor: '#FFF8F3',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  popupEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  popupTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  popupSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Tutor Modal Styles
  tutorModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  tutorContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
  },
  tutorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#6C63FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  tutorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tutorHeaderLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 12,
  },
  tutorHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#6C63FF',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F6FB',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  botMessageText: {
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E6E6E6',
    backgroundColor: '#fff',
  },
  tutorInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E6E6E6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    backgroundColor: '#F9F9F9',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navRow: {
    marginTop: 18,
    marginHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  navBtn: { alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'white' },
  navText: { fontSize: 12, fontWeight: "600", color: "#D1D1D6" },
});

export default VisualLabelingScreen;