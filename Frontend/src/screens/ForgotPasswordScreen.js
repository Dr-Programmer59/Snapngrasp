import { useState } from "react";
import {
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");

  const handleNext = () => {
    if (!email || !email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    navigation?.navigate("verify", { email });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Title */}
      <View style={styles.titleSection}>
        <Text style={styles.mainTitle}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your email to get a verification code
        </Text>
      </View>

      {/* Form */}
      <View style={styles.formCard}>
        <Text style={styles.inputLabel}>Email</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#777"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1d2e" },
  titleSection: { padding: 30, marginTop: 40 },
  mainTitle: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  subtitle: { marginTop: 8, fontSize: 14, color: "#b3b3b3" },
  formCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 25
  },
  inputLabel: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  inputContainer: {
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    justifyContent: "center",
    marginBottom: 25
  },
  input: { fontSize: 16, color: "#000" },
  nextButton: {
    backgroundColor: "#6B5FCD",
    borderRadius: 30,
    height: 50,
    justifyContent: "center",
    alignItems: "center"
  },
  nextButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" }
});
