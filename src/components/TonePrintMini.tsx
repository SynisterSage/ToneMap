/**
 * TonePrint Mini Component
 * Mini visualization of user's music taste profile
 */

import React from 'react';
import {View, StyleSheet, Pressable} from 'react-native';
import {GlassCard} from './GlassCard';
import {H2, Body, Caption} from './Typography';
import Icon from './Icon';
import {useTheme} from '../theme';
import {TonePrintSummary} from '../services/HomeDataService';

interface TonePrintMiniProps {
  summary: TonePrintSummary | null;
  onPress?: () => void;
}

export const TonePrintMini: React.FC<TonePrintMiniProps> = ({summary, onPress}) => {
  const {colors, spacing} = useTheme();

  if (!summary || summary.totalPatterns === 0) {
    return (
      <GlassCard style={styles.card} variant="light">
        <View style={styles.header}>
          <Icon name="wave-square" size={24} color={colors.textSecondary} />
          <H2 style={[styles.title, {color: colors.textPrimary}]}>Your TonePrint</H2>
        </View>
        <View style={styles.emptyContainer}>
          <Caption style={{color: colors.textSecondary, textAlign: 'center'}}>
            Keep listening to music to build your unique TonePrint
          </Caption>
        </View>
      </GlassCard>
    );
  }

  const energyLevel = getEnergyLevel(summary.avgEnergy);
  const valenceLevel = getValenceLevel(summary.avgValence);

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <GlassCard style={styles.card} variant="medium">
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Icon name="wave-square" size={24} color={colors.accent} />
            <H2 style={[styles.title, {color: colors.textPrimary}]}>Your TonePrint</H2>
          </View>
          {onPress && (
            <Icon name="arrow-right" size={20} color={colors.textSecondary} />
          )}
        </View>

        {/* Visual Representation */}
        <View style={styles.visualContainer}>
          <View style={styles.arcContainer}>
            {/* Energy Arc */}
            <View style={styles.arcRow}>
              <Caption style={{color: colors.textSecondary, width: 80}}>Energy</Caption>
              <View style={[styles.arcTrack, {backgroundColor: colors.surfaceGlass}]}>
                <View
                  style={[
                    styles.arcFill,
                    {
                      backgroundColor: colors.accent,
                      width: `${summary.avgEnergy * 100}%`,
                    },
                  ]}
                />
              </View>
              <Caption style={{color: colors.textPrimary, width: 50, textAlign: 'right', fontWeight: '600'}}>
                {Math.round(summary.avgEnergy * 100)}%
              </Caption>
            </View>

            {/* Valence Arc */}
            <View style={styles.arcRow}>
              <Caption style={{color: colors.textSecondary, width: 80}}>Mood</Caption>
              <View style={[styles.arcTrack, {backgroundColor: colors.surfaceGlass}]}>
                <View
                  style={[
                    styles.arcFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${summary.avgValence * 100}%`,
                    },
                  ]}
                />
              </View>
              <Caption style={{color: colors.textPrimary, width: 50, textAlign: 'right', fontWeight: '600'}}>
                {Math.round(summary.avgValence * 100)}%
              </Caption>
            </View>
          </View>

          {/* Summary Text */}
          <View style={styles.summaryBox}>
            <Body style={[styles.summaryText, {color: colors.textPrimary}]}>
              {energyLevel} energy, {valenceLevel} vibes
            </Body>
            {summary.avgTempo && (
              <Caption style={{color: colors.textSecondary, marginTop: 4, textAlign: 'left'}}>
                Average tempo: {Math.round(summary.avgTempo)} BPM
              </Caption>
            )}
          </View>
        </View>

        {/* Top Genres */}
        {summary.topGenres && summary.topGenres.length > 0 && (
          <View style={styles.genresContainer}>
            <Caption style={{color: colors.textSecondary, marginBottom: 8}}>
              Top Genres
            </Caption>
            <View style={styles.genresList}>
              {summary.topGenres.slice(0, 3).map((genre, index) => (
                <View
                  key={index}
                  style={[
                    styles.genreTag,
                    {
                      backgroundColor: colors.surfaceGlass,
                      borderColor: colors.borderGlass,
                    },
                  ]}
                >
                  <Caption style={{color: colors.textPrimary, fontWeight: '500'}}>
                    {genre}
                  </Caption>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pattern Count */}
        <Caption style={[styles.patternCount, {color: colors.textSecondary}]}>
          Based on {summary.totalPatterns} listening patterns
        </Caption>
      </GlassCard>
    </Pressable>
  );
};

// Helper functions
function getEnergyLevel(energy: number): string {
  if (energy >= 0.75) return 'High';
  if (energy >= 0.5) return 'Medium';
  if (energy >= 0.25) return 'Low';
  return 'Very low';
}

function getValenceLevel(valence: number): string {
  if (valence >= 0.75) return 'happy';
  if (valence >= 0.5) return 'upbeat';
  if (valence >= 0.25) return 'mellow';
  return 'melancholic';
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
    paddingVertical: 24,
    alignItems: 'center',
  },
  visualContainer: {
    marginBottom: 16,
  },
  arcContainer: {
    gap: 12,
    marginBottom: 16,
  },
  arcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arcTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  arcFill: {
    height: '100%',
    borderRadius: 4,
  },
  summaryBox: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  summaryText: {
    fontWeight: '600',
    textAlign: 'left',
    fontSize: 16,
  },
  genresContainer: {
    marginBottom: 12,
  },
  genresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  patternCount: {
    textAlign: 'left',
    fontSize: 11,
    marginTop: 4,
  },
});
