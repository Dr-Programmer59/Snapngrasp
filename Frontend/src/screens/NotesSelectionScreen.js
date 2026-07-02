import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getNotes } from '../api/notes';
import { createUploadFromNote } from '../api/upload';

const NotesSelectionScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await getNotes();
      setNotes(response.data.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      Alert.alert('Error', 'Failed to load notes. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotes();
  };

  const handleSelectNote = async (note) => {
    if (processing) return;

    setSelectedNote(note.id);
    setProcessing(true);

    try {
      // Create upload from note content
      const response = await createUploadFromNote(note.id);
      
      if (response.status === 'success') {
        const uploadId = response.data.upload.id;
        
        // Navigate to analyzing screen to generate materials
        navigation.navigate('AnalyzingScreen', {
          uploadId,
          subject: note.tags?.[0] || 'General',
        });
      } else {
        throw new Error(response.message || 'Failed to create upload from note');
      }
    } catch (error) {
      console.error('Error processing note:', error);
      Alert.alert('Error', 'Failed to process note. Please try again.');
      setSelectedNote(null);
    } finally {
      setProcessing(false);
    }
  };

  const renderNoteItem = ({ item }) => {
    const isSelected = selectedNote === item.id;
    const preview = item.content?.substring(0, 100) || 'No content';
    const date = new Date(item.updated_at).toLocaleDateString();

    return (
      <TouchableOpacity
        style={[
          styles.noteCard,
          { backgroundColor: theme.isDark ? '#191B2F' : '#fff' },
          isSelected && styles.noteCardSelected,
        ]}
        onPress={() => handleSelectNote(item)}
        disabled={processing}
      >
        <View style={styles.noteHeader}>
          <Text
            style={[styles.noteTitle, { color: theme.isDark ? '#FFFFFF' : '#1F2937' }]}
            numberOfLines={1}
          >
            {item.title || 'Untitled Note'}
          </Text>
          {isSelected && processing && (
            <ActivityIndicator size="small" color="#6C63FF" />
          )}
          {!processing && (
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.isDark ? '#9CA3AF' : '#6B7280'}
            />
          )}
        </View>

        <Text
          style={[styles.notePreview, { color: theme.isDark ? '#9CA3AF' : '#6B7280' }]}
          numberOfLines={2}
        >
          {preview}
        </Text>

        <View style={styles.noteFooter}>
          <View style={styles.tags}>
            {item.tags?.slice(0, 2).map((tag, index) => (
              <View
                key={index}
                style={[styles.tag, { backgroundColor: theme.isDark ? '#2D3250' : '#F3F4F6' }]}
              >
                <Text style={[styles.tagText, { color: theme.isDark ? '#A0A8C5' : '#6B7280' }]}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
          <Text style={[styles.noteDate, { color: theme.isDark ? '#6B7280' : '#9CA3AF' }]}>
            {date}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.isDark ? '#0C1421' : '#F7F8FA' }]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.isDark ? '#382F74' : '#243D66'}
      />

      {/* Header */}
      <LinearGradient
        colors={theme.isDark ? ['#382F74', '#22234C'] : ['#191B2F', '#0C1421']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select a Note</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={[styles.loadingText, { color: theme.isDark ? '#9CA3AF' : '#6B7280' }]}>
            Loading your notes...
          </Text>
        </View>
      ) : notes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="document-text-outline"
            size={64}
            color={theme.isDark ? '#4B5563' : '#D1D5DB'}
          />
          <Text style={[styles.emptyTitle, { color: theme.isDark ? '#FFFFFF' : '#1F2937' }]}>
            No Notes Found
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.isDark ? '#9CA3AF' : '#6B7280' }]}>
            Create some notes first to use this feature
          </Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6C63FF"
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  noteCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noteCardSelected: {
    borderWidth: 2,
    borderColor: '#6C63FF',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  notePreview: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tags: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noteDate: {
    fontSize: 12,
  },
});

export default NotesSelectionScreen;
