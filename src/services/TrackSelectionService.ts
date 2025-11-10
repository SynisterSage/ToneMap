/**
 * Track Selection Service - Phase 1 Enhanced
 * Advanced multi-layered AI algorithms for intelligent track selection
 * 
 * Scoring Algorithm:
 * - Context Matching: 40%
 * - Audio Feature Similarity: 25%
 * - Engagement Score: 20%
 * - Recency & Freshness: 10%
 * - Genre Diversity: 5%
 */

import {getSupabaseClient} from './database/supabase';
import {FirebaseAuthService} from './FirebaseAuthService';
import type {
  PlaylistFilters,
  TrackWithFeatures,
  EnergyArcShape,
  PlaylistTemplate,
} from '../types/playlists';

interface TrackScore {
  track: TrackWithFeatures;
  score: number;
  breakdown: {
    context_match: number;
    audio_similarity: number;
    engagement: number;
    recency: number;
    diversity: number;
  };
}

interface ContextWeights {
  energy: number;
  valence: number;
  tempo: number;
  danceability: number;
  acousticness: number;
  instrumentalness: number;
}

interface GenreCluster {
  name: string;
  genres: string[];
}

class TrackSelectionServiceClass {
  // Genre clustering for intelligent diversity
  private readonly genreClusters: GenreCluster[] = [
    {
      name: 'indie',
      genres: ['indie', 'indie rock', 'indie pop', 'indie folk', 'alternative', 'alt rock'],
    },
    {
      name: 'electronic',
      genres: ['electronic', 'edm', 'house', 'techno', 'ambient', 'synth', 'electro', 'dubstep'],
    },
    {
      name: 'rock',
      genres: ['rock', 'classic rock', 'hard rock', 'punk', 'punk rock', 'garage rock'],
    },
    {
      name: 'hip-hop',
      genres: ['hip hop', 'rap', 'trap', 'hip-hop', 'r&b', 'rnb'],
    },
    {
      name: 'pop',
      genres: ['pop', 'dance pop', 'synth pop', 'k-pop', 'j-pop'],
    },
    {
      name: 'folk',
      genres: ['folk', 'americana', 'singer-songwriter', 'acoustic'],
    },
    {
      name: 'metal',
      genres: ['metal', 'heavy metal', 'death metal', 'metalcore', 'thrash'],
    },
    {
      name: 'jazz',
      genres: ['jazz', 'smooth jazz', 'jazz fusion', 'bebop'],
    },
    {
      name: 'classical',
      genres: ['classical', 'orchestral', 'baroque', 'romantic'],
    },
    {
      name: 'soul',
      genres: ['soul', 'funk', 'motown', 'neo soul', 'neo-soul'],
    },
  ];

  /**
   * Select tracks based on filters and pattern matching
   */
  async selectTracksFromPattern(
    patternId: string,
    limit: number = 25,
    filters?: PlaylistFilters,
  ): Promise<TrackWithFeatures[]> {
    const userId = FirebaseAuthService.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const supabase = getSupabaseClient();

    // Get the pattern details
    const {data: pattern, error: patternError} = await (supabase as any)
      .from('listening_patterns')
      .select('*')
      .eq('id', patternId)
      .single();

    if (patternError || !pattern) {
      throw new Error('Pattern not found');
    }

    console.log('[TrackSelection] 🎯 Selecting tracks for pattern:', pattern.context_type);

    // Build query to fetch candidate tracks from listening_events
    let query = (supabase as any)
      .from('listening_events')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', true)  // Only tracks they listened to completion
      .order('played_at', {ascending: false})
      .limit(500); // Get a large pool to work with

    // Apply pattern context filters
    if (pattern.time_of_day) {
      query = query.eq('time_of_day', pattern.time_of_day);
    }
    if (pattern.day_of_week) {
      query = query.eq('day_of_week', pattern.day_of_week);
    }
    if (pattern.weather_condition) {
      query = query.eq('weather_condition', pattern.weather_condition);
    }
    if (pattern.activity_type) {
      query = query.eq('activity_type', pattern.activity_type);
    }

    const {data: tracks, error: tracksError} = await query;

    if (tracksError || !tracks || tracks.length === 0) {
      console.warn('[TrackSelection] No tracks found for pattern, using general tracks');
      return this.selectTracksCustom(filters || {}, limit);
    }

    console.log('[TrackSelection] 📚 Found', tracks.length, 'candidate tracks');

    // Convert to TrackWithFeatures format
    const candidateTracks = this.convertToTrackWithFeatures(tracks);

    // Apply additional filters if provided
    const filteredTracks = this.applyFilters(candidateTracks, filters);

    // Apply blacklists
    const safeTracksQuery = await this.applyBlacklists(filteredTracks, userId);

    // Score and rank tracks
    const scoredTracks = this.scoreTracksForPattern(safeTracksQuery, pattern);

    // Select top tracks with diversity
    const selectedTracks = this.diversifySelection(scoredTracks, limit, 'high');

    console.log('[TrackSelection] ✅ Selected', selectedTracks.length, 'tracks');

    return selectedTracks;
  }

