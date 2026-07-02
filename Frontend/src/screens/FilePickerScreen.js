import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import * as Progress from "react-native-progress";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import LeftChatBubble from "../components/LeftChatBubble";

const FileUploadScreen = ({ navigation }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // 📷 Pick Image from Gallery
  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.type || 'image',
          progress: 0,
        }));

        setFiles((prev) => [...prev, ...newFiles]);
        uploadToBackend(newFiles);
      }
    } catch (err) {
      console.log("Error picking image:", err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // 📂 Pick Document (PDF, Word, etc.)
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
        type: [
          "image/*",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
      });

      if (!result.canceled && (result.assets || result.name)) {
        const selectedFiles = result.assets || [result];
        const newFiles = selectedFiles.map((file) => ({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'document',
          progress: 0,
        }));

        setFiles((prev) => [...prev, ...newFiles]);
        uploadToBackend(newFiles);
      }
    } catch (err) {
      console.log("Error picking document:", err);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  // ⏳ Real Upload to Backend
  const uploadToBackend = async (selectedFiles) => {
    try {
      // Get auth token (use SecureStore on native, AsyncStorage on web)
      let token;
      if (Platform.OS === 'web') {
        token = await AsyncStorage.getItem('access_token');
      } else {
        token = await SecureStore.getItemAsync('access_token');
      }
      
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }

      for (const file of selectedFiles) {
        try {
          const formData = new FormData();
          formData.append('image', {
            uri: file.uri,
            name: file.name,
            type: file.type.includes('image') ? 'image/jpeg' : file.type
          });

          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = event.loaded / event.total;
              setFiles((prevFiles) =>
                prevFiles.map((f) =>
                  f.name === file.name ? { ...f, progress } : f
                )
              );
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status === 200 || xhr.status === 201) {
              const response = JSON.parse(xhr.responseText);
              setFiles((prevFiles) =>
                prevFiles.map((f) =>
                  f.name === file.name ? { ...f, progress: 1, uploaded: true, uploadId: response.data?.upload?.id } : f
                )
              );
            } else {
              console.error('Upload failed:', xhr.status, xhr.responseText);
              Alert.alert('Upload Failed', `Failed to upload ${file.name}`);
              setFiles((prevFiles) =>
                prevFiles.map((f) =>
                  f.name === file.name ? { ...f, progress: 0, error: true } : f
                )
              );
            }
          });

          xhr.addEventListener('error', () => {
            console.error('Network error during upload');
            Alert.alert('Network Error', `Failed to upload ${file.name}`);
            setFiles((prevFiles) =>
              prevFiles.map((f) =>
                f.name === file.name ? { ...f, progress: 0, error: true } : f
              )
            );
          });

          const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api.snapngrasp.com';
          xhr.open('POST', `${apiUrl}/api/uploads/image`);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.send(formData);

        } catch (error) {
          console.error('Upload error:', error);
          Alert.alert('Error', `Failed to upload ${file.name}`);
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Error', 'Failed to get authentication token');
    }
  };

  // ❌ Remove File
  const removeFile = (name) => {
    setFiles((prev) => prev.filter((file) => file.name !== name));
  };

  // ✅ Continue Button Action
  const handleContinue = () => {
    if (files.length === 0) {
      Alert.alert('No Files', 'Please select at least one file');
      return;
    }

    // Check if all files are uploaded (progress = 1)
    const allUploaded = files.every(file => file.progress >= 1 && file.uploaded);
    if (!allUploaded) {
      Alert.alert('Wait', 'Please wait for uploads to complete');
      return;
    }

    setLoading(true);
    
    // For now, take the first file
    const firstFile = files[0];
    
    setTimeout(() => {
      setLoading(false);
      // Navigate to ProcessingScreen with uploadId (backend already extracted text)
      navigation.navigate("ProcessingScreen", { 
        uploadId: firstFile.uploadId,
        image: firstFile.uri,
        fileType: firstFile.type,
        fileName: firstFile.name
      });
    }, 500);
  };

  // 💬 Render Each File Row
  const renderFile = ({ item }) => (
    <View style={styles.fileItem}>
      <View style={{ flex: 1 }}>
        <Text style={styles.fileName}>{item.name}</Text>
        <View style={styles.progressContainer}>
          <Progress.Bar
            progress={item.progress}
            width={220}
            color="#6e61ca"
            height={8}
            borderRadius={10}
          />
          <Text style={styles.percentageText}>
            {(item.progress * 100).toFixed(0)}%
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => removeFile(item.name)}>
        <Ionicons name="close-circle" size={24} color="#6e61ca" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>File Upload</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Chat Bubble */}
      <View style={styles.chatSection}>
        <LeftChatBubble message="PDFs or images work fine. Just upload and I'll process them for you." />
      </View>

      {/* Upload Section */}
      <View style={styles.uploadBox}>
        <Image
          source={require("../assets/icons/upload.png")}
          style={styles.uploadIcon}
        />
        <Text style={styles.dragText}>
          Select files from your device
        </Text>

        {/* Two upload options */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.uploadOptionBtn} onPress={pickImage}>
            <Ionicons name="images" size={24} color="#6e61ca" />
            <Text style={styles.uploadOptionText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.uploadOptionBtn} onPress={pickDocument}>
            <Ionicons name="document" size={24} color="#6e61ca" />
            <Text style={styles.uploadOptionText}>Documents</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* File List with Progress Bars */}
      {files.length > 0 && (
        <View style={styles.fileListContainer}>
          <FlatList
            data={files}
            keyExtractor={(item) => item.name}
            renderItem={renderFile}
            style={{ width: "100%" }}
          />
        </View>
      )}

      {/* Footer */}
      {files.length > 0 && (
        <View style={styles.footer}>
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
        </View>
      )}
    </SafeAreaView>
  );
};

export default FileUploadScreen;

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  header: {
    height: 100,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "Poppins-SemiBold",
  },
  chatSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  uploadBox: {
    marginTop: 25,
    backgroundColor: "#fff",
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: "#B8A7FF",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 25,
    paddingHorizontal: 15,
    minHeight: 180,
    marginHorizontal: 20,
  },
  uploadIcon: {
    width: 70,
    height: 70,
    marginBottom: 10,
    resizeMode: "contain",
  },
  dragText: {
    color: "#333",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 15,
    marginTop: 5,
  },
  uploadOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#6e61ca",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  uploadOptionText: {
    color: "#6e61ca",
    fontWeight: "600",
    fontSize: 15,
  },
  browseBtn: {
    borderWidth: 1.5,
    borderColor: "#6e61ca",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 25,
  },
  browseText: {
    color: "#6e61ca",
    fontWeight: "600",
    fontSize: 15,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F8FF",
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  fileName: {
    color: "#333",
    fontSize: 14,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  percentageText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#6e61ca",
  },
  footer: {
    position: "absolute",
    bottom: 10,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
    backgroundColor: "#F7F7F7",
  },
  continueBtn: {
    backgroundColor: "#6e61ca",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    width: width * 0.9,
  },
  continueText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  fileListContainer: {
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 80, // Add space for the footer
  },
});
