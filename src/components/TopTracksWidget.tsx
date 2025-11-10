/**
 * Top Tracks Widget Component
 * Displays user's most played tracks
 */

import React from 'react';
import {View, StyleSheet, Image, Pressable, ScrollView} from 'react-native';
import {GlassCard} from './GlassCard';
import {H2, Body, Caption} from './Typography';
import Icon from './Icon';
import {useTheme} from '../theme';
import {TopTrack} from '../services/HomeDataService';

interface TopTracksWidgetProps {
  tracks: TopTrack[];
  onTrackPress?: (track: TopTrack) => void;
  onViewAll?: () => void;
}

export const TopTracksWidget: React.FC<TopTracksWidgetProps> = ({
  tracks,
  onTrackPress,
  onViewAll,
}) => {
  const {colors, spacing} = useTheme();

  if (!tracks || tracks.length === 0) {
    return (
      <GlassCard style={styles.card} variant="light">
        <View style={styles.header}>
          <H2 style={[styles.title, {color: colors.textPrimary}]}>Top Tracks</H2>
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="music" size={32} color={colors.textSecondary} />
          <Caption style={{color: colors.textSecondary, marginTop: 12}}>
            No tracks yet. Start listening!
          </Caption>
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.card} variant="medium">
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon name="fire" size={24} color={colors.accent} />
          <H2 style={[styles.title, {color: colors.textPrimary}]}>Top Tracks</H2>
        </View>
        {onViewAll && (
          <Pressable onPress={onViewAll} hitSlop={8}>
            <Caption style={{color: colors.accent, fontWeight: '600'}}>
              View All
            </Caption>
          </Pressable>
        )}
      </View>

      <View style={styles.tracksList}>
        {tracks.slice(0, 5).map((track, index) => (
          <Pressable
            key={track.id}
            onPress={() => onTrackPress?.(track)}
            disabled={!onTrackPress}
            style={({pressed}) => [
              styles.trackItem,
              {
                backgroundColor: pressed ? colors.surfaceGlass : 'transparent',
              },
            ]}
          >
            {/* Rank */}
            <View style={styles.rankContainer}>
              <Body style={[styles.rankText, {color: colors.textSecondary}]}>
                {index + 1}
              </Body>
            </View>

            {/* Album Art */}
            {track.albumArt ? (
              <Image source={{uri: track.albumArt}} style={styles.albumArt} />
            ) : (
              <View style={[styles.albumArt, styles.albumArtPlaceholder, {backgroundColor: colors.surfaceGlass}]}>
                <Icon name="music" size={16} color={colors.textSecondary} />
              </View>
            )}

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
            </View>

            {/* Play Count or Popularity */}
            <View style={styles.metaContainer}>
              {track.playCount !== undefined ? (
                <View style={styles.metaRow}>
                  <Icon name="play" size={12} color={colors.textSecondary} />
                  <Caption style={{color: colors.textSecondary, marginLeft: 4}}>
                    {track.playCount}
                  </Caption>
                </View>
              ) : track.popularity !== undefined ? (
                <View style={styles.popularityContainer}>
                  <View
                    style={[
                      styles.popularityBar,
                      {
                        backgroundColor: colors.surfaceGlass,
                        width: 40,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.popularityFill,
                        {
                          backgroundColor: getPopularityColor(track.popularity, colors),
                          width: `${track.popularity}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </GlassCard>
  );
};

// Get color based on popularity
function getPopularityColor(popularity: number, colors: any): string {
  if (popularity >= 70) return colors.success;
  if (popularity >= 50) return colors.accent;
  return colors.warning;
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  tracksList: {
    gap: 4,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  rankContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 8,
  },
  rankText: {
    fontWeight: '600',
    fontSize: 14,
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
  },
  albumArtPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginRight: 12,
  },
  trackName: {
    fontWeight: '500',
    marginBottom: 2,
  },
  metaContainer: {
    alignItems: 'flex-end',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularityContainer: {
    width: 40,
  },
  popularityBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  popularityFill: {
    height: '100%',
    borderRadius: 2,
  },
});
