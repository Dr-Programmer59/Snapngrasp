import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
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
import { signupAPI, loginAPI } from '../api/auth';

export default function SignupScreen({ navigation, route }) {
  const { theme } = useTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { setIsLoggedIn } = route.params;

  // Signup handler function
  const handleSignup = async () => {
    console.log('🚀 Signup button pressed');
    
    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      console.log('⚠️ Validation failed: Missing fields');
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      console.log('⚠️ Validation failed: Passwords do not match');
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      console.log('⚠️ Validation failed: Password too short');
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    console.log('✅ Validation passed');
    setLoading(true);
    try {
      console.log('📝 Calling signup API...');
      // Call backend signup API
      const signupData = await signupAPI(email, password, fullName);
      console.log('✅ Signup response:', signupData);
      
      console.log('🔐 Auto-login after signup...');
      // Auto-login after successful signup
      const loginData = await loginAPI(email, password);
      console.log('✅ Auto-login successful:', loginData.user);
      
      // Navigate to onboarding screens instead of Dashboard
      console.log('🎯 Navigating to onboarding...');
      navigation.replace('SelectLearningStyleScreen', {
        isOnboarding: true,
        userEmail: email,
        userName: fullName,
      });
      
      console.log('✅ Signup and login complete!');
    } catch (error) {
      console.error('❌ Signup failed:', error);
      Alert.alert(
        'Signup Failed',
        error.message || 'Failed to create account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.containerBackground }]}>
      <StatusBar barStyle={theme.colors.statusBarStyle} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.logo, { color: theme.colors.headerText }]}>SnapNGrasp</Text>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={[styles.mainTitle, { color: theme.colors.headerText }]}>Register here!</Text>
          <Text style={[styles.subtitle, { color: theme.colors.secondaryText }]}>
            Enter your details to create an account
          </Text>
        </View>

        {/* Form Card */}
        <View style={[styles.formCard, { backgroundColor: theme.colors.primaryBackground }]}>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.primaryText }]}>Full Name</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.secondaryBackground }]}>
              <Ionicons name="person-outline" size={20} color={theme.colors.secondaryText} style={styles.leftIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.primaryText }]}
                placeholder="Full Name"
                placeholderTextColor={theme.colors.placeholderText}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.primaryText }]}>Email</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.secondaryBackground }]}>
              <Ionicons name="mail-outline" size={20} color={theme.colors.secondaryText} style={styles.leftIcon} />
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

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.primaryText }]}>Password</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.secondaryBackground }]}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.colors.secondaryText} style={styles.leftIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.primaryText }]}
                placeholder="Password"
                placeholderTextColor={theme.colors.placeholderText}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={theme.colors.secondaryText}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.primaryText }]}>Confirm Password</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.secondaryBackground }]}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.colors.secondaryText} style={styles.leftIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.primaryText }]}
                placeholder="Confirm Password"
                placeholderTextColor={theme.colors.placeholderText}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={theme.colors.secondaryText}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            style={[styles.signupButton, { backgroundColor: theme.colors.primaryButton }]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.primaryButtonText} />
            ) : (
              <Text style={[styles.signupButtonText, { color: theme.colors.primaryButtonText }]}>Signup</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: theme.colors.secondaryText }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation?.navigate("Login")}>
              <Text style={[styles.loginLink, { color: theme.colors.accent }]}>Login</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10 },
  logo: { fontSize: 18, fontWeight: "600" },
  titleSection: { paddingHorizontal: 20, marginTop: 30, marginBottom: 30 },
  mainTitle: { fontSize: 32, fontWeight: "bold", marginBottom: 12 },
  subtitle: { fontSize: 15, lineHeight: 22 },

  formCard: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 30,
  },

  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 16, fontWeight: "600", marginBottom: 8 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 30,
    paddingHorizontal: 18,
    height: 52,
  },
  leftIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16 },

  signupButton: {
    borderRadius: 30,
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  signupButtonText: { fontSize: 16, fontWeight: "600" },

  loginContainer: { flexDirection: "row", justifyContent: "center", marginBottom: 25 },
  loginText: { fontSize: 15 },
  loginLink: { fontSize: 15, fontWeight: "600" },

});
