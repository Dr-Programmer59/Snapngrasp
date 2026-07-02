import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { getNotes, deleteNote, toggleFavorite } from "../api/notes";

export default function NotesScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { folderId, folderName } = route.params || {};

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [folderId]);

  // Reload notes when returning from create/edit
  useEffect(() => {
    if (route.params?.reload) {
      loadNotes();
      // Clear the reload param
      navigation.setParams({ reload: false });
    }
  }, [route.params?.reload]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const result = await getNotes('', '', 'updated_at', 'desc', folderId);
      setNotes(result.data.notes);
    } catch (error) {
      console.error('Error loading notes:', error);
      Alert.alert('Error', 'Failed to load notes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotes();
  };

  const handleDeleteNote = (noteId) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNote(noteId);
              setNotes(notes.filter(note => note.id !== noteId));
              Alert.alert('Success', 'Note deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete note');
            }
          },
        },
      ]
    );
  };

  const handleToggleFavorite = async (noteId) => {
    try {
      const result = await toggleFavorite(noteId);
      setNotes(notes.map(note =>
        note.id === noteId ? result.data.note : note
      ));
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const renderNote = ({ item }) => (
    <TouchableOpacity
      style={[styles.noteCard, { backgroundColor: theme.isDark ? '#191B2F' : '#fff' }]}
      onPress={() =>
        navigation.navigate("NoteDetailScreen", { noteId: item.id })
      }
    >
      <View style={styles.noteHeader}>
        <Text style={[styles.noteTitle, { color: theme.isDark ? '#FFFFFF' : '#111827' }]} numberOfLines={1}>{item.title}</Text>
        <View style={styles.noteActions}>
          <TouchableOpacity onPress={() => handleToggleFavorite(item.id)}>
            <Ionicons 
              name={item.is_favorite ? "star" : "star-outline"} 
              size={20} 
              color={item.is_favorite ? "#FDB022" : "#6b7280"} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate("EditNotesScreen", { noteId: item.id })}
            style={{ marginLeft: 8 }}
          >
            <Ionicons name="pencil-outline" size={18} color={theme.isDark ? '#9CA3AF' : '#6b7280'} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handleDeleteNote(item.id)}
            style={{ marginLeft: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.noteContent, { color: theme.isDark ? '#D1D5DB' : '#4b5563' }]} numberOfLines={3}>{item.content}</Text>
      
      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={[styles.tag, { backgroundColor: theme.isDark ? '#252b3d' : '#EDE9FE' }]}>
              <Text style={[styles.tagText, { color: theme.isDark ? '#8B7FD9' : '#7C3AED' }]}>{tag}</Text>
            </View>
          ))}
          {item.tags.length > 3 && (
            <Text style={[styles.moreTagsText, { color: theme.isDark ? '#9CA3AF' : '#6B7280' }]}>+{item.tags.length - 3}</Text>
          )}
        </View>
      )}
      
      <Text style={[styles.noteDate, { color: theme.isDark ? '#6B7280' : '#9CA3AF' }]}>
        {new Date(item.updated_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.isDark ? '#0C1421' : '#f5f5f5' }]}>
        <LinearGradient
          colors={theme.isDark ? ['#382F74', '#22234C'] : ['#191B2F', '#0C1421']}
          style={styles.headerContainer}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{folderName || 'Notes'}</Text>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={[styles.loadingText, { color: theme.isDark ? '#9CA3AF' : '#6B7280' }]}>Loading notes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.isDark ? '#0C1421' : '#f5f5f5' }]}>
      {/* Header Gradient */}
      <LinearGradient
        colors={theme.isDark ? ['#382F74', '#22234C'] : ['#191B2F', '#0C1421']}
        style={styles.headerContainer}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{folderName || 'Notes'}</Text>
        </View>
      </LinearGradient>

      {/* Notes Section */}
      <View style={[styles.notesSection, { backgroundColor: theme.isDark ? '#0C1421' : '#f9fafb' }]}>
        <View style={styles.notesHeader}>
          <Text style={[styles.sectionTitle, { color: theme.isDark ? '#FFFFFF' : '#111827' }]}>
            {folderId ? folderName : 'All Notes'}
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("CreateNoteScreen", { folderId })}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addText}>Add Note</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={renderNote}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={theme.isDark ? '#6B7280' : '#9CA3AF'} />
              <Text style={[styles.emptyText, { color: theme.isDark ? '#9CA3AF' : '#6B7280' }]}>No notes yet</Text>
              <Text style={[styles.emptySubtext, { color: theme.isDark ? '#6B7280' : '#9CA3AF' }]}>Create your first note to get started</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#8B5CF6']}
              tintColor="#8B5CF6"
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  headerContainer: {
    height: 120,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginRight: 40, // to visually center title (back button offset)
    fontFamily: "Poppins",
  },

  // Notes Section
  notesSection: {
    flex: 1,
    padding: 20,
  },
  notesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Poppins",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8B5CF6",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 25,
  },
  addText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 5,
    fontFamily: "Poppins",
  },

  // Note Card
  noteCard: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  noteTitle: {
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "Poppins",
  },
  noteContent: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins",
  },

  // Note Tags
  noteTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 6,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Poppins",
  },
  moreTagsText: {
    fontSize: 11,
    marginLeft: 4,
    fontFamily: "Poppins",
  },
  noteTag: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noteTagText: {
    fontSize: 11,
    color: "#7C3AED",
    fontWeight: "600",
    fontFamily: "Poppins",
  },

  // Note Footer
  noteFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    // borderTopColor is set dynamically in render
  },
  noteDate: {
    fontSize: 12,
    // color is set dynamically in render
    fontFamily: "Poppins",
  },
  noteActions: {
    flexDirection: "row",
    gap: 12,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    fontFamily: "Poppins",
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    fontFamily: "Poppins",
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: "Poppins",
  },
});