  /**
   * Select tracks based on custom filters
   */
  async selectTracksCustom(
    filters: PlaylistFilters,
    limit: number = 25,
  ): Promise<TrackWithFeatures[]> {
    const userId = FirebaseAuthService.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const supabase = getSupabaseClient();

    console.log('[TrackSelection] 🎨 Custom selection with filters:', filters);

    // Check if we have audio feature filters (prefer audio over context)
    const hasAudioFilters = !!(
      filters.energy_range ||
      filters.valence_range ||
      filters.tempo_range ||
      filters.acousticness_range ||
      filters.instrumentalness_range
    );

    // If we have audio filters, get a broader set and filter by audio features
    // Context filters become preferences, not requirements
    let query = (supabase as any)
      .from('listening_events')
      .select('*')
      .eq('user_id', userId)
      .order('played_at', {ascending: false})
      .limit(hasAudioFilters ? 2000 : 1000); // Get more if we're filtering by audio

    // Only apply strict context filters if we DON'T have audio filters
    if (!hasAudioFilters) {
      if (filters.time_of_day && filters.time_of_day.length > 0) {
        query = query.in('time_of_day', filters.time_of_day);
      }
      if (filters.weather_condition && filters.weather_condition.length > 0) {
        query = query.in('weather_condition', filters.weather_condition);
      }
      if (filters.activity_type && filters.activity_type.length > 0) {
        query = query.in('activity_type', filters.activity_type);
      }
    }

    const {data: tracks, error} = await query;

    if (error) {
      console.error('[TrackSelection] ❌ Database error:', error);
      throw new Error('Database error fetching tracks');
    }

    if (!tracks || tracks.length === 0) {
      throw new Error('No tracks found in listening history. Please listen to more music on Spotify!');
    }

    console.log('[TrackSelection] 📚 Found', tracks.length, 'candidate tracks from history');

    const candidateTracks = this.convertToTrackWithFeatures(tracks);
    
    // Apply audio feature filters
    let filteredTracks = this.applyFilters(candidateTracks, filters);
    console.log('[TrackSelection] 🎯 After audio filtering:', filteredTracks.length, 'tracks');

    // SAFETY NET: If filtering removed everything, use unfiltered tracks
    if (filteredTracks.length === 0) {
      console.warn('[TrackSelection] ⚠️ Filters too strict! Using unfiltered tracks as fallback');
      filteredTracks = candidateTracks.slice(0, Math.min(candidateTracks.length, limit * 3));
      
      if (filteredTracks.length === 0) {
        throw new Error(
          `No tracks found in listening history. Please listen to more music on Spotify!`
        );
      }
    }

    const safeTracks = await this.applyBlacklists(filteredTracks, userId);
    console.log('[TrackSelection] ✅ After blacklist filtering:', safeTracks.length, 'tracks');

    // Score tracks based on engagement and recency
    const scoredTracks = this.scoreTracksCustom(safeTracks);

    // Select with diversity
    const selectedTracks = this.diversifySelection(scoredTracks, limit, 'high');

    console.log('[TrackSelection] ✨ Final selection:', selectedTracks.length, 'tracks');

    return selectedTracks;
  }

