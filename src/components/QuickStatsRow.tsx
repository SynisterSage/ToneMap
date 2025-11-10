/**
 * Quick Stats Row Component
 * Displays 4 key metrics in a horizontal row
 */

import React from 'react';
import {View, StyleSheet, Pressable} from 'react-native';
import {GlassCard} from './GlassCard';
import {H2, Caption} from './Typography';
import Icon from './Icon';
import {useTheme} from '../theme';
import {QuickStats} from '../services/HomeDataService';

interface QuickStatsRowProps {
  stats: QuickStats | null;
  onStatPress?: (stat: 'tracks' | 'hours' | 'genres' | 'moods') => void;
}

export const QuickStatsRow: React.FC<QuickStatsRowProps> = ({stats, onStatPress}) => {
  const {colors, spacing} = useTheme();

  if (!stats) {
    return (
      <View style={styles.container}>
        {[1, 2, 3, 4].map(i => (
          <GlassCard key={i} style={styles.statCard} variant="light">
            <View style={styles.statContent}>
              <View style={[styles.placeholder, {backgroundColor: colors.surfaceGlass}]} />
              <View style={[styles.placeholderText, {backgroundColor: colors.surfaceGlass}]} />
            </View>
          </GlassCard>
        ))}
      </View>
    );
  }

  const statData = [
    {
      key: 'tracks' as const,
      value: stats.totalTracks,
      label: 'Tracks',
      icon: 'music' as const,
      color: colors.accent,
    },
    {
      key: 'hours' as const,
      value: stats.totalHours,
      label: 'Hours',
      icon: 'clock' as const,
      color: colors.primary,
    },
    {
      key: 'genres' as const,
      value: stats.uniqueGenres,
      label: 'Genres',
      icon: 'list' as const,
      color: colors.success,
    },
    {
      key: 'moods' as const,
      value: stats.uniqueMoods,
      label: 'Moods',
      icon: 'heart' as const,
      color: colors.warning,
    },
  ];

  return (
    <View style={styles.container}>
      {statData.map(stat => (
        <Pressable
          key={stat.key}
          onPress={() => onStatPress?.(stat.key)}
          disabled={!onStatPress}
          style={({pressed}) => [
            {opacity: pressed ? 0.7 : 1},
          ]}
        >
          <GlassCard style={styles.statCard} variant="medium">
            <View style={styles.statContent}>
              <View style={[styles.iconContainer, {backgroundColor: `${stat.color}20`}]}>
                <Icon name={stat.icon} size={20} color={stat.color} />
              </View>
              <H2 style={[styles.statValue, {color: colors.textPrimary}]}>
                {formatStatValue(stat.value)}
              </H2>
              <Caption style={[styles.statLabel, {color: colors.textSecondary}]}>
                {stat.label}
              </Caption>
            </View>
          </GlassCard>
        </Pressable>
      ))}
    </View>
  );
};

// Format large numbers (e.g., 1234 -> 1.2k)
function formatStatValue(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  statCard: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  statContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontWeight: '700',
    marginBottom: 6,
    fontSize: 24,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  placeholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  placeholderText: {
    width: 30,
    height: 12,
    borderRadius: 6,
  },
});
