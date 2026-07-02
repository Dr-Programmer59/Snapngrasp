import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import LeftChatBubble from "../components/LeftChatBubble"; // 🟣 Import your chat bubble component

export default function OCRResultScreen({ navigation, route }) {
  const { 
    processedText, 
    confidence, 
    uploadId, 
    fileUrl, 
    metadata 
  } = route.params || {};

  console.log('📄 [OCRResultScreen] Received params:', {
    textLength: processedText?.length,
    confidence,
    uploadId,
    fileUrl,
  });

  const [text, setText] = useState(
    processedText ||
      `The cell is considered the fundamental unit of life, forming the building blocks of all living organisms. Plant cells are unique because they contain a rigid cell wall made of cellulose, chloroplasts that perform photosynthesis, and large central vacuoles that store water and maintain cell shape. In contrast, animal cells lack a cell wall and chloroplasts, and their vacuoles are smaller and more numerous. Mitochondria, often referred to as the “powerhouse of the cell,” generate energy in the form of ATP through the process of cellular respiration. The nucleus serves as the control center of the cell, regulating activities such as growth, metabolism, and reproduction. It houses the DNA, which carries the genetic instructions necessary for the functioning and inheritance of traits in living organisms.

The cell is considered the fundamental unit of life, forming the building blocks of all living organisms. Plant cells are unique because they contain a rigid cell wall made of cellulose, chloroplasts that perform photosynthesis, and large central vacuoles that store water and maintain cell shape. In contrast, animal cells lack a cell wall and chloroplasts, and their vacuoles are smaller and more numerous. Mitochondria, often referred to as the “powerhouse of the cell,” generate energy in the form of ATP through the process of cellular respiration. The nucleus serves as the control center of the cell, regulating activities such as growth, metabolism, and reproduction. It houses the DNA, which carries the genetic instructions necessary for the functioning and inheritance of traits in living organisms.

The cell is considered the fundamental unit of life, forming the building blocks of all living organisms. Plant cells are unique because they contain a rigid cell wall made of cellulose, chloroplasts that perform photosynthesis, and large central vacuoles that store water and maintain cell shape. In contrast, animal cells lack a cell wall and chloroplasts, and their vacuoles are smaller and more numerous. Mitochondria, often referred to as the “powerhouse of the cell,” generate energy in the form of ATP through the process of cellular respiration. The nucleus serves as the control center of the cell, regulating activities such as growth, metabolism, and reproduction. It houses the DNA, which carries the genetic instructions necessary for the functioning and inheritance of traits in living organisms.

The cell is considered the fundamental unit of life, forming the building blocks of all living organisms. Plant cells are unique because they contain a rigid cell wall made of cellulose, chloroplasts that perform photosynthesis, and large central vacuoles that store water and maintain cell shape. In contrast, animal cells lack a cell wall and chloroplasts, and their vacuoles are smaller and more numerous. Mitochondria, often referred to as the “powerhouse of the cell,” generate energy in the form of ATP through the process of cellular respiration. The nucleus serves as the control center of the cell, regulating activities such as growth, metabolism, and reproduction. It houses the DNA, which carries the genetic instructions necessary for the functioning and inheritance of traits in living organisms.

The cell is considered the fundamental unit of life, forming the building blocks of all living organisms. Plant cells are unique because they contain a rigid cell wall made of cellulose, chloroplasts that perform photosynthesis, and large central vacuoles that store water and maintain cell shape. In contrast, animal cells lack a cell wall and chloroplasts, and their vacuoles are smaller and more numerous. Mitochondria, often referred to as the “powerhouse of the cell,” generate energy in the form of ATP through the process of cellular respiration. The nucleus serves as the control center of the cell, regulating activities such as growth, metabolism, and reproduction. It houses the DNA, which carries the genetic instructions necessary for the functioning and inheritance of traits in living organisms.`
  );

  const [isEditing, setIsEditing] = useState(false);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeHeader} edges={['top']}>
        {/* 🔹 Header */}
        <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          underlayColor="#8B5CF6"
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Processed Text</Text>
        <View style={{ width: 40 }} />
      </View>
      </SafeAreaView>

      {/* 💬 Chat Bubble */}
      <View style={styles.chatSection}>
        <LeftChatBubble message="Here's what I found from your uploaded document!" />
        <View style={styles.chatActions}>
          {confidence && (
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                {Math.round(confidence * 100)}% confident
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Text style={styles.editBtnText}>{isEditing ? '✓ Save' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 📝 Editable OCR Text */}
      <ScrollView 
        style={styles.scrollBox} 
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {isEditing ? (
          <TextInput
            style={styles.editableText}
            value={text}
            onChangeText={setText}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
          />
        ) : (
          <Text style={styles.textOutput}>{text}</Text>
        )}
      </ScrollView>

      {/* Continue Button */}
      <TouchableOpacity
        style={styles.continueBtn}
        onPress={() => {
          console.log('🚀 Navigating to ProcessingScreen for study material generation with uploadId:', uploadId);
          navigation.navigate('ProcessingScreen', { 
            isGeneratingMaterials: true,
            uploadId: uploadId,
            subject: 'Biology' // You can make this dynamic based on extracted text
          });
        }}
      >
        <Text style={styles.continueText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "flex-start",
  },

  // 🔹 Header
  safeHeader: {
    backgroundColor: "#191B2F",
    width: '100%',
  },
  header: {
    width: '100%',
    backgroundColor: "#191B2F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
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
  backArrow: {
    fontSize: 22,
    color: '#FFFFFFCC',
    fontFamily: 'Poppins-Regular',
  },
  title: {
    fontSize: 18,
    color: "#fff",
    fontFamily: 'Poppins-SemiBold',
  },

  // 💬 Chat Bubble Section
  chatSection: {
    marginTop: 0,
    alignItems: "center",
    paddingHorizontal: 20,
    flexDirection: "column",
    justifyContent: "center",
  },
  chatContainer: {
    width: "100%",
    alignItems: "center",
  },
  chatActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  confidenceBadge: {
    backgroundColor: "#E8F5E9",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  confidenceText: {
    color: "#2E7D32",
    fontSize: 12,
    fontFamily: "Poppins-Medium",
  },
  editBtn: {
    backgroundColor: "#6e61ca",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  editBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },

  // 📝 Text Box
  scrollBox: {
    width: "90%",
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    padding: 15,
    marginTop: 10,
    marginBottom: 80,
    maxHeight: '60%',
  },
  textOutput: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
    fontFamily: "Poppins-Regular",
  },
  editableText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
    fontFamily: "Poppins-Regular",
    minHeight: 400,
  },

  // 🔘 Continue Button
  continueBtn: {
    position: "absolute",
    bottom: 25,
    backgroundColor: "#6e61ca",
    paddingVertical: 14,
    borderRadius: 30,
    width: "80%",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6e61ca",
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  continueText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
});
