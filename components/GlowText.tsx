import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, TextStyle, StyleProp, Platform } from 'react-native';
import { useFonts, Orbitron_400Regular, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { Colors } from '../constants/colors';

interface GlowTextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  animated?: boolean;
}

export default function GlowText({ children, style, animated = false }: GlowTextProps) {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [fontsLoaded] = useFonts({
    Orbitron_400Regular,
    Orbitron_700Bold,
    Orbitron_900Black,
  });

  useEffect(() => {
    if (animated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [animated, glowAnim]);

  const textShadowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 40],
  });

  const textShadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0.8],
  });

  if (animated) {
    return (
      <Animated.Text
        style={[
          styles.base,
          fontsLoaded && { fontFamily: 'Orbitron_900Black' },
          style,
          {
            textShadowRadius,
            textShadowColor: `rgba(6, 182, 212, ${textShadowOpacity})`,
            textShadowOffset: { width: 0, height: 0 },
          },
        ]}
      >
        {children}
      </Animated.Text>
    );
  }

  return (
    <Text 
      style={[
        styles.base, 
        fontsLoaded && { fontFamily: 'Orbitron_900Black' },
        styles.static, 
        style
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },
  static: {
    textShadowColor: 'rgba(6, 182, 212, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
});

