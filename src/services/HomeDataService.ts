/**
 * Home Data Service
 * Aggregates all data needed for the Home Screen
 * Coordinates between Spotify API, Supabase, and local cache
 */

import {getSupabaseClient} from './database/supabase';
import {FirebaseAuthService} from './FirebaseAuthService';
import {PatternAnalysisService} from './PatternAnalysisService';
import {CacheService} from './CacheService';
import * as SpotifyService from './SpotifyService';
import {WeatherService} from './WeatherService';

// ============================================================================
// Type Definitions
// ============================================================================

export interface QuickStats {
  totalTracks: number;
  totalHours: number;
  uniqueGenres: number;
  uniqueMoods: number;
  cachedAt: string;
}

export interface NowPlayingData {
  track: {
    id: string;
    name: string;
    artist: string;
    album: string;
    albumArt: string | null;
    duration: number;
  };
  isPlaying: boolean;
  progress: number;
  audioFeatures?: {
    energy: number;
    valence: number;
    tempo: number;
    danceability: number;
  };
}

export interface TopTrack {
  id: string;
  name: string;
  artist: string;
  albumArt: string | null;
  playCount?: number;
  popularity?: number;
}

export interface TonePrintSummary {
  avgEnergy: number;
  avgValence: number;
  avgTempo: number;
  topGenres: string[];
  totalPatterns: number;
}

export interface ContextInfo {
  currentContext: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: string;
    weather?: string;
  };
  pattern: {
    avgEnergy: number;
    avgValence: number;
    avgTempo: number;
    topGenres: string[];
    sampleSize: number;
    confidenceScore: number;
  } | null;
}

export interface HomeData {
  nowPlaying: NowPlayingData | null;
  quickStats: QuickStats | null;
  tonePrintSummary: TonePrintSummary | null;
  topTracks: TopTrack[];
  contextInfo: ContextInfo | null;
  lastSync: string | null;
}

// ============================================================================
// Service Implementation
// ============================================================================

class HomeDataServiceClass {
  /**
   * Fetch all home screen data
   * Uses cache where appropriate, fetches fresh data when needed
   */
  async fetchHomeData(): Promise<HomeData> {
    console.log('[HomeData] 📊 Fetching home screen data...');

    const userId = FirebaseAuthService.getCurrentUserId();
    if (!userId) {
      console.log('[HomeData] No user logged in');
      return this.getEmptyHomeData();
    }

    try {
      // Fetch all data in parallel where possible
      const [nowPlaying, quickStats, tonePrintSummary, topTracks, contextInfo] = await Promise.all([
        this.getNowPlaying(),
        this.getQuickStats(),
        this.getTonePrintSummary(),
        this.getTopTracks(),
        this.getCurrentContextInfo(),
      ]);

      const lastSync = await this.getLastSyncTime();

      return {
        nowPlaying,
        quickStats,
        tonePrintSummary,
        topTracks,
        contextInfo,
        lastSync,
      };
    } catch (error) {
      console.error('[HomeData] Error fetching home data:', error);
      return this.getEmptyHomeData();
    }
  }

  /**
   * Get currently playing track with audio features
   */
  async getNowPlaying(): Promise<NowPlayingData | null> {
    try {
      const currentlyPlaying = await SpotifyService.getCurrentlyPlaying();
      
      if (!currentlyPlaying) {
        return null;
      }

      // Fetch audio features for the track
      let audioFeatures;
      try {
        const features = await SpotifyService.getAudioFeatures([currentlyPlaying.track.id]);
        if (features && features.length > 0) {
          const feature = features[0];
          audioFeatures = {
            energy: feature.energy,
            valence: feature.valence,
            tempo: feature.tempo,
            danceability: feature.danceability,
          };
        }
      } catch (error) {
        console.log('[HomeData] Could not fetch audio features:', error);
      }

      return {
        track: currentlyPlaying.track,
        isPlaying: currentlyPlaying.isPlaying,
        progress: currentlyPlaying.progress,
        audioFeatures,
      };
    } catch (error) {
      console.error('[HomeData] Error fetching now playing:', error);
      return null;
    }
  }

