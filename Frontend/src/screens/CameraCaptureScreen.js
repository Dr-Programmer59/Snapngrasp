import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function CameraCaptureScreen({ navigation }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType] = useState("back");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    requestPermission();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      setImage(photo.uri);
    }
  };

  const handleRetake = () => setImage(null);

  const handleContinue = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.navigate("ProcessingScreen", { image });
    }, 1500);
  };

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={{ marginTop: 10 }}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text>No access to camera</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7} underlayColor="#8B5CF6">
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Camera</Text>
        <View style={{ width: 40 }} />
      </View>



      {/* Camera or Captured Image */}
      <View style={styles.cameraFrame}>
        <View style={styles.cameraWrapper}>
          {!image ? (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={cameraType}
              ratio="16:9"
            />
          ) : (
            <Image source={{ uri: image }} style={styles.camera} />
          )}
        </View>
      </View>

      {/* Buttons Section */}
      <View style={styles.bottomButtons}>
        {!image ? (
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <Ionicons name="camera" size={36} color="#fff" />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.continueBtn, loading && { opacity: 0.7 }]}
              onPress={handleContinue}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.continueText}>Continue</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA", // background color from ContentInputSelection
    alignItems: "center",
  },
  header: {
    width: "100%",
    backgroundColor: "#191B2F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 30 : 10,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 18,
    color: "#fff",
    fontFamily: 'Poppins-SemiBold',
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
  title: {
    color: "#444",
    fontSize: 16,
    marginTop: 18,
    marginBottom: 10,
    fontWeight: "500",
  },
  cameraFrame: {
    paddingTop:10,
    width: width * 0.9, // visible boundary margin
    height: height * 0.65,
    borderRadius: 20,
    backgroundColor: "#fff", // outer boundary color (light grey)
    justifyContent: "center",
    alignItems: "center",
    padding: 1, // spacing between outer frame and inner camera
  },
  cameraWrapper: {
    width: "100%",
    height: "100%",
    borderRadius:0,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  camera: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  bottomButtons: {
    width: "100%",
    paddingHorizontal: 24,
    marginTop: 25,
    marginBottom: 30,
    alignItems: "center",
  },
  captureButton: {
    backgroundColor: "#6e61ca",
    width: 75,
    height: 75,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  retakeBtn: {
    backgroundColor: "#fff",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 25, // smooth round corners
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#ccc",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  continueBtn: {
    backgroundColor: "#6e61ca",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    shadowColor: "#6e61ca",
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  retakeText: {
    color: "#243D66",
    fontWeight: "600",
    fontSize: 16,
  },
  continueText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
