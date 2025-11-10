/**
 * Pattern Learning Types
 * Structures for learned listening patterns and predictions
 */

import { AudioFeatures, TimeOfDay, DayOfWeek, WeatherCondition, ActivityType } from './listening';

export type PatternType = 'time' | 'weather' | 'activity' | 'combined';

/**
 * Context signature for a pattern
 */
export interface PatternContext {
  timeOfDay?: TimeOfDay;
  dayOfWeek?: DayOfWeek;
  weatherCondition?: WeatherCondition;
  activityType?: ActivityType;
}

/**
 * Typical characteristics for a pattern
 */
export interface PatternCharacteristics {
  // Average audio features
  avgEnergy: number;
  avgValence: number;
  avgTempo: number;
  avgDanceability: number;
  avgAcousticness: number;
  avgInstrumentalness: number;
  
  // Top genres (with percentages)
  topGenres: Array<{
    genre: string;
    percentage: number;
  }>;
  
  // Top artists (with play counts)
  topArtists: Array<{
    artist: string;
    playCount: number;
  }>;
}

/**
 * Learned listening pattern
 */
export interface ListeningPattern {
  id: string;
  userId: string;
  
  // What context this pattern applies to
  patternType: PatternType;
  context: PatternContext;
  
  // What user typically listens to in this context
  characteristics: PatternCharacteristics;
  
  // Pattern metadata
  sampleSize: number;       // How many events analyzed
  confidenceScore: number;  // 0-1, based on consistency
  
  firstDetected: Date;
  lastUpdated: Date;
}

/**
 * Database row format
 */
export interface ListeningPatternRow {
  id: string;
  user_id: string;
  
  context_type: string;
  time_of_day?: string;
  day_of_week?: string;
  weather_condition?: string;
  activity_type?: string;
  
  avg_energy: number;
  avg_valence: number;
  avg_tempo: number;
  avg_danceability: number;
  avg_acousticness: number;
  avg_instrumentalness: number;
  
  top_genres: any; // JSONB
  top_artists: any; // JSONB
  
  sample_size: number;
  confidence_score: number;
  
  first_detected: string;
  last_updated: string;
}

/**
 * Insight generated from patterns
 */
export interface Insight {
  type: 'pattern' | 'anomaly' | 'evolution' | 'correlation';
  title: string;
  description: string;
  emoji: string;
  confidence: number;
  data?: any; // Additional data for visualization
}

/**
 * Prediction for current context
 */
export interface ContextPrediction {
  context: PatternContext;
  predictedFeatures: Partial<AudioFeatures>;
  matchingPatterns: ListeningPattern[];
  confidence: number;
  insights: Insight[];
}

/**
 * User preferences
 */
export interface UserPreferences {
  userId: string;
  
  // Settings
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  weatherEnabled: boolean;
  locationEnabled: boolean;
  activityDetectionEnabled: boolean;
  
  // Blacklists
  blacklistedTracks: string[];
  blacklistedArtists: string[];
  blacklistedGenres: string[];
  
  // Preferences
  preferredPlaylistLength: number;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Helper to convert DB row to ListeningPattern
 */
export function rowToListeningPattern(row: ListeningPatternRow): ListeningPattern {
  return {
    id: row.id,
    userId: row.user_id,
    patternType: row.context_type as PatternType,
    context: {
      timeOfDay: row.time_of_day as TimeOfDay | undefined,
      dayOfWeek: row.day_of_week as DayOfWeek | undefined,
      weatherCondition: row.weather_condition as WeatherCondition | undefined,
      activityType: row.activity_type as ActivityType | undefined,
    },
    characteristics: {
      avgEnergy: row.avg_energy,
      avgValence: row.avg_valence,
      avgTempo: row.avg_tempo,
      avgDanceability: row.avg_danceability,
      avgAcousticness: row.avg_acousticness,
      avgInstrumentalness: row.avg_instrumentalness,
      topGenres: row.top_genres,
      topArtists: row.top_artists,
    },
    sampleSize: row.sample_size,
    confidenceScore: row.confidence_score,
    firstDetected: new Date(row.first_detected),
    lastUpdated: new Date(row.last_updated),
  };
}
