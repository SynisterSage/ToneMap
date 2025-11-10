-- Clean up duplicate patterns that might have conflicting NULL values
-- Run this once to fix existing data

-- Delete patterns where context_type='time' but time_of_day is NULL
DELETE FROM listening_patterns 
WHERE context_type = 'time' AND time_of_day IS NULL;

-- Delete patterns where context_type='time' but day_of_week is NOT NULL (should be day patterns)
DELETE FROM listening_patterns 
WHERE context_type = 'time' AND day_of_week IS NOT NULL AND time_of_day IS NOT NULL;

-- Delete patterns where context_type='weather' but weather_condition is NULL
DELETE FROM listening_patterns 
WHERE context_type = 'weather' AND weather_condition IS NULL;

-- Delete patterns where context_type='activity' but activity_type is NULL
DELETE FROM listening_patterns 
WHERE context_type = 'activity' AND activity_type IS NULL;

-- Show remaining patterns
SELECT 
  context_type,
  time_of_day,
  day_of_week,
  weather_condition,
  activity_type,
  sample_size,
  confidence_score
FROM listening_patterns
ORDER BY context_type, time_of_day, day_of_week, weather_condition, activity_type;
