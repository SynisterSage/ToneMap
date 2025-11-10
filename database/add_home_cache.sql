-- Migration: Add home_cache to user_preferences
-- Date: 2025-11-10
-- Description: Add JSONB column to store cached home screen data

-- Add home_cache column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS home_cache JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.home_cache IS 
'Cached data for home screen including quick_stats, top_tracks, toneprint_summary, and last_sync timestamp';

-- Example structure:
-- {
--   "quick_stats": {
--     "total_tracks": 127,
--     "total_hours": 45,
--     "unique_genres": 12,
--     "unique_moods": 8,
--     "cached_at": "2025-11-10T12:00:00Z"
--   },
--   "top_tracks": {
--     "tracks": [
--       {
--         "id": "spotify_track_id",
--         "name": "Track Name",
--         "artist": "Artist Name",
--         "album_art": "url",
--         "play_count": 25
--       }
--     ],
--     "cached_at": "2025-11-10T11:30:00Z"
--   },
--   "toneprint_summary": {
--     "avg_energy": 0.75,
--     "avg_valence": 0.60,
--     "avg_tempo": 125,
--     "top_genres": ["pop", "rock", "electronic"],
--     "cached_at": "2025-11-10T12:00:00Z"
--   },
--   "last_sync": "2025-11-10T12:05:00Z"
-- }

-- Create an index on home_cache for faster queries (optional, for JSONB queries)
CREATE INDEX IF NOT EXISTS idx_user_preferences_home_cache 
ON user_preferences USING gin (home_cache);

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_preferences' 
  AND column_name = 'home_cache';
