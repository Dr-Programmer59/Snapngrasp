import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { GroupIcon, BookIcon, AddSquareIcon, MessageIcon, UserIcon } from './CustomIcons';

const BottomNavigation = ({ activeTab = 'play', onTabPress }) => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const tabs = [
    { key: 'home', icon: 'group', label: 'Home' },
    { key: 'play', icon: 'book', label: 'play' },
    { key: 'create', icon: 'add', label: 'Create' },
    { key: 'tutor', icon: 'message', label: 'Tutor' },
    { key: 'profile', icon: 'user', label: 'Profile' },
  ];

  const handleTabPress = (tabKey) => {
    if (onTabPress) {
      onTabPress(tabKey);
    }
    if (tabKey === 'play') {
      navigation.navigate('Play');
    } else if (tabKey === 'create') {
      navigation.navigate('FileUpload');
    } else if (tabKey === 'home') {
      navigation.navigate('Dashboard'); // ✅ Updated to Dashboard
    } else if (tabKey === 'profile') {
      navigation.navigate('Settings');
    } else if (tabKey === 'tutor') {
      navigation.navigate('ChatScreen');
    }
  };

  const renderIcon = (iconName, isActive) => {
    const iconColor = isActive ? '#fff' : (theme.isDark ? '#9CA3AF' : '#999');
    const iconSize = isActive ? 20 : 24;

    switch(iconName) {
      case 'group':
        return <GroupIcon size={iconSize} color={iconColor} />;
      case 'book':
        return <BookIcon size={iconSize} color={iconColor} />;
      case 'add':
        return <AddSquareIcon size={iconSize} color={iconColor} />;
      case 'message':
        return <MessageIcon size={iconSize} color={iconColor} />;
      case 'user':
        return <UserIcon size={iconSize} color={iconColor} />;
      default:
        return <Ionicons name="help-outline" size={iconSize} color={iconColor} />;
    }
  };

  return (
    <View style={[
      styles.bottomNav,
      { backgroundColor: theme.colors.secondaryBackground }
    ]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.navItem,
            activeTab === tab.key && styles.navItemActive
          ]}
          onPress={() => handleTabPress(tab.key)}
        >
          {activeTab === tab.key ? (
            <View style={styles.activeTabContainer}>
              {renderIcon(tab.icon, true)}
              <Text style={styles.activeTabText}>{tab.label}</Text>
            </View>
          ) : (
            renderIcon(tab.icon, false)
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 25,
    borderRadius: 30,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  navItem: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  navItemActive: {
    backgroundColor: '#736BEE',
    borderRadius: 25, // Make it oval instead of round
    width: 80, // Wider for oval shape
    height: 44,
    shadowColor: '#736BEE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20, // For Android glow effect
  },
  activeTabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activeTabText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#736BEE',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  createText: {
    color: '#fff',
    marginLeft: 5,
  },
});

export default BottomNavigation;