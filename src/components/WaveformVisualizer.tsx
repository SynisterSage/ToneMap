import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated, Dimensions} from 'react-native';
import {useTheme} from '../theme';

const {width} = Dimensions.get('window');

interface WaveformVisualizerProps {
  energy?: number; // 0-1
  tempo?: number; // BPM
  valence?: number; // 0-1 (mood)
  isPlaying?: boolean;
}

/**
 * Optimized Audio Visualizer
 * Lightweight bars that respond to music
 */
export default function WaveformVisualizer({
  energy = 0.5,
  tempo = 120,
  valence = 0.5,
  isPlaying = false,
}: WaveformVisualizerProps) {
  const {colors} = useTheme();
  
  const BAR_COUNT = 24; // Reduced for performance
  
  const barValues = useRef(
    Array.from({length: BAR_COUNT}, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (!isPlaying) {
      // Gentle idle animation
      barValues.forEach((anim, index) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 0.3 + (Math.sin(index * 0.5) * 0.1),
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.3,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
      return;
    }

    // Active animation based on energy and tempo
    const animSpeed = Math.max(300, 800 - (tempo / 200) * 400);

    barValues.forEach((anim, index) => {
      const delay = (index / BAR_COUNT) * animSpeed * 0.5;
      const minScale = 0.2;
      const maxScale = 0.4 + (energy * 0.6);
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: minScale + (maxScale - minScale) * (0.7 + Math.random() * 0.3),
            duration: animSpeed,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: minScale,
            duration: animSpeed,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    return () => {
      barValues.forEach(anim => anim.stopAnimation());
    };
  }, [isPlaying, energy, tempo]);

  // Get color based on valence
  const getColor = () => {
    if (valence >= 0.6) return '#a855f7'; // Happy
    if (valence >= 0.4) return '#8b5cf6'; // Neutral
    return '#7c3aed'; // Melancholic
  };

  const barColor = getColor();

  return (
    <View style={styles.container}>
      <View style={styles.barsContainer}>
        {barValues.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                backgroundColor: barColor,
                transform: [
                  {
                    scaleY: anim,
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '85%',
    height: '70%',
    gap: 4,
  },
  bar: {
    flex: 1,
    height: '100%',
    borderRadius: 4,
    opacity: 0.8,
  },
});
