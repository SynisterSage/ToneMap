/**
 * GenreAnalyzer - Intelligent audio feature estimation from genre + metadata
 * 
 * Analyzes Spotify track metadata (genres, popularity, duration) to estimate
 * audio features without requiring the deprecated /audio-features endpoint.
 */

interface AudioFeatures {
  energy: number; // 0-1
  valence: number; // 0-1 (negative to positive mood)
  danceability: number; // 0-1
  tempo: number; // BPM
  acousticness: number; // 0-1
  instrumentalness: number; // 0-1
  loudness: number; // -60 to 0 dB
  speechiness: number; // 0-1
  liveness: number; // 0-1
}

interface TrackMetadata {
  genres: string[]; // Artist genres
  popularity: number; // 0-100
  duration_ms: number;
  explicit: boolean;
  artistPopularity?: number;
  releaseYear?: number;
}

/**
 * Comprehensive genre-to-features mapping
 * Based on Spotify's genre taxonomy and audio characteristics research
 */
const GENRE_PROFILES: Record<string, Partial<AudioFeatures>> = {
  // Electronic / Dance
  'edm': { energy: 0.85, valence: 0.75, danceability: 0.90, tempo: 128, acousticness: 0.05, instrumentalness: 0.70 },
  'house': { energy: 0.80, valence: 0.70, danceability: 0.85, tempo: 125, acousticness: 0.05, instrumentalness: 0.75 },
  'techno': { energy: 0.85, valence: 0.60, danceability: 0.88, tempo: 130, acousticness: 0.03, instrumentalness: 0.80 },
  'dubstep': { energy: 0.90, valence: 0.55, danceability: 0.75, tempo: 140, acousticness: 0.05, instrumentalness: 0.70 },
  'trance': { energy: 0.80, valence: 0.65, danceability: 0.80, tempo: 138, acousticness: 0.05, instrumentalness: 0.85 },
  'electro': { energy: 0.85, valence: 0.70, danceability: 0.85, tempo: 128, acousticness: 0.05, instrumentalness: 0.75 },
  'drum and bass': { energy: 0.90, valence: 0.65, danceability: 0.80, tempo: 174, acousticness: 0.05, instrumentalness: 0.75 },
  'dnb': { energy: 0.90, valence: 0.65, danceability: 0.80, tempo: 174, acousticness: 0.05, instrumentalness: 0.75 },
  'trap': { energy: 0.75, valence: 0.50, danceability: 0.80, tempo: 140, acousticness: 0.10, instrumentalness: 0.50 },
  'future bass': { energy: 0.75, valence: 0.70, danceability: 0.75, tempo: 150, acousticness: 0.10, instrumentalness: 0.60 },
  'bass': { energy: 0.80, valence: 0.60, danceability: 0.80, tempo: 140, acousticness: 0.10, instrumentalness: 0.65 },
  
  // Hip Hop / Rap
  'hip hop': { energy: 0.70, valence: 0.55, danceability: 0.75, tempo: 95, acousticness: 0.15, instrumentalness: 0.20, speechiness: 0.40 },
  'rap': { energy: 0.70, valence: 0.55, danceability: 0.75, tempo: 95, acousticness: 0.15, instrumentalness: 0.15, speechiness: 0.45 },
  'drill': { energy: 0.75, valence: 0.45, danceability: 0.70, tempo: 140, acousticness: 0.10, instrumentalness: 0.20, speechiness: 0.40 },
  
  // Pop
  'pop': { energy: 0.65, valence: 0.70, danceability: 0.70, tempo: 120, acousticness: 0.20, instrumentalness: 0.05, speechiness: 0.10 },
  'dance pop': { energy: 0.75, valence: 0.75, danceability: 0.85, tempo: 125, acousticness: 0.15, instrumentalness: 0.10 },
  'electropop': { energy: 0.70, valence: 0.70, danceability: 0.80, tempo: 122, acousticness: 0.15, instrumentalness: 0.20 },
  'indie pop': { energy: 0.60, valence: 0.65, danceability: 0.60, tempo: 115, acousticness: 0.35, instrumentalness: 0.10 },
  'synth-pop': { energy: 0.65, valence: 0.68, danceability: 0.75, tempo: 118, acousticness: 0.10, instrumentalness: 0.30 },
  'art pop': { energy: 0.55, valence: 0.60, danceability: 0.55, tempo: 110, acousticness: 0.25, instrumentalness: 0.20 },
  
  // Rock
  'rock': { energy: 0.75, valence: 0.60, danceability: 0.50, tempo: 125, acousticness: 0.15, instrumentalness: 0.30, loudness: -5 },
  'alternative': { energy: 0.70, valence: 0.55, danceability: 0.55, tempo: 120, acousticness: 0.20, instrumentalness: 0.25 },
  'indie': { energy: 0.60, valence: 0.60, danceability: 0.55, tempo: 115, acousticness: 0.35, instrumentalness: 0.20 },
  'indie rock': { energy: 0.65, valence: 0.58, danceability: 0.55, tempo: 118, acousticness: 0.30, instrumentalness: 0.25 },
  'punk': { energy: 0.85, valence: 0.55, danceability: 0.60, tempo: 160, acousticness: 0.10, instrumentalness: 0.20, loudness: -4 },
  'metal': { energy: 0.90, valence: 0.45, danceability: 0.45, tempo: 140, acousticness: 0.05, instrumentalness: 0.40, loudness: -3 },
  'hard rock': { energy: 0.85, valence: 0.50, danceability: 0.50, tempo: 130, acousticness: 0.10, instrumentalness: 0.35, loudness: -4 },
  'classic rock': { energy: 0.70, valence: 0.60, danceability: 0.55, tempo: 120, acousticness: 0.15, instrumentalness: 0.35 },
  
  // R&B / Soul
  'r&b': { energy: 0.55, valence: 0.60, danceability: 0.70, tempo: 90, acousticness: 0.25, instrumentalness: 0.10, speechiness: 0.15 },
  'soul': { energy: 0.60, valence: 0.65, danceability: 0.65, tempo: 95, acousticness: 0.30, instrumentalness: 0.15, liveness: 0.25 },
  'neo soul': { energy: 0.55, valence: 0.60, danceability: 0.65, tempo: 88, acousticness: 0.35, instrumentalness: 0.15 },
  'funk': { energy: 0.75, valence: 0.75, danceability: 0.85, tempo: 110, acousticness: 0.20, instrumentalness: 0.30 },
  
  // Jazz / Blues
  'jazz': { energy: 0.45, valence: 0.55, danceability: 0.50, tempo: 120, acousticness: 0.60, instrumentalness: 0.70, liveness: 0.35 },
  'blues': { energy: 0.50, valence: 0.45, danceability: 0.45, tempo: 95, acousticness: 0.55, instrumentalness: 0.50, liveness: 0.30 },
  'smooth jazz': { energy: 0.40, valence: 0.60, danceability: 0.40, tempo: 100, acousticness: 0.50, instrumentalness: 0.75 },
  
  // Folk / Acoustic
  'folk': { energy: 0.45, valence: 0.55, danceability: 0.40, tempo: 100, acousticness: 0.80, instrumentalness: 0.30 },
  'acoustic': { energy: 0.40, valence: 0.55, danceability: 0.35, tempo: 95, acousticness: 0.85, instrumentalness: 0.25 },
  'singer-songwriter': { energy: 0.40, valence: 0.50, danceability: 0.35, tempo: 90, acousticness: 0.75, instrumentalness: 0.20 },
  'americana': { energy: 0.50, valence: 0.55, danceability: 0.45, tempo: 105, acousticness: 0.70, instrumentalness: 0.30 },
  
  // Country
  'country': { energy: 0.55, valence: 0.65, danceability: 0.55, tempo: 115, acousticness: 0.50, instrumentalness: 0.20 },
  'contemporary country': { energy: 0.60, valence: 0.70, danceability: 0.60, tempo: 120, acousticness: 0.40, instrumentalness: 0.15 },
  
  // Latin
  'latin': { energy: 0.70, valence: 0.75, danceability: 0.80, tempo: 110, acousticness: 0.25, instrumentalness: 0.20 },
  'reggaeton': { energy: 0.75, valence: 0.70, danceability: 0.85, tempo: 95, acousticness: 0.15, instrumentalness: 0.20 },
  'salsa': { energy: 0.75, valence: 0.80, danceability: 0.85, tempo: 180, acousticness: 0.30, instrumentalness: 0.40, liveness: 0.30 },
  'bachata': { energy: 0.60, valence: 0.65, danceability: 0.75, tempo: 125, acousticness: 0.35, instrumentalness: 0.30 },
  
  // Classical / Instrumental
  'classical': { energy: 0.35, valence: 0.50, danceability: 0.20, tempo: 100, acousticness: 0.90, instrumentalness: 0.95, liveness: 0.40 },
  'orchestra': { energy: 0.40, valence: 0.55, danceability: 0.25, tempo: 110, acousticness: 0.85, instrumentalness: 0.95 },
  'piano': { energy: 0.30, valence: 0.50, danceability: 0.20, tempo: 90, acousticness: 0.90, instrumentalness: 0.95 },
  'instrumental': { energy: 0.45, valence: 0.55, danceability: 0.35, tempo: 105, acousticness: 0.60, instrumentalness: 0.90 },
  
  // Ambient / Chill
  'ambient': { energy: 0.25, valence: 0.50, danceability: 0.25, tempo: 80, acousticness: 0.50, instrumentalness: 0.90 },
  'chillout': { energy: 0.35, valence: 0.60, danceability: 0.40, tempo: 90, acousticness: 0.40, instrumentalness: 0.70 },
  'lo-fi': { energy: 0.40, valence: 0.55, danceability: 0.45, tempo: 85, acousticness: 0.35, instrumentalness: 0.75 },
  'downtempo': { energy: 0.40, valence: 0.55, danceability: 0.50, tempo: 95, acousticness: 0.35, instrumentalness: 0.65 },
  
  // Reggae / Ska
  'reggae': { energy: 0.55, valence: 0.70, danceability: 0.70, tempo: 80, acousticness: 0.35, instrumentalness: 0.25 },
  'ska': { energy: 0.70, valence: 0.75, danceability: 0.75, tempo: 160, acousticness: 0.25, instrumentalness: 0.30 },
  'dub': { energy: 0.50, valence: 0.60, danceability: 0.65, tempo: 75, acousticness: 0.20, instrumentalness: 0.60 },
  
  // World Music
  'world': { energy: 0.55, valence: 0.60, danceability: 0.60, tempo: 110, acousticness: 0.50, instrumentalness: 0.40 },
  'afrobeat': { energy: 0.75, valence: 0.75, danceability: 0.85, tempo: 115, acousticness: 0.30, instrumentalness: 0.35 },
  'k-pop': { energy: 0.75, valence: 0.75, danceability: 0.80, tempo: 130, acousticness: 0.15, instrumentalness: 0.10 },
  'j-pop': { energy: 0.70, valence: 0.75, danceability: 0.75, tempo: 125, acousticness: 0.20, instrumentalness: 0.15 },
  
  // Additional Electronic Subgenres
  'progressive house': { energy: 0.78, valence: 0.68, danceability: 0.82, tempo: 128, acousticness: 0.05, instrumentalness: 0.80 },
  'deep house': { energy: 0.65, valence: 0.65, danceability: 0.80, tempo: 122, acousticness: 0.08, instrumentalness: 0.70 },
  'tech house': { energy: 0.80, valence: 0.60, danceability: 0.85, tempo: 125, acousticness: 0.05, instrumentalness: 0.75 },
  'minimal': { energy: 0.60, valence: 0.50, danceability: 0.70, tempo: 125, acousticness: 0.05, instrumentalness: 0.85 },
  'hardstyle': { energy: 0.95, valence: 0.65, danceability: 0.80, tempo: 150, acousticness: 0.03, instrumentalness: 0.70 },
  'jungle': { energy: 0.88, valence: 0.60, danceability: 0.78, tempo: 170, acousticness: 0.05, instrumentalness: 0.70 },
  'breakbeat': { energy: 0.75, valence: 0.60, danceability: 0.75, tempo: 135, acousticness: 0.10, instrumentalness: 0.60 },
  'garage': { energy: 0.70, valence: 0.65, danceability: 0.80, tempo: 130, acousticness: 0.10, instrumentalness: 0.50 },
  'uk garage': { energy: 0.72, valence: 0.65, danceability: 0.82, tempo: 130, acousticness: 0.10, instrumentalness: 0.45 },
  'grime': { energy: 0.80, valence: 0.50, danceability: 0.75, tempo: 140, acousticness: 0.08, instrumentalness: 0.30, speechiness: 0.35 },
  'vaporwave': { energy: 0.40, valence: 0.50, danceability: 0.45, tempo: 95, acousticness: 0.15, instrumentalness: 0.80 },
  'synthwave': { energy: 0.70, valence: 0.65, danceability: 0.70, tempo: 115, acousticness: 0.05, instrumentalness: 0.75 },
  'wave': { energy: 0.65, valence: 0.55, danceability: 0.65, tempo: 140, acousticness: 0.10, instrumentalness: 0.60 },
  
  // More Hip Hop Subgenres
  'boom bap': { energy: 0.65, valence: 0.55, danceability: 0.70, tempo: 90, acousticness: 0.15, instrumentalness: 0.25, speechiness: 0.40 },
  'trap metal': { energy: 0.90, valence: 0.40, danceability: 0.65, tempo: 145, acousticness: 0.05, instrumentalness: 0.20, speechiness: 0.40 },
  'cloud rap': { energy: 0.55, valence: 0.50, danceability: 0.65, tempo: 70, acousticness: 0.15, instrumentalness: 0.30, speechiness: 0.35 },
  'phonk': { energy: 0.75, valence: 0.45, danceability: 0.75, tempo: 140, acousticness: 0.10, instrumentalness: 0.40, speechiness: 0.25 },
  
  // More Rock Subgenres
  'post-rock': { energy: 0.65, valence: 0.50, danceability: 0.40, tempo: 115, acousticness: 0.25, instrumentalness: 0.70 },
  'post-punk': { energy: 0.70, valence: 0.45, danceability: 0.55, tempo: 125, acousticness: 0.15, instrumentalness: 0.30 },
  'shoegaze': { energy: 0.60, valence: 0.45, danceability: 0.40, tempo: 110, acousticness: 0.20, instrumentalness: 0.50 },
  'emo': { energy: 0.75, valence: 0.35, danceability: 0.50, tempo: 140, acousticness: 0.15, instrumentalness: 0.20 },
  'screamo': { energy: 0.90, valence: 0.35, danceability: 0.45, tempo: 160, acousticness: 0.05, instrumentalness: 0.15, speechiness: 0.30 },
  'grunge': { energy: 0.75, valence: 0.40, danceability: 0.45, tempo: 115, acousticness: 0.20, instrumentalness: 0.30 },
  'stoner rock': { energy: 0.70, valence: 0.50, danceability: 0.45, tempo: 100, acousticness: 0.15, instrumentalness: 0.45 },
  'doom metal': { energy: 0.75, valence: 0.30, danceability: 0.35, tempo: 75, acousticness: 0.05, instrumentalness: 0.50, loudness: -3 },
  'black metal': { energy: 0.95, valence: 0.25, danceability: 0.35, tempo: 180, acousticness: 0.05, instrumentalness: 0.45, loudness: -2 },
  'death metal': { energy: 0.95, valence: 0.30, danceability: 0.40, tempo: 170, acousticness: 0.05, instrumentalness: 0.40, loudness: -2 },
  'prog rock': { energy: 0.65, valence: 0.55, danceability: 0.40, tempo: 120, acousticness: 0.20, instrumentalness: 0.55 },
  'math rock': { energy: 0.70, valence: 0.55, danceability: 0.40, tempo: 145, acousticness: 0.15, instrumentalness: 0.60 },
  
  // Indie Subgenres
  'indie folk': { energy: 0.45, valence: 0.55, danceability: 0.40, tempo: 100, acousticness: 0.75, instrumentalness: 0.30 },
  'indie electronic': { energy: 0.65, valence: 0.65, danceability: 0.70, tempo: 120, acousticness: 0.15, instrumentalness: 0.40 },
  'bedroom pop': { energy: 0.50, valence: 0.60, danceability: 0.55, tempo: 105, acousticness: 0.40, instrumentalness: 0.25 },
  'dream pop': { energy: 0.50, valence: 0.60, danceability: 0.45, tempo: 100, acousticness: 0.30, instrumentalness: 0.35 },
  
  // Latin Subgenres
  'cumbia': { energy: 0.70, valence: 0.75, danceability: 0.85, tempo: 100, acousticness: 0.30, instrumentalness: 0.40 },
  'merengue': { energy: 0.80, valence: 0.85, danceability: 0.90, tempo: 130, acousticness: 0.25, instrumentalness: 0.35 },
  'bossa nova': { energy: 0.40, valence: 0.70, danceability: 0.55, tempo: 85, acousticness: 0.70, instrumentalness: 0.40 },
  'samba': { energy: 0.75, valence: 0.80, danceability: 0.85, tempo: 180, acousticness: 0.35, instrumentalness: 0.45, liveness: 0.35 },
  'tango': { energy: 0.60, valence: 0.50, danceability: 0.75, tempo: 120, acousticness: 0.45, instrumentalness: 0.50 },
  'latin trap': { energy: 0.75, valence: 0.65, danceability: 0.85, tempo: 95, acousticness: 0.10, instrumentalness: 0.20, speechiness: 0.35 },
  
  // More Pop Subgenres
  'bubblegum pop': { energy: 0.75, valence: 0.85, danceability: 0.80, tempo: 128, acousticness: 0.10, instrumentalness: 0.05 },
  'hyperpop': { energy: 0.85, valence: 0.75, danceability: 0.80, tempo: 150, acousticness: 0.05, instrumentalness: 0.15 },
  'power pop': { energy: 0.80, valence: 0.75, danceability: 0.70, tempo: 140, acousticness: 0.15, instrumentalness: 0.20 },
  
  // Mood/Vibe Genres
  'sad': { energy: 0.35, valence: 0.25, danceability: 0.35, tempo: 85, acousticness: 0.55, instrumentalness: 0.30 },
  'chill': { energy: 0.35, valence: 0.60, danceability: 0.45, tempo: 90, acousticness: 0.40, instrumentalness: 0.60 },
  'party': { energy: 0.85, valence: 0.80, danceability: 0.90, tempo: 128, acousticness: 0.10, instrumentalness: 0.20 },
  'workout': { energy: 0.90, valence: 0.70, danceability: 0.85, tempo: 135, acousticness: 0.05, instrumentalness: 0.30 },
  'study': { energy: 0.30, valence: 0.55, danceability: 0.30, tempo: 90, acousticness: 0.50, instrumentalness: 0.85 },
  'sleep': { energy: 0.20, valence: 0.50, danceability: 0.20, tempo: 70, acousticness: 0.60, instrumentalness: 0.90 },
  
  // More Electronic
  'glitch': { energy: 0.65, valence: 0.50, danceability: 0.60, tempo: 130, acousticness: 0.05, instrumentalness: 0.85 },
  'idm': { energy: 0.60, valence: 0.50, danceability: 0.50, tempo: 125, acousticness: 0.10, instrumentalness: 0.90 },
  'trip hop': { energy: 0.50, valence: 0.45, danceability: 0.60, tempo: 95, acousticness: 0.20, instrumentalness: 0.60 },
  'big beat': { energy: 0.85, valence: 0.70, danceability: 0.80, tempo: 135, acousticness: 0.05, instrumentalness: 0.50 },
  
  // More Alternative
  'post-hardcore': { energy: 0.85, valence: 0.45, danceability: 0.50, tempo: 155, acousticness: 0.10, instrumentalness: 0.25 },
  'metalcore': { energy: 0.90, valence: 0.40, danceability: 0.45, tempo: 160, acousticness: 0.05, instrumentalness: 0.30, loudness: -3 },
  'nu metal': { energy: 0.85, valence: 0.45, danceability: 0.55, tempo: 135, acousticness: 0.10, instrumentalness: 0.25 },
};

