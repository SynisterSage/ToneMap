import React from 'react';
import {SafeAreaView, StyleSheet, View, ScrollView, TouchableOpacity} from 'react-native';
import {H1, H2, Body} from '../components/Typography';
import {useTheme} from '../theme';
import {GlassCard} from '../components/GlassCard';
import ThemedButton from '../components/ThemedButton';
import Icon from '../components/Icon';

interface ProfileScreenProps {
  onLogout: () => void;
}

export default function ProfileScreen({onLogout}: ProfileScreenProps) {
  const {colors, spacing} = useTheme();

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
      <ScrollView contentContainerStyle={[styles.container, {padding: spacing.large}]}>
        <H1 style={{marginBottom: spacing.large, color: colors.primary}}>Profile</H1>
        
        <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="medium">
          <H2 style={{marginBottom: spacing.medium, color: colors.primary}}>Quick Stats</H2>
          <View style={styles.statRow}>
            <Icon name="chart-bar" size={18} color={colors.accent} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary}}>
              Tracks Analyzed: 0
            </Body>
          </View>
          <View style={styles.statRow}>
            <Icon name="music" size={18} color={colors.accent} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary}}>
              Top Genre: Loading...
            </Body>
          </View>
          <View style={styles.statRow}>
            <Icon name="star" size={18} color={colors.accent} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary}}>
              Favorite Artist: Loading...
            </Body>
          </View>
          <View style={styles.statRow}>
            <Icon name="calendar" size={18} color={colors.accent} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary}}>
              Member Since: Today
            </Body>
          </View>
        </GlassCard>

        <GlassCard style={{width: '100%', marginBottom: spacing.medium}} variant="light">
          <H2 style={{marginBottom: spacing.medium, color: colors.primary}}>Settings</H2>
          
          <TouchableOpacity style={styles.settingRow}>
            <Icon name="bell" size={18} color={colors.textSecondary} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary, flex: 1}}>
              Weekly Summary Notifications
            </Body>
            <Icon name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingRow}>
            <Icon name="shield-alt" size={18} color={colors.textSecondary} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary, flex: 1}}>
              Data & Privacy
            </Body>
            <Icon name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingRow}>
            <Icon name="palette" size={18} color={colors.textSecondary} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary, flex: 1}}>
              Theme Settings
            </Body>
            <Icon name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.settingRow, {marginBottom: 0}]}>
            <Icon name="info-circle" size={18} color={colors.textSecondary} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary, flex: 1}}>
              About ToneMap
            </Body>
            <Icon name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </GlassCard>

        <View style={{width: '100%'}}>
          <ThemedButton title="Disconnect Spotify" onPress={onLogout} variant="glass" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  container: {flexGrow: 1, paddingVertical: 40},
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
});