  /**
   * Select tracks for current context (Right Now feature)
   */
  async selectTracksForCurrentContext(limit: number = 25): Promise<TrackWithFeatures[]> {
    // Get current context
    const now = new Date();
    const hour = now.getHours();
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';

    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    console.log('[TrackSelection] 🌟 Selecting for current context:', timeOfDay);

    // Find best matching pattern for current context
    const userId = FirebaseAuthService.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const supabase = getSupabaseClient();
    const {data: patterns} = await (supabase as any)
      .from('listening_patterns')
      .select('*')
      .eq('user_id', userId)
      .eq('time_of_day', timeOfDay)
      .order('confidence_score', {ascending: false})
      .limit(1);

    if (patterns && patterns.length > 0) {
      console.log('[TrackSelection] ✅ Found pattern for', timeOfDay);
      return this.selectTracksFromPattern(patterns[0].id, limit);
    }

    // No pattern found - use very broad filters based on time
    console.log('[TrackSelection] ⚠️ No pattern found, using broad time-based selection');
    
    const timeBasedFilters: any = {};
    
    // Set energy based on time of day (but keep ranges wide)
    if (timeOfDay === 'morning') {
      timeBasedFilters.energy_range = [0.4, 1.0];  // Moderate to high
    } else if (timeOfDay === 'afternoon') {
      timeBasedFilters.energy_range = [0.3, 0.9];  // Wide range
    } else if (timeOfDay === 'evening') {
      timeBasedFilters.energy_range = [0.2, 0.8];  // Lower energy
    } else { // night
      timeBasedFilters.energy_range = [0.1, 0.7];  // Calm
    }
    
    // Very wide valence and tempo - accept almost anything
    timeBasedFilters.valence_range = [0.2, 1.0];
    timeBasedFilters.tempo_range = [60, 180];
    
    return this.selectTracksCustom(timeBasedFilters, limit);
  }

  /**
   * Score tracks using advanced multi-layer algorithm
   */
  private scoreTracksForPattern(
    tracks: TrackWithFeatures[],
    pattern: any,
    context?: {template?: PlaylistTemplate; timeOfDay?: string; weather?: string; activity?: string},
  ): TrackScore[] {
    // Get context-specific feature weights
    const featureWeights = this.getContextFeatureWeights(context);
    
    return tracks.map(track => {
      // LAYER 1: Context Matching (40%)
      const contextMatch = this.calculateContextMatch(pattern, track, featureWeights);

      // LAYER 2: Audio Feature Similarity (25%)
      const audioSimilarity = this.calculateAudioFeatureSimilarity(track, pattern, featureWeights);

      // LAYER 3: Engagement Score (20%)
      const engagement = this.calculateEngagementScore(track);

      // LAYER 4: Recency & Freshness (10%)
      const recency = track.last_played ? this.calculateRecencyScore(track.last_played) : 0.5;

      // LAYER 5: Genre Diversity (5%) - calculated separately
      const diversity = 1; // Base score, adjusted in diversifySelection

      // Weighted total score
      const score =
        contextMatch * 0.40 +
        audioSimilarity * 0.25 +
        engagement * 0.20 +
        recency * 0.10 +
        diversity * 0.05;

      return {
        track,
        score,
        breakdown: {
          context_match: contextMatch,
          audio_similarity: audioSimilarity,
          engagement,
          recency,
          diversity,
        },
      };
    });
  }

