/**
 * Now Playing Card Component
 * Displays currently playing track with expandable audio features
 */

import React, {useState, useEffect} from 'react';
import {View, StyleSheet, Image, Pressable, Animated} from 'react-native';
import {GlassCard} from './GlassCard';
import {Body, Caption} from './Typography';
import Icon from './Icon';
import {useTheme} from '../theme';
import {NowPlayingData} from '../services/HomeDataService';

interface NowPlayingCardProps {
  data: NowPlayingData | null;
  onRefresh?: () => void;
}

export const NowPlayingCard: React.FC<NowPlayingCardProps> = ({data, onRefresh}) => {
  const {colors, spacing} = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const [currentProgress, setCurrentProgress] = useState(data?.progress || 0);

  // Update progress every second when playing
  useEffect(() => {
    if (!data || !data.isPlaying) {
      setCurrentProgress(data?.progress || 0);
      return;
    }

    setCurrentProgress(data.progress);

    const interval = setInterval(() => {
      setCurrentProgress((prev) => {
        const newProgress = prev + 1000; // Add 1 second in ms
        // Don't exceed track duration
        if (newProgress >= data.track.duration) {
          return data.track.duration;
        }
        return newProgress;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [data, data?.isPlaying, data?.progress]);

  useEffect(() => {
    Animated.spring(animation, {
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [isExpanded]);

  if (!data) {
    return (
      <GlassCard style={styles.card} variant="light">
        <View style={styles.emptyContainer}>
          <Icon name="music" size={32} color={colors.textSecondary} />
          <Body style={[styles.emptyText, {color: colors.textSecondary}]}>
            Not playing right now
          </Body>
          <Caption style={{color: colors.textSecondary, marginTop: spacing.xsmall}}>
            Open Spotify to see live data
          </Caption>
        </View>
      </GlassCard>
    );
  }

  const {track, isPlaying, audioFeatures} = data;
  const progressPercent = (currentProgress / track.duration) * 100;

  const expandedHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });

  return (
    <GlassCard style={styles.card} variant="medium">
      <Pressable onPress={() => setIsExpanded(!isExpanded)}>
        <View style={styles.header}>
          <View style={styles.nowPlayingBadge}>
            <View style={[styles.playingDot, {backgroundColor: colors.accent}]} />
            <Caption style={{color: colors.accent, fontWeight: '600'}}>
              {isPlaying ? 'NOW PLAYING' : 'PAUSED'}
            </Caption>
          </View>
          {onRefresh && (
            <Pressable onPress={onRefresh} hitSlop={8}>
              <Icon name="sync" size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        <View style={styles.content}>
          {/* Album Art */}
          <View style={styles.albumArtContainer}>
            {track.albumArt ? (
              <Image source={{uri: track.albumArt}} style={styles.albumArt} />
            ) : (
              <View style={[styles.albumArt, styles.albumArtPlaceholder, {backgroundColor: colors.surfaceGlass}]}>
                <Icon name="music" size={24} color={colors.textSecondary} />
              </View>
            )}
          </View>

          {/* Track Info */}
          <View style={styles.trackInfo}>
            <Body
              style={[styles.trackName, {color: colors.textPrimary}]}
              numberOfLines={1}
            >
              {track.name}
            </Body>
            <Caption style={{color: colors.textSecondary}} numberOfLines={1}>
              {track.artist}
            </Caption>

            {/* Progress Bar */}
            <View style={[styles.progressBar, {backgroundColor: colors.surfaceGlass}]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${progressPercent}%`,
                  },
                ]}
              />
            </View>

            {/* Time */}
            <View style={styles.timeRow}>
              <Caption style={{color: colors.textSecondary}}>
                {formatTime(currentProgress)}
              </Caption>
              <Caption style={{color: colors.textSecondary}}>
                {formatTime(track.duration)}
              </Caption>
            </View>
          </View>
        </View>

        {/* Expanded Audio Features */}
        {audioFeatures && (
          <Animated.View 
            style={[
              styles.expandedContent, 
              {
                height: expandedHeight,
                opacity: animation,
              }
            ]}
            pointerEvents={isExpanded ? 'auto' : 'none'}
          >
            <View style={styles.featuresGrid}>
              <FeatureBar
                label="Energy"
                value={audioFeatures.energy}
                color={colors.accent}
              />
              <FeatureBar
                label="Valence"
                value={audioFeatures.valence}
                color={colors.primary}
              />
              <View style={styles.featureRow}>
                <Caption style={{color: colors.textSecondary}}>Tempo</Caption>
                <Caption style={{color: colors.textPrimary, fontWeight: '600'}}>
                  {Math.round(audioFeatures.tempo)} BPM
                </Caption>
              </View>
              <View style={styles.featureRow}>
                <Caption style={{color: colors.textSecondary}}>Danceability</Caption>
                <Caption style={{color: colors.textPrimary, fontWeight: '600'}}>
                  {Math.round(audioFeatures.danceability * 100)}%
                </Caption>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Expand Indicator */}
        {audioFeatures && (
          <View style={styles.expandIndicator}>
            <Icon
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textSecondary}
            />
            <Caption style={{color: colors.textSecondary, marginLeft: spacing.xsmall}}>
              {isExpanded ? 'Hide' : 'Show'} audio features
            </Caption>
          </View>
        )}
      </Pressable>
    </GlassCard>
  );
};

// Helper component for feature bars
const FeatureBar: React.FC<{label: string; value: number; color: string}> = ({
  label,
  value,
  color,
}) => {
  const {colors} = useTheme();
  return (
    <View style={styles.featureBar}>
      <Caption style={{color: colors.textSecondary, marginBottom: 4}}>
        {label}
      </Caption>
      <View style={[styles.barTrack, {backgroundColor: colors.surfaceGlass}]}>
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: color,
              width: `${value * 100}%`,
            },
          ]}
        />
      </View>
      <Caption style={{color: colors.textPrimary, marginTop: 2, fontWeight: '600'}}>
        {Math.round(value * 100)}%
      </Caption>
    </View>
  );
};

// Format milliseconds to MM:SS
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nowPlayingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    marginTop: 12,
  },
  content: {
    flexDirection: 'row',
  },
  albumArtContainer: {
    marginRight: 12,
  },
  albumArt: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  albumArtPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  trackName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  expandedContent: {
    overflow: 'hidden',
    marginTop: 16,
  },
  featuresGrid: {
    gap: 12,
  },
  featureBar: {
    marginBottom: 8,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
});
