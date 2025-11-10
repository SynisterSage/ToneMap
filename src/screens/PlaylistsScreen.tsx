import React from 'react';
import {SafeAreaView, StyleSheet, View, ScrollView} from 'react-native';
import {H1, H2, Body} from '../components/Typography';
import {useTheme} from '../theme';
import {GlassCard} from '../components/GlassCard';
import ThemedButton from '../components/ThemedButton';
import Icon from '../components/Icon';

export default function PlaylistsScreen() {
  const {colors, spacing} = useTheme();

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
      <ScrollView contentContainerStyle={[styles.container, {padding: spacing.large}]}>
        <H1 style={{marginBottom: spacing.large, color: colors.primary}}>Playlists</H1>
        
        <GlassCard style={{width: '100%', marginBottom: spacing.medium}} variant="medium">
          <View style={styles.playlistHeader}>
            <Icon name="sun" size={28} color={colors.warning} />
            <H2 style={{marginLeft: spacing.small, color: colors.primary}}>Morning Energy</H2>
          </View>
          <Body style={{marginBottom: spacing.medium, color: colors.textSecondary}}>
            Start your day with high-energy tracks matched to your taste
          </Body>
          <ThemedButton title="Generate Playlist" onPress={() => {}} variant="primary" />
        </GlassCard>

        <GlassCard style={{width: '100%', marginBottom: spacing.medium}} variant="medium">
          <View style={styles.playlistHeader}>
            <Icon name="brain" size={28} color={colors.accent} />
            <H2 style={{marginLeft: spacing.small, color: colors.primary}}>Focus Flow</H2>
          </View>
          <Body style={{marginBottom: spacing.medium, color: colors.textSecondary}}>
            Instrumental and low-energy tracks for deep concentration
          </Body>
          <ThemedButton title="Generate Playlist" onPress={() => {}} variant="primary" />
        </GlassCard>

        <GlassCard style={{width: '100%', marginBottom: spacing.medium}} variant="medium">
          <View style={styles.playlistHeader}>
            <Icon name="moon" size={28} color={colors.primary} />
            <H2 style={{marginLeft: spacing.small, color: colors.primary}}>Evening Vibes</H2>
          </View>
          <Body style={{marginBottom: spacing.medium, color: colors.textSecondary}}>
            Wind down with mellow tracks that match your mood
          </Body>
          <ThemedButton title="Generate Playlist" onPress={() => {}} variant="primary" />
        </GlassCard>

        <GlassCard style={{width: '100%'}} variant="light">
          <Body style={{textAlign: 'center', color: colors.textSecondary}}>
            💡 Playlists adapt to your listening patterns and can be customized before saving to Spotify
          </Body>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  container: {flexGrow: 1, paddingVertical: 40},
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
});
