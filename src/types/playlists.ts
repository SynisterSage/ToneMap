/**
 * Playlist Types
 * Type definitions for playlist generation, storage, and management
 */

export type PlaylistTemplate = 
  | 'morning_energy'
  | 'focus_flow'
  | 'evening_winddown'
  | 'rainy_day'
  | 'workout'
  | 'weekend_vibes'
  | 'right_now'
  | 'custom';

export type EnergyArcShape = 
  | 'steady'        // Consistent energy throughout
  | 'building'      // Gradual increase
  | 'peaking'       // Rise then fall
  | 'winding_down'; // Gradual decrease

export interface PlaylistFilters {
  // Audio Features
  energy_range?: [number, number];      // 0-1
  valence_range?: [number, number];     // 0-1
  tempo_range?: [number, number];       // BPM
  danceability_range?: [number, number]; // 0-1
  acousticness_range?: [number, number]; // 0-1
  instrumentalness_range?: [number, number]; // 0-1
  
  // Context
  time_of_day?: ('morning' | 'afternoon' | 'evening' | 'night')[];
  day_of_week?: string[];
  weather_condition?: ('sunny' | 'partly_cloudy' | 'cloudy' | 'rainy' | 'snowy' | 'foggy' | 'stormy')[];
  activity_type?: ('stationary' | 'walking' | 'running' | 'driving' | 'cycling')[];
  
  // Music Preferences
  genres?: string[];
  artists?: string[];
  exclude_genres?: string[];
  exclude_artists?: string[];
  
  // Track Properties
  min_popularity?: number;
  max_popularity?: number;
  year_range?: [number, number];
  exclude_explicit?: boolean;
}

export interface PlaylistGenerationOptions {
  template?: PlaylistTemplate;
  filters?: PlaylistFilters;
  track_limit?: number;                  // 10-100, default 25
  include_discovery?: boolean;           // Include 20% new similar tracks
  energy_arc?: EnergyArcShape;
  smart_transitions?: boolean;           // Order by key/tempo
  diversity_level?: 'low' | 'medium' | 'high'; // Artist repetition control
  use_current_context?: boolean;         // Use real-time weather/time
}

export interface GeneratedPlaylist {
  id?: string;
  user_id: string;
  name: string;
  description?: string;
  
  // Context when generated
  context_snapshot: {
    generation_type: 'auto' | 'custom';
    template?: PlaylistTemplate;
    filters?: PlaylistFilters;
    options?: PlaylistGenerationOptions;
    matched_pattern_id?: string;
    is_context_based?: boolean; // Generated from "Right Now" or auto-context
    generated_at_context?: {
      time: string;
      time_of_day?: string;
      weather?: string;
      temperature?: number;
      activity?: string;
    };
  };
  
  // Playlist data
  track_ids: string[];
  tracks?: TrackWithFeatures[];          // Full track data
  total_tracks: number;
  total_duration_ms: number;
  
  // Feedback
  user_rating?: number;                  // 1-5
  tracks_skipped?: string[];
  tracks_loved?: string[];
  
  // Spotify integration
  spotify_playlist_id?: string;
  spotify_url?: string;
  is_public?: boolean;
  is_collaborative?: boolean;
  
  // Metadata
  created_at: string;
  last_modified?: string;
}

export interface TrackWithFeatures {
  // Basic Info
  id: string;
  name: string;
  artist: string;
  artist_id?: string;
  album?: string;
  album_art?: string;
  duration_ms: number;
  
  // Audio Features
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
  
  // Metadata
  genres?: string[];
  popularity?: number;
  explicit?: boolean;
  release_year?: number;
  
  // User engagement data (if available)
  play_count?: number;
  last_played?: string;
  skip_rate?: number;
  completion_rate?: number;
  
  // Discovery markers
  is_discovered?: boolean; // Track discovered via artist/related artist exploration
  is_from_saved_album?: boolean; // Track from user's saved albums but not played yet
}

export interface PlaylistPreview {
  tracks: TrackWithFeatures[];
  total_duration_ms: number;
  
  // Aggregated stats
  avg_energy: number;
  avg_valence: number;
  avg_tempo: number;
  
  top_genres: Array<{genre: string; count: number}>;
  top_artists: Array<{artist: string; count: number}>;
  
  // Visual data for charts
  energy_progression: number[];          // Energy value per track
  mood_distribution: {
    happy: number;
    sad: number;
    energetic: number;
    calm: number;
  };
}

export interface PlaylistStats {
  total_playlists: number;
  total_tracks_generated: number;
  avg_rating: number;
  
  favorite_template?: PlaylistTemplate;
  most_used_context?: string;
  
  generation_history: Array<{
    date: string;
    count: number;
  }>;
  
  template_breakdown: Array<{
    template: PlaylistTemplate;
    count: number;
    avg_rating: number;
  }>;
}

export interface PlaylistFeedback {
  playlist_id: string;
  user_rating?: number;
  tracks_skipped?: string[];
  tracks_loved?: string[];
  tracks_added?: string[];              // User added tracks
  comment?: string;
}

export interface AutoGenerateConfig {
  enabled: boolean;
  triggers: {
    mood_shift?: boolean;                // Generate when mood pattern shifts
    genre_shift?: boolean;               // Generate when genre preferences shift
    time_based?: boolean;                // Generate at specific times
    weather_change?: boolean;            // Generate when weather changes significantly
    manual_schedule?: Array<{            // User-defined schedule
      time: string;                      // "08:00"
      days: string[];                    // ["monday", "tuesday"]
      template: PlaylistTemplate;
    }>;
  };
  min_interval_hours?: number;           // Minimum time between auto-generations
}

export interface PlaylistUserPreferences {
  default_length: number;                // 10-100
  default_privacy: 'private' | 'public';
  auto_generate: AutoGenerateConfig;
  allow_explicit: boolean;
  discovery_mode: boolean;
  energy_arc_preference?: EnergyArcShape;
  diversity_level: 'low' | 'medium' | 'high';
}