/**
 * Default audio features for unknown genres
 */
const DEFAULT_FEATURES: AudioFeatures = {
  energy: 0.60,
  valence: 0.60,
  danceability: 0.60,
  tempo: 120,
  acousticness: 0.30,
  instrumentalness: 0.30,
  loudness: -8,
  speechiness: 0.10,
  liveness: 0.15,
};

/**
 * Analyze track metadata to estimate audio features
 */
export function analyzeTrackFeatures(metadata: TrackMetadata): AudioFeatures {
  // Start with default features
  let features = { ...DEFAULT_FEATURES };
  
  // If no genres, use adjusted defaults based on popularity
  if (!metadata.genres || metadata.genres.length === 0) {
    features = adjustForPopularity(features, metadata.popularity);
    features = adjustForDuration(features, metadata.duration_ms);
    features = adjustForReleaseYear(features, metadata.releaseYear);
    features = adjustForExplicit(features, metadata.explicit);
    return clampFeatures(features);
  }
  
  // Find matching genre profiles
  const matchedProfiles: Partial<AudioFeatures>[] = [];
  
  for (const genre of metadata.genres) {
    const genreLower = genre.toLowerCase();
    
    // Exact match
    if (GENRE_PROFILES[genreLower]) {
      matchedProfiles.push(GENRE_PROFILES[genreLower]);
      continue;
    }
    
    // Partial match (e.g., "indie rock" contains "indie" or "rock")
    for (const [profileGenre, profile] of Object.entries(GENRE_PROFILES)) {
      if (genreLower.includes(profileGenre) || profileGenre.includes(genreLower)) {
        matchedProfiles.push(profile);
        break;
      }
    }
  }
  
  // Average matched profiles
  if (matchedProfiles.length > 0) {
    features = averageFeatures(matchedProfiles);
  }
  
  // Apply all metadata adjustments IN ORDER
  features = adjustForDuration(features, metadata.duration_ms);
  features = adjustForPopularity(features, metadata.popularity);
  features = adjustForReleaseYear(features, metadata.releaseYear);
  features = adjustForExplicit(features, metadata.explicit);
  
  // Apply intelligent improvements
  features = improveEnergy(features);
  features = improveValence(features, metadata.genres);
  features = improveDanceability(features);
  
  // Ensure all values are in valid ranges
  features = clampFeatures(features);
  
  return features;
}