  /**
   * Get context-specific audio feature weights
   */
  private getContextFeatureWeights(context?: {
    template?: PlaylistTemplate;
    timeOfDay?: string;
    weather?: string;
    activity?: string;
  }): ContextWeights {
    // Default weights
    let weights: ContextWeights = {
      energy: 0.2,
      valence: 0.2,
      tempo: 0.15,
      danceability: 0.15,
      acousticness: 0.15,
      instrumentalness: 0.15,
    };

    if (!context) return weights;

    // Time-based weight adjustments
    switch (context.timeOfDay) {
      case 'morning':
        weights.energy = 0.3;      // Prioritize energy
        weights.valence = 0.3;     // Uplifting mood
        weights.tempo = 0.2;
        break;
      case 'afternoon':
        weights.energy = 0.2;
        weights.danceability = 0.25;
        weights.tempo = 0.2;
        break;
      case 'evening':
        weights.acousticness = 0.3; // More acoustic
        weights.valence = 0.25;     // Mood important
        weights.energy = 0.15;      // Lower energy
        break;
      case 'night':
        weights.acousticness = 0.35;
        weights.energy = 0.1;       // Very low energy
        weights.valence = 0.2;
        break;
    }

    // Activity-based adjustments
    switch (context.activity) {
      case 'running':
      case 'cycling':
        weights.energy = 0.35;
        weights.tempo = 0.35;       // High tempo critical
        weights.danceability = 0.2;
        break;
      case 'walking':
        weights.tempo = 0.25;
        weights.energy = 0.25;
        break;
      case 'stationary':
        weights.acousticness = 0.25;
        weights.instrumentalness = 0.25; // Focus music
        break;
    }

    // Weather-based adjustments
    switch (context.weather) {
      case 'rainy':
      case 'cloudy':
        weights.acousticness = 0.3;
        weights.valence = 0.25;
        weights.energy = 0.15;
        break;
      case 'sunny':
        weights.energy = 0.3;
        weights.valence = 0.3;
        break;
      case 'stormy':
        weights.energy = 0.25;
        weights.instrumentalness = 0.25;
        break;
    }

    // Template-specific overrides
    switch (context.template) {
      case 'focus_flow':
        weights.instrumentalness = 0.4;
        weights.energy = 0.3;
        weights.acousticness = 0.2;
        break;
      case 'workout':
        weights.energy = 0.4;
        weights.tempo = 0.4;
        weights.danceability = 0.2;
        break;
      case 'evening_winddown':
        weights.acousticness = 0.35;
        weights.energy = 0.1;
        weights.valence = 0.25;
        break;
    }

    return weights;
  }

  /**
   * Calculate context match score with pattern confidence
   */
  private calculateContextMatch(pattern: any, track: TrackWithFeatures, weights: ContextWeights): number {
    if (!pattern) return 0.5;

    let matchScore = 0;

    // Audio feature matching with dynamic weights
    if (track.energy !== undefined && pattern.avg_energy !== undefined) {
      matchScore += (1 - Math.abs(track.energy - pattern.avg_energy)) * weights.energy;
    }
    if (track.valence !== undefined && pattern.avg_valence !== undefined) {
      matchScore += (1 - Math.abs(track.valence - pattern.avg_valence)) * weights.valence;
    }
    if (track.tempo !== undefined && pattern.avg_tempo !== undefined) {
      const tempoMatch = 1 - Math.min(Math.abs(track.tempo - pattern.avg_tempo) / 200, 1);
      matchScore += tempoMatch * weights.tempo;
    }
    if (track.danceability !== undefined && pattern.avg_danceability !== undefined) {
      matchScore += (1 - Math.abs(track.danceability - pattern.avg_danceability)) * weights.danceability;
    }
    if (track.acousticness !== undefined && pattern.avg_acousticness !== undefined) {
      matchScore += (1 - Math.abs(track.acousticness - pattern.avg_acousticness)) * weights.acousticness;
    }
    if (track.instrumentalness !== undefined && pattern.avg_instrumentalness !== undefined) {
      matchScore += (1 - Math.abs(track.instrumentalness - pattern.avg_instrumentalness)) * weights.instrumentalness;
    }

    // Weight by pattern confidence and sample size
    const confidenceMultiplier = (pattern.confidence_score || 0.5) * Math.min(pattern.sample_size / 50, 1);
    
    return matchScore * confidenceMultiplier;
  }

