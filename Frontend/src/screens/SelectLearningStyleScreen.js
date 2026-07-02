import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SelectLearningStyleScreen({ navigation, route }) {
  const [selectedStyles, setSelectedStyles] = useState(['visual']);
  const [hoveredId, setHoveredId] = useState(null);
  
  const { isOnboarding, userEmail, userName } = route.params || {};

  const learningStyles = [
    {
      id: 'visual',
      iconSource: require('../assets/images/visual.png'),
      title: 'Visual',
      description: 'Learn with images, diagrams, and videos',
    },
    {
      id: 'auditory',
      iconSource: require('../assets/images/Auditory.png'),
      title: 'Auditory',
      description: 'Understand better through sounds, podcasts, and voice notes',
    },
    {
      id: 'reading',
      iconSource: require('../assets/images/reading-writing.png'),
      title: 'Reading-Writing',
      description: 'Learn through text, notes, and articles.',
    },
    {
      id: 'interactive',
      iconSource: require('../assets/images/Interactive.png'),
      title: 'Interactive',
      description: 'Hands-on practice, quizzes, and active exercises',
    },
  ];

  const toggleStyle = (id) => {
    setSelectedStyles((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    if (selectedStyles.length > 0) {
      navigation.navigate("SelectStudyGoalScreen", {
        learningStyles: selectedStyles,
        isOnboarding,
        userEmail,
        userName,
      });
    }
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#0F172A']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Learning Preferences</Text>
          </View>

          {/* Mascot + Message Section */}
          <View style={styles.messageSection}>
            <View style={styles.mascotIconWrapper}>
              <Image
                source={require('../assets/images/mascot.png')}
                style={styles.mascotImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.messageBubble}>
              <Text style={styles.messageText}>
                How do you prefer to learn? Select all that apply!
              </Text>
            </View>
          </View>

          {/* Main White Container with all cards */}
          <View style={styles.mainContainer}>
            {/* Learning Style Cards */}
            <View style={styles.cardsContainer}>
              {learningStyles.map((style) => {
                const isSelected = selectedStyles.includes(style.id);

                return (
                  <TouchableOpacity
                    key={style.id}
                    onPress={() => toggleStyle(style.id)}
                    onPressIn={() => setHoveredId(style.id)}
                    onPressOut={() => setHoveredId(null)}
                    style={styles.cardWrapper}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      styles.cardOuter,
                      isSelected && styles.cardOuterSelected
                    ]}>
                      <View style={styles.iconContainer}>
                        <Image
                          source={style.iconSource}
                          style={styles.iconImage}
                          resizeMode="contain"
                        />
                      </View>

                      <Text
                        style={[
                          styles.cardTitle,
                          (isSelected || hoveredId === style.id) && styles.cardTitleYellow,
                          !(isSelected || hoveredId === style.id) && styles.cardTitleGray,
                        ]}
                      >
                        {style.title}
                      </Text>
                      <Text
                        style={[
                          styles.cardDescription,
                          (isSelected || hoveredId === style.id) && styles.cardDescriptionWhite,
                          !(isSelected || hoveredId === style.id) && styles.cardDescriptionGray,
                        ]}
                      >
                        {style.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Save Changes Button */}
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.continueGradient}
              >
                <Text style={styles.continueText}>Save Changes</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#334155',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
    fontFamily: 'Poppins',
  },

  /** Mascot & Bubble Section **/
  messageSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  mascotIconWrapper: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  mascotImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  messageBubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderTopLeftRadius: 4,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    fontFamily: 'Poppins',
  },

  /** Main White Container **/
  mainContainer: {
    backgroundColor: '#eef3f7ff',
    borderRadius: 40,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },

  /** Cards **/
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 28,
  },
  cardWrapper: {
    width: '47%',
    marginBottom: 16,
  },
  cardOuter: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardOuterSelected: {
    backgroundColor: '#8B5CF6',
  },
  iconContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
  },
  iconImage: {
    width: 60,
    height: 60,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
    fontFamily: 'Poppins',
  },
  cardTitleYellow: {
    color: '#FCD34D',
  },
  cardTitleBlack: {
    color: '#1F2937',
  },
  cardTitleGray: {
    color: '#374151',
  },
  cardDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 4,
    fontFamily: 'Poppins',
  },
  cardDescriptionWhite: {
    color: '#FFFFFF',
  },
  cardDescriptionGray: {
    color: '#6B7280',
  },

  /** Continue Button **/
  continueButton: {
    marginTop: 8,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  continueText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffffff',
    fontFamily: 'Poppins',
  },
});