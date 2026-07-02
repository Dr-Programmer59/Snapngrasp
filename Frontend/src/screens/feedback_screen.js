import React, { useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
  Animated,
  PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from "react-native-svg";
import { useTheme } from "../contexts/ThemeContext";

const { height: SCREEN_H } = Dimensions.get("window");

export default function FeedbackScreen({ navigation, route }) {
  const { theme } = useTheme();
  
  // Initialize refs before any conditional returns
  const normalSheetTop = Math.round(SCREEN_H * 0.56);
  const expandedSheetTop = Math.round(SCREEN_H * 0.25);
  const sheetPosition = useRef(new Animated.Value(normalSheetTop)).current;

  const feedbackData = route?.params?.feedbackData;
  const isLoading = route?.params?.isLoading;
  const screenTitle =
    route?.params?.title ||
    route?.params?.screenTitle ||
    feedbackData?.title ||
    "Session Score";

  // Show loading state if feedback is being generated
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme?.isDark ? "#0B1023" : "#F3F4F8" }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={{ color: theme?.isDark ? "#fff" : "#111827", fontSize: 16, fontWeight: "700", marginTop: 16 }}>
            Analyzing your performance...
          </Text>
          <Text style={{ color: theme?.isDark ? "rgba(255,255,255,0.6)" : "rgba(17,24,39,0.6)", fontSize: 14, marginTop: 8, textAlign: "center" }}>
            Our AI tutor is reviewing your answers{"\n"}to provide personalized feedback
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!feedbackData?.overall_score) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0B1023" }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>No feedback data</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginTop: 14, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: "#6C63FF" }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isDark = !!theme?.isDark;

  const {
    overall_score,
    strong_areas = [],
    weak_areas = [],
    personalized_message,
  } = feedbackData;

  const correct = Number(overall_score.correct ?? 0);
  const total = Number(overall_score.total ?? 0) || 1;
  const pct = Math.max(0, Math.min(100, Math.round((correct / total) * 100)));

  // Top “hero” background colors (match your screenshots: light = darker navy, dark = purple-ish)
  const heroColors = isDark
    ? ["#3A337A", "#2F2B6F", "#1E234F"]
    : ["#0F172A", "#111C3A", "#1A2356"];

  // Header bar: dark glossy in both modes
  const headerColors = ["rgba(0,0,0,0.22)", "rgba(0,0,0,0.62)"];

  // Bottom sheet background
  const sheetBgLight = "#FFFFFF";
  const sheetGradientDark = ["#0B1023", "#070A16"];

  const subtitle =
    personalized_message ||
    "Great job!";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0B1023" : "#F3F4F8" }} edges={["top"]}>
      <View style={styles.screen}>
        {/* HERO BACKGROUND */}
        <LinearGradient colors={heroColors} style={styles.heroBg} />

        {/* HEADER BAR (rounded bottom corners) */}
        <LinearGradient colors={headerColors} style={styles.headerBar}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {screenTitle}
          </Text>

          <View style={{ width: 44 }} />
        </LinearGradient>

        {/* HERO CONTENT */}
        <View style={styles.heroContent}>
          <View style={styles.congratsRow}>
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.mascot}
              resizeMode="contain"
            />

            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={styles.congratsTitle}>Congrats!</Text>

              <Text style={styles.congratsSub} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          </View>

          {/* ARC GAUGE */}
          <View style={styles.gaugeBlock}>
            <ArcGauge
              value={pct}
              size={280}
              strokeWidth={26}
              trackColor={isDark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.25)"}
              // red -> yellow/orange -> green
              gradientStops={[
                { offset: "0%", color: "#FF5A5F" },
                { offset: "35%", color: "#F4B000" },
                { offset: "100%", color: "#25D19F" },
              ]}
              indicator={{
                show: true,
                // little diamond marker like your screenshot
                fill: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.18)",
                stroke: "rgba(255,255,255,0.75)",
              }}
            />

            {/* Center labels */}
            <View style={styles.gaugeCenter} pointerEvents="none">
              <Text style={styles.scoreBig}>
                {correct}/{total}
              </Text>
              <Text style={styles.scoreSmall}>You Scored</Text>
            </View>
          </View>

          <Text style={styles.streakText}>
            Keep your streak alive 🔥 Every{"\n"}steps makes you sharper
          </Text>
        </View>

        {/* BOTTOM SHEET */}
        {isDark ? (
          <Animated.View style={[styles.sheet, { top: sheetPosition }]}>
            <LinearGradient
              colors={sheetGradientDark}
              style={{ flex: 1, borderTopLeftRadius: 34, borderTopRightRadius: 34 }}
            >
              <SheetContent
                strong_areas={strong_areas}
                weak_areas={weak_areas}
                isDark={isDark}
                onTryAgain={() => navigation.goBack()}
                onCreateNew={() => navigation.navigate("Dashboard")}
                sheetPosition={sheetPosition}
                normalSheetTop={normalSheetTop}
                expandedSheetTop={expandedSheetTop}
              />
            </LinearGradient>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.sheet, { top: sheetPosition, backgroundColor: sheetBgLight }]}>
            <SheetContent
              strong_areas={strong_areas}
              weak_areas={weak_areas}
              isDark={isDark}
              onTryAgain={() => navigation.goBack()}
              onCreateNew={() => navigation.navigate("Dashboard")}
              sheetPosition={sheetPosition}
              normalSheetTop={normalSheetTop}
              expandedSheetTop={expandedSheetTop}
            />
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

