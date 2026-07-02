import { useRef, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export default function VerifyModal({ navigation, route }) {
  const email = route?.params?.email || "";
  const [code, setCode] = useState(["", "", "", "", ""]);
  const inputRefs = useRef([]);

  const handleChangeText = (text, index) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 4) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleVerify = () => {
    const finalCode = code.join("");

    if (finalCode.length < 5) {
      alert("Please enter complete 5-digit OTP");
      return;
    }

    // ✅ Replace current screen to close modal and navigate to Reset Password Screen
    navigation.replace("resetPassword", { email });
  };

  return (
    <Modal animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Verify Email</Text>
          <Text style={styles.subtitle}>
            Enter the 5-digit code sent to:
          </Text>
          <Text style={styles.email}>{email}</Text>

          {/* OTP Inputs */}
          <View style={styles.otpContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                value={digit}
                onChangeText={(text) => handleChangeText(text, index)}
                keyboardType="numeric"
                maxLength={1}
                style={styles.otpInput}
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity style={styles.verifyButton} onPress={handleVerify}>
            <Text style={styles.verifyText}>Verify</Text>
          </TouchableOpacity>

          {/* Close / Back Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.navigate("forgotPassword")}
          >
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    color: "#666",
    textAlign: "center",
  },
  email: {
    color: "#6B5FCD",
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 25,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "80%",
    marginBottom: 30,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderRadius: 10,
    backgroundColor: "#F2F2F2",
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
  },
  verifyButton: {
    backgroundColor: "#6B5FCD",
    width: "85%",
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 10,
  },
  verifyText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    marginTop: 8,
  },
  closeText: {
    color: "#6B5FCD",
    fontSize: 14,
    fontWeight: "600",
  },
});
