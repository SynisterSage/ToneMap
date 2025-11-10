/**
 * Listening Event Types
 * Core data structures for tracking music listening history with context
 */

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type WeatherCondition = 'sunny' | 'partly_cloudy' | 'cloudy' | 'rainy' | 'snowy' | 'foggy' | 'stormy';
export type ActivityType = 'stationary' | 'walking' | 'running' | 'driving' | 'cycling';
export type UserMood = 'happy' | 'sad' | 'energetic' | 'calm' | 'stressed' | 'excited' | 'melancholic';

/**
 * Audio features from Spotify API
 */
export interface AudioFeatures {
  energy: number;           // 0-1
  valence: number;          // 0-1 (happiness/positivity)
  tempo: number;            // BPM
  danceability: number;     // 0-1
  acousticness: number;     // 0-1
  instrumentalness: number; // 0-1
  liveness: number;         // 0-1
  speechiness: number;      // 0-1
  loudness: number;         // dB
  mode: number;             // 0 (minor) or 1 (major)
  key: number;              // 0-11 (C, C#, D, etc.)
  time_signature: number;   // 3, 4, 5, etc.
}

/**
 * Context information for a listening event
 */
export interface ListeningContext {
  // Time context
  timeOfDay: TimeOfDay;
  dayOfWeek: DayOfWeek;
  
  // Weather context
  weatherCondition?: WeatherCondition;
  temperatureCelsius?: number;
  weatherDescription?: string;
  
  // Location context (optional)
  latitude?: number;
  longitude?: number;
  locationName?: string; // 'home', 'work', 'gym', or city name
  
  // Activity context
  activityType?: ActivityType;
  
  // User-provided context
  userTags?: string[];      // ['working', 'gym', 'relaxing']
  userMood?: UserMood;
}

/**
 * Track information
 */
export interface TrackInfo {
  id: string;
  name: string;
  artist: string;
  album?: string;
  durationMs: number;
  genres?: string[];
  imageUrl?: string;
  spotifyUrl?: string;
}

/**
 * Engagement metrics
 */
export interface EngagementMetrics {
  skipped: boolean;
  playDurationMs: number;
  completed: boolean;       // >70% played
  repeated: boolean;
  rating?: 1 | 2 | 3 | 4 | 5;
}

/**
 * Complete listening event
 */
export interface ListeningEvent {
  id: string;
  userId: string;
  
  // Track data
  track: TrackInfo;
  audioFeatures: AudioFeatures;
  
  // Context
  playedAt: Date;
  context: ListeningContext;
  
  // Engagement
  engagement: EngagementMetrics;
  
  // Metadata
  createdAt: Date;
  syncedAt: Date;
}

/**
 * Database row format (snake_case for Postgres)
 */
export interface ListeningEventRow {
  id: string;
  user_id: string;
  
  // Track
  track_id: string;
  track_name: string;
  artist_name: string;
  album_name?: string;
  duration_ms: number;
  genres?: string[];
  image_url?: string;
  spotify_url?: string;
  
  // Audio features
  energy: number;
  valence: number;
  tempo: number;
  danceability: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  speechiness: number;
  loudness: number;
  mode: number;
  key: number;
  time_signature: number;
  
  // Context
  played_at: string;
  time_of_day: string;
  day_of_week: string;
  weather_condition?: string;
  temperature_celsius?: number;
  weather_description?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  activity_type?: string;
  user_tags?: string[];
  user_mood?: string;
  
  // Engagement
  skipped: boolean;
  play_duration_ms: number;
  completed: boolean;
  repeated: boolean;
  rating?: number;
  
  // Metadata
  created_at: string;
  synced_at: string;
}

/**
 * Helper to convert DB row to ListeningEvent
 */
export function rowToListeningEvent(row: ListeningEventRow): ListeningEvent {
  return {
    id: row.id,
    userId: row.user_id,
    track: {
      id: row.track_id,
      name: row.track_name,
      artist: row.artist_name,
      album: row.album_name,
      durationMs: row.duration_ms,
      genres: row.genres,
      imageUrl: row.image_url,
      spotifyUrl: row.spotify_url,
    },
    audioFeatures: {
      energy: row.energy,
      valence: row.valence,
      tempo: row.tempo,
      danceability: row.danceability,
      acousticness: row.acousticness,
      instrumentalness: row.instrumentalness,
      liveness: row.liveness,
      speechiness: row.speechiness,
      loudness: row.loudness,
      mode: row.mode,
      key: row.key,
      time_signature: row.time_signature,
    },
    playedAt: new Date(row.played_at),
    context: {
      timeOfDay: row.time_of_day as TimeOfDay,
      dayOfWeek: row.day_of_week as DayOfWeek,
      weatherCondition: row.weather_condition as WeatherCondition | undefined,
      temperatureCelsius: row.temperature_celsius,
      weatherDescription: row.weather_description,
      latitude: row.latitude,
      longitude: row.longitude,
      locationName: row.location_name,
      activityType: row.activity_type as ActivityType | undefined,
      userTags: row.user_tags,
      userMood: row.user_mood as UserMood | undefined,
    },
    engagement: {
      skipped: row.skipped,
      playDurationMs: row.play_duration_ms,
      completed: row.completed,
      repeated: row.repeated,
      rating: row.rating as 1 | 2 | 3 | 4 | 5 | undefined,
    },
    createdAt: new Date(row.created_at),
    syncedAt: new Date(row.synced_at),
  };
}

/**
 * Helper to convert ListeningEvent to DB row
 */
export function listeningEventToRow(event: ListeningEvent): Omit<ListeningEventRow, 'id' | 'created_at'> {
  return {
    user_id: event.userId,
    track_id: event.track.id,
    track_name: event.track.name,
    artist_name: event.track.artist,
    album_name: event.track.album,
    duration_ms: event.track.durationMs,
    genres: event.track.genres,
    image_url: event.track.imageUrl,
    spotify_url: event.track.spotifyUrl,
    energy: event.audioFeatures.energy,
    valence: event.audioFeatures.valence,
    tempo: event.audioFeatures.tempo,
    danceability: event.audioFeatures.danceability,
    acousticness: event.audioFeatures.acousticness,
    instrumentalness: event.audioFeatures.instrumentalness,
    liveness: event.audioFeatures.liveness,
    speechiness: event.audioFeatures.speechiness,
    loudness: event.audioFeatures.loudness,
    mode: event.audioFeatures.mode,
    key: event.audioFeatures.key,
    time_signature: event.audioFeatures.time_signature,
    played_at: event.playedAt.toISOString(),
    time_of_day: event.context.timeOfDay,
    day_of_week: event.context.dayOfWeek,
    weather_condition: event.context.weatherCondition,
    temperature_celsius: event.context.temperatureCelsius,
    weather_description: event.context.weatherDescription,
    latitude: event.context.latitude,
    longitude: event.context.longitude,
    location_name: event.context.locationName,
    activity_type: event.context.activityType,
    user_tags: event.context.userTags,
    user_mood: event.context.userMood,
    skipped: event.engagement.skipped,
    play_duration_ms: event.engagement.playDurationMs,
    completed: event.engagement.completed,
    repeated: event.engagement.repeated,
    rating: event.engagement.rating,
    synced_at: event.syncedAt.toISOString(),
  };
}
