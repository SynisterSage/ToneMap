/**
 * Contextual Pattern Card Component
 * Shows listening patterns for current context with playlist generation CTA
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {GlassCard} from './GlassCard';
import {H2, Body, Caption} from './Typography';
import ThemedButton from './ThemedButton';
import Icon from './Icon';
import {useTheme} from '../theme';
import {ContextInfo} from '../services/HomeDataService';

interface ContextualPatternCardProps {
  contextInfo: ContextInfo | null;
  onGeneratePlaylist?: () => void;
  isGenerating?: boolean;
}

export const ContextualPatternCard: React.FC<ContextualPatternCardProps> = ({
  contextInfo,
  onGeneratePlaylist,
  isGenerating = false,
}) => {
  const {colors, spacing} = useTheme();

  if (!contextInfo) {
    return (
      <GlassCard style={styles.card} variant="light">
        <View style={styles.emptyContainer}>
          <Icon name="calendar" size={32} color={colors.textSecondary} />
          <Caption style={{color: colors.textSecondary, marginTop: 12}}>
            Building your contextual patterns...
          </Caption>
        </View>
      </GlassCard>
    );
  }

  const {currentContext, pattern} = contextInfo;

  // Format context string
  const contextString = formatContext(currentContext);
  const contextIcon = getContextIcon(currentContext.timeOfDay);

  return (
    <GlassCard style={styles.card} variant="medium">
      {/* Header */}
      <View style={styles.header}>
        <Icon name={contextIcon} size={24} color={colors.accent} />
        <H2 style={[styles.title, {color: colors.textPrimary}]}>
          Right Now
        </H2>
      </View>

      {/* Context */}
      <View style={[styles.contextBadge, {backgroundColor: `${colors.accent}20`}]}>
        <Body style={[styles.contextText, {color: colors.accent}]}>
          {contextString}
        </Body>
      </View>

      {pattern ? (
        <>
          {/* Pattern Info */}
          <Body style={[styles.description, {color: colors.textPrimary}]}>
            You typically listen to:
          </Body>

          {/* Top Genres */}
          {pattern.topGenres && pattern.topGenres.length > 0 && (
            <View style={styles.genresList}>
              {pattern.topGenres.map((genre, index) => (
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
                  <Caption style={{color: colors.textPrimary}}>
                    {genre}
                  </Caption>
                </View>
              ))}
            </View>
          )}

          {/* Audio Features */}
          <View style={styles.featuresContainer}>
            <FeatureChip
              label="Energy"
              value={pattern.avgEnergy}
              color={colors.accent}
            />
            <FeatureChip
              label="Mood"
              value={pattern.avgValence}
              color={colors.primary}
            />
            {pattern.avgTempo > 0 && (
              <View style={[styles.chip, {backgroundColor: colors.surfaceGlass}]}>
                <Caption style={{color: colors.textPrimary}}>
                  {Math.round(pattern.avgTempo)} BPM
                </Caption>
              </View>
            )}
          </View>

          {/* Confidence Badge */}
          {pattern.sampleSize > 0 && (
            <Caption style={[styles.confidence, {color: colors.textSecondary}]}>
              Based on {pattern.sampleSize} tracks • {Math.round(pattern.confidenceScore * 100)}% confidence
            </Caption>
          )}

          {/* Generate Playlist Button */}
          {onGeneratePlaylist && (
            <ThemedButton
              title={isGenerating ? "Generating..." : "Generate Playlist for Now 🎵"}
              onPress={onGeneratePlaylist}
              variant="primary"
              disabled={isGenerating}
              style={{marginTop: spacing.medium}}
            />
          )}
        </>
      ) : (
        <>
          <Body style={[styles.description, {color: colors.textSecondary}]}>
            We don't have enough data for this context yet. Keep listening!
          </Body>
          <Caption style={[styles.confidence, {color: colors.textSecondary, marginTop: spacing.small}]}>
            Need at least 10 tracks to build a pattern
          </Caption>
        </>
      )}
    </GlassCard>
  );
};

// Feature chip component
const FeatureChip: React.FC<{label: string; value: number; color: string}> = ({
  label,
  value,
  color,
}) => {
  return (
    <View style={[styles.chip, {backgroundColor: `${color}20`, borderColor: color, borderWidth: 1}]}>
      <Caption style={{color}}>
        {label}: {Math.round(value * 100)}%
      </Caption>
    </View>
  );
};

// Format context string
function formatContext(context: {timeOfDay: string; dayOfWeek: string; weather?: string}): string {
  const day = context.dayOfWeek.charAt(0).toUpperCase() + context.dayOfWeek.slice(1);
  const time = context.timeOfDay.charAt(0).toUpperCase() + context.timeOfDay.slice(1);
  
  if (context.weather) {
    const weather = context.weather.replace('_', ' ');
    return `${day} ${time} • ${weather}`;
  }
  
  return `${day} ${time}`;
}

// Get icon for time of day
function getContextIcon(timeOfDay: string): 'sun' | 'cloud' | 'moon' | 'star' {
  switch (timeOfDay) {
    case 'morning':
      return 'sun';
    case 'afternoon':
      return 'cloud';
    case 'evening':
      return 'moon';
    case 'night':
      return 'star';
    default:
      return 'sun';
  }
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontWeight: '600',
  },
  contextBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  contextText: {
    fontWeight: '600',
    fontSize: 14,
  },
  description: {
    marginBottom: 12,
  },
  genresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  genreTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  confidence: {
    fontSize: 11,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
});
