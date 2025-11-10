-- ToneMap Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE: listening_events
-- Stores every track played with full context
-- =============================================================================
CREATE TABLE IF NOT EXISTS listening_events (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  
  -- Track information
  track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT,
  duration_ms INTEGER NOT NULL,
  genres TEXT[],
  image_url TEXT,
  spotify_url TEXT,
  
  -- Audio Features (from Spotify API)
  energy FLOAT CHECK (energy >= 0 AND energy <= 1),
  valence FLOAT CHECK (valence >= 0 AND valence <= 1),
  tempo FLOAT,
  danceability FLOAT CHECK (danceability >= 0 AND danceability <= 1),
  acousticness FLOAT CHECK (acousticness >= 0 AND acousticness <= 1),
  instrumentalness FLOAT CHECK (instrumentalness >= 0 AND instrumentalness <= 1),
  liveness FLOAT CHECK (liveness >= 0 AND liveness <= 1),
  speechiness FLOAT CHECK (speechiness >= 0 AND speechiness <= 1),
  loudness FLOAT,
  mode INTEGER CHECK (mode IN (0, 1)),
  key INTEGER CHECK (key >= 0 AND key <= 11),
  time_signature INTEGER,
  
  -- Context: Time
  played_at TIMESTAMP NOT NULL,
  time_of_day TEXT CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night')),
  day_of_week TEXT CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  
  -- Context: Weather
  weather_condition TEXT CHECK (weather_condition IN ('sunny', 'partly_cloudy', 'cloudy', 'rainy', 'snowy', 'foggy', 'stormy')),
  temperature_celsius FLOAT,
  weather_description TEXT,
  
  -- Context: Location (optional)
  latitude FLOAT,
  longitude FLOAT,
  location_name TEXT,
  
  -- Context: Activity
  activity_type TEXT CHECK (activity_type IN ('stationary', 'walking', 'running', 'driving', 'cycling')),
  
  -- Context: User Tags
  user_tags TEXT[],
  user_mood TEXT CHECK (user_mood IN ('happy', 'sad', 'energetic', 'calm', 'stressed', 'excited', 'melancholic')),
  
  -- Engagement Metrics
  skipped BOOLEAN DEFAULT false,
  play_duration_ms INTEGER,
  completed BOOLEAN DEFAULT false,
  repeated BOOLEAN DEFAULT false,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  synced_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_listening_events_user_played ON listening_events(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_listening_events_user_context ON listening_events(user_id, time_of_day, day_of_week);
CREATE INDEX IF NOT EXISTS idx_listening_events_weather ON listening_events(user_id, weather_condition) WHERE weather_condition IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listening_events_activity ON listening_events(user_id, activity_type) WHERE activity_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listening_events_track ON listening_events(user_id, track_id);

-- =============================================================================
-- TABLE: listening_patterns
-- Stores learned patterns from user behavior
-- =============================================================================
CREATE TABLE IF NOT EXISTS listening_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  
  -- Pattern Context Signature
  context_type TEXT NOT NULL CHECK (context_type IN ('time', 'weather', 'activity', 'combined')),
  time_of_day TEXT CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night')),
  day_of_week TEXT CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  weather_condition TEXT CHECK (weather_condition IN ('sunny', 'partly_cloudy', 'cloudy', 'rainy', 'snowy', 'foggy', 'stormy')),
  activity_type TEXT CHECK (activity_type IN ('stationary', 'walking', 'running', 'driving', 'cycling')),
  
  -- Typical Features for this Context
  avg_energy FLOAT CHECK (avg_energy >= 0 AND avg_energy <= 1),
  avg_valence FLOAT CHECK (avg_valence >= 0 AND avg_valence <= 1),
  avg_tempo FLOAT,
  avg_danceability FLOAT CHECK (avg_danceability >= 0 AND avg_danceability <= 1),
  avg_acousticness FLOAT CHECK (avg_acousticness >= 0 AND avg_acousticness <= 1),
  avg_instrumentalness FLOAT CHECK (avg_instrumentalness >= 0 AND avg_instrumentalness <= 1),
  
  -- Top genres and artists (stored as JSONB)
  top_genres JSONB DEFAULT '[]',
  top_artists JSONB DEFAULT '[]',
  
  -- Pattern Metadata
  sample_size INTEGER DEFAULT 0,
  confidence_score FLOAT DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  first_detected TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint: one pattern per context signature per user
  UNIQUE(user_id, context_type, time_of_day, day_of_week, weather_condition, activity_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patterns_user ON listening_patterns(user_id, context_type);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON listening_patterns(user_id, confidence_score DESC);

-- =============================================================================
-- TABLE: user_preferences
-- User settings and blacklists
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,  -- Firebase UID
  
  -- Firebase Auth
  email TEXT,
  
  -- Spotify Account Linking
  spotify_user_id TEXT,
  spotify_email TEXT,
  spotify_display_name TEXT,
  spotify_connected BOOLEAN DEFAULT false,
  
  -- Settings
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 30 CHECK (sync_interval_minutes >= 15),
  weather_enabled BOOLEAN DEFAULT true,
  location_enabled BOOLEAN DEFAULT false,
  activity_detection_enabled BOOLEAN DEFAULT true,
  
  -- Blacklists
  blacklisted_tracks TEXT[] DEFAULT '{}',
  blacklisted_artists TEXT[] DEFAULT '{}',
  blacklisted_genres TEXT[] DEFAULT '{}',
  
  -- Playlist Preferences
  preferred_playlist_length INTEGER DEFAULT 25 CHECK (preferred_playlist_length >= 10 AND preferred_playlist_length <= 100),
  playlist_privacy TEXT DEFAULT 'private' CHECK (playlist_privacy IN ('private', 'public')),
  playlist_collaborative BOOLEAN DEFAULT false,
  auto_generate_enabled BOOLEAN DEFAULT true,
  auto_generate_triggers JSONB DEFAULT '{"mood_shift": true, "genre_shift": true, "time_based": false, "weather_change": false}',
  min_auto_interval_hours INTEGER DEFAULT 24,
  allow_explicit BOOLEAN DEFAULT true,
  discovery_mode BOOLEAN DEFAULT true,
  energy_arc_preference TEXT DEFAULT 'steady' CHECK (energy_arc_preference IN ('steady', 'building', 'peaking', 'winding_down')),
  diversity_level TEXT DEFAULT 'high' CHECK (diversity_level IN ('low', 'medium', 'high')),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- TABLE: generated_playlists
-- Track generated playlists and user feedback
-- =============================================================================
CREATE TABLE IF NOT EXISTS generated_playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Context snapshot when generated (stored as JSONB)
  context_snapshot JSONB,
  
  -- Playlist data
  track_ids TEXT[] NOT NULL,
  total_tracks INTEGER NOT NULL,
  total_duration_ms INTEGER,
  
  -- Feedback
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  tracks_skipped TEXT[] DEFAULT '{}',
  tracks_loved TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  spotify_playlist_id TEXT,
  
  -- Foreign key-like behavior (not enforced for flexibility)
  CONSTRAINT fk_user_preferences FOREIGN KEY (user_id) REFERENCES user_preferences(user_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_playlists_user ON generated_playlists(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playlists_rating ON generated_playlists(user_id, user_rating DESC) WHERE user_rating IS NOT NULL;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Users can only see their own data
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE listening_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_playlists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own listening events" ON listening_events;
DROP POLICY IF EXISTS "Users can insert own listening events" ON listening_events;
DROP POLICY IF EXISTS "Users can update own listening events" ON listening_events;
DROP POLICY IF EXISTS "Users can delete own listening events" ON listening_events;

DROP POLICY IF EXISTS "Users can view own patterns" ON listening_patterns;
DROP POLICY IF EXISTS "Users can insert own patterns" ON listening_patterns;
DROP POLICY IF EXISTS "Users can update own patterns" ON listening_patterns;
DROP POLICY IF EXISTS "Users can delete own patterns" ON listening_patterns;

DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;

DROP POLICY IF EXISTS "Users can view own playlists" ON generated_playlists;
DROP POLICY IF EXISTS "Users can insert own playlists" ON generated_playlists;
DROP POLICY IF EXISTS "Users can update own playlists" ON generated_playlists;
DROP POLICY IF EXISTS "Users can delete own playlists" ON generated_playlists;

-- Policies for listening_events
CREATE POLICY "Users can view own listening events"
  ON listening_events FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own listening events"
  ON listening_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own listening events"
  ON listening_events FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own listening events"
  ON listening_events FOR DELETE
  USING (true);

-- Policies for listening_patterns
CREATE POLICY "Users can view own patterns"
  ON listening_patterns FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own patterns"
  ON listening_patterns FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own patterns"
  ON listening_patterns FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own patterns"
  ON listening_patterns FOR DELETE
  USING (true);

-- Policies for user_preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  USING (true);

-- Policies for generated_playlists
CREATE POLICY "Users can view own playlists"
  ON generated_playlists FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own playlists"
  ON generated_playlists FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own playlists"
  ON generated_playlists FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own playlists"
  ON generated_playlists FOR DELETE
  USING (true);

-- =============================================================================
-- FUNCTIONS
-- Helper functions for common queries
-- =============================================================================

-- Function to get listening events for a time range
CREATE OR REPLACE FUNCTION get_listening_events_range(
  p_user_id TEXT,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS SETOF listening_events AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM listening_events
  WHERE user_id = p_user_id
    AND played_at >= p_start_date
    AND played_at <= p_end_date
  ORDER BY played_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get patterns matching current context
CREATE OR REPLACE FUNCTION get_matching_patterns(
  p_user_id TEXT,
  p_time_of_day TEXT DEFAULT NULL,
  p_day_of_week TEXT DEFAULT NULL,
  p_weather TEXT DEFAULT NULL,
  p_activity TEXT DEFAULT NULL
)
RETURNS SETOF listening_patterns AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM listening_patterns
  WHERE user_id = p_user_id
    AND (p_time_of_day IS NULL OR time_of_day = p_time_of_day)
    AND (p_day_of_week IS NULL OR day_of_week = p_day_of_week)
    AND (p_weather IS NULL OR weather_condition = p_weather)
    AND (p_activity IS NULL OR activity_type = p_activity)
  ORDER BY confidence_score DESC, sample_size DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- DONE!
-- =============================================================================

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('listening_events', 'listening_patterns', 'user_preferences', 'generated_playlists');
