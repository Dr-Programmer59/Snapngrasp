import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import BottomNavigation from '../components/BottomNavigation';
import { useTheme } from '../contexts/ThemeContext';
import { getUploadHistory, deleteUpload } from '../api/upload';

const FileUploadScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('create');

  const handleTabPress = (tabKey) => {
    setActiveTab(tabKey);
    if (tabKey === 'profile') {
      navigation.navigate('ContentInputSelection');
    }
    // Add navigation logic for other tabs as needed
  };

  // Fetch uploads on component mount
  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    try {
      setLoading(true);
      const response = await getUploadHistory();
      
      // Transform backend data to match our display format
      const transformedFiles = response.data.uploads.map((upload) => ({
        id: upload.id,
        name: upload.title && upload.subject 
          ? `${upload.subject} - ${upload.title}` 
          : upload.title || upload.filename,
        type: upload.mime_type?.split('/')[1] || 'jpg', // Extract file extension from mime type
        size: formatFileSize(upload.file_size),
        time: formatTime(upload.created_at),
        upload_id: upload.id,
        file_url: upload.file_url,
      }));
      
      setFiles(transformedFiles);
    } catch (error) {
      console.error('Failed to fetch uploads:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Helper function to format time
  const formatTime = (dateString) => {
    const now = new Date();
    const uploadDate = new Date(dateString);
    const diffMs = now - uploadDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return uploadDate.toLocaleDateString();
  };

  const handleUpload = () => {
    navigation.navigate('ContentInputSelection');
  };

  const handleFilePress = (file) => {
    // Navigate to study material screen or detail view
    navigation.navigate('StudyMaterialScreen', { uploadId: file.upload_id });
  };

  const handleDeleteFile = (fileId) => {
    const file = files.find(f => f.id === fileId);
    Alert.alert(
      'Delete Upload',
      `Are you sure you want to delete "${file?.name || 'this file'}"? This will also remove all generated study materials.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUpload(fileId);
              setFiles(prev => prev.filter(f => f.id !== fileId));
            } catch (error) {
              console.error('Failed to delete upload:', error);
              Alert.alert('Error', 'Failed to delete upload. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.isDark ? '#0C1421' : '#F9F9F9' }]}>
      {/* Header */}
      <LinearGradient
        colors={theme.isDark ? ['#382F74', '#22234C'] : ['#191B2F', '#0C1421']}
        style={styles.header}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerText}>Create</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {loading ? (
        // Loading state
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#6e61ca" />
          <Text style={[styles.emptyText, { color: theme.isDark ? '#9CA3AF' : '#555' }]}>Loading your uploads...</Text>
        </View>
      ) : files.length === 0 ? (
        // Empty state
        <View style={styles.emptyContainer}>
          <Image
            source={require('../assets/images/empty_state.png')}
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={[styles.emptyText, { color: theme.isDark ? '#9CA3AF' : '#555' }]}>
            No content here yet. Start by uploading your first document to create learning material.
          </Text>
          <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
            <Text style={styles.uploadButtonText}>Upload</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Uploaded files view
        <ScrollView contentContainerStyle={styles.filesContainer}>
          <View style={styles.uploadHeader}>
            <Text style={[styles.uploadedTitle, { color: theme.isDark ? '#FFFFFF' : '#000' }]}>Uploaded Files</Text>
            <TouchableOpacity style={styles.uploadSmallButton} onPress={handleUpload}>
              <Text style={styles.uploadSmallButtonText}>Upload</Text>
            </TouchableOpacity>
          </View>

          {files.map((file) => (
            <TouchableOpacity 
              key={file.id} 
              style={[styles.fileCard, { backgroundColor: theme.isDark ? '#191B2F' : '#fff' }]}
              onPress={() => handleFilePress(file)}
            >
              <Image
                source={
                  file.type === 'pdf'
                    ? require('../assets/images/pdf.png')
                    : file.type === 'jpeg' || file.type === 'jpg'
                    ? require('../assets/images/jpg.png')
                    : file.type === 'png'
                    ? require('../assets/images/pdf.png')
                    : require('../assets/images/jpg.png')
                }
                style={styles.fileIcon}
              />
              <View style={styles.fileDetails}>
                <Text style={[styles.fileName, { color: theme.isDark ? '#FFFFFF' : '#333' }]} numberOfLines={1}>{file.name}</Text>
                <Text style={[styles.fileMeta, { color: theme.isDark ? '#9CA3AF' : '#888' }]}>{file.size} • {file.time}</Text>
              </View>
              <TouchableOpacity onPress={(e) => {
                e.stopPropagation();
                handleDeleteFile(file.id);
              }}>
                <Ionicons name="close-circle-outline" size={22} color={theme.isDark ? '#9CA3AF' : '#A0A0A0'} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
};

export default FileUploadScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 100,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingbottom:70,
  },
  headerText: { fontFamily: 'Poppins', fontSize: 20, fontWeight: '500', color: '#FFFFFF' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyImage: { width: 160, height: 160, marginBottom: 20 },
  emptyText: { textAlign: 'center', marginBottom: 20, fontFamily: 'Poppins' },
  uploadButton: {
    backgroundColor: '#6e61ca',
    width: 100,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  uploadHeader: { flexDirection: 'row', justifyContent: 'space-between', margin: 20 },
  uploadedTitle: { fontSize: 20, fontWeight: '600' ,fontFamily: 'Poppins'},
  uploadSmallButton: {
    backgroundColor: '#736BEE',
     width: 90,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadSmallButtonText: { color: '#fff', fontWeight: '600',fontSize: 16 },
  filesContainer: { paddingHorizontal: 20, paddingBottom: 80 },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    elevation: 1,
  },
  fileIcon: { width: 32, height: 32, marginRight: 10 },
  fileDetails: { flex: 1 },
  fileName: { fontWeight: '600', fontFamily: 'Poppins'},
  fileMeta: { fontSize: 12, fontFamily: 'Poppins'},
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 15,
    borderTopColor: '#ddd',
    borderTopWidth: 1,
    backgroundColor: '#fff',
  },
});
