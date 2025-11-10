-- Migration: Add Playlist Preferences to user_preferences table
-- Run this in Supabase SQL Editor if you already have the user_preferences table

-- Add new playlist preference columns
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS playlist_privacy TEXT DEFAULT 'private' CHECK (playlist_privacy IN ('private', 'public')),
ADD COLUMN IF NOT EXISTS playlist_collaborative BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_generate_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_generate_triggers JSONB DEFAULT '{"mood_shift": true, "genre_shift": true, "time_based": false, "weather_change": false}',
ADD COLUMN IF NOT EXISTS min_auto_interval_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS allow_explicit BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS discovery_mode BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS energy_arc_preference TEXT DEFAULT 'steady' CHECK (energy_arc_preference IN ('steady', 'building', 'peaking', 'winding_down')),
ADD COLUMN IF NOT EXISTS diversity_level TEXT DEFAULT 'high' CHECK (diversity_level IN ('low', 'medium', 'high'));

-- Update existing rows to have default values if needed
UPDATE user_preferences 
SET 
  playlist_privacy = COALESCE(playlist_privacy, 'private'),
  playlist_collaborative = COALESCE(playlist_collaborative, false),
  auto_generate_enabled = COALESCE(auto_generate_enabled, true),
  auto_generate_triggers = COALESCE(auto_generate_triggers, '{"mood_shift": true, "genre_shift": true, "time_based": false, "weather_change": false}'::JSONB),
  min_auto_interval_hours = COALESCE(min_auto_interval_hours, 24),
  allow_explicit = COALESCE(allow_explicit, true),
  discovery_mode = COALESCE(discovery_mode, true),
  energy_arc_preference = COALESCE(energy_arc_preference, 'steady'),
  diversity_level = COALESCE(diversity_level, 'high')
WHERE 
  playlist_privacy IS NULL 
  OR playlist_collaborative IS NULL 
  OR auto_generate_enabled IS NULL;

-- Verify the changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_preferences' 
  AND column_name LIKE '%playlist%' 
  OR column_name LIKE '%auto_generate%'
  OR column_name LIKE '%diversity%'
  OR column_name LIKE '%energy_arc%'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Playlist preferences migration completed successfully!';
END $$;
