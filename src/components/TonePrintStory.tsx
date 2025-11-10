import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  PanResponder,
  Text,
} from 'react-native';
import {useTheme} from '../theme';
import {TonePrint} from '../services/TonePrintEngine';

const {width, height} = Dimensions.get('window');

interface TonePrintStoryProps {
  tonePrint: TonePrint;
  onClose: () => void;
}

export default function TonePrintStory({tonePrint, onClose}: TonePrintStoryProps) {
  const {colors} = useTheme();
  const [currentScene, setCurrentScene] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const sceneOpacity = useRef(new Animated.Value(0)).current;
  const sceneScale = useRef(new Animated.Value(0.8)).current;
  const backgroundParallax = useRef(new Animated.Value(0)).current;

  const scenes = [
    'intro',
    'persona',
    'energy',
    'mood',
    'vibe',
    'intensity',
    'diversity',
    'summary',
  ];

  const totalScenes = scenes.length;

  // Animate scene entrance with parallax
  useEffect(() => {
    sceneOpacity.setValue(0);
    sceneScale.setValue(0.8);
    backgroundParallax.setValue(50);
    
    Animated.parallel([
      Animated.spring(sceneOpacity, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(sceneScale, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(backgroundParallax, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentScene]);

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50 && currentScene > 0) {
          // Swipe right - previous scene
          goToPreviousScene();
        } else if (gestureState.dx < -50 && currentScene < totalScenes - 1) {
          // Swipe left - next scene
          goToNextScene();
        } else {
          // Reset
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  function goToNextScene() {
    if (currentScene < totalScenes - 1) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -50,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(sceneOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(sceneScale, {
          toValue: 0.9,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundParallax, {
          toValue: -30,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentScene(currentScene + 1);
        translateX.setValue(50);
        setTimeout(() => {
          translateX.setValue(0);
        }, 10);
      });
    } else {
      onClose();
    }
  }

  function goToPreviousScene() {
    if (currentScene > 0) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 50,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(sceneOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(sceneScale, {
          toValue: 0.9,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundParallax, {
          toValue: 30,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentScene(currentScene - 1);
        translateX.setValue(-50);
        setTimeout(() => {
          translateX.setValue(0);
        }, 10);
      });
    }
  }

  function handleTap() {
    goToNextScene();
  }

  return (
    <View style={styles.container}>
      {/* Background parallax layer */}
      <Animated.View
        style={[
          styles.parallaxBackground,
          {
            transform: [
              {translateX: backgroundParallax},
              {scale: sceneScale.interpolate({
                inputRange: [0.8, 1],
                outputRange: [1.1, 1],
              })},
            ],
            opacity: sceneOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.6],
            }),
          },
        ]}
      />
      
      <TouchableWithoutFeedback onPress={handleTap}>
        <Animated.View
          style={[
            styles.sceneContainer,
            {
              opacity: sceneOpacity,
              transform: [
                {translateX},
                {scale: sceneScale},
              ],
            },
          ]}
          {...panResponder.panHandlers}>
          {renderScene(scenes[currentScene], tonePrint, colors)}
        </Animated.View>
      </TouchableWithoutFeedback>

      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        {scenes.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              {
                backgroundColor:
                  index === currentScene ? colors.primary : 'rgba(139, 92, 246, 0.3)',
                opacity: index === currentScene ? 1 : 0.5,
              },
            ]}
          />
        ))}
      </View>

      {/* Close button */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.closeButton}>
          <Text style={[styles.closeText, {color: colors.textSecondary}]}>✕</Text>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

function renderScene(sceneType: string, tonePrint: TonePrint, colors: any) {
  switch (sceneType) {
    case 'intro':
      return <IntroScene colors={colors} />;
    case 'persona':
      return <PersonaScene tonePrint={tonePrint} colors={colors} />;
    case 'energy':
      return <EnergyScene tonePrint={tonePrint} colors={colors} />;
    case 'mood':
      return <MoodScene tonePrint={tonePrint} colors={colors} />;
    case 'vibe':
      return <VibeScene tonePrint={tonePrint} colors={colors} />;
    case 'intensity':
      return <IntensityScene tonePrint={tonePrint} colors={colors} />;
    case 'diversity':
      return <DiversityScene tonePrint={tonePrint} colors={colors} />;
    case 'summary':
      return <SummaryScene tonePrint={tonePrint} colors={colors} />;
    default:
      return <IntroScene colors={colors} />;
  }
}

// Scene Components
function IntroScene({colors}: any) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.scene}>
      <Animated.View style={{transform: [{scale: pulseAnim}]}}>
        <Text style={[styles.titleLarge, {color: colors.primary}]}>🎵</Text>
      </Animated.View>
      <Text style={[styles.title, {color: colors.textPrimary}]}>
        Your TonePrint
      </Text>
      <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
        A journey through your music taste
      </Text>
      <Text style={[styles.hint, {color: colors.textSecondary}]}>
        Tap to continue
      </Text>
    </View>
  );
}