  /**
   * Calculate audio feature similarity score
   */
  private calculateAudioFeatureSimilarity(
    track: TrackWithFeatures,
    pattern: any,
    weights: ContextWeights,
  ): number {
    // Multi-dimensional feature space similarity
    let similarity = 0;
    let totalWeight = 0;

    const features: Array<{track: number | undefined; pattern: number | undefined; weight: number}> = [
      {track: track.energy, pattern: pattern.avg_energy, weight: weights.energy},
      {track: track.valence, pattern: pattern.avg_valence, weight: weights.valence},
      {track: track.danceability, pattern: pattern.avg_danceability, weight: weights.danceability},
      {track: track.acousticness, pattern: pattern.avg_acousticness, weight: weights.acousticness},
      {track: track.instrumentalness, pattern: pattern.avg_instrumentalness, weight: weights.instrumentalness},
    ];

    for (const feature of features) {
      if (feature.track !== undefined && feature.pattern !== undefined) {
        similarity += (1 - Math.abs(feature.track - feature.pattern)) * feature.weight;
        totalWeight += feature.weight;
      }
    }

    // Tempo similarity (normalized differently)
    if (track.tempo !== undefined && pattern.avg_tempo !== undefined) {
      const tempoSimilarity = 1 - Math.min(Math.abs(track.tempo - pattern.avg_tempo) / 200, 1);
      similarity += tempoSimilarity * weights.tempo;
      totalWeight += weights.tempo;
    }

    return totalWeight > 0 ? similarity / totalWeight : 0.5;
  }

  /**
   * Score tracks for custom selection (no pattern)
   */
  private scoreTracksCustom(tracks: TrackWithFeatures[]): TrackScore[] {
    return tracks.map(track => {
      const recency = track.last_played ? this.calculateRecencyScore(track.last_played) : 0.5;
      const engagement = this.calculateEngagementScore(track);
      const popularity = (track.popularity || 50) / 100;

      // For custom selection, weight engagement and popularity higher
      const audioSimilarity = popularity; // Use popularity as proxy
      const contextMatch = 0.5; // Neutral when no pattern

      const score = 
        contextMatch * 0.20 +
        audioSimilarity * 0.25 +
        engagement * 0.35 +
        recency * 0.15 +
        1 * 0.05; // diversity base

      return {
        track,
        score,
        breakdown: {
          context_match: contextMatch,
          audio_similarity: audioSimilarity,
          engagement,
          recency,
          diversity: 1,
        },
      };
    });
  }

  /**
   * Calculate recency score with optimal freshness balance
   * Sweet spot: Recently played but not too repetitive
   */
  private calculateRecencyScore(lastPlayed: string): number {
    const daysSincePlay = (Date.now() - new Date(lastPlayed).getTime()) / (1000 * 60 * 60 * 24);
    
    // Optimized recency curve
    // 0-3 days: 0.6-0.7 (too recent, avoid repetition)
    // 3-7 days: 0.7-0.9 (optimal freshness)
    // 7-30 days: 0.9-1.0 (sweet spot - familiar but fresh)
    // 30-90 days: 0.8-0.7 (nostalgic rediscovery)
    // 90+ days: 0.5-0.3 (too old unless highly rated)
    
    if (daysSincePlay <= 3) {
      // Too recent - slight penalty to avoid repetition
      return 0.6 + (daysSincePlay / 3) * 0.1;
    } else if (daysSincePlay <= 7) {
      // Optimal freshness window
      return 0.7 + ((daysSincePlay - 3) / 4) * 0.2;
    } else if (daysSincePlay <= 30) {
      // Sweet spot - best balance
      return 0.9 + ((daysSincePlay - 7) / 23) * 0.1;
    } else if (daysSincePlay <= 90) {
      // Nostalgic rediscovery zone
      return 0.8 - ((daysSincePlay - 30) / 60) * 0.1;
    } else {
      // Old tracks - significant decay
      return Math.max(0.2, 0.7 - ((daysSincePlay - 90) / 365) * 0.5);
    }
  }

  /**
   * Calculate engagement score with temporal weighting
   * Recent engagement matters more than old engagement
   */
  private calculateEngagementScore(track: TrackWithFeatures): number {
    let baseEngagement = 0.5;

    // Build engagement from available data
    if (track.completion_rate !== undefined) {
      baseEngagement = track.completion_rate * 0.4;
    }
    if (track.skip_rate !== undefined) {
      baseEngagement += (1 - track.skip_rate) * 0.3;
    }
    if (track.play_count !== undefined && track.play_count > 0) {
      // Normalize play count (1-10 plays = 0-0.2 bonus)
      baseEngagement += Math.min(track.play_count / 50, 0.2);
    }
    
    // Popularity as fallback/baseline
    const popularityScore = (track.popularity || 50) / 100;
    baseEngagement = Math.max(baseEngagement, popularityScore * 0.1);

    // Apply temporal decay if we know when it was last played
    if (track.last_played) {
      const daysSincePlay = (Date.now() - new Date(track.last_played).getTime()) / (1000 * 60 * 60 * 24);
      
      // Recent engagement is more reliable
      // 0-30 days: 1.0x (full weight)
      // 30-90 days: 0.85x
      // 90-180 days: 0.7x
      // 180+ days: 0.5x (engagement may have changed)
      let temporalWeight = 1.0;
      if (daysSincePlay > 180) {
        temporalWeight = 0.5;
      } else if (daysSincePlay > 90) {
        temporalWeight = 0.7;
      } else if (daysSincePlay > 30) {
        temporalWeight = 0.85;
      }
      
      baseEngagement *= temporalWeight;
    }

    return Math.min(1.0, Math.max(0.1, baseEngagement));
  }

