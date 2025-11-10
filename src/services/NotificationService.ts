/**
 * NotificationService - Handles push notifications for ToneMap
 * 
 * Sends notifications for:
 * - New contextual playlists ready
 * - Pattern detection (e.g., "You always listen to jazz on Friday evenings")
 * - Playlist completion reminders
 * - New music from favorite artists
 */

import PushNotificationIOS from '@react-native-community/push-notification-ios';
import {Platform, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_PERMISSION_KEY = '@tonemap_notification_permission';

interface NotificationPayload {
  title: string;
  body: string;
  data?: {[key: string]: any};
  badge?: number;
  sound?: string;
}

class NotificationServiceClass {
  private isInitialized = false;

  /**
   * Initialize notification service and request permissions
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      if (Platform.OS === 'ios') {
        // Request permissions
        const authorizationStatus = await PushNotificationIOS.requestPermissions({
          alert: true,
          badge: true,
          sound: true,
        });

        console.log('[Notifications] iOS Authorization:', authorizationStatus);

        const granted = authorizationStatus.authorizationStatus === 1 || 
                       authorizationStatus.authorizationStatus === 2; // Authorized or provisional

        await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, granted ? 'granted' : 'denied');

        this.isInitialized = granted;
        return granted;
      }

      // Android would use react-native-push-notification or similar
      console.log('[Notifications] Platform not iOS, skipping for now');
      return false;

    } catch (error) {
      console.error('[Notifications] Error initializing:', error);
      return false;
    }
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const permission = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_KEY);
      return permission === 'granted';
    } catch (error) {
      return false;
    }
  }

  /**
   * Send a local notification (iOS)
   */
  async sendLocalNotification(payload: NotificationPayload): Promise<void> {
    try {
      const enabled = await this.areNotificationsEnabled();
      if (!enabled) {
        console.log('[Notifications] Notifications not enabled, skipping');
        return;
      }

      if (Platform.OS === 'ios') {
        PushNotificationIOS.addNotificationRequest({
          id: `tonemap_${Date.now()}`,
          title: payload.title,
          body: payload.body,
          badge: payload.badge,
          sound: payload.sound || 'default',
          userInfo: payload.data || {},
        });

        console.log('[Notifications] ✅ Local notification sent:', payload.title);
      }

    } catch (error) {
      console.error('[Notifications] Error sending local notification:', error);
    }
  }

  /**
   * Send notification for new contextual playlist
   */
  async notifyNewPlaylist(playlistName: string, contextDescription: string): Promise<void> {
    await this.sendLocalNotification({
      title: '🎵 New Playlist Ready!',
      body: `${contextDescription}. "${playlistName}" is waiting for you.`,
      data: {
        type: 'new_playlist',
        playlistName,
      },
      badge: 1,
    });
  }

  /**
   * Send notification for detected pattern
   */
  async notifyPatternDetected(patternDescription: string): Promise<void> {
    await this.sendLocalNotification({
      title: '🎯 Pattern Detected!',
      body: patternDescription,
      data: {
        type: 'pattern_detected',
      },
    });
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.removeAllDeliveredNotifications();
    }
  }

  /**
   * Set badge count
   */
  setBadgeCount(count: number): void {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.setApplicationIconBadgeNumber(count);
    }
  }

  /**
   * Prompt user to enable notifications (if not already)
   */
  async promptForPermission(): Promise<boolean> {
    const enabled = await this.areNotificationsEnabled();
    if (enabled) {
      return true;
    }

    return new Promise((resolve) => {
      Alert.alert(
        'Enable Notifications',
        'Get notified when we create new playlists for you based on your vibe.',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Enable',
            onPress: async () => {
              const result = await this.initialize();
              resolve(result);
            },
          },
        ]
      );
    });
  }
}

export const NotificationService = new NotificationServiceClass();