/**
 * Bottom Sheet content (scrollable list + fixed buttons)
 */
function SheetContent({ strong_areas, weak_areas, isDark, onTryAgain, onCreateNew, sheetPosition, normalSheetTop, expandedSheetTop }) {
  const titleColor = isDark ? "#FFFFFF" : "#111827";
  const labelColor = isDark ? "rgba(255,255,255,0.85)" : "rgba(17,24,39,0.85)";
  const itemText = isDark ? "rgba(255,255,255,0.90)" : "rgba(17,24,39,0.85)";

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 3;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        sheetPosition.setOffset(sheetPosition._value);
        sheetPosition.setValue(0);
      },
      onPanResponderMove: Animated.event(
        [null, { dy: sheetPosition }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        sheetPosition.flattenOffset();
        const currentValue = sheetPosition._value;
        const velocity = gestureState.vy;
        
        // If swiping up fast or past midpoint
        if (velocity < -0.3 || (currentValue < (normalSheetTop + expandedSheetTop) / 2)) {
          Animated.spring(sheetPosition, {
            toValue: expandedSheetTop,
            useNativeDriver: false,
            velocity: velocity,
            tension: 50,
            friction: 9,
          }).start();
        } else {
          // Swipe down or stay at normal
          Animated.spring(sheetPosition, {
            toValue: normalSheetTop,
            useNativeDriver: false,
            velocity: velocity,
            tension: 50,
            friction: 9,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingTop: 4, paddingBottom: 8, alignItems: 'center' }} {...panResponder.panHandlers}>
        <View style={styles.sheetHandle} />
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <Text style={[styles.sheetTitle, { color: titleColor }]}>AI Feedback</Text>
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingBottom: 18 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Strong */}
        {strong_areas && strong_areas.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: labelColor }]}>Strong Area</Text>

            <View style={styles.grid}>
              {strong_areas.map((area, idx) => (
                <View key={`s-${idx}`} style={styles.gridItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#25D19F" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.gridText, { color: itemText }]}>
                      {area.topic}
                    </Text>
                    {area.description && (
                      <Text style={[styles.gridSubtext, { color: isDark ? "rgba(255,255,255,0.5)" : "rgba(17,24,39,0.5)" }]}>
                        {area.description}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Weak */}
        {weak_areas && weak_areas.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: labelColor, marginTop: 18 }]}>Weak Area</Text>

            <View style={{ marginTop: 10 }}>
              {weak_areas.map((area, idx) => (
                <View key={`w-${idx}`} style={styles.weakAreaCard}>
                  <View style={styles.rowItem}>
                    <Ionicons name="close-circle" size={20} color="#FF5A5F" />
                    <Text style={[styles.rowText, { color: itemText }]}>
                      {area.topic}
                    </Text>
                  </View>
                  {area.description && (
                    <Text style={[styles.weakDesc, { color: isDark ? "rgba(255,255,255,0.65)" : "rgba(17,24,39,0.65)" }]}>
                      {area.description}
                    </Text>
                  )}
                  {area.suggestions && area.suggestions.length > 0 && (
                    <View style={styles.suggestionsBox}>
                      <Text style={[styles.suggestionsTitle, { color: isDark ? "rgba(255,255,255,0.75)" : "rgba(17,24,39,0.75)" }]}>
                        Suggestions:
                      </Text>
                      {area.suggestions.map((suggestion, sIdx) => (
                        <View key={`sug-${idx}-${sIdx}`} style={styles.suggestionRow}>
                          <Text style={{ color: "#6C63FF", fontSize: 14, marginRight: 6 }}>•</Text>
                          <Text style={[styles.suggestionText, { color: isDark ? "rgba(255,255,255,0.70)" : "rgba(17,24,39,0.70)" }]}>
                            {suggestion}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom buttons */}
      <View style={[styles.bottomBtns, { paddingHorizontal: 20 }]}>
        <TouchableOpacity
          style={[styles.pillBtn, styles.pillOutline, isDark && styles.pillOutlineDark]}
          onPress={onTryAgain}
          activeOpacity={0.85}
        >
          <View style={[styles.pillIcon, styles.pillIconOutline]}>
            <Ionicons name="arrow-back" size={18} color={isDark ? "rgba(255,255,255,0.75)" : "rgba(17,24,39,0.7)"} />
          </View>
          <Text style={[styles.pillTextOutline, { color: isDark ? "rgba(255,255,255,0.70)" : "rgba(17,24,39,0.65)" }]}>
            Try Again
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pillBtn, styles.pillPrimary]}
          onPress={onCreateNew}
          activeOpacity={0.85}
        >
          <Text style={styles.pillTextPrimary}>Create New</Text>
          <View style={styles.pillIconPrimary}>
            <Ionicons name="arrow-forward" size={18} color="#6C63FF" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * ArcGauge (React Native version of the exact SVG dash technique)
 * Based on: circle + strokeDasharray + strokeDashoffset = half-circle meter. :contentReference[oaicite:2]{index=2}
 */
function ArcGauge({
  value = 0, // 0..100
  size = 200, // width
  strokeWidth = 25,
  trackColor = "#E5E5E5",
  gradientStops = [
    { offset: "0%", color: "red" },
    { offset: "25%", color: "orange" },
    { offset: "100%", color: "green" },
  ],
  indicator = { show: true, fill: "rgba(255,255,255,0.12)", stroke: "rgba(255,255,255,0.75)" },
}) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

  // Match the article’s geometry: svg width=200 height=120, circle center at (100,100) r=65. :contentReference[oaicite:3]{index=3}
  const svgW = size;
  const svgH = Math.round(size * 0.6);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.325; // 200 -> 65
  const halfCirc = Math.PI * r;

  // dash length = (PI * r * value)/100  :contentReference[oaicite:4]{index=4}
  const dash = (halfCirc * v) / 100;

  // strokeDashoffset = -PI * r  :contentReference[oaicite:5]{index=5}
  const dashOffset = -halfCirc;

  // marker at the end
  const ratio = v / 100;
  const angle = Math.PI - ratio * Math.PI; // left -> right over top arc
  const markerX = cx + r * Math.cos(angle);
  const markerY = cy - r * Math.sin(angle);

  const gid = useMemo(() => `score-grad-${Math.random().toString(16).slice(2)}`, []);

  return (
    <View style={{ width: size, height: svgH, overflow: "hidden" }}>
      <Svg width={svgW} height={svgH}>
        {/* Track (placeholder arc) */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDashoffset={dashOffset}
          strokeDasharray={`${halfCirc} 10000`}
        />

        {/* Progress */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDashoffset={dashOffset}
          strokeDasharray={`${dash} 10000`}
        />

        <Defs>
          <SvgLinearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientStops.map((s) => (
              <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </SvgLinearGradient>
        </Defs>

        {/* Diamond indicator */}
        {indicator?.show && (
          <Rect
            x={markerX - 7}
            y={markerY - 7}
            width={14}
            height={14}
            rx={3}
            fill={indicator.fill}
            stroke={indicator.stroke}
            strokeWidth={2}
            transform={`rotate(45 ${markerX} ${markerY})`}
          />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  heroBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Math.round(SCREEN_H * 0.62),
  },

  headerBar: {
    marginHorizontal: 14,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "ios" ? 10 : 12,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  headerBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 10,
  },

  heroContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
  },

  congratsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  mascot: {
    width: 56,
    height: 56,
  },
  congratsTitle: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  congratsSub: {
    marginTop: 6,
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  improveText: {
    color: "#25D19F",
    fontWeight: "900",
  },

  gaugeBlock: {
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    bottom: 18,
    left: 0,
    right: 0,
  },
  scoreBig: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "900",
  },
  scoreSmall: {
    marginTop: 6,
    color: "rgba(255,255,255,0.80)",
    fontSize: 15,
    fontWeight: "700",
  },

  streakText: {
    marginTop: 14,
    textAlign: "center",
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },

  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingTop: 12,
    overflow: "hidden",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 54,
    height: 6,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 10,
  },
  sheetTitle: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 10,
  },

  sectionLabel: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "900",
  },

  grid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridItem: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
    marginBottom: 12,
    gap: 10,
  },
  gridText: {
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
  },
  gridSubtext: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
    lineHeight: 16,
  },

  weakAreaCard: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,90,95,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,90,95,0.15)",
  },
  weakDesc: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 8,
    marginLeft: 30,
    lineHeight: 18,
  },
  suggestionsBox: {
    marginTop: 10,
    marginLeft: 30,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,90,95,0.1)",
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    lineHeight: 18,
  },

  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowText: {
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
  },

  bottomBtns: {
    flexDirection: "row",
    gap: 14,
    paddingTop: 8,
    paddingBottom: 18,
  },

  pillBtn: {
    flex: 1,
    height: 56,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  pillOutline: {
    backgroundColor: "rgba(0,0,0,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
  },
  pillOutlineDark: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.14)",
  },
  pillTextOutline: {
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 10,
  },

  pillPrimary: {
    backgroundColor: "#6C63FF",
  },
  pillTextPrimary: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    marginRight: 10,
  },

  pillIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  pillIconOutline: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.0)",
  },
  pillIconPrimary: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
