/**
 * ContextTrackingService - Monitors user context and triggers playlist generation
 * 
 * Tracks:
 * - Time of day changes (morning → afternoon → evening → night)
 * - Weather changes (if available)
 * - Activity changes (detected from phone activity or manual input)
 * - Location changes (home, work, gym, etc.)
 * 
 * Auto-generates playlists when significant context shifts occur
 */

import {getSupabaseClient} from './database/supabase';
import {FirebaseAuthService} from './FirebaseAuthService';
import {PlaylistGenerationService} from './PlaylistGenerationService';
import {NotificationService} from './NotificationService';
import {ListeningHistoryService} from './ListeningHistoryService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ContextSnapshot {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  hour: number;
  dayOfWeek: string;
  weather?: string;
  temperature?: number;
  activity?: string;
  location?: string;
  recentGenres?: string[]; // Track recent listening genres
  recentMood?: string; // Track recent mood (energy/valence)
}

interface ContextChange {
  type: 'time_shift' | 'weather_change' | 'activity_change' | 'location_change' | 'listening_pattern_change';
  from: any;
  to: any;
  timestamp: string;
}

const CONTEXT_CHECK_INTERVAL = 15 * 60 * 1000; // Check every 15 minutes
const LAST_CONTEXT_KEY = '@tonemap_last_context';
const LAST_GENERATION_KEY = '@tonemap_last_generation';

class ContextTrackingServiceClass {
  private intervalId: number | null = null;
  private lastContext: ContextSnapshot | null = null;
  private isTracking = false;

  /**
   * Start tracking context changes
   */
  async startTracking(): Promise<void> {
    if (this.isTracking) {
      console.log('[ContextTracking] Already tracking');
      return;
    }

    console.log('[ContextTracking] 🎯 Starting context tracking');
    this.isTracking = true;

    // Load last context from storage
    await this.loadLastContext();

    // Do initial check
    await this.checkContext();

    // Set up interval to check periodically
    this.intervalId = setInterval(async () => {
      await this.checkContext();
    }, CONTEXT_CHECK_INTERVAL);

    console.log('[ContextTracking] ✅ Context tracking started');
  }

  /**
   * Stop tracking context changes
   */
  stopTracking(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isTracking = false;
    console.log('[ContextTracking] ⏸️ Context tracking stopped');
  }

  /**
   * Get current context
   */
  async getCurrentContext(): Promise<ContextSnapshot> {
    const now = new Date();
    const hour = now.getHours();
    
    // Determine time of day
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 5 && hour < 12) {
      timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 17) {
      timeOfDay = 'afternoon';
    } else if (hour >= 17 && hour < 21) {
      timeOfDay = 'evening';
    } else {
      timeOfDay = 'night';
    }

    const dayOfWeek = now.toLocaleDateString('en-US', {weekday: 'long'}).toLowerCase();

    // Get recent listening patterns (last 20 tracks)
    let recentGenres: string[] = [];
    let recentMood: string = 'balanced';
    
    try {
      const recentTracks = await ListeningHistoryService.getListeningHistory(20); // Last 20 tracks
      
      if (recentTracks.length > 0) {
        // Extract genres from recent listening
        const genreCounts: {[key: string]: number} = {};
        recentTracks.forEach((track: any) => {
          if (track.genres) {
            track.genres.forEach((genre: string) => {
              genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            });
          }
        });
        
        recentGenres = Object.entries(genreCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([genre]) => genre);
        
        // Determine mood from audio features
        const avgEnergy = recentTracks.reduce((sum: number, t: any) => sum + (t.energy || 0.5), 0) / recentTracks.length;
        const avgValence = recentTracks.reduce((sum: number, t: any) => sum + (t.valence || 0.5), 0) / recentTracks.length;
        
        if (avgEnergy > 0.6 && avgValence > 0.6) {
          recentMood = 'energetic_happy';
        } else if (avgEnergy > 0.6 && avgValence < 0.4) {
          recentMood = 'energetic_intense';
        } else if (avgEnergy < 0.4 && avgValence > 0.6) {
          recentMood = 'calm_happy';
        } else if (avgEnergy < 0.4 && avgValence < 0.4) {
          recentMood = 'calm_melancholic';
        }
      }
    } catch (error) {
      console.warn('[ContextTracking] Could not fetch recent listening patterns:', error);
    }

    // TODO: Get weather from API if available
    // TODO: Get activity from sensors if available
    // TODO: Get location if available