  /**
   * Get quick stats (with caching)
   */
  async getQuickStats(): Promise<QuickStats | null> {
    try {
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) return null;

      // Try cache first (5 minute TTL)
      const cached = await CacheService.get<QuickStats>('quick_stats');
      if (cached) {
        return cached;
      }

      console.log('[HomeData] 📈 Calculating quick stats from database...');

      const supabase = getSupabaseClient();
      
      // Get stats from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const {data: events, error} = await (supabase as any)
        .from('listening_events')
        .select('track_id, duration_ms, genres, user_mood')
        .eq('user_id', userId)
        .gte('played_at', thirtyDaysAgo.toISOString());

      if (error || !events) {
        console.error('[HomeData] Error fetching stats:', error);
        return null;
      }

      // Calculate stats
      const uniqueTracks = new Set(events.map((e: any) => e.track_id)).size;
      const totalMs = events.reduce((sum: number, e: any) => sum + (e.duration_ms || 0), 0);
      const totalHours = Math.round(totalMs / 1000 / 60 / 60);

      // Count unique genres
      const allGenres = new Set<string>();
      events.forEach((e: any) => {
        if (e.genres && Array.isArray(e.genres)) {
          e.genres.forEach((g: string) => allGenres.add(g));
        }
      });

      // Count unique moods
      const uniqueMoods = new Set(
        events
          .map((e: any) => e.user_mood)
          .filter((m: any) => m !== null)
      ).size;

      const stats: QuickStats = {
        totalTracks: uniqueTracks,
        totalHours,
        uniqueGenres: allGenres.size,
        uniqueMoods,
        cachedAt: new Date().toISOString(),
      };

      // Cache for 5 minutes
      await CacheService.set('quick_stats', stats, 5);

      return stats;
    } catch (error) {
      console.error('[HomeData] Error getting quick stats:', error);
      return null;
    }
  }

  /**
   * Get TonePrint summary
   */
  async getTonePrintSummary(): Promise<TonePrintSummary | null> {
    try {
      // Try cache first (10 minute TTL)
      const cached = await CacheService.get<TonePrintSummary>('toneprint_summary');
      if (cached) {
        return cached;
      }

      console.log('[HomeData] 🎨 Fetching TonePrint summary...');

      const summary = await PatternAnalysisService.getMusicTasteSummary();
      
      if (summary) {
        // Cache for 10 minutes
        await CacheService.set('toneprint_summary', summary, 10);
      }

      return summary;
    } catch (error) {
      console.error('[HomeData] Error getting TonePrint summary:', error);
      return null;
    }
  }

  /**
   * Get top tracks with caching
   */
  async getTopTracks(limit: number = 5): Promise<TopTrack[]> {
    try {
      // Try cache first (60 minute TTL)
      const cached = await CacheService.get<TopTrack[]>('top_tracks');
      if (cached) {
        return cached.slice(0, limit);
      }

      console.log('[HomeData] 🎵 Fetching top tracks from Spotify...');

      // Fetch from Spotify (short_term = last 4 weeks)
      const tracks = await SpotifyService.getTopTracks('short_term', limit);
      
      if (tracks && tracks.length > 0) {
        const topTracks: TopTrack[] = tracks.map((track: any) => ({
          id: track.id,
          name: track.name,
          artist: track.artist,
          albumArt: track.albumArt,
          popularity: track.popularity,
        }));

        // Cache for 1 hour
        await CacheService.set('top_tracks', topTracks, 60);

        return topTracks;
      }

      // Fallback: Get most played from our database
      console.log('[HomeData] Falling back to database for top tracks...');
      return await this.getTopTracksFromDatabase(limit);
    } catch (error) {
      console.error('[HomeData] Error getting top tracks:', error);
      return [];
    }
  }

  /**
   * Fallback: Get top tracks from our listening_events table
   */
  private async getTopTracksFromDatabase(limit: number): Promise<TopTrack[]> {
    try {
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) return [];

      const supabase = getSupabaseClient();

      // Get most played tracks from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const {data: events, error} = await (supabase as any)
        .from('listening_events')
        .select('track_id, track_name, artist_name, image_url')
        .eq('user_id', userId)
        .gte('played_at', sevenDaysAgo.toISOString());

      if (error || !events) return [];

      // Count plays per track
      const trackCounts: {[key: string]: {count: number; track: any}} = {};
      
      events.forEach((event: any) => {
        if (!trackCounts[event.track_id]) {
          trackCounts[event.track_id] = {
            count: 0,
            track: {
              id: event.track_id,
              name: event.track_name,
              artist: event.artist_name,
              albumArt: event.image_url,
            },
          };
        }
        trackCounts[event.track_id].count++;
      });

      // Sort by play count and return top tracks
      const topTracks = Object.values(trackCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map(item => ({
          ...item.track,
          playCount: item.count,
        }));

      return topTracks;
    } catch (error) {
      console.error('[HomeData] Error getting top tracks from database:', error);
      return [];
    }
  }

  /**
   * Get current context and matching pattern
   */
  async getCurrentContextInfo(): Promise<ContextInfo | null> {
    try {
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) return null;

      // Determine current context
      const currentContext = this.determineCurrentContext();

      // Try to find a matching pattern
      const pattern = await this.findMatchingPattern(userId, currentContext);

      return {
        currentContext,
        pattern,
      };
    } catch (error) {
      console.error('[HomeData] Error getting context info:', error);
      return null;
    }
  }

  /**
   * Determine current context (time, day, weather)
   */
  private determineCurrentContext(): {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: string;
    weather?: string;
  } {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.toLocaleDateString('en-US', {weekday: 'long'}).toLowerCase();

    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    return {
      timeOfDay,
      dayOfWeek,
    };
  }

  /**
   * Find matching pattern for current context
   */
  private async findMatchingPattern(
    userId: string,
    context: {timeOfDay: string; dayOfWeek: string}
  ): Promise<any> {
    try {
      const supabase = getSupabaseClient();

      // Try to find exact match (time + day)
      let {data: pattern} = await (supabase as any)
        .from('listening_patterns')
        .select('*')
        .eq('user_id', userId)
        .eq('time_of_day', context.timeOfDay)
        .eq('day_of_week', context.dayOfWeek)
        .order('confidence_score', {ascending: false})
        .limit(1)
        .single();

      // If no exact match, try just time of day
      if (!pattern) {
        const result = await (supabase as any)
          .from('listening_patterns')
          .select('*')
          .eq('user_id', userId)
          .eq('time_of_day', context.timeOfDay)
          .is('day_of_week', null)
          .order('confidence_score', {ascending: false})
          .limit(1);
        
        pattern = result.data?.[0];
      }

      if (!pattern) return null;

      // Parse genres if stored as string
      let topGenres = pattern.top_genres;
      if (typeof topGenres === 'string') {
        try {
          const parsed = JSON.parse(topGenres);
          topGenres = Array.isArray(parsed) 
            ? parsed.map((g: any) => g.name || g).slice(0, 3)
            : [];
        } catch (e) {
          topGenres = [];
        }
      } else if (Array.isArray(topGenres)) {
        topGenres = topGenres.map((g: any) => g.name || g).slice(0, 3);
      }

      return {
        avgEnergy: pattern.avg_energy || 0,
        avgValence: pattern.avg_valence || 0,
        avgTempo: pattern.avg_tempo || 0,
        topGenres,
        sampleSize: pattern.sample_size || 0,
        confidenceScore: pattern.confidence_score || 0,
      };
    } catch (error) {
      console.error('[HomeData] Error finding matching pattern:', error);
      return null;
    }
  }

  /**
   * Get last sync time from database
   */
  async getLastSyncTime(): Promise<string | null> {
    try {
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) return null;

      const supabase = getSupabaseClient();

      // Get most recent listening event
      const {data} = await (supabase as any)
        .from('listening_events')
        .select('synced_at')
        .eq('user_id', userId)
        .order('synced_at', {ascending: false})
        .limit(1)
        .single();

      return data?.synced_at || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Invalidate all caches (for manual refresh)
   */
  async invalidateAllCaches(): Promise<void> {
    console.log('[HomeData] 🔄 Invalidating all caches...');
    await Promise.all([
      CacheService.invalidate('quick_stats'),
      CacheService.invalidate('toneprint_summary'),
      CacheService.invalidate('top_tracks'),
    ]);
  }

  /**
   * Get empty home data structure
   */
  private getEmptyHomeData(): HomeData {
    return {
      nowPlaying: null,
      quickStats: null,
      tonePrintSummary: null,
      topTracks: [],
      contextInfo: null,
      lastSync: null,
    };
  }
}

export const HomeDataService = new HomeDataServiceClass();
