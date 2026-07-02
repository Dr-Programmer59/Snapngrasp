import { SafeAreaView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import BottomNavigation from '../components/BottomNavigation';
import { styles } from '../styles/styles';

export default function EmptyStateScreen({ navigation, onNavigate }) {
  const handleTabPress = (tabKey) => {
    switch (tabKey) {
      case 'home':
        navigation.navigate('Dashboard');
        break;
      case 'play':
        navigation.navigate('Play');
        break;
      case 'create':
        // Already on create
        break;
      case 'tutor':
        navigation.navigate('Chat');
        break;
      case 'profile':
        navigation.navigate('Settings');
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.emptyContent}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>📋</Text>
        </View>
        <Text style={styles.emptyTitle}>No content here yet. Start by</Text>
        <Text style={styles.emptyTitle}>uploading your first document to</Text>
        <Text style={styles.emptyTitle}>begin!</Text>
        
        <TouchableOpacity style={styles.uploadButton} onPress={() => onNavigate('upload')}>
          <Text style={styles.uploadButtonText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="create" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}