    return {
      timeOfDay,
      hour,
      dayOfWeek,
      recentGenres,
      recentMood,
    };
  }

  /**
   * Check if context has changed significantly
   */
  private async checkContext(): Promise<void> {
    try {
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) {
        console.log('[ContextTracking] No user logged in, skipping');
        return;
      }

      const currentContext = await this.getCurrentContext();
      
      if (!this.lastContext) {
        // First time, just save current context
        this.lastContext = currentContext;
        await this.saveLastContext();
        console.log('[ContextTracking] 📝 Initial context saved:', currentContext);
        return;
      }

      // Check for significant changes
      const changes: ContextChange[] = [];

      // Time of day change
      if (currentContext.timeOfDay !== this.lastContext.timeOfDay) {
        changes.push({
          type: 'time_shift',
          from: this.lastContext.timeOfDay,
          to: currentContext.timeOfDay,
          timestamp: new Date().toISOString(),
        });
      }

      // Weather change
      if (currentContext.weather && currentContext.weather !== this.lastContext.weather) {
        changes.push({
          type: 'weather_change',
          from: this.lastContext.weather,
          to: currentContext.weather,
          timestamp: new Date().toISOString(),
        });
      }

      // Activity change
      if (currentContext.activity && currentContext.activity !== this.lastContext.activity) {
        changes.push({
          type: 'activity_change',
          from: this.lastContext.activity,
          to: currentContext.activity,
          timestamp: new Date().toISOString(),
        });
      }

      // Listening pattern change
      if (currentContext.recentMood && this.lastContext.recentMood && 
          currentContext.recentMood !== this.lastContext.recentMood) {
        changes.push({
          type: 'listening_pattern_change',
          from: this.lastContext.recentMood,
          to: currentContext.recentMood,
          timestamp: new Date().toISOString(),
        });
      }

      // Genre shift detection (significant if top 3 genres changed completely)
      if (currentContext.recentGenres && this.lastContext.recentGenres &&
          currentContext.recentGenres.length > 0 && this.lastContext.recentGenres.length > 0) {
        const genreOverlap = currentContext.recentGenres.filter(g => 
          this.lastContext!.recentGenres!.includes(g)
        ).length;
        
        if (genreOverlap === 0) {
          // No overlap - completely different genres being listened to
          changes.push({
            type: 'listening_pattern_change',
            from: this.lastContext.recentGenres.join(', '),
            to: currentContext.recentGenres.join(', '),
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (changes.length > 0) {
        console.log('[ContextTracking] 🔔 Context changed:', changes);
        await this.handleContextChange(currentContext, changes);
      }

      // Update last context
      this.lastContext = currentContext;
      await this.saveLastContext();

    } catch (error) {
      console.error('[ContextTracking] Error checking context:', error);
    }
  }

  /**
   * Handle context change - generate new playlist and notify user
   */
  private async handleContextChange(
    newContext: ContextSnapshot,
    changes: ContextChange[]
  ): Promise<void> {
    try {
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) return;

      // Check if we recently generated a playlist (avoid spam)
      const lastGeneration = await AsyncStorage.getItem(LAST_GENERATION_KEY);
      if (lastGeneration) {
        const timeSinceLastGen = Date.now() - parseInt(lastGeneration, 10);
        const minTimeBetweenGen = 30 * 60 * 1000; // 30 minutes minimum

        if (timeSinceLastGen < minTimeBetweenGen) {
          console.log('[ContextTracking] ⏰ Too soon since last generation, skipping');
          return;
        }
      }

      console.log('[ContextTracking] 🎵 Generating contextual playlist...');

      // Generate playlist based on new context
      const template = this.determineTemplateForContext(newContext);
      const playlist = await PlaylistGenerationService.generateFromTemplate(
        template as any,
        {
          use_current_context: true,
          include_discovery: true,
        },
      );

      if (!playlist) {
        console.error('[ContextTracking] Failed to generate playlist');
        return;
      }

      // Save to "contextual suggestions" (temporary, auto-updated)
      await this.saveContextualSuggestion(userId, playlist, newContext, changes);

      // Update last generation time
      await AsyncStorage.setItem(LAST_GENERATION_KEY, Date.now().toString());

      // Send push notification
      const changeDescription = this.describeContextChange(changes);
      await NotificationService.sendLocalNotification({
        title: '🎵 New Playlist Ready!',
        body: `${changeDescription}. We made a fresh playlist just for you.`,
        data: {
          type: 'contextual_playlist',
          playlistId: playlist.id,
        },
      });

      console.log('[ContextTracking] ✅ Contextual playlist generated and notification sent');

    } catch (error) {
      console.error('[ContextTracking] Error handling context change:', error);
    }
  }

  /**
   * Determine which template fits current context best
   */
  private determineTemplateForContext(context: ContextSnapshot): string {
    const {timeOfDay, dayOfWeek, recentMood} = context;

    // If recent listening shows energetic mood, suggest workout even if it's not morning
    if (recentMood === 'energetic_happy' || recentMood === 'energetic_intense') {
      return 'workout';
    }

    // If recent listening shows calm/melancholic, suggest evening winddown
    if (recentMood === 'calm_melancholic') {
      return 'evening_winddown';
    }

    // Time-based templates (default behavior)
    if (timeOfDay === 'morning') {
      return 'morning_energy';
    } else if (timeOfDay === 'afternoon') {
      // Weekday afternoon = focus, weekend = chill
      if (dayOfWeek === 'saturday' || dayOfWeek === 'sunday') {
        return 'right_now';
      }
      return 'focus_flow';
    } else if (timeOfDay === 'evening') {
      return 'evening_winddown';
    } else {
      // Night
      return 'evening_winddown';
    }
  }

  /**
   * Save contextual suggestion to database
   */
  private async saveContextualSuggestion(
    userId: string,
    playlist: any,
    context: ContextSnapshot,
    changes: ContextChange[]
  ): Promise<void> {
    const supabase = getSupabaseClient();

    // Mark as contextual suggestion (not saved to Spotify yet)
    const suggestion = {
      user_id: userId,
      playlist_data: JSON.stringify(playlist),
      context_snapshot: JSON.stringify(context),
      context_changes: JSON.stringify(changes),
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    // Delete old suggestions for this user
    await supabase
      .from('contextual_suggestions')
      .delete()
      .eq('user_id', userId);

    // Insert new suggestion
    const {error} = await supabase
      .from('contextual_suggestions')
      .insert(suggestion as any);

    if (error) {
      console.error('[ContextTracking] Error saving suggestion:', error);
    }
  }

  /**
   * Get current contextual suggestions for user
   */
  async getContextualSuggestions(userId: string): Promise<any[]> {
    const supabase = getSupabaseClient();

    const {data, error} = await supabase
      .from('contextual_suggestions')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', {ascending: false})
      .limit(2); // Max 2 suggestions

    if (error) {
      console.error('[ContextTracking] Error fetching suggestions:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      ...JSON.parse(row.playlist_data),
      isContextual: true,
      contextSnapshot: JSON.parse(row.context_snapshot),
      contextChanges: JSON.parse(row.context_changes),
      createdAt: row.created_at,
    }));
  }

  /**
   * Describe context change in human-readable text
   */
  private describeContextChange(changes: ContextChange[]): string {
    if (changes.length === 0) return 'Context updated';

    const change = changes[0]; // Use first change for description

    switch (change.type) {
      case 'time_shift':
        const descriptions: {[key: string]: string} = {
          morning: 'Good morning',
          afternoon: 'Good afternoon',
          evening: 'Good evening',
          night: 'Good night',
        };
        return descriptions[change.to] || 'Time has changed';
      
      case 'weather_change':
        return `Weather changed to ${change.to}`;
      
      case 'activity_change':
        return `You're now ${change.to}`;
      
      case 'location_change':
        return `You've moved to ${change.to}`;
      
      case 'listening_pattern_change':
        return 'Your music taste shifted';
      
      default:
        return 'Your vibe shifted';
    }
  }

  /**
   * Load last context from storage
   */
  private async loadLastContext(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(LAST_CONTEXT_KEY);
      if (stored) {
        this.lastContext = JSON.parse(stored);
        console.log('[ContextTracking] Loaded last context:', this.lastContext);
      }
    } catch (error) {
      console.error('[ContextTracking] Error loading last context:', error);
    }
  }

  /**
   * Save last context to storage
   */
  private async saveLastContext(): Promise<void> {
    try {
      if (this.lastContext) {
        await AsyncStorage.setItem(LAST_CONTEXT_KEY, JSON.stringify(this.lastContext));
      }
    } catch (error) {
      console.error('[ContextTracking] Error saving last context:', error);
    }
  }

  /**
   * Force a context check now (for testing or manual trigger)
   */
  async forceCheck(): Promise<void> {
    console.log('[ContextTracking] 🔄 Forcing context check...');
    await this.checkContext();
  }

  /**
   * Manually trigger playlist generation for current context
   */
  async generateForCurrentContext(): Promise<any | null> {
    try {
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const context = await this.getCurrentContext();
      const template = this.determineTemplateForContext(context);

      console.log('[ContextTracking] 🎵 Manually generating for context:', context);

      const playlist = await PlaylistGenerationService.generateFromTemplate(
        template as any,
        {
          use_current_context: true,
          include_discovery: true,
        },
      );

      if (playlist) {
        await this.saveContextualSuggestion(userId, playlist, context, []);
        await AsyncStorage.setItem(LAST_GENERATION_KEY, Date.now().toString());
      }

      return playlist;

    } catch (error) {
      console.error('[ContextTracking] Error generating for current context:', error);
      return null;
    }
  }
}

export const ContextTrackingService = new ContextTrackingServiceClass();
