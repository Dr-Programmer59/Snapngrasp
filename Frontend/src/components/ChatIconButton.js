import React from "react";
import { View, Image, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const ChatIconButton = ({
  size = 90,
  logoSource = require("../assets/logo.png"),
  onPress,
}) => {
  const iconSize = size * 0.8;
  const containerSize = size * 1.5;

  return (
    <Pressable onPress={onPress} style={[styles.container, { width: containerSize, height: containerSize }]}>
      {/* Outer glow */}
      <View
        style={[
          styles.glow,
          {
            width: size * 1.35,
            height: size * 1.35,
            borderRadius: size * 0.675,
          },
        ]}
      />
      
      {/* Main gradient circle */}
      <LinearGradient
        colors={['#6C5CE7', '#4B2FC8']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[
          styles.mainCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        {/* Top shine overlay */}
        <LinearGradient
          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.7 }}
          style={[
            styles.shine,
            {
              width: size,
              height: size * 0.55,
              borderTopLeftRadius: size / 2,
              borderTopRightRadius: size / 2,
            },
          ]}
        />
      </LinearGradient>

      {/* Logo on top */}
      <Image
        source={logoSource}
        style={[styles.logo, { width: iconSize, height: iconSize }]}
        resizeMode="contain"
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    backgroundColor: '#6C5CE7',
    opacity: 0.25,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  mainCircle: {
    position: "absolute",
    overflow: "hidden",
    shadowColor: '#4B2FC8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  logo: {
    zIndex: 10,
  },
});

export default ChatIconButton;
