import React from 'react';
import {SafeAreaView, StyleSheet, View, ScrollView, TouchableOpacity, Linking} from 'react-native';
import {H1, H2, Body, Caption} from '../components/Typography';
import {useTheme} from '../theme';
import {GlassCard} from '../components/GlassCard';
import Icon from '../components/Icon';

export default function AboutScreen() {
  const {colors, spacing} = useTheme();
  const APP_VERSION = '0.0.1';
  const BUILD_NUMBER = '1';

  const openLink = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Error opening link:', err));
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
      <ScrollView contentContainerStyle={[styles.container, {padding: spacing.large}]}>
        <H1 style={{marginBottom: spacing.large, color: colors.primary}}>About ToneMap</H1>
        
        {/* App Info Card */}
        <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="medium">
          <View style={styles.centerContent}>
            <Icon name="music" size={64} color={colors.primary} />
            <H2 style={{marginTop: spacing.medium, color: colors.primary}}>ToneMap</H2>
            <Caption style={{color: colors.textSecondary, marginTop: spacing.xsmall}}>
              Your Musical Intelligence
            </Caption>
            <View style={styles.versionContainer}>
              <Caption style={{color: colors.textSecondary}}>
                Version {APP_VERSION} (Build {BUILD_NUMBER})
              </Caption>
            </View>
          </View>
        </GlassCard>

        {/* Description Card */}
        <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="light">
          <H2 style={{marginBottom: spacing.medium, color: colors.primary}}>What is ToneMap?</H2>
          <Body style={{color: colors.textPrimary, lineHeight: 22}}>
            ToneMap is a context-aware music intelligence platform that learns your listening patterns 
            and creates personalized playlists based on your mood, time of day, and musical preferences.
          </Body>
          <Body style={{color: colors.textPrimary, lineHeight: 22, marginTop: spacing.medium}}>
            By analyzing your Spotify listening history, ToneMap creates your unique "TonePrint" - 
            a comprehensive profile of your musical taste that evolves with you.
          </Body>
        </GlassCard>

        {/* Features Card */}
        <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="light">
          <H2 style={{marginBottom: spacing.medium, color: colors.primary}}>Key Features</H2>
          <View style={styles.featureRow}>
            <Icon name="fingerprint" size={18} color={colors.accent} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary, flex: 1}}>
              TonePrint Analysis - Your unique musical DNA
            </Body>
          </View>
          <View style={styles.featureRow}>
            <Icon name="list-ul" size={18} color={colors.accent} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary, flex: 1}}>
              Context-Aware Playlists - Music for every moment
            </Body>
          </View>
          <View style={styles.featureRow}>
            <Icon name="chart-line" size={18} color={colors.accent} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary, flex: 1}}>
              Listening Analytics - Track your musical journey
            </Body>
          </View>
          <View style={[styles.featureRow, {marginBottom: 0}]}>
            <Icon name="brain" size={18} color={colors.accent} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary, flex: 1}}>
              Pattern Learning - Gets smarter with every listen
            </Body>
          </View>
        </GlassCard>

        {/* Links Card */}
        <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="light">
          <H2 style={{marginBottom: spacing.medium, color: colors.primary}}>Links & Support</H2>
          
          <TouchableOpacity 
            style={styles.linkRow}
            onPress={() => openLink('https://tonemap.app/privacy')}
          >
            <Icon name="shield-alt" size={18} color={colors.textSecondary} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary, flex: 1}}>
              Privacy Policy
            </Body>
            <Icon name="external-link-alt" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.linkRow, {marginBottom: 0}]}
            onPress={() => openLink('https://tonemap.app/terms')}
          >
            <Icon name="file-alt" size={18} color={colors.textSecondary} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary, flex: 1}}>
              Terms of Service
            </Body>
            <Icon name="external-link-alt" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </GlassCard>

        {/* Credits Card */}
        <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="light">
          <H2 style={{marginBottom: spacing.medium, color: colors.primary}}>Credits</H2>
          <Body style={{color: colors.textPrimary, marginBottom: spacing.small, fontSize: 16}}>
            Made with ❤️ by Alexander Ferguson
          </Body>
          <TouchableOpacity 
            onPress={() => openLink('https://aferguson.art')}
            style={{marginTop: spacing.small}}
          >
            <Body style={{color: colors.accent, textDecorationLine: 'underline'}}>
              aferguson.art ↗
            </Body>
          </TouchableOpacity>
          <Caption style={{color: colors.textSecondary, lineHeight: 18, marginTop: spacing.medium}}>
            Powered by Spotify API, Firebase, and Supabase
          </Caption>
          <Caption style={{color: colors.textSecondary, lineHeight: 18, marginTop: spacing.xsmall}}>
            Icons by FontAwesome
          </Caption>
        </GlassCard>

        {/* Legal Notice */}
        <View style={{alignItems: 'center', marginTop: spacing.small}}>
          <Caption style={{color: colors.textSecondary, textAlign: 'center', lineHeight: 16}}>
            © 2025 ToneMap. All rights reserved.
          </Caption>
          <Caption style={{color: colors.textSecondary, textAlign: 'center', lineHeight: 16, marginTop: spacing.xsmall}}>
            ToneMap is not affiliated with Spotify AB.
          </Caption>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  container: {flexGrow: 1, paddingVertical: 40},
  centerContent: {
    alignItems: 'center',
  },
  versionContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
});