  /**
   * Diversify selection with intelligent genre clustering and artist variety
   */
  private diversifySelection(
    scoredTracks: TrackScore[],
    limit: number,
    diversityLevel: 'low' | 'medium' | 'high',
  ): TrackWithFeatures[] {
    // Sort by score first
    const sorted = [...scoredTracks].sort((a, b) => b.score - a.score);
    
    // Penalize tracks played in the last 2 hours (avoid repetition across playlists)
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
    const withRecencyPenalty = sorted.map(item => {
      if (item.track.last_played) {
        const lastPlayed = new Date(item.track.last_played).getTime();
        if (lastPlayed > twoHoursAgo) {
          // Recently played - reduce score by 50%
          return {...item, score: item.score * 0.5};
        }
      }
      return item;
    }).sort((a, b) => b.score - a.score); // Re-sort after penalty

    // Set limits based on diversity level
    const maxPerArtist = diversityLevel === 'high' ? 2 : diversityLevel === 'medium' ? 3 : 4;
    const maxPerGenreCluster = diversityLevel === 'high' ? Math.ceil(limit * 0.4) : 
                                diversityLevel === 'medium' ? Math.ceil(limit * 0.5) : 
                                Math.ceil(limit * 0.7);

    const selected: TrackWithFeatures[] = [];
    const artistCount: {[artist: string]: number} = {};
    const genreClusterCount: {[cluster: string]: number} = {};

    for (const {track} of withRecencyPenalty) {
      if (selected.length >= limit) break;

      const artistKey = track.artist_id || track.artist;
      const currentArtistCount = artistCount[artistKey] || 0;

      // Check artist limit
      if (currentArtistCount >= maxPerArtist) {
        continue;
      }

      // Check genre cluster diversity
      const trackGenreCluster = this.getGenreCluster(track.genres || []);
      const currentClusterCount = genreClusterCount[trackGenreCluster] || 0;

      if (diversityLevel === 'high' && currentClusterCount >= maxPerGenreCluster) {
        // For high diversity, strictly enforce genre cluster limits
        continue;
      }

      // Add track
      selected.push(track);
      artistCount[artistKey] = currentArtistCount + 1;
      genreClusterCount[trackGenreCluster] = currentClusterCount + 1;
    }

    // If we don't have enough tracks, relax constraints and fill
    if (selected.length < Math.floor(limit * 0.8)) {
      for (const {track} of sorted) {
        if (selected.length >= limit) break;
        if (!selected.find(t => t.id === track.id)) {
          selected.push(track);
        }
      }
    }

    console.log('[TrackSelection] 🎨 Diversity Analysis:', {
      level: diversityLevel,
      maxPerArtist,
      uniqueArtists: Object.keys(artistCount).length,
      genreClusters: Object.keys(genreClusterCount).length,
      genreDistribution: genreClusterCount,
      totalTracks: selected.length,
    });

    return selected;
  }

  /**
   * Get genre cluster for a set of genres
   */
  private getGenreCluster(genres: string[]): string {
    if (!genres || genres.length === 0) return 'unknown';

    // Find which cluster this track belongs to
    for (const cluster of this.genreClusters) {
      for (const trackGenre of genres) {
        for (const clusterGenre of cluster.genres) {
          if (trackGenre.toLowerCase().includes(clusterGenre.toLowerCase()) ||
              clusterGenre.toLowerCase().includes(trackGenre.toLowerCase())) {
            return cluster.name;
          }
        }
      }
    }

    return 'other';
  }

