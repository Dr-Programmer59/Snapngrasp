import { useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function VisualNewScreen({ navigation }) {
  const [showTutor, setShowTutor] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);

  const tutorY = useRef(new Animated.Value(height)).current;
  const congratsScale = useRef(new Animated.Value(0)).current;

  const openTutor = () => {
    setShowTutor(true);
    Animated.timing(tutorY, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  const closeTutor = () => {
    Animated.timing(tutorY, { toValue: height, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setShowTutor(false));
  };

  const triggerCongrats = () => {
    setShowCongrats(true);
    congratsScale.setValue(0.6);
    Animated.sequence([
      Animated.spring(congratsScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.delay(900),
    ]).start(() => {
      Animated.timing(congratsScale, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setShowCongrats(false));
    });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: '#fff' }}>{'<'} </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Biology — Cell Structure</Text>
        <TouchableOpacity>
          <Text style={{ color: '#fff' }}>☆</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleRow}><Text style={styles.screenTitle}>Visual</Text></View>

      <View style={styles.progressRow}>
        <Text style={styles.progressText}>1/2</Text>
        <View style={styles.progressBarBackground}><View style={[styles.progressFill, { width: '50%' }]} /></View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.visualTitle}>Human brain anatomy</Text>
          <Image source={require('./assets/scan_document.gif')} style={styles.visualImage} />

          <View style={styles.labelsRow}>
            <View style={styles.labelChip}><Text style={styles.labelText}>Frontal Lobe</Text></View>
            <View style={styles.labelChip}><Text style={styles.labelText}>Temporal Lobe</Text></View>
            <View style={styles.labelChip}><Text style={styles.labelText}>Occipital Lobe</Text></View>
          </View>

          <View style={styles.labelElementsSection}>
            <Text style={styles.sectionTitle}>Label Elements</Text>
            <View style={styles.chipsWrap}>
              <View style={styles.smallChip}><Text style={styles.smallChipText}>Parietal Lobe</Text></View>
              <View style={styles.smallChip}><Text style={styles.smallChipText}>Temporal Lobe</Text></View>
              <View style={styles.smallChip}><Text style={styles.smallChipText}>Spinal Cord</Text></View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navBtn}><Text style={{color: '#777'}}>asd</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navPrimary} onPress={triggerCongrats}><Text style={{color: '#fff'}}>Next</Text></TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.fab} onPress={openTutor}><Image source={require('./assets/logo.png')} style={styles.fabImage} /></TouchableOpacity>

      {showCongrats && (
        <Animated.View style={[styles.congratsBox, { transform: [{ scale: congratsScale }] }]} pointerEvents="none">
          <Text style={styles.congratsEmoji}>🔥</Text>
          <Text style={styles.congratsText}>Great job! +1</Text>
        </Animated.View>
      )}

      {showTutor && (
        <Animated.View style={[styles.tutorSheet, { transform: [{ translateY: tutorY }] }]}>
          <View style={styles.tutorHeaderRow}>
            <View style={styles.tutorLogoWrap}><Image source={require('./assets/logo.png')} style={styles.tutorLogo} /></View>
            <Text style={styles.tutorTitle}>Snap Tutor</Text>
            <TouchableOpacity onPress={closeTutor}><Text style={{color: '#666'}}>✕</Text></TouchableOpacity>
          </View>
          <View style={styles.tutorBubble}><Text>No worries! We will suggest an explanation or steps.</Text></View>
          <TouchableOpacity style={styles.tutorAction}><Text style={{color: '#fff'}}>Explain Cell</Text></TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { height: 62, backgroundColor: '#243D66', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  headerTitle: { color: '#fff', fontFamily: 'Poppins-SemiBold' },
  titleRow: { paddingHorizontal: 18, paddingTop: 12 },
  screenTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#111' },
  progressRow: { paddingHorizontal: 18, marginTop: 12 },
  progressText: { color: '#333', fontFamily: 'Poppins-SemiBold', marginBottom: 8 },
  progressBarBackground: { height: 8, backgroundColor: '#E8E8E8', borderRadius: 10, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#6C63FF', borderRadius: 10 },
  content: { padding: 18, paddingBottom: 120 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  visualTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', marginBottom: 12 },
  visualImage: { width: '100%', height: 200, resizeMode: 'contain', marginBottom: 12, borderRadius: 8 },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  labelChip: { backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  labelText: { color: '#243D66', fontFamily: 'Poppins-SemiBold' },
  labelElementsSection: { marginTop: 8 },
  sectionTitle: { fontFamily: 'Poppins-Bold', marginBottom: 8 },
  chipsWrap: { flexDirection: 'row' },
  smallChip: { backgroundColor: '#F3F6FB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 8 },
  smallChipText: { color: '#333', fontFamily: 'Poppins-Regular' },
  navRow: { position: 'absolute', left: 18, right: 18, bottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navBtn: { backgroundColor: '#fff', padding: 12, borderRadius: 12 },
  navPrimary: { backgroundColor: '#6C63FF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  fab: { position: 'absolute', bottom: 92, right: 18, width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  fabImage: { width: 44, height: 44, resizeMode: 'contain' },
  congratsBox: { position: 'absolute', top: height * 0.28, left: width * 0.18, right: width * 0.18, height: 120, borderRadius: 14, backgroundColor: '#FFF8F3', alignItems: 'center', justifyContent: 'center', elevation: 8 },
  congratsEmoji: { fontSize: 32, marginBottom: 6 },
  congratsText: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#243D66' },
  tutorSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, height: Math.round(height * 0.44), borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: '#fff', padding: 16, elevation: 8 },
  tutorHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tutorLogoWrap: { backgroundColor: '#F2F4FF', width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  tutorLogo: { width: 34, height: 34, borderRadius: 8 },
  tutorTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', color: '#243D66', flex: 1 },
  tutorBubble: { backgroundColor: '#F8FAFF', padding: 12, borderRadius: 10, marginBottom: 12 },
  tutorAction: { backgroundColor: '#6C63FF', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, alignSelf: 'flex-end' },
});
