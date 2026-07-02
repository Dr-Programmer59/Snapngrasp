import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useMemo } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
  TextInput,
} from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import BottomNavigation from "../components/BottomNavigation";
import LeftChatBubble from "../components/LeftChatBubble";
import Text from "../components/Text";
import { useTheme } from "../contexts/ThemeContext";
import { withPoppins } from "../theme/typography";

import { getRecentActivity } from "../api/activity";
import { getFavorites, addFavorite, removeFavorite } from "../api/favorites";
import { 
  getVisualById, 
  getMCQsById, 
  getFlashcardsById,
  updateFlashcardSetTitle,
  updateMCQSetTitle,
  updateVisualTitle,
  deleteFlashcardSet,
  deleteMCQSet,
  deleteVisual
} from "../api/studyMaterial";

const { width } = Dimensions.get("window");

/** ✅ Local helper (NOT a separate component file) */
const ProgressRing = ({ size, strokeWidth, percent, color, trackColor, textColor }) => {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const dashOffset = c * (1 - p / 100);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>

      <Text style={[styles.ringText, { color: textColor }]}>{Math.round(p)}%</Text>
    </View>
  );
};

const PlayScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const initialTab = route?.params?.initialTab;
  const [activeTab, setActiveTab] = useState("All");
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [allActivities, setAllActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  // Set initial tab based on navigation parameter
  useEffect(() => {
    if (initialTab) {
      const tabMap = {
        'flashcards': 'Flashcards',
        'visuals': 'Visuals',
        'mcqs': 'Quiz',
      };
      const mappedTab = tabMap[initialTab];
      if (mappedTab) {
        setActiveTab(mappedTab);
      }
    }
  }, [initialTab]);

  const palette = useMemo(() => {
    const primary = theme?.colors?.primary ?? "#6C63FF";
    const isDark = !!theme?.isDark;

    return {
      primary,
      isDark,

      screenBg: isDark ? "#0C1421" : "#F9F9F9",
      headerGrad: isDark ? ["#382F74", "#22234C"] : ["#191B2F", "#0C1421"],

      // Card (match screenshot in LIGHT)
      cardBg: isDark ? "#191B2F" : "#FFFFFF",
      cardBorder: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
      cardShadow: isDark ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.10)",

      text: isDark ? "#FFFFFF" : "#1B1F3B",
      subText: isDark ? "rgba(255,255,255,0.70)" : "rgba(27,31,59,0.65)",

      // Ring
      ringTrack: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)",

      // Pill
      pillBg: isDark ? "rgba(255,255,255,0.10)" : "rgba(108,99,255,0.10)",
      pillText: isDark ? "#FFFFFF" : primary,

      // Dots
      dotCorrect: primary,
      dotIncorrect: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)",

      // Right icons
      iconGrey: isDark ? "rgba(255,255,255,0.72)" : "rgba(27,31,59,0.55)",
      openBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",

      tabsBg: isDark ? "#0C1421" : "#F9F9F9",
      tabsBox: isDark ? "#191B2F" : "#000",
      tabsBorder: isDark ? "#252b3d" : "#ddd",
    };
  }, [theme]);

  useEffect(() => {
    fetchActivities();
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const data = await getFavorites();
      if (data?.favorites) {
        const favSet = new Set(data.favorites.map((fav) => `${fav.activity_type}:${fav.activity_id}`));
        setFavoriteIds(favSet);
      }
    } catch (error) {
      console.error("❌ Error fetching favorites:", error);
    }
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const data = await getRecentActivity();

      if (data?.activities) {
        const transformed = data.activities.map((activity) => {
          const correct = activity.correct ?? activity.stats?.correct ?? 0;
          const incorrect = activity.incorrect ?? activity.stats?.incorrect ?? 0;
          const count = activity.count ?? activity.total ?? activity.total_items ?? 0;

          return {
            id: activity.id,
            subject: activity.title || "Study Material",
            topic: activity.label || "",
            progress: activity.percent || 0,
            correct,
            incorrect,
            count, // used for "10 Quiz" pill if available
            type: activity.type,
            starred: activity.starred || false,
            updated_at: activity.updated_at,
          };
        });

        setAllActivities(transformed);
        setDataLoaded(transformed.length > 0);
      }
    } catch (error) {
      console.error("❌ Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = () => navigation.navigate("ContentInputSelection");

  const handleCardPress = async (item) => {
    try {
      if (item.type === "flashcard") {
        const response = await getFlashcardsById(item.id);
        if (response?.data) {
          const startIndex = Math.floor((item.progress / 100) * (response.data.count || 0));
          navigation.navigate("FlashcardPracticeScreen", {
            flashcards: response.data,
            startIndex,
            activityId: item.id,
          });
        }
      } else if (item.type === "mcq") {
        const response = await getMCQsById(item.id);
        if (response?.data) {
          const startIndex = Math.floor((item.progress / 100) * (response.data.count || 0));
          navigation.navigate("MCQQuizScreen", {
            mcqs: response.data,
            startIndex,
            activityId: item.id,
          });
        }
      } else if (item.type === "visual") {
        const response = await getVisualById(item.id);
        if (response?.data) navigation.navigate("LabeledVisualScreen", { visual: response.data });
      }
    } catch (error) {
      console.error("❌ Error loading activity:", error);
      Alert.alert("Error", "Failed to load activity. Please try again.");
    }
  };

  const toggleBookmark = async (item) => {
    const key = `${item.type}:${item.id}`;
    const isFav = favoriteIds.has(key);

    try {
      if (isFav) {
        await removeFavorite(item.type, item.id);
        const next = new Set(favoriteIds);
        next.delete(key);
        setFavoriteIds(next);
      } else {
        await addFavorite(item.type, item.id);
        const next = new Set(favoriteIds);
        next.add(key);
        setFavoriteIds(next);
      }
    } catch (error) {
      console.error("❌ Error toggling favorite:", error);
    }
  };

  const toggleMenu = (itemId, event) => {
    if (openMenuId === itemId) {
      setOpenMenuId(null);
    } else {
      event.target.measure((x, y, width, height, pageX, pageY) => {
        setMenuPosition({ top: pageY + height, right: width - pageX });
        setOpenMenuId(itemId);
      });
    }
  };

  const handleEditTitle = (item) => {
    setOpenMenuId(null);
    Alert.prompt(
      "Edit Title",
      "Enter a new title:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async (newTitle) => {
            if (!newTitle || newTitle.trim() === "") {
              Alert.alert("Error", "Title cannot be empty");
              return;
            }

            try {
              if (item.type === "flashcard") {
                await updateFlashcardSetTitle(item.id, newTitle.trim());
              } else if (item.type === "mcq") {
                await updateMCQSetTitle(item.id, newTitle.trim());
              } else if (item.type === "visual") {
                await updateVisualTitle(item.id, newTitle.trim());
              }

              // Update local state
              setAllActivities(prevActivities =>
                prevActivities.map(activity =>
                  activity.id === item.id
                    ? { ...activity, subject: newTitle.trim() }
                    : activity
                )
              );

              Alert.alert("Success", "Title updated successfully");
            } catch (error) {
              console.error("❌ Error updating title:", error);
              Alert.alert("Error", "Failed to update title. Please try again.");
            }
          },
        },
      ],
      "plain-text",
      item.subject
    );
  };

  const handleDelete = (item) => {
    const itemTypeName = item.type === "flashcard" ? "Flashcard Set" : item.type === "mcq" ? "Quiz Set" : "Visual";
    
    setOpenMenuId(null);
    
    Alert.alert(
      "Delete " + itemTypeName,
      `Are you sure you want to delete "${item.subject}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (item.type === "flashcard") {
                await deleteFlashcardSet(item.id);
              } else if (item.type === "mcq") {
                await deleteMCQSet(item.id);
              } else if (item.type === "visual") {
                await deleteVisual(item.id);
              }

              // Remove from local state
              setAllActivities(prevActivities =>
                prevActivities.filter(activity => activity.id !== item.id)
              );

              // Remove from favorites if it was favorited
              const favKey = `${item.type}:${item.id}`;
              if (favoriteIds.has(favKey)) {
                const next = new Set(favoriteIds);
                next.delete(favKey);
                setFavoriteIds(next);
              }

              Alert.alert("Success", itemTypeName + " deleted successfully");
            } catch (error) {
              console.error("❌ Error deleting:", error);
              Alert.alert("Error", "Failed to delete. Please try again.");
            }
          },
        },
      ]
    );
  };

  const renderData = useMemo(() => {
    if (activeTab === "Bookmarks") {
      return allActivities.filter((item) => favoriteIds.has(`${item.type}:${item.id}`));
    }
    if (activeTab === "All") return allActivities;

    const typeMap = {
      Flashcards: "flashcard",
      Quiz: "mcq",
      Visuals: "visual",
    };
    return allActivities.filter((item) => item.type === typeMap[activeTab]);
  }, [activeTab, allActivities, favoriteIds]);

  const emptyImageForTab = {
    All: require("../assets/images/empty_state.png"),
    Flashcards: require("../assets/images/empty_flashcards.png"),
    Quiz: require("../assets/images/empty_quiz.png"),
    Visuals: require("../assets/images/empty_visuals.png"),
    Bookmarks: require("../assets/images/empty_bookmark.png"),
  };

  const getPillLabel = (item) => {
    const n = item.count && item.count > 0 ? item.count : null;

    if (item.type === "mcq") return n ? `${n} Quiz` : "Quiz";
    if (item.type === "flashcard") return n ? `${n} Flashcards` : "Flashcards";
    if (item.type === "visual") return "Visual";
    return "Activity";
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.isDark ? "#382F74" : "#191B2F" }]} edges={["top"]}>
      <View style={{ flex: 1, backgroundColor: palette.screenBg }}>
        {/* Top Header */}
        <LinearGradient colors={palette.headerGrad} style={styles.topHeader}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Play</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.chatRow}>
            <LeftChatBubble message="Choose your challenge — it's play time! 🚀" />
          </View>
        </LinearGradient>

        <View style={{ height: 6, backgroundColor: palette.screenBg }} />

        {/* Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: palette.tabsBg }]}>
          <View style={[styles.textTabsBox, { backgroundColor: palette.tabsBox, borderColor: palette.tabsBorder }]}>
            {["All", "Flashcards", "Quiz", "Visuals"].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, activeTab === tab && { backgroundColor: "#6C63FF" }]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.tabButton,
              styles.iconTabButton,
              { backgroundColor: theme.isDark ? "#191B2F" : "#fff", borderColor: palette.tabsBorder },
              activeTab === "Bookmarks" && { backgroundColor: "#6C63FF" },
            ]}
            onPress={() => setActiveTab("Bookmarks")}
          >
            <Ionicons
              name="star-outline"
              size={20}
              color={activeTab === "Bookmarks" ? "#fff" : theme.isDark ? "#9CA3AF" : "#243D66"}
            />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#6C63FF" />
            <Text style={[styles.emptyText, { color: theme.isDark ? "#9CA3AF" : "#555", marginTop: 20 }]}>
              Loading your activities...
            </Text>
          </View>
        ) : !dataLoaded || renderData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Image source={emptyImageForTab[activeTab]} style={styles.emptyImage} resizeMode="contain" />
            <Text style={[styles.emptyText, { color: theme.isDark ? "#9CA3AF" : "#555" }]}>
              {activeTab === "Bookmarks"
                ? "No bookmarks yet. Tap the star icon to save your favorites!"
                : "Nothing to play yet. Upload your first document to start learning!"}
            </Text>
            {activeTab !== "Bookmarks" && (
              <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
                <Text style={styles.uploadButtonText}>Upload</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.filesContainer}>
            {renderData.map((item) => {
              const favKey = `${item.type}:${item.id}`;
              const isFav = favoriteIds.has(favKey);
              const isMenuOpen = openMenuId === item.id;

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.9}
                  style={[
                    styles.activityCard,
                    {
                      backgroundColor: palette.cardBg,
                      borderColor: palette.cardBorder,
                      shadowColor: palette.cardShadow,
                    },
                  ]}
                  onPress={() => handleCardPress(item)}
                >
                  {/* Left: progress ring */}
                  <View style={styles.cardLeft}>
                    <ProgressRing
                      size={78}
                      strokeWidth={10}
                      percent={item.progress || 0}
                      color={palette.primary}
                      trackColor={palette.ringTrack}
                      textColor={palette.text}
                    />
                  </View>

                  {/* Middle: pill + title + stats */}
                  <View style={styles.cardMiddle}>
                    <View style={[styles.pill, { backgroundColor: palette.pillBg }]}>
                      <Text style={[styles.pillText, { color: palette.pillText }]}>{getPillLabel(item)}</Text>
                    </View>

                    <Text numberOfLines={1} style={[styles.cardTitle, { color: palette.text }]}>
                      {item.subject}
                    </Text>

                    <View style={styles.statsRowNew}>
                      <View style={styles.statItem}>
                        <View style={[styles.dot, { backgroundColor: palette.dotCorrect }]} />
                        <Text style={[styles.statText, { color: palette.subText }]}>{item.correct} Correct</Text>
                      </View>

                      <View style={[styles.statItem, { marginLeft: 18 }]}>
                        <View style={[styles.dot, { backgroundColor: palette.dotIncorrect }]} />
                        <Text style={[styles.statText, { color: palette.subText }]}>{item.incorrect} Incorrect</Text>
                      </View>
                    </View>
                  </View>

                  {/* Right: star + menu + open */}
                  <View style={styles.cardRight}>
                    <TouchableOpacity
                      style={styles.starHit}
                      activeOpacity={0.85}
                      onPress={() => toggleBookmark(item)}
                    >
                      <Ionicons
                        name={isFav ? "star" : "star-outline"}
                        size={24}
                        color={palette.iconGrey}
                      />
                    </TouchableOpacity>

                    <View>
                      <TouchableOpacity
                        style={styles.menuBtn}
                        activeOpacity={0.85}
                        onPress={(e) => toggleMenu(item.id, e)}
                      >
                        <Ionicons
                          name="ellipsis-horizontal"
                          size={20}
                          color={palette.iconGrey}
                        />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[styles.openBtn, { backgroundColor: palette.openBg }]}
                      activeOpacity={0.85}
                      onPress={() => handleCardPress(item)}
                    >
                      <Ionicons
                        name="arrow-up"
                        size={16}
                        color={palette.iconGrey}
                        style={{ transform: [{ rotate: "45deg" }] }}
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Floating Dropdown Menu */}
        {openMenuId && (
          <>
            <TouchableOpacity
              style={styles.dropdownOverlay}
              activeOpacity={1}
              onPress={() => setOpenMenuId(null)}
            />
            <View style={[styles.dropdownFloating, { 
              backgroundColor: theme.isDark ? "#1F2937" : "#FFFFFF",
              borderColor: theme.isDark ? "#374151" : "#E5E7EB",
              top: menuPosition.top,
              right: 20,
            }]}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  const item = renderData.find(i => i.id === openMenuId);
                  if (item) handleEditTitle(item);
                }}
              >
                <Ionicons name="pencil-outline" size={18} color={theme.isDark ? "#9CA3AF" : "#6B7280"} />
                <Text style={[styles.dropdownText, { color: theme.isDark ? "#F3F4F6" : "#1F2937" }]}>
                  Edit Title
                </Text>
              </TouchableOpacity>

              <View style={[styles.dropdownDivider, { backgroundColor: theme.isDark ? "#374151" : "#E5E7EB" }]} />

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  const item = renderData.find(i => i.id === openMenuId);
                  if (item) handleDelete(item);
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={[styles.dropdownText, { color: "#EF4444" }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <BottomNavigation
          activeTab="play"
          onTabPress={(tabKey) => {
            if (tabKey === "profile") navigation.navigate("ContentInputSelection");
          }}
        />
      </View>
    </SafeAreaView>
  );
};

export default PlayScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },

  topHeader: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
  },
  headerTitle: {
    ...withPoppins({
      color: "#fff",
      fontSize: 17,
      fontWeight: "600",
    }),
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(128, 128, 128, 0.3)",
    borderRadius: 8,
  },
  backArrow: {
    fontSize: 20,
    color: "#FFFFFFCC",
    fontFamily: "Poppins-Regular",
  },
  chatRow: { marginTop: 15 },

  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  textTabsBox: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 5,
    borderWidth: 1,
  },
  tabButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    marginHorizontal: 2,
    backgroundColor: "transparent",
  },
  tabText: {
    ...withPoppins({
      fontSize: 13,
      color: "#fff",
      fontWeight: "500",
    }),
  },
  activeTabText: {
    ...withPoppins({
      color: "#fff",
      fontWeight: "700",
    }),
  },
  iconTabButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
  },

  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  emptyImage: { width: 180, height: 180, marginBottom: 20 },
  emptyText: {
    ...withPoppins({
      textAlign: "center",
      marginBottom: 20,
    }),
  },
  uploadButton: {
    backgroundColor: "#736BEE",
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 10,
  },
  uploadButtonText: {
    ...withPoppins({
      color: "#fff",
      fontWeight: "600",
    }),
  },

  filesContainer: { paddingHorizontal: 20, paddingBottom: 100 },

  /** ✅ NEW CARD STYLE (matches screenshot) */
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginBottom: 12,
    overflow: "visible",

    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },

  cardLeft: { marginRight: 14 },
  ringText: {
    position: "absolute",
    ...withPoppins({
      fontSize: 18,
      fontWeight: "800",
    }),
  },

  cardMiddle: { flex: 1, paddingRight: 10 },

  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  pillText: {
    ...withPoppins({
      fontSize: 12,
      fontWeight: "700",
    }),
  },

  cardTitle: {
    ...withPoppins({
      fontSize: 17,
      fontWeight: "800",
    }),
    marginBottom: 10,
  },

  statsRowNew: { flexDirection: "row", alignItems: "center" },
  statItem: { flexDirection: "row", alignItems: "center" },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  statText: {
    ...withPoppins({
      fontSize: 13,
      fontWeight: "700",
    }),
  },

  cardRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingLeft: 8,
    zIndex: 100,
  },
  starHit: {
    width: 42,
    height: 42,
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  menuBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  dropdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
  },
  dropdownFloating: {
    position: "absolute",
    width: 140,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 999,
    zIndex: 999,
    overflow: "hidden",
  },
  dropdown: {
    position: "absolute",
    top: 35,
    right: 0,
    width: 140,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 999,
    zIndex: 9999,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dropdownText: {
    ...withPoppins({
      fontSize: 14,
      fontWeight: "500",
      marginLeft: 10,
    }),
  },
  dropdownDivider: {
    height: 1,
    marginHorizontal: 8,
  },
  openBtn: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
