import React, {useState, useEffect} from 'react';
import {SafeAreaView, StyleSheet, View, ScrollView, Switch, TouchableOpacity, Alert} from 'react-native';
import {H1, H2, Body, Caption} from '../components/Typography';
import {useTheme} from '../theme';
import {GlassCard} from '../components/GlassCard';
import Icon from '../components/Icon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getSupabaseClient} from '../services/database/supabase';
import {FirebaseAuthService} from '../services/FirebaseAuthService';

interface SummarySettings {
  enabled: boolean;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  includeTopTracks: boolean;
  includeTopGenres: boolean;
  includeListeningPatterns: boolean;
  includeMoodAnalysis: boolean;
  includeRecommendations: boolean;
}

const DEFAULT_SETTINGS: SummarySettings = {
  enabled: true,
  frequency: 'weekly',
  dayOfWeek: 0, // Sunday
  includeTopTracks: true,
  includeTopGenres: true,
  includeListeningPatterns: true,
  includeMoodAnalysis: true,
  includeRecommendations: true,
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FREQUENCIES = [
  {value: 'weekly', label: 'Weekly'},
  {value: 'biweekly', label: 'Every 2 Weeks'},
  {value: 'monthly', label: 'Monthly'},
];

export default function WeeklySummaryScreen() {
  const {colors, spacing} = useTheme();
  const [settings, setSettings] = useState<SummarySettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load from AsyncStorage first
      const localSettings = await AsyncStorage.getItem('weeklySummarySettings');
      if (localSettings) {
        setSettings(JSON.parse(localSettings));
      }

      // Try to load from Supabase
      const userId = FirebaseAuthService.getCurrentUserId();
      if (userId) {
        const supabase = getSupabaseClient();
        const {data, error} = await supabase
          .from('user_preferences')
          .select('summary_settings')
          .eq('user_id', userId)
          .single();

        if (data && (data as any).summary_settings) {
          setSettings((data as any).summary_settings);
          // Update local storage
          await AsyncStorage.setItem('weeklySummarySettings', JSON.stringify((data as any).summary_settings));
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: SummarySettings) => {
    setIsSaving(true);
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem('weeklySummarySettings', JSON.stringify(newSettings));

      // Save to Supabase
      const userId = FirebaseAuthService.getCurrentUserId();
      if (userId) {
        const supabase = getSupabaseClient();
        const {error} = await (supabase as any)
          .from('user_preferences')
          .update({
            summary_settings: newSettings,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (error) {
          console.error('Error saving to Supabase:', error);
          throw error;
        }
      }

      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof SummarySettings>(
    key: K,
    value: SummarySettings[K]
  ) => {
    const newSettings = {...settings, [key]: value};
    saveSettings(newSettings);
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
      <ScrollView contentContainerStyle={[styles.container, {padding: spacing.large}]}>
        <H1 style={{marginBottom: spacing.large, color: colors.primary}}>Weekly Summary</H1>
        
        {/* Enable/Disable */}
        <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="medium">
          <View style={styles.toggleRow}>
            <View style={{flex: 1}}>
              <H2 style={{color: colors.primary, marginBottom: spacing.xsmall}}>
                Summary Notifications
              </H2>
              <Caption style={{color: colors.textSecondary}}>
                Get personalized music insights delivered to your inbox
              </Caption>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(value) => updateSetting('enabled', value)}
              trackColor={{false: colors.border, true: colors.accent}}
              thumbColor={settings.enabled ? colors.primary : colors.textSecondary}
            />
          </View>
        </GlassCard>

        {/* Frequency Selection */}
        {settings.enabled && (
          <>
            <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="light">
              <H2 style={{marginBottom: spacing.medium, color: colors.primary}}>Frequency</H2>
              {FREQUENCIES.map((freq) => (
                <TouchableOpacity
                  key={freq.value}
                  style={styles.optionRow}
                  onPress={() => updateSetting('frequency', freq.value as any)}
                >
                  <Body style={{color: colors.textPrimary, flex: 1}}>{freq.label}</Body>
                  {settings.frequency === freq.value && (
                    <Icon name="check" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </GlassCard>

            {/* Day Selection */}
            <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="light">
              <H2 style={{marginBottom: spacing.medium, color: colors.primary}}>
                Delivery Day
              </H2>
              <Caption style={{color: colors.textSecondary, marginBottom: spacing.medium}}>
                Choose which day you want to receive your summary
              </Caption>
              {DAYS.map((day, index) => (
                <TouchableOpacity
                  key={day}
                  style={styles.optionRow}
                  onPress={() => updateSetting('dayOfWeek', index)}
                >
                  <Body style={{color: colors.textPrimary, flex: 1}}>{day}</Body>
                  {settings.dayOfWeek === index && (
                    <Icon name="check" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </GlassCard>

            {/* Content Preferences */}
            <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="light">
              <H2 style={{marginBottom: spacing.medium, color: colors.primary}}>
                What to Include
              </H2>

              <View style={styles.toggleRow}>
                <View style={{flex: 1}}>
                  <Body style={{color: colors.textPrimary}}>Top Tracks</Body>
                  <Caption style={{color: colors.textSecondary}}>
                    Your most played songs
                  </Caption>
                </View>
                <Switch
                  value={settings.includeTopTracks}
                  onValueChange={(value) => updateSetting('includeTopTracks', value)}
                  trackColor={{false: colors.border, true: colors.accent}}
                  thumbColor={settings.includeTopTracks ? colors.primary : colors.textSecondary}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={{flex: 1}}>
                  <Body style={{color: colors.textPrimary}}>Top Genres</Body>
                  <Caption style={{color: colors.textSecondary}}>
                    Genre breakdown and trends
                  </Caption>
                </View>
                <Switch
                  value={settings.includeTopGenres}
                  onValueChange={(value) => updateSetting('includeTopGenres', value)}
                  trackColor={{false: colors.border, true: colors.accent}}
                  thumbColor={settings.includeTopGenres ? colors.primary : colors.textSecondary}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={{flex: 1}}>
                  <Body style={{color: colors.textPrimary}}>Listening Patterns</Body>
                  <Caption style={{color: colors.textSecondary}}>
                    When and how you listen
                  </Caption>
                </View>
                <Switch
                  value={settings.includeListeningPatterns}
                  onValueChange={(value) => updateSetting('includeListeningPatterns', value)}
                  trackColor={{false: colors.border, true: colors.accent}}
                  thumbColor={settings.includeListeningPatterns ? colors.primary : colors.textSecondary}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={{flex: 1}}>
                  <Body style={{color: colors.textPrimary}}>Mood Analysis</Body>
                  <Caption style={{color: colors.textSecondary}}>
                    Your emotional music journey
                  </Caption>
                </View>
                <Switch
                  value={settings.includeMoodAnalysis}
                  onValueChange={(value) => updateSetting('includeMoodAnalysis', value)}
                  trackColor={{false: colors.border, true: colors.accent}}
                  thumbColor={settings.includeMoodAnalysis ? colors.primary : colors.textSecondary}
                />
              </View>

              <View style={[styles.toggleRow, {marginBottom: 0}]}>
                <View style={{flex: 1}}>
                  <Body style={{color: colors.textPrimary}}>Recommendations</Body>
                  <Caption style={{color: colors.textSecondary}}>
                    Personalized music suggestions
                  </Caption>
                </View>
                <Switch
                  value={settings.includeRecommendations}
                  onValueChange={(value) => updateSetting('includeRecommendations', value)}
                  trackColor={{false: colors.border, true: colors.accent}}
                  thumbColor={settings.includeRecommendations ? colors.primary : colors.textSecondary}
                />
              </View>
            </GlassCard>

            {/* Preview Info */}
            <GlassCard style={{width: '100%'}} variant="light">
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: spacing.small}}>
                <Icon name="info-circle" size={18} color={colors.accent} />
                <Body style={{marginLeft: spacing.small, color: colors.primary, fontWeight: '600'}}>
                  Preview
                </Body>
              </View>
              <Caption style={{color: colors.textSecondary, lineHeight: 18}}>
                Your next summary will be delivered on {DAYS[settings.dayOfWeek]} at 9:00 AM. 
                {'\n\n'}
                Summaries are sent via email to your registered address.
              </Caption>
            </GlassCard>
          </>
        )}

        {!settings.enabled && (
          <GlassCard style={{width: '100%'}} variant="light">
            <View style={{alignItems: 'center', paddingVertical: spacing.large}}>
              <Icon name="bell-slash" size={48} color={colors.textSecondary} />
              <Body style={{marginTop: spacing.medium, color: colors.textSecondary, textAlign: 'center'}}>
                Summary notifications are currently disabled.
                {'\n'}
                Enable them to start receiving insights.
              </Body>
            </View>
          </GlassCard>
        )}

        {isSaving && (
          <Caption style={{textAlign: 'center', color: colors.accent, marginTop: spacing.small}}>
            Saving settings...
          </Caption>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  container: {flexGrow: 1, paddingVertical: 40},
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
  },
});