  /**
   * Apply filters to track list
   */
  private applyFilters(
    tracks: TrackWithFeatures[],
    filters?: PlaylistFilters,
  ): TrackWithFeatures[] {
    if (!filters) return tracks;

    const startCount = tracks.length;
    let energyFiltered = 0;
    let valenceFiltered = 0;
    let tempoFiltered = 0;
    let missingFeatures = 0;

    // Log sample track to see what we're working with
    if (tracks.length > 0) {
      const sample = tracks[0];
      console.log('[TrackSelection] 📝 Sample track features:', {
        name: sample.name,
        energy: sample.energy,
        valence: sample.valence,
        tempo: sample.tempo,
        hasFeatures: !!(sample.energy || sample.valence || sample.tempo),
      });
    }

    const filtered = tracks.filter(track => {
      // Track missing audio features - be lenient, allow them through
      if (!track.energy && !track.valence && !track.tempo) {
        missingFeatures++;
        return true; // Allow tracks without features - they'll be scored lower naturally
      }

      // Energy range - only filter if we have the value AND it's outside range
      if (filters.energy_range && track.energy !== undefined && track.energy !== null) {
        if (track.energy < filters.energy_range[0] || track.energy > filters.energy_range[1]) {
          energyFiltered++;
          return false;
        }
      }

      // Valence range - only filter if we have the value AND it's outside range
      if (filters.valence_range && track.valence !== undefined && track.valence !== null) {
        if (track.valence < filters.valence_range[0] || track.valence > filters.valence_range[1]) {
          valenceFiltered++;
          return false;
        }
      }

      // Tempo range - only filter if we have the value AND it's outside range
      if (filters.tempo_range && track.tempo !== undefined && track.tempo !== null) {
        if (track.tempo < filters.tempo_range[0] || track.tempo > filters.tempo_range[1]) {
          tempoFiltered++;
          return false;
        }
      }

      // Acousticness range - only filter if we have the value AND it's outside range
      if (filters.acousticness_range && track.acousticness !== undefined && track.acousticness !== null) {
        if (track.acousticness < filters.acousticness_range[0] || track.acousticness > filters.acousticness_range[1]) {
          return false;
        }
      }

      // Instrumentalness range - only filter if we have the value AND it's outside range
      if (filters.instrumentalness_range && track.instrumentalness !== undefined && track.instrumentalness !== null) {
        if (track.instrumentalness < filters.instrumentalness_range[0] || track.instrumentalness > filters.instrumentalness_range[1]) {
          return false;
        }
      }

      // Genres - only filter if track has genres AND none match
      if (filters.genres && filters.genres.length > 0) {
        if (track.genres && track.genres.length > 0) {
          const hasMatchingGenre = track.genres.some(g =>
            filters.genres!.some(fg => 
              g.toLowerCase().includes(fg.toLowerCase()) ||
              fg.toLowerCase().includes(g.toLowerCase())
            ),
          );
          if (!hasMatchingGenre) return false;
        }
        // If track has no genres, allow it through (benefit of the doubt)
      }

      // Exclude genres
      if (filters.exclude_genres && filters.exclude_genres.length > 0 && track.genres) {
        const hasExcludedGenre = track.genres.some(g =>
          filters.exclude_genres!.some(fg => g.toLowerCase().includes(fg.toLowerCase())),
        );
        if (hasExcludedGenre) return false;
      }

      // Exclude explicit
      if (filters.exclude_explicit && track.explicit) {
        return false;
      }

      return true;
    });

    // Log filtering stats
    console.log('[TrackSelection] 🔍 Filter stats:', {
      start: startCount,
      end: filtered.length,
      removed: startCount - filtered.length,
      energyFiltered,
      valenceFiltered,
      tempoFiltered,
      missingFeatures,
      filters: {
        energy: filters.energy_range,
        valence: filters.valence_range,
        tempo: filters.tempo_range,
      },
    });

    return filtered;
  }

