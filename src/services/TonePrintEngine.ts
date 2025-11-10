interface AudioFeatures {
  id: string;
  energy: number;
  valence: number;
  danceability: number;
  acousticness: number;
  instrumentalness: number;
  tempo: number;
  loudness: number;
  speechiness?: number;
}

export interface TonePrint {
  // Core distributions
  energyDistribution: {
    high: number; // 0-100 percentage
    medium: number;
    low: number;
  };
  moodProfile: {
    positive: number; // 0-100 percentage
    neutral: number;
    melancholic: number;
  };
  
  // Audio characteristics
  audioCharacteristics: {
    avgTempo: number;
    avgAcousticness: number; // 0-100
    avgInstrumentalness: number; // 0-100
    avgLoudness: number;
    avgDanceability: number; // 0-100
    avgEnergy: number; // 0-100
    avgValence: number; // 0-100
  };
  
  // NEW: Vibe categories (percentage of tracks fitting each vibe)
  vibeCategories: {
    workout: number; // High energy + high tempo + high danceability
    party: number; // High danceability + high valence + high energy
    chill: number; // Low energy + high acousticness
    focus: number; // High instrumentalness + medium energy
    emotional: number; // High valence variance + medium energy
    hype: number; // Very high energy + very high tempo
  };
  
  // NEW: Intensity score (0-100)
  intensityScore: number;
  
  // NEW: Mainstream vs Underground (0-100, higher = more mainstream)
  mainstreamScore: number;
  
  // NEW: Diversity score (0-100)
  diversityScore: number;
  
  // NEW: Consistency score (0-100, higher = more consistent taste)
  consistencyScore: number;
  
  // NEW: Vocal preference (0-100, higher = prefers vocals)
  vocalPreference: number;
  
  // Dominant characteristics
  dominantMood: 'positive' | 'neutral' | 'melancholic';
  dominantEnergy: 'high' | 'medium' | 'low';
  dominantVibe: 'workout' | 'party' | 'chill' | 'focus' | 'emotional' | 'hype';
  listeningPersona: string; // e.g., "Energetic Explorer", "Chill Curator"
  
  // Metadata
  trackCount: number;
  lastUpdated: string;
}

