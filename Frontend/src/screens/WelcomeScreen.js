import { Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from '../contexts/ThemeContext';
import { withPoppins } from '../styles/typography';

export default function WelcomeScreen({ navigation }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primaryBackground }]}>
      <StatusBar barStyle={theme.colors.statusBarStyle} />
      
      {/* Mascot Character */}
      <View style={styles.mascotContainer}>
        <Image 
          source={require('../assets/images/mascot.png')} 
          style={styles.mascotImage}
          resizeMode="contain"
        />
      </View>

      {/* Welcome Text */}
      <Text style={[styles.welcomeTitle, { color: theme.colors.primaryText }]}>Welcome to SnapNGrasp</Text>

      {/* Tagline */}
      <Text style={[styles.subtitle, { color: theme.colors.secondaryText }]}>
        Capture notes, get flashcards, quizzes, and{"\n"}voice lessons—all in one app
      </Text>

      {/* Divider Line with Text */}
      <View style={styles.dividerContainer}>
        <View style={[styles.dividerLine, { backgroundColor: theme.colors.divider }]} />
        <Text style={[styles.dividerText, { color: theme.colors.secondaryText }]}>Snap it. Grasp it.</Text>
        <View style={[styles.dividerLine, { backgroundColor: theme.colors.divider }]} />
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.getStartedButton, { backgroundColor: theme.colors.primaryButton }]}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={[styles.getStartedButtonText, { color: theme.colors.primaryButtonText }]}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginButton, { borderColor: theme.colors.primaryButton }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={[styles.loginButtonText, { color: theme.colors.primaryButton }]}>Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 100,
  },
  mascotContainer: {
    marginBottom: 40,
  },
  mascotImage: {
    width: 200,
    height: 200,
  },
  welcomeTitle: {
    ...withPoppins({
      fontSize: 28,
      fontWeight: "bold",
      marginBottom: 15,
    })
  },
  subtitle: {
    ...withPoppins({
      fontSize: 15,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 30,
    })
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 40,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...withPoppins({
      marginHorizontal: 15,
      fontSize: 14,
    })
  },
  buttonContainer: {
    width: "100%",
    gap: 15,
  },
  getStartedButton: {
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    width: "100%",
  },
  getStartedButtonText: {
    ...withPoppins({
      fontSize: 16,
      fontWeight: "600",
    })
  },
  loginButton: {
    backgroundColor: "transparent",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    borderWidth: 2,
    width: "100%",
  },
  loginButtonText: {
    ...withPoppins({
      fontSize: 16,
      fontWeight: "600",
    })
  },
});
