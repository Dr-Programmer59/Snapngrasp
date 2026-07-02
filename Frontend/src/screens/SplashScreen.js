import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import Mascot from '../assets/images/mascot.png';

const { height: screenHeight } = Dimensions.get('window');

export default function SplashScreen() {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -20,
          duration: 500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [bounceAnim]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={Mascot}
        style={[styles.mascot, { transform: [{ translateY: bounceAnim }] }]}
        resizeMode="contain" // ensures full image fits inside container
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascot: {
    width: '80%',                // scales to 80% of screen width
    height: screenHeight * 0.6,  // scales height dynamically to avoid cropping
  },
});
