import React from 'react';
import {SafeAreaView, StyleSheet, View, ScrollView} from 'react-native';
import {H1, H2, Body} from '../components/Typography';
import {useTheme} from '../theme';
import ThemedButton from '../components/ThemedButton';
import {GlassCard} from '../components/GlassCard';
import Icon from '../components/Icon';
import * as Keychain from 'react-native-keychain';

export default function HomeScreen({onLogout}: {onLogout: () => void}) {
  const {colors, spacing} = useTheme();

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
      <ScrollView contentContainerStyle={[styles.container, {padding: spacing.large}]}>
        <H1 style={{marginBottom: spacing.large, color: colors.primary}}>Welcome to ToneMap</H1>
        
        <GlassCard style={{width: '100%', marginBottom: spacing.large}}>
          <Body style={{textAlign: 'center', color: colors.textSecondary}}>
            Your Spotify account is connected. We'll start analyzing your music to build your TonePrint.
          </Body>
        </GlassCard>

        <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="light">
          <H2 style={{marginBottom: spacing.medium, color: colors.primary}}>Coming Soon</H2>
          <View style={styles.featureRow}>
            <Icon name="wave-square" size={20} color={colors.accent} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary}}>View your TonePrint visualization</Body>
          </View>
          <View style={styles.featureRow}>
            <Icon name="list-ul" size={20} color={colors.accent} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary}}>Get personalized adaptive playlists</Body>
          </View>
          <View style={styles.featureRow}>
            <Icon name="chart-line" size={20} color={colors.accent} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary}}>Track mood & energy over time</Body>
          </View>
          <View style={[styles.featureRow, {marginBottom: 0}]}>
            <Icon name="calendar-week" size={20} color={colors.accent} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary}}>Weekly listening summaries</Body>
          </View>
        </GlassCard>

        <View style={{marginTop: spacing.xlarge, width: '100%'}}>
          <ThemedButton title="Disconnect Spotify" onPress={onLogout} variant="glass" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  container: {flexGrow: 1, alignItems: 'center', paddingVertical: 40},
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
});
