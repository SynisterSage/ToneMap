/**
 * Listening History Service
 * Tracks what the user is listening to and stores it in the database
 */

import {getCurrentlyPlaying, getAudioFeatures} from './SpotifyService';
import {getSupabaseClient} from './database/supabase';
import {FirebaseAuthService} from './FirebaseAuthService';
import {WeatherService} from './WeatherService';

interface ListeningEvent {
  user_id: string;
  track_id: string;
  track_name: string;
  artist_name: string;
  album_name?: string;
  duration_ms: number;
  genres?: string[];
  image_url?: string;
  spotify_url?: string;
  
  // Audio features
  energy?: number;
  valence?: number;
  tempo?: number;
  danceability?: number;
  acousticness?: number;
  instrumentalness?: number;
  liveness?: number;
  speechiness?: number;
  loudness?: number;
  mode?: number;
  key?: number;
  time_signature?: number;
  
  // Context
  played_at: string; // ISO timestamp
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
  day_of_week?: string;
  
  // Engagement
  skipped?: boolean;
  play_duration_ms?: number;
  completed?: boolean;
}

class ListeningHistoryServiceClass {
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private lastTrackId: string | null = null;
  private trackStartTime: number | null = null;
  private isTracking = false;

  /**
   * Start tracking listening history
   */
  startTracking() {
    if (this.isTracking) {
      console.log('[ListeningHistory] Already tracking');
      return;
    }

    console.log('[ListeningHistory] 🎵 Starting listening history tracking...');
    this.isTracking = true;

    // Check immediately
    this.checkCurrentlyPlaying();

    // Then check every 30 seconds
    this.syncInterval = setInterval(() => {
      this.checkCurrentlyPlaying();
    }, 30000);
  }

  /**
   * Stop tracking listening history
   */
  stopTracking() {
    console.log('[ListeningHistory] ⏸️  Stopping listening history tracking');
    this.isTracking = false;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Check what's currently playing and save if it's a new track
   */
  private async checkCurrentlyPlaying() {
    try {
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) {
        console.log('[ListeningHistory] No user signed in, skipping');
        return;
      }

      const currentTrack = await getCurrentlyPlaying();
      
      if (!currentTrack) {
        // Nothing playing or playback paused
        if (this.lastTrackId) {
          // User stopped playing, save the last track if we were tracking it
          await this.saveCompletedTrack(false);
        }
        return;
      }

      const trackId = currentTrack.track.id;

      // New track started
      if (trackId !== this.lastTrackId) {
        // Save previous track if there was one
        if (this.lastTrackId) {
          await this.saveCompletedTrack(false);
        }

        // Start tracking new track
        console.log('[ListeningHistory] 🎵 New track:', currentTrack.track.name);
        this.lastTrackId = trackId;
        this.trackStartTime = Date.now();

        // Save the listening event
        await this.saveListeningEvent(currentTrack);
      }
    } catch (error) {
      console.error('[ListeningHistory] Error checking currently playing:', error);
    }
  }

  /**
   * Save a listening event to the database
   */
  private async saveListeningEvent(track: any) {
    try {
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) return;

      // Get audio features for the track
      let audioFeatures: any = null;
      try {
        const featuresArray = await getAudioFeatures([track.track.id]);
        audioFeatures = featuresArray && featuresArray.length > 0 ? featuresArray[0] : null;
      } catch (error) {
        console.log('[ListeningHistory] Could not fetch audio features:', error);
      }

      // Determine time of day
      const hour = new Date().getHours();
      let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
      if (hour >= 5 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
      else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
      else timeOfDay = 'night';

      // Get day of week
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = days[new Date().getDay()];

      // Get current weather
      const weather = await WeatherService.getCurrentWeather();

      // Build listening event
      const event: any = {
        user_id: userId,
        track_id: track.track.id,
        track_name: track.track.name,
        artist_name: track.track.artist,
        album_name: track.track.album,
        duration_ms: track.track.duration,
        image_url: track.track.albumArt,
        played_at: new Date().toISOString(),
        time_of_day: timeOfDay,
        day_of_week: dayOfWeek,
        weather_condition: weather?.condition || null,
        temperature_celsius: weather?.temperature || null,
      };

      console.log('[ListeningHistory] 📊 Context:', {
        time_of_day: timeOfDay,
        day_of_week: dayOfWeek,
        weather: weather?.condition,
        temp: weather?.temperature
      });

      // Add audio features if available
      if (audioFeatures) {
        event.energy = audioFeatures.energy;
        event.valence = audioFeatures.valence;
        event.tempo = audioFeatures.tempo;
        event.danceability = audioFeatures.danceability;
        event.acousticness = audioFeatures.acousticness;
        event.instrumentalness = audioFeatures.instrumentalness;
        event.liveness = audioFeatures.liveness;
        event.speechiness = audioFeatures.speechiness;
        event.loudness = audioFeatures.loudness;
        event.mode = audioFeatures.mode;
        event.key = audioFeatures.key;
        event.time_signature = audioFeatures.time_signature;
      }

      // Save to database
      const supabase = getSupabaseClient();
      const {error} = await supabase
        .from('listening_events')
        .insert(event);

      if (error) {
        console.error('[ListeningHistory] ❌ Error saving event:', error);
      } else {
        console.log('[ListeningHistory] ✅ Saved:', event.track_name, {
          time_of_day: event.time_of_day,
          day_of_week: event.day_of_week,
          weather: event.weather_condition
        });
      }
    } catch (error) {
      console.error('[ListeningHistory] Error saving listening event:', error);
    }
  }

  /**
   * Save completion status for the last track
   */
  private async saveCompletedTrack(completed: boolean) {
    if (!this.lastTrackId || !this.trackStartTime) return;

    try {
      const playDuration = Date.now() - this.trackStartTime;
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) return;

      const supabase = getSupabaseClient();
      
      // Update the most recent event for this track
      const {error} = await (supabase as any)
        .from('listening_events')
        .update({
          play_duration_ms: playDuration,
          completed,
          skipped: !completed,
        })
        .eq('user_id', userId)
        .eq('track_id', this.lastTrackId)
        .order('played_at', {ascending: false})
        .limit(1);

      if (error) {
        console.error('[ListeningHistory] Error updating completion:', error);
      }
    } catch (error) {
      console.error('[ListeningHistory] Error saving completed track:', error);
    }

    this.lastTrackId = null;
    this.trackStartTime = null;
  }

  /**
   * Get listening history for a user
   */
  async getListeningHistory(limit: number = 50): Promise<any[]> {
    try {
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) return [];

      const supabase = getSupabaseClient();
      const {data, error} = await supabase
        .from('listening_events')
        .select('*')
        .eq('user_id', userId)
        .order('played_at', {ascending: false})
        .limit(limit);

      if (error) {
        console.error('[ListeningHistory] Error fetching history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[ListeningHistory] Error getting listening history:', error);
      return [];
    }
  }
}

export const ListeningHistoryService = new ListeningHistoryServiceClass();
