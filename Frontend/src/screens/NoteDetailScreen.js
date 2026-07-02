import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getNoteById, deleteNote, toggleFavorite } from "../api/notes";

export default function NoteDetailScreen({ route, navigation }) {
  const { noteId } = route.params;
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNote();
  }, []);

  const loadNote = async () => {
    try {
      setLoading(true);
      const response = await getNoteById(noteId);
      // Extract the note from the response data structure
      setNote(response.data?.note || response.data || response);
    } catch (error) {
      console.error("Error loading note:", error);
      Alert.alert("Error", "Failed to load note", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteNote(noteId);
              navigation.navigate("NotesScreen", { reload: true });
            } catch (error) {
              Alert.alert("Error", "Failed to delete note");
            }
          },
        },
      ]
    );
  };

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite(noteId);
      setNote({ ...note, is_favorite: !note.is_favorite });
    } catch (error) {
      Alert.alert("Error", "Failed to update favorite status");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c6fd6" />
          <Text style={styles.loadingText}>Loading note...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!note) {
    return null;
  }

  // Simple function to strip HTML tags for plain text display
  const stripHTML = (html) => {
    return html
      .replace(/<strong>(.*?)<\/strong>/g, '$1')
      .replace(/<em>(.*?)<\/em>/g, '$1')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]*>/g, '');
  };

  const displayContent = note.content_html 
    ? stripHTML(note.content_html) 
    : note.content;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {note.title}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleToggleFavorite} style={styles.actionButton}>
            <Ionicons
              name={note.is_favorite ? "star" : "star-outline"}
              size={22}
              color="#FFD700"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("EditNotesScreen", { noteId })}
            style={styles.actionButton}
          >
            <Ionicons name="pencil" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={22} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {note.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Category */}
        {note.category && (
          <View style={styles.categoryContainer}>
            <Ionicons name="folder-outline" size={16} color="#7c6fd6" />
            <Text style={styles.categoryText}>{note.category}</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.contentText}>{displayContent}</Text>
        </View>

        {/* Metadata */}
        <View style={styles.metadata}>
          <Text style={styles.metadataText}>
            Created: {new Date(note.created_at).toLocaleDateString()}
          </Text>
          {note.updated_at && (
            <Text style={styles.metadataText}>
              Updated: {new Date(note.updated_at).toLocaleDateString()}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1a1f3a",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
    fontFamily: "Poppins",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1f3a",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginHorizontal: 12,
    fontFamily: "Poppins",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 8,
  },
  tag: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: "#7C3AED",
    fontWeight: "600",
    fontFamily: "Poppins",
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    color: "#7c6fd6",
    fontWeight: "500",
    fontFamily: "Poppins",
  },
  contentContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#1a1a1a",
    fontFamily: "Poppins",
  },
  metadata: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  metadataText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
    fontFamily: "Poppins",
  },
});