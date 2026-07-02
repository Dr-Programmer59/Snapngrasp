import { Ionicons } from '@expo/vector-icons';
import { useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator
} from "react-native";
import { useTheme } from '../contexts/ThemeContext';
import { loginAPI } from '../api/auth';

export default function LoginScreen({ navigation, route }) {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const setIsLoggedIn = route?.params?.setIsLoggedIn || null;

  // Login handler function
  const handleLogin = async () => {
    console.log('🚀 Login button pressed');
    
    // Basic validation
    if (!email || !password) {
      console.log('⚠️ Validation failed: Missing email or password');
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    console.log('✅ Validation passed');
    setLoading(true);
    try {
      console.log('🔐 Calling login API...');
      // Call backend login API
      const data = await loginAPI(email, password);
      
      // Login successful - tokens are already saved in auth.js
      console.log('✅ Login successful! User:', data.user);
      
      // Show success notification
      Alert.alert(
        '✅ Login Successful',
        `Welcome back, ${data.user.email}!`,
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigate to subscription screen before entering main app
              console.log('Navigating to SubscriptionScreen', { setIsLoggedIn });
              navigation.navigate('SubscriptionScreen', { setIsLoggedIn });
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Login failed:', error);
      Alert.alert(
        'Login Failed',
        error.message || 'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.containerBackground }]}>
      <StatusBar barStyle={theme.colors.statusBarStyle} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.logo, { color: theme.colors.headerText }]}>SnapNGrasp</Text>
      </View>

      {/* Welcome Text */}
      <View style={styles.welcomeSection}>
        <Text style={[styles.welcomeBack, { color: theme.colors.accent }]}>Welcome Back 👋</Text>
        <Text style={[styles.mainTitle, { color: theme.colors.headerText }]}>Log In to Continue</Text>
        <Text style={[styles.subtitle, { color: theme.colors.secondaryText }]}>
          Use your email or username to log in and{"\n"}continue snapping
        </Text>
      </View>

      {/* Form Card */}
      <View style={[styles.formCard, { backgroundColor: theme.colors.primaryBackground }]}>
        {/* Email Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.primaryText }]}>Email</Text>
          <View style={[styles.inputContainer, { backgroundColor: theme.colors.secondaryBackground, borderColor: theme.colors.border }]}>
            <Ionicons name="mail-outline" size={20} color={theme.colors.secondaryText} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.colors.primaryText }]}
              placeholder="Email"
              placeholderTextColor={theme.colors.placeholderText}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Password Input */}
        <View style={styles.inputGroup}>
          <View style={styles.passwordHeader}>
            <Text style={[styles.inputLabel, { color: theme.colors.primaryText }]}>Password</Text>
            <TouchableOpacity onPress={() => navigation?.navigate("ForgotPassword")}>
              <Text style={[styles.forgotLink, { color: theme.colors.accent }]}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.inputContainer, { backgroundColor: theme.colors.secondaryBackground, borderColor: theme.colors.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.secondaryText} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.colors.primaryText }]}
              placeholder="Password"
              placeholderTextColor={theme.colors.placeholderText}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={theme.colors.secondaryText}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Remember Me Checkbox */}
        <TouchableOpacity
          style={styles.rememberMeContainer}
          onPress={() => setRememberMe(!rememberMe)}
        >
          <View style={[
            styles.checkbox, 
            { 
              backgroundColor: rememberMe ? '#6B5FCD' : theme.colors.secondaryBackground, 
              borderColor: rememberMe ? '#6B5FCD' : theme.colors.border 
            }
          ]}>
            {rememberMe && (
              <Ionicons name="checkmark" size={14} color="#fff" />
            )}
          </View>
          <Text style={[styles.rememberMeText, { color: theme.colors.primaryText }]}>Remember Me</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: theme.colors.primaryButton }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.primaryButtonText} />
          ) : (
            <Text style={[styles.loginButtonText, { color: theme.colors.primaryButtonText }]}>Login</Text>
          )}
        </TouchableOpacity>

        {/* Sign Up Link */}
        <View style={styles.signupContainer}>
          <Text style={[styles.signupText, { color: theme.colors.secondaryText }]}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation?.navigate("Signup")}>
            <Text style={[styles.signupLink, { color: theme.colors.accent }]}>Signup</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  logo: {
    fontSize: 18,
    fontWeight: "600",
  },
  welcomeSection: {
    paddingHorizontal: 20,
    marginTop: 30,
    marginBottom: 30,
  },
  welcomeBack: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  formCard: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 5,
  },
  passwordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  forgotLink: {
    fontSize: 14,
    fontWeight: "500",
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    borderColor: "#6B5FCD",
  },
  rememberMeText: {
    fontSize: 15,
  },
  loginButton: {
    borderRadius: 30,
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 25,
  },
  signupText: {
    fontSize: 15,
  },
  signupLink: {
    fontSize: 15,
    fontWeight: "600",
  },
});
