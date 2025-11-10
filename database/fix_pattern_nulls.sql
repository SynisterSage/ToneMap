-- Fix Pattern Analysis NULL Values
-- Run this in Supabase SQL Editor to clean up conflicting patterns

-- Step 1: Check existing patterns with NULL issues
SELECT 
  id,
  user_id,
  context_type,
  time_of_day,
  day_of_week,
  weather_condition,
  activity_type,
  sample_size,
  last_updated
FROM listening_patterns
ORDER BY user_id, context_type, last_updated DESC;

-- Step 2: Delete duplicate patterns (keeping the most recent)
-- This handles cases where patterns have conflicting NULL values
WITH ranked_patterns AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        user_id, 
        context_type, 
        COALESCE(time_of_day, 'NULL'),
        COALESCE(day_of_week, 'NULL'),
        COALESCE(weather_condition, 'NULL'),
        COALESCE(activity_type, 'NULL')
      ORDER BY last_updated DESC
    ) as rn
  FROM listening_patterns
)
DELETE FROM listening_patterns
WHERE id IN (
  SELECT id FROM ranked_patterns WHERE rn > 1
);

-- Step 3: Verify no duplicates remain
SELECT 
  user_id,
  context_type,
  COALESCE(time_of_day, 'NULL') as time_of_day,
  COALESCE(day_of_week, 'NULL') as day_of_week,
  COALESCE(weather_condition, 'NULL') as weather_condition,
  COALESCE(activity_type, 'NULL') as activity_type,
  COUNT(*) as count
FROM listening_patterns
GROUP BY 
  user_id, 
  context_type, 
  time_of_day,
  day_of_week,
  weather_condition,
  activity_type
HAVING COUNT(*) > 1;

-- Step 4: Add a comment to document the unique constraint behavior
COMMENT ON CONSTRAINT listening_patterns_user_id_context_type_time_of_day_day_of_week_key 
ON listening_patterns IS 
'Ensures one pattern per unique context signature. NULL values ARE considered distinct in this constraint.';

-- Step 5: Create a helper view for easier pattern querying
CREATE OR REPLACE VIEW pattern_summary AS
SELECT 
  user_id,
  context_type,
  time_of_day,
  day_of_week,
  weather_condition,
  activity_type,
  sample_size,
  confidence_score,
  avg_energy,
  avg_valence,
  avg_tempo,
  last_updated,
  -- Create a readable description
  CASE 
    WHEN time_of_day IS NOT NULL AND day_of_week IS NULL AND weather_condition IS NULL AND activity_type IS NULL 
      THEN time_of_day || ' time pattern'
    WHEN time_of_day IS NULL AND day_of_week IS NOT NULL AND weather_condition IS NULL AND activity_type IS NULL 
      THEN day_of_week || ' pattern'
    WHEN time_of_day IS NULL AND day_of_week IS NULL AND weather_condition IS NOT NULL AND activity_type IS NULL 
      THEN weather_condition || ' weather pattern'
    WHEN time_of_day IS NULL AND day_of_week IS NULL AND weather_condition IS NULL AND activity_type IS NOT NULL 
      THEN activity_type || ' activity pattern'
    ELSE 'combined pattern'
  END as pattern_description
FROM listening_patterns
ORDER BY user_id, confidence_score DESC, last_updated DESC;

-- Step 6: Show patterns grouped by type for verification
SELECT 
  user_id,
  context_type,
  COUNT(*) as total_patterns,
  SUM(CASE WHEN time_of_day IS NOT NULL THEN 1 ELSE 0 END) as time_patterns,
  SUM(CASE WHEN day_of_week IS NOT NULL THEN 1 ELSE 0 END) as day_patterns,
  SUM(CASE WHEN weather_condition IS NOT NULL THEN 1 ELSE 0 END) as weather_patterns,
  SUM(CASE WHEN activity_type IS NOT NULL THEN 1 ELSE 0 END) as activity_patterns
FROM listening_patterns
GROUP BY user_id, context_type
ORDER BY user_id, context_type;