export function calculateTonePrint(audioFeatures: AudioFeatures[]): TonePrint {
  if (audioFeatures.length === 0) {
    return getEmptyTonePrint();
  }

  const trackCount = audioFeatures.length;

  // Extract arrays
  const energyLevels = audioFeatures.map(f => f.energy);
  const valenceLevels = audioFeatures.map(f => f.valence);
  const tempos = audioFeatures.map(f => f.tempo);
  const danceabilities = audioFeatures.map(f => f.danceability);
  const acousticnesses = audioFeatures.map(f => f.acousticness);
  const instrumentalnesses = audioFeatures.map(f => f.instrumentalness);
  const loudnesses = audioFeatures.map(f => f.loudness);

  // Calculate averages
  const avgEnergy = energyLevels.reduce((a, b) => a + b, 0) / trackCount;
  const avgValence = valenceLevels.reduce((a, b) => a + b, 0) / trackCount;
  const avgTempo = tempos.reduce((a, b) => a + b, 0) / trackCount;
  const avgDanceability = danceabilities.reduce((a, b) => a + b, 0) / trackCount;
  const avgAcousticness = acousticnesses.reduce((a, b) => a + b, 0) / trackCount;
  const avgInstrumentalness = instrumentalnesses.reduce((a, b) => a + b, 0) / trackCount;
  const avgLoudness = loudnesses.reduce((a, b) => a + b, 0) / trackCount;

  // Calculate standard deviations for consistency score
  const energyStdDev = calculateStdDev(energyLevels, avgEnergy);
  const valenceStdDev = calculateStdDev(valenceLevels, avgValence);
  const tempoStdDev = calculateStdDev(tempos, avgTempo);

  // Energy distribution
  const highEnergy = energyLevels.filter(e => e >= 0.7).length;
  const mediumEnergy = energyLevels.filter(e => e >= 0.4 && e < 0.7).length;
  const lowEnergy = energyLevels.filter(e => e < 0.4).length;

  // Mood profile (based on valence)
  const positive = valenceLevels.filter(v => v >= 0.6).length;
  const neutral = valenceLevels.filter(v => v >= 0.4 && v < 0.6).length;
  const melancholic = valenceLevels.filter(v => v < 0.4).length;

  // NEW: Calculate Vibe Categories
  const vibes = calculateVibeCategories(audioFeatures);
  
  // NEW: Calculate Intensity Score (0-100)
  const intensityScore = calculateIntensityScore(avgEnergy, avgTempo, avgLoudness);
  
  // NEW: Diversity score (variance across features)
  const diversityScore = calculateDiversityScore(energyStdDev, valenceStdDev, tempoStdDev);
  
  // NEW: Consistency score (inverse of diversity)
  const consistencyScore = 100 - diversityScore;
  
  // NEW: Mainstream score (would need popularity data, using placeholder)
  const mainstreamScore = 50; // TODO: Pass popularity data
  
  // NEW: Vocal preference (inverse of instrumentalness)
  const vocalPreference = Math.round((1 - avgInstrumentalness) * 100);

  // Determine dominant characteristics
  const dominantEnergy = avgEnergy >= 0.7 ? 'high' : avgEnergy >= 0.4 ? 'medium' : 'low';
  const dominantMood = avgValence >= 0.6 ? 'positive' : avgValence >= 0.4 ? 'neutral' : 'melancholic';
  const dominantVibe = getDominantVibe(vibes);
  const listeningPersona = generateListeningPersona(dominantVibe, dominantEnergy, diversityScore, mainstreamScore);

  return {
    energyDistribution: {
      high: Math.round((highEnergy / trackCount) * 100),
      medium: Math.round((mediumEnergy / trackCount) * 100),
      low: Math.round((lowEnergy / trackCount) * 100),
    },
    moodProfile: {
      positive: Math.round((positive / trackCount) * 100),
      neutral: Math.round((neutral / trackCount) * 100),
      melancholic: Math.round((melancholic / trackCount) * 100),
    },
    audioCharacteristics: {
      avgTempo: Math.round(avgTempo),
      avgAcousticness: Math.round(avgAcousticness * 100),
      avgInstrumentalness: Math.round(avgInstrumentalness * 100),
      avgLoudness: Math.round(avgLoudness),
      avgDanceability: Math.round(avgDanceability * 100),
      avgEnergy: Math.round(avgEnergy * 100),
      avgValence: Math.round(avgValence * 100),
    },
    vibeCategories: vibes,
    intensityScore,
    mainstreamScore,
    diversityScore,
    consistencyScore,
    vocalPreference,
    dominantMood,
    dominantEnergy,
    dominantVibe,
    listeningPersona,
    trackCount,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Calculate vibe categories percentages
 */
function calculateVibeCategories(audioFeatures: AudioFeatures[]) {
  const trackCount = audioFeatures.length;
  
  let workout = 0;
  let party = 0;
  let chill = 0;
  let focus = 0;
  let emotional = 0;
  let hype = 0;
  
  audioFeatures.forEach(f => {
    // Workout: High energy (>0.7) + high tempo (>120) + high danceability (>0.6)
    if (f.energy > 0.7 && f.tempo > 120 && f.danceability > 0.6) workout++;
    
    // Party: High danceability (>0.7) + high valence (>0.6) + medium-high energy (>0.6)
    if (f.danceability > 0.7 && f.valence > 0.6 && f.energy > 0.6) party++;
    
    // Chill: Low energy (<0.5) + high acousticness (>0.5)
    if (f.energy < 0.5 && f.acousticness > 0.5) chill++;
    
    // Focus: High instrumentalness (>0.6) + medium energy (0.3-0.6)
    if (f.instrumentalness > 0.6 && f.energy >= 0.3 && f.energy <= 0.6) focus++;
    
    // Emotional: Medium energy (0.4-0.7) + low danceability (<0.5)
    if (f.energy >= 0.4 && f.energy <= 0.7 && f.danceability < 0.5) emotional++;
    
    // Hype: Very high energy (>0.8) + very high tempo (>140) + high loudness (>-6)
    if (f.energy > 0.8 && f.tempo > 140 && f.loudness > -6) hype++;
  });
  
  return {
    workout: Math.round((workout / trackCount) * 100),
    party: Math.round((party / trackCount) * 100),
    chill: Math.round((chill / trackCount) * 100),
    focus: Math.round((focus / trackCount) * 100),
    emotional: Math.round((emotional / trackCount) * 100),
    hype: Math.round((hype / trackCount) * 100),
  };
}

/**
 * Calculate intensity score (0-100)
 * Combines energy + loudness + tempo
 */
function calculateIntensityScore(avgEnergy: number, avgTempo: number, avgLoudness: number): number {
  // Normalize tempo (assume range 60-180 BPM)
  const normalizedTempo = Math.min(Math.max((avgTempo - 60) / 120, 0), 1);
  
  // Normalize loudness (assume range -60 to 0 dB)
  const normalizedLoudness = Math.min(Math.max((avgLoudness + 60) / 60, 0), 1);
  
  // Weighted combination
  const intensity = (avgEnergy * 0.4) + (normalizedLoudness * 0.3) + (normalizedTempo * 0.3);
  
  return Math.round(intensity * 100);
}

/**
 * Calculate diversity score based on variance
 */
function calculateDiversityScore(energyStdDev: number, valenceStdDev: number, tempoStdDev: number): number {
  // Normalize standard deviations
  // Energy/valence: 0-1 range, so stddev max ~0.5
  // Tempo: 60-180 range, so stddev max ~60
  
  const normalizedEnergyVar = Math.min(energyStdDev / 0.5, 1);
  const normalizedValenceVar = Math.min(valenceStdDev / 0.5, 1);
  const normalizedTempoVar = Math.min(tempoStdDev / 60, 1);
  
  const diversity = (normalizedEnergyVar + normalizedValenceVar + normalizedTempoVar) / 3;
  
  return Math.round(diversity * 100);
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[], mean: number): number {
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Get dominant vibe
 */
function getDominantVibe(vibes: any): 'workout' | 'party' | 'chill' | 'focus' | 'emotional' | 'hype' {
  const entries = Object.entries(vibes) as [string, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return sorted[0][0] as any;
}

/**
 * Generate listening persona based on characteristics
 */
function generateListeningPersona(dominantVibe: string, dominantEnergy: string, diversityScore: number, mainstreamScore: number): string {
  const personas: Record<string, string[]> = {
    workout: ['Fitness Fanatic', 'Energy Enthusiast', 'Gym Warrior'],
    party: ['Party Animal', 'Celebration Curator', 'Dance Floor Devotee'],
    chill: ['Relaxation Expert', 'Zen Master', 'Peaceful Soul'],
    focus: ['Concentration King', 'Study Sage', 'Flow State Finder'],
    emotional: ['Deep Feeler', 'Introspective Explorer', 'Emotion Architect'],
    hype: ['Adrenaline Junkie', 'Intensity Seeker', 'Hype Machine'],
  };
  
  const diversityModifier = diversityScore > 70 ? ' Explorer' : diversityScore < 30 ? ' Specialist' : '';
  const basePersonas = personas[dominantVibe] || ['Music Lover'];
  const basePersona = basePersonas[Math.floor(Math.random() * basePersonas.length)];
  
  return basePersona + diversityModifier;
}

function getEmptyTonePrint(): TonePrint {
  return {
    energyDistribution: { high: 0, medium: 0, low: 0 },
    moodProfile: { positive: 0, neutral: 0, melancholic: 0 },
    audioCharacteristics: {
      avgTempo: 0,
      avgAcousticness: 0,
      avgInstrumentalness: 0,
      avgLoudness: 0,
      avgDanceability: 0,
      avgEnergy: 0,
      avgValence: 0,
    },
    vibeCategories: {
      workout: 0,
      party: 0,
      chill: 0,
      focus: 0,
      emotional: 0,
      hype: 0,
    },
    intensityScore: 0,
    mainstreamScore: 0,
    diversityScore: 0,
    consistencyScore: 0,
    vocalPreference: 0,
    dominantMood: 'neutral',
    dominantEnergy: 'medium',
    dominantVibe: 'chill',
    listeningPersona: 'Music Lover',
    trackCount: 0,
    lastUpdated: new Date().toISOString(),
  };
}

// Get mood emoji based on valence
export function getMoodEmoji(valence: number): string {
  if (valence >= 0.6) return '😊';
  if (valence >= 0.4) return '😐';
  return '😔';
}

// Get energy level label
export function getEnergyLevel(energy: number): string {
  if (energy >= 0.7) return 'High Energy';
  if (energy >= 0.4) return 'Medium Energy';
  return 'Low Energy';
}

// Get vibe emoji
export function getVibeEmoji(vibe: string): string {
  const emojis: Record<string, string> = {
    workout: '💪',
    party: '🎉',
    chill: '😌',
    focus: '🎯',
    emotional: '💙',
    hype: '🔥',
  };
  return emojis[vibe] || '🎵';
}