/**
 * Average multiple feature profiles
 */
function averageFeatures(profiles: Partial<AudioFeatures>[]): AudioFeatures {
  const result = { ...DEFAULT_FEATURES };
  
  const keys = Object.keys(result) as (keyof AudioFeatures)[];
  
  for (const key of keys) {
    const values = profiles
      .map(p => p[key])
      .filter(v => v !== undefined) as number[];
    
    if (values.length > 0) {
      result[key] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }
  
  return result;
}

/**
 * Adjust features based on track popularity
 * More popular tracks tend to be more danceable and energetic
 */
function adjustForPopularity(features: AudioFeatures, popularity: number): AudioFeatures {
  const popularityFactor = popularity / 100;
  
  // Popular tracks tend toward "sweet spot" tempos (115-130 BPM)
  let tempoAdjustment = 0;
  if (popularity > 80) {
    const targetTempo = 122; // Sweet spot for mainstream appeal
    const currentDiff = features.tempo - targetTempo;
    tempoAdjustment = -currentDiff * 0.15; // Move 15% toward sweet spot
  }
  
  // Very popular tracks boost danceability significantly
  const danceBoost = popularity > 80 ? 0.15 : (popularityFactor - 0.5) * 0.15;
  
  return {
    ...features,
    tempo: features.tempo + tempoAdjustment,
    danceability: Math.min(features.danceability + danceBoost, 0.95),
    energy: features.energy + (popularityFactor - 0.5) * 0.10,
    valence: features.valence + (popularityFactor - 0.5) * 0.08,
  };
}

/**
 * Adjust features based on track duration
 * Longer tracks tend to be less danceable, more instrumental, slower tempo
 */
function adjustForDuration(features: AudioFeatures, duration_ms: number): AudioFeatures {
  const durationMinutes = duration_ms / 60000;
  
  if (durationMinutes > 6) {
    // Very long tracks (>6 min) - progressive/epic/ambient
    return {
      ...features,
      tempo: features.tempo - 8, // Slower, more progressive
      danceability: features.danceability * 0.75,
      instrumentalness: Math.min(features.instrumentalness * 1.4, 0.95),
      energy: features.energy * 0.90,
      valence: features.valence * 0.95, // Slightly more serious/introspective
    };
  } else if (durationMinutes > 5) {
    // Long tracks (5-6 min) - likely instrumental/album tracks
    return {
      ...features,
      tempo: features.tempo - 5,
      danceability: features.danceability * 0.85,
      instrumentalness: Math.min(features.instrumentalness * 1.3, 0.95),
      energy: features.energy * 0.95,
    };
  } else if (durationMinutes < 2.5) {
    // Short tracks (<2.5 min) - likely pop/punk/energetic/radio edit
    return {
      ...features,
      tempo: features.tempo + 10, // Faster, more punchy
      energy: Math.min(features.energy * 1.15, 0.95),
      danceability: Math.min(features.danceability * 1.1, 0.95),
      valence: features.valence + 0.05, // Slightly more upbeat
    };
  }
  
  return features;
}

/**
 * Adjust features for explicit content
 * Explicit tracks tend to have more speechiness and higher energy in certain genres
 */
function adjustForExplicit(features: AudioFeatures, explicit: boolean): AudioFeatures {
  if (explicit) {
    return {
      ...features,
      speechiness: Math.min(features.speechiness * 1.3, 0.66),
      energy: Math.min(features.energy + 0.05, 1.0), // Slightly higher energy
    };
  }
  return features;
}

/**
 * Adjust features based on release year (era-based characteristics)
 */
function adjustForReleaseYear(features: AudioFeatures, releaseYear?: number): AudioFeatures {
  if (!releaseYear || releaseYear < 1960 || releaseYear > 2025) {
    return features;
  }
  
  let tempoAdjustment = 0;
  let valenceAdjustment = 0;
  let energyAdjustment = 0;
  
  if (releaseYear >= 1960 && releaseYear < 1980) {
    // 60s-70s: Generally slower, more positive, lower energy
    tempoAdjustment = -8;
    valenceAdjustment = 0.08;
    energyAdjustment = -0.05;
  } else if (releaseYear >= 1980 && releaseYear < 1990) {
    // 80s: Moderate tempo, high energy (synths!)
    tempoAdjustment = 0;
    energyAdjustment = 0.08;
    valenceAdjustment = 0.05;
  } else if (releaseYear >= 1990 && releaseYear < 2000) {
    // 90s: Faster tempo, grunge/alternative = lower valence
    tempoAdjustment = 5;
    valenceAdjustment = -0.08;
  } else if (releaseYear >= 2000 && releaseYear < 2010) {
    // 00s: Fast tempo, high energy
    tempoAdjustment = 8;
    energyAdjustment = 0.05;
  } else if (releaseYear >= 2010 && releaseYear < 2020) {
    // 10s: Trap influence = specific tempo (140-150), varied energy
    tempoAdjustment = 10;
  } else if (releaseYear >= 2020) {
    // 20s: TikTok influence = upbeat, danceable
    valenceAdjustment = 0.10;
    features.danceability = Math.min(features.danceability + 0.08, 0.95);
  }
  
  return {
    ...features,
    tempo: features.tempo + tempoAdjustment,
    valence: clamp(features.valence + valenceAdjustment, 0, 1),
    energy: clamp(features.energy + energyAdjustment, 0, 1),
  };
}

/**
 * Improve energy based on tempo and loudness relationship
 */
function improveEnergy(features: AudioFeatures): AudioFeatures {
  let energyBoost = 0;
  
  // Very fast tempo correlates with higher energy
  if (features.tempo > 160) {
    energyBoost += 0.15;
  } else if (features.tempo > 140) {
    energyBoost += 0.08;
  }
  
  // Very slow tempo correlates with lower energy
  if (features.tempo < 80) {
    energyBoost -= 0.15;
  } else if (features.tempo < 95) {
    energyBoost -= 0.08;
  }
  
  // Loudness correlation (normalized from -60 to 0 dB)
  const normalizedLoudness = (features.loudness + 60) / 60; // 0 to 1
  if (normalizedLoudness > 0.8) {
    energyBoost += 0.12;
  } else if (normalizedLoudness < 0.3) {
    energyBoost -= 0.10;
  }
  
  return {
    ...features,
    energy: clamp(features.energy + energyBoost, 0, 1),
  };
}

/**
 * Improve valence with minor/major key inference
 */
function improveValence(features: AudioFeatures, genres: string[]): AudioFeatures {
  let valenceAdjustment = 0;
  
  // Check for mood-indicating genres
  const genresLower = genres.map(g => g.toLowerCase());
  
  // Likely minor key / sad genres
  const sadGenres = ['emo', 'goth', 'doom', 'sad', 'melancholic', 'dark', 'post-punk', 'shoegaze'];
  const hasSadGenre = genresLower.some(g => sadGenres.some(sad => g.includes(sad)));
  if (hasSadGenre) valenceAdjustment -= 0.20;
  
  // Likely major key / happy genres  
  const happyGenres = ['happy', 'upbeat', 'party', 'dance', 'funk', 'disco', 'tropical'];
  const hasHappyGenre = genresLower.some(g => happyGenres.some(happy => g.includes(happy)));
  if (hasHappyGenre) valenceAdjustment += 0.20;
  
  // High acousticness often = introspective (except "happy acoustic")
  if (features.acousticness > 0.7 && !hasHappyGenre) {
    valenceAdjustment -= 0.10;
  }
  
  // Very high instrumentalness = more neutral
  if (features.instrumentalness > 0.7) {
    // Push toward neutral (0.5)
    const distanceFromNeutral = features.valence - 0.5;
    valenceAdjustment -= distanceFromNeutral * 0.3;
  }
  
  return {
    ...features,
    valence: clamp(features.valence + valenceAdjustment, 0, 1),
  };
}

/**
 * Improve danceability based on tempo sweet spots
 */
function improveDanceability(features: AudioFeatures): AudioFeatures {
  let danceAdjustment = 0;
  
  // Tempo sweet spot for danceability: 115-135 BPM
  if (features.tempo >= 115 && features.tempo <= 135) {
    danceAdjustment += 0.12;
  } else if (features.tempo < 90 || features.tempo > 160) {
    danceAdjustment -= 0.15;
  }
  
  // Very long tracks are less danceable (club tracks are typically 3-5 min)
  // This is handled in adjustForDuration, so we don't double-adjust
  
  return {
    ...features,
    danceability: clamp(features.danceability + danceAdjustment, 0, 1),
  };
}

/**
 * Ensure all features are within valid ranges
 */
function clampFeatures(features: AudioFeatures): AudioFeatures {
  return {
    energy: clamp(features.energy, 0, 1),
    valence: clamp(features.valence, 0, 1),
    danceability: clamp(features.danceability, 0, 1),
    tempo: clamp(features.tempo, 40, 200),
    acousticness: clamp(features.acousticness, 0, 1),
    instrumentalness: clamp(features.instrumentalness, 0, 1),
    loudness: clamp(features.loudness, -60, 0),
    speechiness: clamp(features.speechiness, 0, 1),
    liveness: clamp(features.liveness, 0, 1),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Add variance to features to avoid identical results
 * Adds realistic randomness (±5-10% variation)
 */
export function addRealisticVariance(features: AudioFeatures): AudioFeatures {
  const variance = (base: number, range: number) => {
    const randomOffset = (Math.random() - 0.5) * range;
    return base + randomOffset;
  };
  
  return {
    energy: clamp(variance(features.energy, 0.10), 0, 1),
    valence: clamp(variance(features.valence, 0.12), 0, 1),
    danceability: clamp(variance(features.danceability, 0.10), 0, 1),
    tempo: clamp(variance(features.tempo, 10), 40, 200),
    acousticness: clamp(variance(features.acousticness, 0.08), 0, 1),
    instrumentalness: clamp(variance(features.instrumentalness, 0.08), 0, 1),
    loudness: clamp(variance(features.loudness, 3), -60, 0),
    speechiness: clamp(variance(features.speechiness, 0.05), 0, 1),
    liveness: clamp(variance(features.liveness, 0.10), 0, 1),
  };
}
