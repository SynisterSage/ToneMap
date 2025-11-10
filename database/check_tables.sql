-- Quick check to see what tables exist
-- Run this in Supabase SQL Editor

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('listening_events', 'listening_patterns', 'user_preferences', 'generated_playlists')
ORDER BY table_name;

-- If you see all 4 tables, you're good!
-- If not, you need to run the full schema.sql