function PersonaScene({tonePrint, colors}: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.scene}>
      <Text style={[styles.label, {color: colors.textSecondary}]}>
        Your Listening Persona
      </Text>
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{scale: scaleAnim}],
        }}>
        <Text style={[styles.titleHuge, {color: colors.primary}]}>
          {tonePrint.listeningPersona}
        </Text>
      </Animated.View>
      <Text style={[styles.subtitle, {color: colors.textSecondary, marginTop: 20}]}>
        Based on {tonePrint.trackCount} tracks
      </Text>
    </View>
  );
}

function EnergyScene({tonePrint, colors}: any) {
  return (
    <View style={styles.scene}>
      <Text style={[styles.label, {color: colors.textSecondary}]}>
        Energy Distribution
      </Text>
      <CircularProgress
        percentage={tonePrint.energyDistribution.high}
        label="High Energy"
        color="#10b981"
        colors={colors}
      />
      <View style={{height: 12}} />
      <CircularProgress
        percentage={tonePrint.energyDistribution.medium}
        label="Medium Energy"
        color="#f59e0b"
        colors={colors}
      />
      <View style={{height: 12}} />
      <CircularProgress
        percentage={tonePrint.energyDistribution.low}
        label="Low Energy"
        color="#8b5cf6"
        colors={colors}
      />
    </View>
  );
}

function CircularProgress({percentage, label, color, colors}: any) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: percentage,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  return (
    <View style={styles.progressRow}>
      <View style={styles.circleContainer}>
        <Animated.View
          style={[
            styles.progressCircle,
            {
              backgroundColor: color,
              width: progress.interpolate({
                inputRange: [0, 100],
                outputRange: [0, 40],
              }),
              height: progress.interpolate({
                inputRange: [0, 100],
                outputRange: [0, 40],
              }),
              borderRadius: 20,
            },
          ]}
        />
      </View>
      <View style={{flex: 1, marginLeft: 12}}>
        <Text style={[styles.progressLabel, {color: colors.textPrimary}]}>
          {label}
        </Text>
        <Text style={[styles.progressValue, {color}]}>
          {percentage}%
        </Text>
      </View>
    </View>
  );
}

function MoodScene({tonePrint, colors}: any) {
  const {positive, neutral, melancholic} = tonePrint.moodProfile;

  return (
    <View style={styles.scene}>
      <Text style={[styles.label, {color: colors.textSecondary}]}>
        Mood Profile
      </Text>
      <View style={{height: 20}} />
      
      <MoodBar percentage={positive} label="😊 Positive" color="#10b981" colors={colors} />
      <View style={{height: 16}} />
      <MoodBar percentage={neutral} label="😐 Neutral" color="#f59e0b" colors={colors} />
      <View style={{height: 16}} />
      <MoodBar percentage={melancholic} label="😔 Melancholic" color="#8b5cf6" colors={colors} />
    </View>
  );
}

function MoodBar({percentage, label, color, colors}: any) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: percentage,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  return (
    <View style={{width: '100%'}}>
      <View style={styles.moodBarHeader}>
        <Text style={[styles.progressLabel, {color: colors.textPrimary}]}>
          {label}
        </Text>
        <Text style={[styles.progressValue, {color}]}>
          {percentage}%
        </Text>
      </View>
      <View style={[styles.moodBarTrack, {backgroundColor: colors.surface}]}>
        <Animated.View
          style={[
            styles.moodBarFill,
            {
              backgroundColor: color,
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

function VibeScene({tonePrint, colors}: any) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 30,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        })
      ),
    ]).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.scene}>
      <Text style={[styles.label, {color: colors.textSecondary}]}>
        Your Dominant Vibe
      </Text>
      <Animated.View
        style={{
          transform: [{scale: scaleAnim}, {rotate: spin}],
          marginVertical: 20,
        }}>
        <View style={[styles.vibeCircle, {borderColor: colors.primary}]}>
          <Text style={[styles.vibeText, {color: colors.primary}]}>
            {tonePrint.dominantVibe.toUpperCase()}
          </Text>
        </View>
      </Animated.View>
      <Text style={[styles.subtitle, {color: colors.textPrimary}]}>
        {tonePrint.vibeCategories[tonePrint.dominantVibe]}% of your tracks
      </Text>
    </View>
  );
}

