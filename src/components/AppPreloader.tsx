/**
 * AppPreloader Component
 * 
 * A beautiful, branded loading screen that appears during app initialization,
 * authentication, and major loading states.
 * 
 * Features:
 * - Animated logo with scale + fade
 * - Three pulsing dots loader
 * - Rotating loading messages
 * - Theme-compatible (dark/light)
 * - Smooth transitions
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import { useTheme } from '../theme';

interface AppPreloaderProps {
  visible: boolean;
  message?: string;
  variant?: 'default' | 'minimal';
}

const LOADING_MESSAGES = [
  'Loading your vibes...',
  'Analyzing patterns...',
  'Syncing with Spotify...',
  'Preparing your TonePrint...',
];

export default function AppPreloader({ 
  visible, 
  message, 
  variant = 'default' 
}: AppPreloaderProps) {
  const { colors, spacing } = useTheme();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const dot1Scale = useRef(new Animated.Value(1)).current;
  const dot2Scale = useRef(new Animated.Value(1)).current;
  const dot3Scale = useRef(new Animated.Value(1)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;

  // Logo entrance animation
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset for next time
      logoScale.setValue(0.8);
      logoOpacity.setValue(0);
    }
  }, [visible]);

  // Pulsing dots animation
  useEffect(() => {
    if (!visible) return;

    const createPulseAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1.3,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const dot1Anim = createPulseAnimation(dot1Scale, 0);
    const dot2Anim = createPulseAnimation(dot2Scale, 200);
    const dot3Anim = createPulseAnimation(dot3Scale, 400);

    dot1Anim.start();
    dot2Anim.start();
    dot3Anim.start();

    return () => {
      dot1Anim.stop();
      dot2Anim.stop();
      dot3Anim.stop();
    };
  }, [visible]);

  // Rotate loading messages
  useEffect(() => {
    if (!visible || message) return; // Don't rotate if custom message provided

    const interval = setInterval(() => {
      // Fade out current message
      Animated.timing(messageOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Change message
        setCurrentMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        
        // Fade in new message
        Animated.timing(messageOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 2500);

    // Initial fade in
    Animated.timing(messageOpacity, {
      toValue: 1,
      duration: 300,
      delay: 400,
      useNativeDriver: true,
    }).start();

    return () => clearInterval(interval);
  }, [visible, message]);

  if (!visible) return null;

  const displayMessage = message || LOADING_MESSAGES[currentMessageIndex];

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Animated Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            },
          ]}
        >
          {/* Logo Text - You can replace this with an actual logo image/SVG */}
          <Text style={[styles.logoText, { color: colors.primary }]}>
            ToneMap
          </Text>
          <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>🎵</Text>
          </View>
        </Animated.View>

        {/* Pulsing Dots Loader */}
        {variant === 'default' && (
          <View style={styles.dotsContainer}>
            <Animated.View
              style={[
                styles.dot,
                { 
                  backgroundColor: colors.primary,
                  transform: [{ scale: dot1Scale }] 
                },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                { 
                  backgroundColor: colors.primary,
                  transform: [{ scale: dot2Scale }] 
                },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                { 
                  backgroundColor: colors.primary,
                  transform: [{ scale: dot3Scale }] 
                },
              ]}
            />
          </View>
        )}

        {/* Loading Message */}
        {variant === 'default' && (
          <Animated.Text
            style={[
              styles.message,
              { 
                color: colors.textSecondary,
                opacity: messageOpacity,
              },
            ]}
          >
            {displayMessage}
          </Animated.Text>
        )}

        {/* Optional: Version or branding */}
        <Text style={[styles.version, { color: colors.textSecondary }]}>
          v1.0.0
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  badgeText: {
    fontSize: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  version: {
    position: 'absolute',
    bottom: 32,
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.5,
  },
});
