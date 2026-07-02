import { Ionicons } from "@expo/vector-icons";
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

const VisualUploadScreen = ({ navigation }) => {
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
        allowsMultipleSelection: false, // Only one visual at a time
        quality: 1,
      });

      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.fileName || `visual_${Date.now()}.jpg`,
          type: 'image',
          progress: 0,
        }));

        setFiles(newFiles); // Replace existing files
        uploadToBackend(newFiles);
      }
    } catch (err) {
      console.log("Error picking image:", err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // 📷 Take Photo with Camera
  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow camera access');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 1,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map((asset) => ({
          uri: asset.uri,
          name: `visual_${Date.now()}.jpg`,
          type: 'image',
          progress: 0,
        }));

        setFiles(newFiles);
        uploadToBackend(newFiles);
      }
    } catch (err) {
      console.log("Error taking photo:", err);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  // ⏳ Real Upload to Backend
  const uploadToBackend = async (selectedFiles) => {
    try {
      // Get auth token
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
            type: 'image/jpeg'
          });
          // Add flag to indicate this is a visual upload (no text extraction)
          formData.append('skipTextExtraction', 'true');
          formData.append('uploadType', 'visual');

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
              console.log('✅ [VisualUpload] Upload response:', response);
              console.log('📍 [VisualUpload] Full response.data:', response.data);
              
              // Backend returns upload_id with underscore
              const uploadId = response.data?.upload_id || response.data?.id || response.upload_id || response.id;
              console.log('🔑 [VisualUpload] Extracted uploadId:', uploadId);
              
              setFiles((prevFiles) =>
                prevFiles.map((f) =>
                  f.name === file.name ? { ...f, progress: 1, uploaded: true, uploadId } : f
                )
              );
            } else {
              console.error('❌ [VisualUpload] Upload failed:', xhr.status, xhr.responseText);
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

  // ✅ Continue Button Action - Process Visual
  const handleContinue = () => {
    if (files.length === 0) {
      Alert.alert('No Visual', 'Please select a visual/image');
      return;
    }

    // Check if all files are uploaded (progress = 1)
    const allUploaded = files.every(file => file.progress >= 1 && file.uploaded);
    if (!allUploaded) {
      Alert.alert('Wait', 'Please wait for upload to complete');
      return;
    }

    setLoading(true);
    
    const firstFile = files[0];
    console.log('🚀 [VisualUpload] Navigating with params:', {
      uploadId: firstFile.uploadId,
      hasUploadId: !!firstFile.uploadId,
      isGeneratingMaterials: true,
      isVisualUpload: true
    });
    
    if (!firstFile.uploadId) {
      console.error('❌ [VisualUpload] No uploadId found! File object:', firstFile);
      Alert.alert('Error', 'Upload ID not found. Please try uploading again.');
      setLoading(false);
      return;
    }
    
    setTimeout(() => {
      setLoading(false);
      // Navigate directly to ProcessingScreen with isGeneratingMaterials=true
      // and isVisualUpload=true to skip text extraction
      navigation.navigate("ProcessingScreen", { 
        uploadId: firstFile.uploadId,
        image: firstFile.uri,
        subject: 'Visual Analysis',
        isGeneratingMaterials: true,
        isVisualUpload: true, // Flag to indicate this is a visual upload (no text extraction)
      });
    }, 500);
  };

  // 💬 Render Each File Row
  const renderFile = ({ item }) => (
    <View style={styles.fileItem}>
      <Image source={{ uri: item.uri }} style={styles.previewImage} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.fileName}>{item.name}</Text>
        <View style={styles.progressContainer}>
          <Progress.Bar
            progress={item.progress}
            width={180}
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
        <Text style={styles.headerTitle}>Upload Visual</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Chat Bubble */}
      <View style={styles.chatSection}>
        <LeftChatBubble message="Upload a diagram, chart, or any visual and I'll analyze it to generate study materials for you!" />
      </View>

      {/* Upload Buttons */}
      <View style={styles.uploadSection}>
        <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
          <Ionicons name="images" size={32} color="#6e61ca" />
          <Text style={styles.uploadBtnText}>Choose from Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.uploadBtn} onPress={takePhoto}>
          <Ionicons name="camera" size={32} color="#6e61ca" />
          <Text style={styles.uploadBtnText}>Take Photo</Text>
        </TouchableOpacity>
      </View>

      {/* File List */}
      {files.length > 0 && (
        <View style={styles.fileListContainer}>
          <Text style={styles.fileListTitle}>Uploaded Visual:</Text>
          <FlatList
            data={files}
            renderItem={renderFile}
            keyExtractor={(item) => item.name}
            style={styles.fileList}
          />
        </View>
      )}

      {/* Continue Button */}
      {files.length > 0 && (
        <TouchableOpacity
          style={[
            styles.continueBtn,
            files.every(f => f.progress >= 1 && f.uploaded) ? {} : styles.continueDisabled
          ]}
          onPress={handleContinue}
          disabled={!files.every(f => f.progress >= 1 && f.uploaded) || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueBtnText}>Generate Study Materials</Text>
          )}
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#6e61ca",
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  chatSection: {
    padding: 16,
    marginBottom: 10,
  },
  uploadSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  uploadBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    minWidth: width * 0.4,
  },
  uploadBtnText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  fileListContainer: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  fileListTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  fileList: {
    flex: 1,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  fileName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  percentageText: {
    marginLeft: 10,
    fontSize: 12,
    color: "#6e61ca",
    fontWeight: "600",
  },
  continueBtn: {
    backgroundColor: "#6e61ca",
    paddingVertical: 16,
    marginHorizontal: 16,
    marginVertical: 20,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  continueDisabled: {
    backgroundColor: "#ccc",
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
});

export default VisualUploadScreen;