function IntensityScene({tonePrint, colors}: any) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let currentScore = 0;
    const targetScore = tonePrint.intensityScore;
    const duration = 2000;
    const steps = 60;
    const increment = targetScore / steps;
    const stepDuration = duration / steps;

    const timer = setInterval(() => {
      currentScore += increment;
      if (currentScore >= targetScore) {
        setDisplayScore(targetScore);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.round(currentScore));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.scene}>
      <Text style={[styles.label, {color: colors.textSecondary}]}>
        Intensity Score
      </Text>
      <View style={styles.ringContainer}>
        <Text style={[styles.ringNumber, {color: colors.primary}]}>
          {displayScore}
        </Text>
        <Text style={[styles.ringLabel, {color: colors.textSecondary}]}>/100</Text>
      </View>
      <Text style={[styles.subtitle, {color: colors.textSecondary, marginTop: 30}]}>
        {tonePrint.intensityScore >= 70
          ? 'You love high-energy music! 🔥'
          : tonePrint.intensityScore >= 40
          ? 'Balanced intensity 🎵'
          : 'Chill vibes all the way 😌'}
      </Text>
    </View>
  );
}

function DiversityScene({tonePrint, colors}: any) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let currentScore = 0;
    const targetScore = tonePrint.diversityScore;
    const duration = 2000;
    const steps = 60;
    const increment = targetScore / steps;
    const stepDuration = duration / steps;

    const timer = setInterval(() => {
      currentScore += increment;
      if (currentScore >= targetScore) {
        setDisplayScore(targetScore);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.round(currentScore));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.scene}>
      <Text style={[styles.label, {color: colors.textSecondary}]}>
        Diversity Score
      </Text>
      <View style={styles.ringContainer}>
        <Text style={[styles.ringNumber, {color: colors.accent}]}>
          {displayScore}
        </Text>
        <Text style={[styles.ringLabel, {color: colors.textSecondary}]}>/100</Text>
      </View>
      <Text style={[styles.subtitle, {color: colors.textSecondary, marginTop: 30}]}>
        {tonePrint.diversityScore >= 70
          ? 'Eclectic taste! You explore everything 🌍'
          : tonePrint.diversityScore >= 40
          ? 'Balanced variety 🎧'
          : 'You know what you like! 🎯'}
      </Text>
    </View>
  );
}

function SummaryScene({tonePrint, colors}: any) {
  return (
    <View style={styles.scene}>
      <Text style={[styles.title, {color: colors.primary}]}>
        Your TonePrint
      </Text>
      <View style={styles.summaryGrid}>
        <SummaryCard
          label="Persona"
          value={tonePrint.listeningPersona}
          colors={colors}
        />
        <SummaryCard
          label="Intensity"
          value={`${tonePrint.intensityScore}/100`}
          colors={colors}
        />
        <SummaryCard
          label="Diversity"
          value={`${tonePrint.diversityScore}/100`}
          colors={colors}
        />
        <SummaryCard
          label="Tracks Analyzed"
          value={`${tonePrint.trackCount}`}
          colors={colors}
        />
      </View>
      <Text style={[styles.hint, {color: colors.textSecondary, marginTop: 40}]}>
        Tap to finish
      </Text>
    </View>
  );
}

function SummaryCard({label, value, colors}: any) {
  return (
    <View style={[styles.summaryCard, {backgroundColor: colors.surface}]}>
      <Text style={[styles.summaryLabel, {color: colors.textSecondary}]}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, {color: colors.textPrimary}]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  parallaxBackground: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 100,
  },
  sceneContainer: {
    flex: 1,
  },
  scene: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
    fontWeight: '600',
  },
  titleLarge: {
    fontSize: 60,
    textAlign: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  titleHuge: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 20,
  },
  hint: {
    fontSize: 12,
    marginTop: 20,
    opacity: 0.6,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  circleContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircle: {
    borderRadius: 20,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  progressValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  moodBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  moodBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  vibeCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vibeText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  ringContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  ringNumber: {
    fontSize: 56,
    fontWeight: 'bold',
  },
  ringLabel: {
    fontSize: 18,
    marginTop: -8,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 30,
    width: '100%',
  },
  summaryCard: {
    width: '47%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
