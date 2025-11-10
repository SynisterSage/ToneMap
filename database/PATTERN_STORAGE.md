# Pattern Storage Strategy

## Problem
The `listening_patterns` table has a unique constraint on:
```sql
UNIQUE(user_id, context_type, time_of_day, day_of_week, weather_condition, activity_type)
```

This means NULL values matter! Two rows with different NULL combinations are considered different.

## Solution
Each pattern type ONLY sets its relevant field(s) to non-NULL, and explicitly sets others to NULL:

### Time-of-Day Patterns
```typescript
context_type: 'time'
time_of_day: 'morning' | 'afternoon' | 'evening' | 'night'
day_of_week: null
weather_condition: null
activity_type: null
```

### Day-of-Week Patterns
```typescript
context_type: 'time'
time_of_day: null
day_of_week: 'monday' | 'tuesday' | ... | 'sunday'
weather_condition: null
activity_type: null
```

### Weather Patterns
```typescript
context_type: 'weather'
time_of_day: null
day_of_week: null
weather_condition: 'sunny' | 'rainy' | 'cloudy' | etc.
activity_type: null
```

### Activity Patterns
```typescript
context_type: 'activity'
time_of_day: null
day_of_week: null
weather_condition: null
activity_type: 'walking' | 'running' | 'stationary' | etc.
```

### Combined Patterns (Future)
```typescript
context_type: 'combined'
time_of_day: 'morning'
day_of_week: 'friday'
weather_condition: 'sunny'
activity_type: 'walking'
// Could have any combination of the above
```

## Why This Matters
Without explicit NULL assignment:
- Pattern for "morning" might accidentally have `day_of_week='monday'` from a previous calculation
- This creates a pattern for "(morning + monday + null weather + null activity)"
- But we want separate patterns: "(morning only)" and "(monday only)"
- The UNIQUE constraint sees these as different rows

## Cleanup
If you have existing bad data, run:
```bash
psql your_database < database/cleanup_patterns.sql
```
