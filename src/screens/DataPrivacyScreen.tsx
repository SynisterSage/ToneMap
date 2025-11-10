import React, {useState} from 'react';
import {SafeAreaView, StyleSheet, View, ScrollView, TouchableOpacity, Alert, Share} from 'react-native';
import {H1, H2, Body, Caption} from '../components/Typography';
import {useTheme} from '../theme';
import {GlassCard} from '../components/GlassCard';
import ThemedButton from '../components/ThemedButton';
import Icon from '../components/Icon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {FirebaseAuthService} from '../services/FirebaseAuthService';
import * as Keychain from 'react-native-keychain';

export default function DataPrivacyScreen() {
  const {colors, spacing} = useTheme();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Collect all user data
      const userData: any = {
        exportDate: new Date().toISOString(),
        firebase: {
          user: FirebaseAuthService.getCurrentUser()?.uid,
          email: FirebaseAuthService.getCurrentUser()?.email,
        },
        localStorage: {},
      };

      // Get all AsyncStorage keys
      const keys = await AsyncStorage.getAllKeys();
      const values = await AsyncStorage.multiGet(keys);
      
      values.forEach(([key, value]) => {
        try {
          userData.localStorage[key] = JSON.parse(value || '');
        } catch {
          userData.localStorage[key] = value;
        }
      });

      // Convert to JSON string
      const jsonData = JSON.stringify(userData, null, 2);

      // Share the data
      await Share.share({
        message: jsonData,
        title: 'ToneMap Data Export',
      });

      Alert.alert('Success', 'Your data has been exported. You can save it or share it.');
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewStoredData = () => {
    Alert.alert(
      'Stored Data',
      'ToneMap stores the following data:\n\n' +
      '• Your Spotify listening history\n' +
      '• Audio feature analysis results\n' +
      '• Learned listening patterns\n' +
      '• Your TonePrint snapshots\n' +
      '• Generated playlist history\n' +
      '• App preferences & settings\n\n' +
      'All data is encrypted and stored securely.',
      [{text: 'OK'}]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear temporary cached data but keep your listening history and preferences. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear specific cache keys but keep important data
              const keysToKeep = ['userSession', 'userSettings', 'themePreference'];
              const allKeys = await AsyncStorage.getAllKeys();
              const keysToRemove = allKeys.filter(key => !keysToKeep.includes(key));
              
              await AsyncStorage.multiRemove(keysToRemove);
              Alert.alert('Success', 'Cache cleared successfully.');
            } catch (error) {
              console.error('Error clearing cache:', error);
              Alert.alert('Error', 'Failed to clear cache.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your ToneMap account and all associated data. This action cannot be undone.\n\nAre you absolutely sure?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              'Last chance! Delete your account permanently?',
              [
                {text: 'Cancel', style: 'cancel'},
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // Delete Firebase user
                      await FirebaseAuthService.deleteAccount();
                      
                      // Clear all local data
                      await AsyncStorage.clear();
                      await Keychain.resetGenericPassword({service: 'spotify'});
                      
                      Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
                      // Navigation handled by parent component via logout
                    } catch (error) {
                      console.error('Error deleting account:', error);
                      Alert.alert('Error', 'Failed to delete account. Please try again.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
      <ScrollView contentContainerStyle={[styles.container, {padding: spacing.large}]}>
        <H1 style={{marginBottom: spacing.large, color: colors.primary}}>Data & Privacy</H1>
        
        {/* Privacy Overview */}
        <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="medium">
          <Icon name="shield-alt" size={32} color={colors.primary} style={{marginBottom: spacing.medium}} />
          <Body style={{color: colors.textPrimary, lineHeight: 22}}>
            Your privacy is our priority. All your listening data is encrypted and stored securely. 
            We never sell your data to third parties.
          </Body>
        </GlassCard>

        {/* Data Management */}
        <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="light">
          <H2 style={{marginBottom: spacing.medium, color: colors.primary}}>Data Management</H2>
          
          <TouchableOpacity 
            style={styles.actionRow}
            onPress={handleViewStoredData}
          >
            <Icon name="database" size={18} color={colors.textSecondary} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary, flex: 1}}>
              View Stored Data
            </Body>
            <Icon name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionRow}
            onPress={handleExportData}
            disabled={isExporting}
          >
            <Icon name="download" size={18} color={colors.textSecondary} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary, flex: 1}}>
              {isExporting ? 'Exporting...' : 'Export My Data'}
            </Body>
            <Icon name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionRow, {marginBottom: 0}]}
            onPress={handleClearCache}
          >
            <Icon name="trash-alt" size={18} color={colors.textSecondary} />
            <Body style={{marginLeft: spacing.small, color: colors.textPrimary, flex: 1}}>
              Clear Cache
            </Body>
            <Icon name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </GlassCard>

        {/* Data Collection Info */}
        <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="light">
          <H2 style={{marginBottom: spacing.medium, color: colors.primary}}>What We Collect</H2>
          
          <View style={styles.infoRow}>
            <Icon name="music" size={16} color={colors.accent} />
            <View style={{marginLeft: spacing.small, flex: 1}}>
              <Body style={{color: colors.textPrimary, fontWeight: '600'}}>Listening History</Body>
              <Caption style={{color: colors.textSecondary, marginTop: 2}}>
                Tracks, artists, genres, and audio features from Spotify
              </Caption>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Icon name="chart-line" size={16} color={colors.accent} />
            <View style={{marginLeft: spacing.small, flex: 1}}>
              <Body style={{color: colors.textPrimary, fontWeight: '600'}}>Usage Analytics</Body>
              <Caption style={{color: colors.textSecondary, marginTop: 2}}>
                App usage patterns to improve your experience
              </Caption>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Icon name="brain" size={16} color={colors.accent} />
            <View style={{marginLeft: spacing.small, flex: 1}}>
              <Body style={{color: colors.textPrimary, fontWeight: '600'}}>Learned Patterns</Body>
              <Caption style={{color: colors.textSecondary, marginTop: 2}}>
                Context-based listening preferences for personalization
              </Caption>
            </View>
          </View>
          
          <View style={[styles.infoRow, {marginBottom: 0}]}>
            <Icon name="user" size={16} color={colors.accent} />
            <View style={{marginLeft: spacing.small, flex: 1}}>
              <Body style={{color: colors.textPrimary, fontWeight: '600'}}>Account Info</Body>
              <Caption style={{color: colors.textSecondary, marginTop: 2}}>
                Email, username, and authentication tokens
              </Caption>
            </View>
          </View>
        </GlassCard>

        {/* Danger Zone */}
        <GlassCard style={{width: '100%', marginBottom: spacing.medium}} variant="light">
          <H2 style={{marginBottom: spacing.small, color: '#ef4444'}}>Danger Zone</H2>
          <Caption style={{color: colors.textSecondary, marginBottom: spacing.medium}}>
            Irreversible actions that permanently affect your account
          </Caption>
          
          <ThemedButton
            title="Delete Account"
            onPress={handleDeleteAccount}
            variant="glass"
            style={{backgroundColor: 'rgba(239, 68, 68, 0.1)'}}
          />
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  container: {flexGrow: 1, paddingVertical: 40},
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
});