  /**
   * Apply user blacklists
   */
  private async applyBlacklists(
    tracks: TrackWithFeatures[],
    userId: string,
  ): Promise<TrackWithFeatures[]> {
    const supabase = getSupabaseClient();
    const {data: prefs} = await (supabase as any)
      .from('user_preferences')
      .select('blacklisted_tracks, blacklisted_artists, blacklisted_genres')
      .eq('user_id', userId)
      .single();

    if (!prefs) return tracks;

    const blacklistedTracks = prefs.blacklisted_tracks || [];
    const blacklistedArtists = prefs.blacklisted_artists || [];
    const blacklistedGenres = prefs.blacklisted_genres || [];

    return tracks.filter(track => {
      if (blacklistedTracks.includes(track.id)) return false;
      if (blacklistedArtists.some((a: string) => track.artist.toLowerCase().includes(a.toLowerCase()))) {
        return false;
      }
      if (track.genres && blacklistedGenres.some((g: string) =>
        track.genres!.some(tg => tg.toLowerCase().includes(g.toLowerCase()))
      )) {
        return false;
      }
      return true;
    });
  }

  /**
   * Convert listening_events to TrackWithFeatures
   */
  private convertToTrackWithFeatures(events: any[]): TrackWithFeatures[] {
    // Group by track_id and get most recent play
    const trackMap = new Map<string, any>();
    
    for (const event of events) {
      if (!trackMap.has(event.track_id)) {
        trackMap.set(event.track_id, event);
      }
    }

    return Array.from(trackMap.values()).map(event => ({
      id: event.track_id,
      name: event.track_name,
      artist: event.artist_name,
      artist_id: event.artist_id, // Make sure artist_id is included for diversity
      album: event.album_name,
      album_art: event.image_url || event.album_art, // Support both field names
      duration_ms: event.duration_ms,
      energy: event.energy,
      valence: event.valence,
      tempo: event.tempo,
      danceability: event.danceability,
      acousticness: event.acousticness,
      instrumentalness: event.instrumentalness,
      liveness: event.liveness,
      speechiness: event.speechiness,
      loudness: event.loudness,
      mode: event.mode,
      key: event.key,
      time_signature: event.time_signature,
      genres: event.genres || [],
      popularity: event.popularity,
      last_played: event.played_at,
      skip_rate: event.skipped ? 1 : 0,
      completion_rate: event.completed ? 1 : 0,
    }));
  }

  /**
   * Order tracks for smooth transitions (by key/tempo)
   */
  orderForSmartTransitions(tracks: TrackWithFeatures[]): TrackWithFeatures[] {
    if (tracks.length === 0) return tracks;

    const ordered = [tracks[0]];
    const remaining = tracks.slice(1);

    while (remaining.length > 0) {
      const lastTrack = ordered[ordered.length - 1];
      
      // Find track with closest key and tempo
      let bestIndex = 0;
      let bestScore = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const track = remaining[i];
        let score = 0;

        // Key distance (musical circle of fifths)
        if (lastTrack.key !== undefined && track.key !== undefined) {
          const keyDist = Math.min(
            Math.abs(lastTrack.key - track.key),
            12 - Math.abs(lastTrack.key - track.key),
          );
          score += keyDist * 2;
        }

        // Tempo distance
        if (lastTrack.tempo !== undefined && track.tempo !== undefined) {
          score += Math.abs(lastTrack.tempo - track.tempo) / 10;
        }

        if (score < bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }

      ordered.push(remaining[bestIndex]);
      remaining.splice(bestIndex, 1);
    }

    return ordered;
  }

  /**
   * Shape playlist energy arc
   */
  shapeEnergyArc(tracks: TrackWithFeatures[], shape: EnergyArcShape): TrackWithFeatures[] {
    const sorted = [...tracks].sort((a, b) => (a.energy || 0) - (b.energy || 0));

    switch (shape) {
      case 'building':
        // Low to high energy
        return sorted;

      case 'winding_down':
        // High to low energy
        return sorted.reverse();

      case 'peaking':
        // Build up then wind down
        const mid = Math.floor(sorted.length / 2);
        const firstHalf = sorted.slice(0, mid);
        const secondHalf = sorted.slice(mid).reverse();
        return [...firstHalf, ...secondHalf];

      case 'steady':
      default:
        // Keep original order (or shuffle)
        return tracks;
    }
  }
}

export const TrackSelectionService = new TrackSelectionServiceClass();
