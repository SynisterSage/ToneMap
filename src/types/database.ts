/**
 * Database type definitions
 * Auto-generated types for Supabase tables
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      listening_events: {
        Row: {
          id: string
          user_id: string
          track_id: string
          track_name: string
          artist_name: string
          album_name: string | null
          duration_ms: number
          genres: string[] | null
          image_url: string | null
          spotify_url: string | null
          energy: number
          valence: number
          tempo: number
          danceability: number
          acousticness: number
          instrumentalness: number
          liveness: number
          speechiness: number
          loudness: number
          mode: number
          key: number
          time_signature: number
          played_at: string
          time_of_day: string
          day_of_week: string
          weather_condition: string | null
          temperature_celsius: number | null
          weather_description: string | null
          latitude: number | null
          longitude: number | null
          location_name: string | null
          activity_type: string | null
          user_tags: string[] | null
          user_mood: string | null
          skipped: boolean
          play_duration_ms: number
          completed: boolean
          repeated: boolean
          rating: number | null
          created_at: string
          synced_at: string
        }
        Insert: {
          id?: string
          user_id: string
          track_id: string
          track_name: string
          artist_name: string
          album_name?: string | null
          duration_ms: number
          genres?: string[] | null
          image_url?: string | null
          spotify_url?: string | null
          energy: number
          valence: number
          tempo: number
          danceability: number
          acousticness: number
          instrumentalness: number
          liveness: number
          speechiness: number
          loudness: number
          mode: number
          key: number
          time_signature: number
          played_at: string
          time_of_day: string
          day_of_week: string
          weather_condition?: string | null
          temperature_celsius?: number | null
          weather_description?: string | null
          latitude?: number | null
          longitude?: number | null
          location_name?: string | null
          activity_type?: string | null
          user_tags?: string[] | null
          user_mood?: string | null
          skipped?: boolean
          play_duration_ms: number
          completed?: boolean
          repeated?: boolean
          rating?: number | null
          created_at?: string
          synced_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          track_id?: string
          track_name?: string
          artist_name?: string
          album_name?: string | null
          duration_ms?: number
          genres?: string[] | null
          image_url?: string | null
          spotify_url?: string | null
          energy?: number
          valence?: number
          tempo?: number
          danceability?: number
          acousticness?: number
          instrumentalness?: number
          liveness?: number
          speechiness?: number
          loudness?: number
          mode?: number
          key?: number
          time_signature?: number
          played_at?: string
          time_of_day?: string
          day_of_week?: string
          weather_condition?: string | null
          temperature_celsius?: number | null
          weather_description?: string | null
          latitude?: number | null
          longitude?: number | null
          location_name?: string | null
          activity_type?: string | null
          user_tags?: string[] | null
          user_mood?: string | null
          skipped?: boolean
          play_duration_ms?: number
          completed?: boolean
          repeated?: boolean
          rating?: number | null
          created_at?: string
          synced_at?: string
        }
      }
      listening_patterns: {
        Row: {
          id: string
          user_id: string
          context_type: string
          time_of_day: string | null
          day_of_week: string | null
          weather_condition: string | null
          activity_type: string | null
          avg_energy: number
          avg_valence: number
          avg_tempo: number
          avg_danceability: number
          avg_acousticness: number
          avg_instrumentalness: number
          top_genres: Json
          top_artists: Json
          sample_size: number
          confidence_score: number
          first_detected: string
          last_updated: string
        }
        Insert: {
          id?: string
          user_id: string
          context_type: string
          time_of_day?: string | null
          day_of_week?: string | null
          weather_condition?: string | null
          activity_type?: string | null
          avg_energy: number
          avg_valence: number
          avg_tempo: number
          avg_danceability: number
          avg_acousticness: number
          avg_instrumentalness: number
          top_genres?: Json
          top_artists?: Json
          sample_size?: number
          confidence_score?: number
          first_detected?: string
          last_updated?: string
        }
        Update: {
          id?: string
          user_id?: string
          context_type?: string
          time_of_day?: string | null
          day_of_week?: string | null
          weather_condition?: string | null
          activity_type?: string | null
          avg_energy?: number
          avg_valence?: number
          avg_tempo?: number
          avg_danceability?: number
          avg_acousticness?: number
          avg_instrumentalness?: number
          top_genres?: Json
          top_artists?: Json
          sample_size?: number
          confidence_score?: number
          first_detected?: string
          last_updated?: string
        }
      }
      user_preferences: {
        Row: {
          user_id: string
          auto_sync_enabled: boolean
          sync_interval_minutes: number
          weather_enabled: boolean
          location_enabled: boolean
          activity_detection_enabled: boolean
          blacklisted_tracks: string[]
          blacklisted_artists: string[]
          blacklisted_genres: string[]
          preferred_playlist_length: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          auto_sync_enabled?: boolean
          sync_interval_minutes?: number
          weather_enabled?: boolean
          location_enabled?: boolean
          activity_detection_enabled?: boolean
          blacklisted_tracks?: string[]
          blacklisted_artists?: string[]
          blacklisted_genres?: string[]
          preferred_playlist_length?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          auto_sync_enabled?: boolean
          sync_interval_minutes?: number
          weather_enabled?: boolean
          location_enabled?: boolean
          activity_detection_enabled?: boolean
          blacklisted_tracks?: string[]
          blacklisted_artists?: string[]
          blacklisted_genres?: string[]
          preferred_playlist_length?: number
          created_at?: string
          updated_at?: string
        }
      }
      generated_playlists: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          context_snapshot: Json | null
          track_ids: string[]
          total_tracks: number
          total_duration_ms: number | null
          user_rating: number | null
          tracks_skipped: string[]
          tracks_loved: string[]
          created_at: string
          spotify_playlist_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          context_snapshot?: Json | null
          track_ids: string[]
          total_tracks: number
          total_duration_ms?: number | null
          user_rating?: number | null
          tracks_skipped?: string[]
          tracks_loved?: string[]
          created_at?: string
          spotify_playlist_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          context_snapshot?: Json | null
          track_ids?: string[]
          total_tracks?: number
          total_duration_ms?: number | null
          user_rating?: number | null
          tracks_skipped?: string[]
          tracks_loved?: string[]
          created_at?: string
          spotify_playlist_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
