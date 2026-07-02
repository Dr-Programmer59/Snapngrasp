import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getFolders, createFolder, updateFolder, deleteFolder } from '../api/folders';

const FoldersScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#6C63FF');

  const folderColors = [
    '#6C63FF', '#FF6B9D', '#4ECDC4', '#FFD93D',
    '#A8E6CF', '#FF8B94', '#95E1D3', '#FECA57',
  ];

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const response = await getFolders();
      setFolders(response.data.folders || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
      Alert.alert('Error', 'Failed to load folders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFolders();
  };

  const handleCreateFolder = () => {
    setEditingFolder(null);
    setFolderName('');
    setFolderColor('#6C63FF');
    setModalVisible(true);
  };

  const handleEditFolder = (folder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderColor(folder.color || '#6C63FF');
    setModalVisible(true);
  };

  const handleSaveFolder = async () => {
    if (!folderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }

    try {
      if (editingFolder) {
        await updateFolder(editingFolder.id, folderName.trim(), folderColor, 'folder-outline');
      } else {
        await createFolder(folderName.trim(), folderColor, 'folder-outline');
      }
      setModalVisible(false);
      fetchFolders();
    } catch (error) {
      console.error('Error saving folder:', error);
      Alert.alert('Error', 'Failed to save folder');
    }
  };

  const handleDeleteFolder = (folder) => {
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folder.name}"? Notes in this folder will not be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFolder(folder.id);
              fetchFolders();
            } catch (error) {
              console.error('Error deleting folder:', error);
              Alert.alert('Error', 'Failed to delete folder');
            }
          },
        },
      ]
    );
  };

  const handleFolderPress = (folder) => {
    navigation.navigate('NotesScreen', { folderId: folder.id, folderName: folder.name });
  };

  const renderFolderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.folderCard, { backgroundColor: theme.isDark ? '#191B2F' : '#fff' }]}
      onPress={() => handleFolderPress(item)}
    >
      <View style={[styles.folderIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name="folder" size={32} color={item.color} />
      </View>

      <View style={styles.folderInfo}>
        <Text style={[styles.folderName, { color: theme.isDark ? '#FFFFFF' : '#1F2937' }]}>
          {item.name}
        </Text>
        <Text style={[styles.folderCount, { color: theme.isDark ? '#9CA3AF' : '#6B7280' }]}>
          {item.note_count || 0} {item.note_count === 1 ? 'note' : 'notes'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.menuBtn}
        onPress={() => {
          Alert.alert('Folder Actions', `Choose action for "${item.name}"`, [
            { text: 'Edit', onPress: () => handleEditFolder(item) },
            { text: 'Delete', onPress: () => handleDeleteFolder(item), style: 'destructive' },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={theme.isDark ? '#9CA3AF' : '#6B7280'} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.isDark ? '#0C1421' : '#F7F8FA' }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.isDark ? '#382F74' : '#243D66'} />

      {/* Header */}
      <LinearGradient
        colors={theme.isDark ? ['#382F74', '#2D2552'] : ['#243D66', '#1A2B4A']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Folders</Text>
          <TouchableOpacity onPress={handleCreateFolder} style={styles.addButton}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* All Notes Card */}
      <View style={styles.allNotesContainer}>
        <TouchableOpacity
          style={[styles.folderCard, { backgroundColor: theme.isDark ? '#191B2F' : '#fff' }]}
          onPress={() => navigation.navigate('NotesScreen')}
        >
          <View style={[styles.folderIcon, { backgroundColor: '#6C63FF20' }]}>
            <Ionicons name="document-text" size={32} color="#6C63FF" />
          </View>

          <View style={styles.folderInfo}>
            <Text style={[styles.folderName, { color: theme.isDark ? '#FFFFFF' : '#1F2937' }]}>
              All Notes
            </Text>
            <Text style={[styles.folderCount, { color: theme.isDark ? '#9CA3AF' : '#6B7280' }]}>
              View all your notes
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={theme.isDark ? '#9CA3AF' : '#6B7280'} />
        </TouchableOpacity>
      </View>

      {/* Folders List */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.isDark ? '#9CA3AF' : '#6B7280' }]}>
            Loading folders...
          </Text>
        </View>
      ) : folders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={80} color={theme.isDark ? '#4B5563' : '#D1D5DB'} />
          <Text style={[styles.emptyText, { color: theme.isDark ? '#9CA3AF' : '#6B7280' }]}>
            No folders yet. Create one to organize your notes!
          </Text>
        </View>
      ) : (
        <FlatList
          data={folders}
          renderItem={renderFolderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Create/Edit Folder Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.isDark ? '#1F2937' : '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: theme.isDark ? '#F3F4F6' : '#1F2937' }]}>
              {editingFolder ? 'Edit Folder' : 'New Folder'}
            </Text>

            <TextInput
              style={[styles.input, {
                backgroundColor: theme.isDark ? '#374151' : '#F3F4F6',
                color: theme.isDark ? '#F3F4F6' : '#1F2937',
              }]}
              placeholder="Folder name"
              placeholderTextColor={theme.isDark ? '#9CA3AF' : '#6B7280'}
              value={folderName}
              onChangeText={setFolderName}
              autoFocus
            />

            <Text style={[styles.colorLabel, { color: theme.isDark ? '#D1D5DB' : '#4B5563' }]}>
              Choose a color:
            </Text>

            <View style={styles.colorPicker}>
              {folderColors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    folderColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setFolderColor(color)}
                >
                  {folderColor === color && <Ionicons name="checkmark" size={20} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveFolder}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allNotesContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  folderIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  folderCount: {
    fontSize: 14,
  },
  menuBtn: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  colorLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6B7280',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#6C63FF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FoldersScreen;
