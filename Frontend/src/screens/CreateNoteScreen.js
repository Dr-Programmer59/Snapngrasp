import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { createNote } from "../api/notes";

export default function CreateNoteScreen({ route }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { folderId } = route.params || {};
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      Alert.alert("Error", "Please enter a title or content");
      return;
    }

    setSaving(true);
    try {
      const noteData = {
        title: title.trim() || "Untitled Note",
        content: content.trim(),
        tags: tags.trim() ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        category: category.trim() || null,
        folder_id: folderId || null,
      };

      await createNote(noteData);
      Alert.alert("Success", "Note created successfully", [
        {
          text: "OK",
          onPress: () => navigation.navigate("NotesScreen", { reload: true, folderId }),
        },
      ]);
    } catch (error) {
      console.error("Error creating note:", error);
      Alert.alert("Error", error.message || "Failed to create note");
    } finally {
      setSaving(false);
    }
  };

  const insertFormatting = (format) => {
    if (!content) return;
    
    // Get cursor position (for simplicity, we'll append to the end)
    let newContent = content;
    
    if (format === "bold") {
      setIsBold(!isBold);
    } else if (format === "italic") {
      setIsItalic(!isItalic);
    }
  };

  const wrapSelectedText = (wrapper) => {
    // For now, we'll toggle the formatting state
    // In a full implementation, you'd track selection and wrap specific text
    if (wrapper === "**") {
      setIsBold(!isBold);
    } else if (wrapper === "*") {
      setIsItalic(!isItalic);
    }
  };

  const ToolbarButton = ({ icon, onPress, active }) => (
    <TouchableOpacity
      style={[styles.toolBtn, active && styles.toolBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.toolIcon, active && styles.toolIconActive]}>
        {icon}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.isDark ? '#0C1421' : '#f5f5f5' }]}>
      {/* HEADER */}
      <LinearGradient
        colors={theme.isDark ? ['#382F74', '#22234C'] : ['#191B2F', '#0C1421']}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Notes</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      {/* CONTENT */}
      <ScrollView style={[styles.content, { backgroundColor: theme.isDark ? '#0C1421' : '#f5f5f5' }]}>
        {/* TITLE SECTION */}
        <Text style={[styles.label, { color: theme.isDark ? '#FFFFFF' : '#000' }]}>Title</Text>
        <TextInput
          style={[styles.titleInput, { backgroundColor: theme.isDark ? '#191B2F' : '#fff', color: theme.isDark ? '#FFFFFF' : '#000' }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter title"
          placeholderTextColor={theme.isDark ? '#6B7280' : '#999'}
          editable={!saving}
        />

        {/* TAGS SECTION */}
        <Text style={[styles.label, { color: theme.isDark ? '#FFFFFF' : '#000' }]}>Tags (comma-separated)</Text>
        <TextInput
          style={[styles.titleInput, { backgroundColor: theme.isDark ? '#191B2F' : '#fff', color: theme.isDark ? '#FFFFFF' : '#000' }]}
          value={tags}
          onChangeText={setTags}
          placeholder="e.g. biology, chapter1, exam"
          placeholderTextColor={theme.isDark ? '#6B7280' : '#999'}
          editable={!saving}
        />

        {/* CATEGORY SECTION */}
        <Text style={[styles.label, { color: theme.isDark ? '#FFFFFF' : '#000' }]}>Category (optional)</Text>
        <TextInput
          style={[styles.titleInput, { backgroundColor: theme.isDark ? '#191B2F' : '#fff', color: theme.isDark ? '#FFFFFF' : '#000' }]}
          value={category}
          onChangeText={setCategory}
          placeholder="e.g. Study Notes, Personal"
          placeholderTextColor={theme.isDark ? '#6B7280' : '#999'}
          editable={!saving}
        />

        {/* FORMATTING TOOLBAR */}
        <View style={[styles.toolbar, { backgroundColor: theme.isDark ? '#191B2F' : '#2a2f4a' }]}>
          <ToolbarButton
            icon="B"
            onPress={() => wrapSelectedText("**")}
            active={isBold}
          />
          <ToolbarButton
            icon="I"
            onPress={() => wrapSelectedText("*")}
            active={isItalic}
          />
          <View style={styles.formatHint}>
            <Text style={[styles.formatHintText, { color: theme.isDark ? '#9CA3AF' : '#aaa' }]}>
              Use **text** for bold, *text* for italic
            </Text>
          </View>
        </View>

        {/* CONTENT INPUT */}
        <TextInput
          style={[styles.contentInput, { backgroundColor: theme.isDark ? '#191B2F' : '#fff', color: theme.isDark ? '#FFFFFF' : '#000' }]}
          value={content}
          onChangeText={setContent}
          multiline
          placeholder="Start typing here... Use **bold** and *italic* formatting"
          placeholderTextColor={theme.isDark ? '#6B7280' : '#aaa'}
          textAlignVertical="top"
          editable={!saving}
        />
      </ScrollView>

      {/* SAVE BUTTON */}
      <View style={[styles.buttonContainer, { backgroundColor: theme.isDark ? '#0C1421' : '#f5f5f5' }]}>
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Save Note</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    fontFamily: "Poppins",
  },
  placeholder: {
    width: 48,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    fontFamily: "Poppins",
  },
  titleInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    fontFamily: "Poppins",
  },
  toolbar: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 8,
    marginBottom: 2,
    alignItems: "center",
  },
  toolBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
    marginRight: 4,
  },
  toolBtnActive: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  toolIcon: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  toolIconActive: {
    color: "#7c6fd6",
  },
  formatHint: {
    flex: 1,
    marginLeft: 8,
  },
  formatHintText: {
    fontSize: 11,
    fontStyle: "italic",
    fontFamily: "Poppins",
  },
  contentInput: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 300,
    fontFamily: "Poppins",
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  saveButton: {
    backgroundColor: "#7c6fd6",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#7c6fd6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
  },
  saveText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.5,
    fontFamily: "Poppins",
  },
});