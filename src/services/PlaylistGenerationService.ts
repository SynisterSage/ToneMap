/**
 * Playlist Generation Service
 * Main service for generating playlists from patterns, custom filters, and context
 */

import {getSupabaseClient} from './database/supabase';
import {FirebaseAuthService} from './FirebaseAuthService';
import {TrackSelectionService} from './TrackSelectionService';
import {PlaylistStorageService} from './PlaylistStorageService';
import * as SpotifyService from './SpotifyService';
import type {
  PlaylistTemplate,
  PlaylistGenerationOptions,
  PlaylistFilters,
  GeneratedPlaylist,
  PlaylistPreview,
  TrackWithFeatures,
} from '../types/playlists';

class PlaylistGenerationServiceClass {
  /**
   * Generate playlist from a predefined template
   */
  async generateFromTemplate(
    template: PlaylistTemplate,
    options?: Partial<PlaylistGenerationOptions>,
  ): Promise<GeneratedPlaylist | null> {
    try {
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      console.log('[PlaylistGeneration] 🎵 Generating from template:', template);

      // Get template configuration
      const config = this.getTemplateConfig(template);
      
      // Merge with user options
      const finalOptions: PlaylistGenerationOptions = {
        ...config,
        ...options,
        template,
      };

      // Get user preferences for defaults
      const prefs = await this.getUserPreferences(userId);
      const trackLimit = finalOptions.track_limit || prefs.default_length || 25;

      let tracks: TrackWithFeatures[] = [];

      // Generate based on template
      if (template === 'right_now') {
        tracks = await TrackSelectionService.selectTracksForCurrentContext(trackLimit);
      } else if (finalOptions.filters) {
        // Try pattern-based first, fall back to custom selection
        try {
          const pattern = await this.findBestPattern(userId, finalOptions.filters);
          
          if (pattern) {
            console.log('[PlaylistGeneration] 🎯 Using pattern:', pattern.pattern_name);
            tracks = await TrackSelectionService.selectTracksFromPattern(
              pattern.id,
              trackLimit,
              finalOptions.filters,
            );
          }
        } catch (error) {
          console.log('[PlaylistGeneration] ⚠️ Pattern selection failed, using custom selection');
        }
        
        // If pattern failed or returned no tracks, use custom selection
        if (tracks.length === 0) {
          console.log('[PlaylistGeneration] 🎨 Using custom filter selection');
          tracks = await TrackSelectionService.selectTracksCustom(
            finalOptions.filters,
            trackLimit,
          );
        }
      } else {
        // No filters provided, try current context
        console.log('[PlaylistGeneration] 🌟 No filters, using current context');
        tracks = await TrackSelectionService.selectTracksForCurrentContext(trackLimit);
      }

      if (tracks.length === 0) {
        throw new Error(
          `No tracks found for template "${template}". Make sure you have enough listening history with varied contexts!`
        );
      }

      console.log('[PlaylistGeneration] 📊 Generated', tracks.length, 'tracks from real listening history');

      // Apply energy arc shaping
      if (finalOptions.energy_arc && finalOptions.energy_arc !== 'steady') {
        tracks = TrackSelectionService.shapeEnergyArc(tracks, finalOptions.energy_arc);
      }

      // Apply smart transitions
      if (finalOptions.smart_transitions) {
        tracks = TrackSelectionService.orderForSmartTransitions(tracks);
      }

      // Include discovery tracks (30% new similar tracks)
      if (finalOptions.include_discovery) {
        tracks = await this.addDiscoveryTracks(tracks, trackLimit, template);
      }

      // Build playlist object
      const playlist = this.buildPlaylistObject(
        userId,
        template,
        tracks,
        finalOptions,
      );

      console.log('[PlaylistGeneration] ✅ Generated playlist with', tracks.length, 'tracks');

      return playlist;
    } catch (error) {
      console.error('[PlaylistGeneration] Failed to generate from template:', error);
      return null;
    }
  }

  /**
   * Generate custom playlist with user-defined filters
   */
  async generateCustom(
    filters: PlaylistFilters,
    options?: Partial<PlaylistGenerationOptions>,
  ): Promise<GeneratedPlaylist | null> {
    try {
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      console.log('[PlaylistGeneration] 🎨 Generating custom playlist');

      const prefs = await this.getUserPreferences(userId);
      const trackLimit = options?.track_limit || prefs.default_length || 25;

      // Select tracks based on filters
      let tracks = await TrackSelectionService.selectTracksCustom(filters, trackLimit);

      console.log('[PlaylistGeneration] 📊 Found', tracks.length, 'tracks from your library matching filters');

      // If user requested more tracks than we have, use discovery to fill the gap
      const needsDiscovery = tracks.length < trackLimit;
      
      if (needsDiscovery || options?.include_discovery) {
        console.log('[PlaylistGeneration] 🔍 Using discovery to reach', trackLimit, 'tracks (currently have', tracks.length, ')');
        
        // Pass filters to discovery so it can match the genre/vibe
        const DiscoveryService = require('./DiscoveryService');
        const discoveryCount = Math.max(
          trackLimit - tracks.length, // Fill the gap
          Math.floor(trackLimit * 0.3) // Or at least 30% for variety
        );
        
        const discovered = await DiscoveryService.discoverTracks(tracks, {
          targetCount: discoveryCount,
          excludeTrackIds: tracks.map(t => t.id),
          audioFeatureFilters: {
            minEnergy: filters.energy_range?.[0],
            maxEnergy: filters.energy_range?.[1],
            minValence: filters.valence_range?.[0],
            maxValence: filters.valence_range?.[1],
            minTempo: filters.tempo_range?.[0],
            maxTempo: filters.tempo_range?.[1],
          },
          userTopGenres: filters.genres,
        });
        
        console.log('[PlaylistGeneration] ✅ Discovered', discovered.length, 'matching tracks');
        
        // Get audio features for discovered tracks
        if (discovered.length > 0) {
          const discoveryIds = discovered.map((t: any) => t.id);
          const SpotifyService = require('./SpotifyService');
          const audioFeatures = await SpotifyService.getAudioFeatures(discoveryIds);
          
          const discoveryWithFeatures = discovered.map((track: any, index: number) => ({
            ...track,
            ...audioFeatures[index],
          }));
          
          // Add discovered tracks
          tracks = [...tracks, ...discoveryWithFeatures];
        }
      }

      if (tracks.length === 0) {
        throw new Error('No tracks found matching filters. Try different genre/filters!');
      }

      // Trim to exact limit if we have more
      if (tracks.length > trackLimit) {
        tracks = tracks.slice(0, trackLimit);
      }

      // Apply options
      if (options?.energy_arc && options.energy_arc !== 'steady') {
        tracks = TrackSelectionService.shapeEnergyArc(tracks, options.energy_arc);
      }

      if (options?.smart_transitions) {
        tracks = TrackSelectionService.orderForSmartTransitions(tracks);
      }

      const finalOptions: PlaylistGenerationOptions = {
        template: 'custom',
        filters,
        ...options,
        track_limit: trackLimit,
      };

      const playlist = this.buildPlaylistObject(
        userId,
        'custom',
        tracks,
        finalOptions,
      );

      console.log('[PlaylistGeneration] ✅ Custom playlist generated');

      return playlist;
    } catch (error) {
      console.error('[PlaylistGeneration] Failed to generate custom playlist:', error);
      return null;
    }
  }

  /**
   * Generate playlist for current context (Right Now)
   */
  async generateRightNow(
    options?: Partial<PlaylistGenerationOptions>,
  ): Promise<GeneratedPlaylist | null> {
    return this.generateFromTemplate('right_now', options);
  }

  /**
   * Create preview of a playlist without saving
   */
  async previewPlaylist(trackIds: string[]): Promise<PlaylistPreview | null> {
    try {
      console.log('[PlaylistGeneration] 👀 Creating preview for', trackIds.length, 'tracks');

      // Fetch track details with metadata
      const tracksMetadata = await SpotifyService.getTracksWithMetadata(trackIds);
      
      // Fetch audio features
      const audioFeatures = await SpotifyService.getAudioFeatures(trackIds);

      if (tracksMetadata.length === 0) {
        return null;
      }

      // Merge metadata with audio features
      const tracks: TrackWithFeatures[] = tracksMetadata.map((track: any, index: number) => {
        const features = audioFeatures[index] || {};
        return {
          ...track,
          energy: features.energy,
          valence: features.valence,
          tempo: features.tempo,
          danceability: features.danceability,
          acousticness: features.acousticness,
          instrumentalness: features.instrumentalness,
          loudness: features.loudness,
          speechiness: features.speechiness,
          mode: features.mode,
          key: features.key,
        };
      });

      // Calculate aggregated stats
      const totalDuration = tracks.reduce((sum, t) => sum + (t.duration_ms || 0), 0);
      const avgEnergy =
        tracks.reduce((sum, t) => sum + (t.energy || 0), 0) / tracks.length;
      const avgValence =
        tracks.reduce((sum, t) => sum + (t.valence || 0), 0) / tracks.length;
      const avgTempo =
        tracks.reduce((sum, t) => sum + (t.tempo || 0), 0) / tracks.length;

      // Top genres
      const genreCounts: {[genre: string]: number} = {};
      tracks.forEach(t => {
        t.genres?.forEach(g => {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
      });
      const topGenres = Object.entries(genreCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([genre, count]) => ({genre, count}));

      // Top artists
      const artistCounts: {[artist: string]: number} = {};
      tracks.forEach(t => {
        artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
      });
      const topArtists = Object.entries(artistCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([artist, count]) => ({artist, count}));

      // Energy progression
      const energyProgression = tracks.map(t => t.energy || 0.5);

      // Mood distribution (simplified)
      const moodDistribution = {
        happy: tracks.filter(t => (t.valence || 0) > 0.6 && (t.energy || 0) > 0.6).length,
        sad: tracks.filter(t => (t.valence || 0) < 0.4 && (t.energy || 0) < 0.4).length,
        energetic: tracks.filter(t => (t.energy || 0) > 0.7).length,
        calm: tracks.filter(t => (t.energy || 0) < 0.4).length,
      };

      const preview: PlaylistPreview = {
        tracks,
        total_duration_ms: totalDuration,
        avg_energy: Math.round(avgEnergy * 100) / 100,
        avg_valence: Math.round(avgValence * 100) / 100,
        avg_tempo: Math.round(avgTempo),
        top_genres: topGenres,
        top_artists: topArtists,
        energy_progression: energyProgression,
        mood_distribution: moodDistribution,
      };

      console.log('[PlaylistGeneration] ✅ Preview created');

      return preview;
    } catch (error) {
      console.error('[PlaylistGeneration] Failed to create preview:', error);
      return null;
    }
  }

  /**
   * Save playlist to Spotify and database
   */
  async saveToSpotify(
    playlist: GeneratedPlaylist,
    customName?: string,
  ): Promise<{success: boolean; playlistId?: string; spotifyUrl?: string}> {
    try {
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      console.log('[PlaylistGeneration] 💾 Saving to Spotify...');

      // Get user preferences for privacy setting
      const prefs = await this.getUserPreferences(userId);
      const isPublic = prefs.default_privacy === 'public';

      // Create name with timestamp if not custom
      const playlistName = customName || this.generatePlaylistName(playlist);

      // Create Spotify playlist
      const spotifyPlaylist = await SpotifyService.createPlaylist(
        playlistName,
        playlist.description,
        isPublic,
        playlist.is_collaborative || false,
      );

      if (!spotifyPlaylist) {
        throw new Error('Failed to create Spotify playlist');
      }

      // Add tracks to Spotify playlist
      const tracksAdded = await SpotifyService.addTracksToPlaylist(
        spotifyPlaylist.id,
        playlist.track_ids,
      );

      if (!tracksAdded) {
        throw new Error('Failed to add tracks to Spotify playlist');
      }

      // Update playlist object with Spotify info
      playlist.name = playlistName;
      playlist.spotify_playlist_id = spotifyPlaylist.id;
      playlist.spotify_url = spotifyPlaylist.url;
      playlist.is_public = isPublic;

      // Save to database
      const playlistId = await PlaylistStorageService.saveGeneratedPlaylist(playlist);

      if (!playlistId) {
        console.warn('[PlaylistGeneration] Playlist created on Spotify but not saved to DB');
      }

      console.log('[PlaylistGeneration] ✅ Playlist saved to Spotify and database');

      return {
        success: true,
        playlistId: playlistId || undefined,
        spotifyUrl: spotifyPlaylist.url,
      };
    } catch (error) {
      console.error('[PlaylistGeneration] Failed to save to Spotify:', error);
      return {success: false};
    }
  }

  /**
   * Regenerate an existing playlist with same settings
   */
  async regeneratePlaylist(playlistId: string): Promise<GeneratedPlaylist | null> {
    try {
      console.log('[PlaylistGeneration] 🔄 Regenerating playlist:', playlistId);

      // Get original playlist
      const original = await PlaylistStorageService.getPlaylistById(playlistId);
      if (!original) {
        throw new Error('Original playlist not found');
      }

      const options: PlaylistGenerationOptions = {
        template: original.context_snapshot.template,
        filters: original.context_snapshot.filters,
        ...original.context_snapshot.options,
      };

      // Generate new playlist
      if (options.template && options.template !== 'custom') {
        return this.generateFromTemplate(options.template, options);
      } else {
        return this.generateCustom(options.filters || {}, options);
      }
    } catch (error) {
      console.error('[PlaylistGeneration] Failed to regenerate:', error);
      return null;
    }
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  /**
   * Get template configuration
   */
  private getTemplateConfig(template: PlaylistTemplate): PlaylistGenerationOptions {
    const configs: {[key: string]: PlaylistGenerationOptions} = {
      morning_energy: {
        filters: {
          energy_range: [0.5, 1.0],  // Very wide - any upbeat song
          valence_range: [0.4, 1.0],  // Positive to very positive
          tempo_range: [90, 160],     // Wide tempo range
        },
        energy_arc: 'building',
        smart_transitions: true,
        diversity_level: 'high',
      },
      focus_flow: {
        filters: {
          energy_range: [0.2, 0.75],  // Low to moderate energy
          valence_range: [0.25, 0.75], // Any mood works for focus
          tempo_range: [60, 130],     // Slower to moderate
        },
        energy_arc: 'steady',
        diversity_level: 'medium',
      },
      evening_winddown: {
        filters: {
          energy_range: [0.1, 0.65],  // Low energy only
          valence_range: [0.2, 0.8],  // Any mood
          tempo_range: [60, 130],     // Slow to moderate
        },
        energy_arc: 'winding_down',
        smart_transitions: true,
        diversity_level: 'medium',
      },
      rainy_day: {
        filters: {
          energy_range: [0.15, 0.75], // Low to moderate energy
          valence_range: [0.2, 0.75],  // Melancholic to neutral
          tempo_range: [60, 130],     // Slower tempos
        },
        energy_arc: 'steady',
        diversity_level: 'high',
      },
      workout: {
        filters: {
          energy_range: [0.6, 1.0],   // High energy only
          tempo_range: [110, 200],    // Fast beats
          valence_range: [0.3, 1.0],  // Any mood as long as energetic
        },
        energy_arc: 'building',
        diversity_level: 'medium',
      },
      weekend_vibes: {
        filters: {
          day_of_week: ['saturday', 'sunday'],
        },
        diversity_level: 'high',
        include_discovery: true,
      },
      right_now: {
        use_current_context: true,
        diversity_level: 'high',
      },
      custom: {
        diversity_level: 'medium',
      },
    };

    return configs[template] || configs.custom;
  }

  /**
   * Find best matching pattern for filters
   */
  private async findBestPattern(
    userId: string,
    filters: PlaylistFilters,
  ): Promise<any | null> {
    try {
      const supabase = getSupabaseClient();
      let query = (supabase as any)
        .from('listening_patterns')
        .select('*')
        .eq('user_id', userId);

      // Apply filters to find matching pattern
      if (filters.time_of_day && filters.time_of_day.length === 1) {
        query = query.eq('time_of_day', filters.time_of_day[0]);
      }
      if (filters.weather_condition && filters.weather_condition.length === 1) {
        query = query.eq('weather_condition', filters.weather_condition[0]);
      }
      if (filters.activity_type && filters.activity_type.length === 1) {
        query = query.eq('activity_type', filters.activity_type[0]);
      }

      const {data} = await query
        .order('confidence_score', {ascending: false})
        .limit(1);

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('[PlaylistGeneration] Error finding pattern:', error);
      return null;
    }
  }

  /**
   * Get user preferences
   */
  private async getUserPreferences(userId: string): Promise<any> {
    const supabase = getSupabaseClient();
    const {data} = await (supabase as any)
      .from('user_preferences')
      .select('preferred_playlist_length')
      .eq('user_id', userId)
      .single();

    return {
      default_length: data?.preferred_playlist_length || 25,
      default_privacy: 'private', // Default until we add to schema
    };
  }

  /**
   * Add discovery tracks using Spotify Recommendations API
   * Mix: 70% user tracks + 30% discovered tracks
   * Ensures mood-appropriate recommendations based on template
   */
  private async addDiscoveryTracks(
    tracks: TrackWithFeatures[],
    totalLimit: number,
    template?: string,
  ): Promise<TrackWithFeatures[]> {
    try {
      console.log('[PlaylistGeneration] 🔍 Adding discovery tracks for template:', template);

      // If we don't have enough tracks, skip discovery
      if (tracks.length < 3) {
        console.warn('[PlaylistGeneration] ⚠️ Not enough tracks for discovery, returning user tracks only');
        return tracks;
      }

      // Calculate split: 70% user tracks, 30% discovery
      const userTrackCount = Math.ceil(totalLimit * 0.7);
      const discoveryCount = totalLimit - userTrackCount;

      // Use top user tracks as seeds (up to 5)
      const seedTracks = tracks
        .slice(0, 5)
        .map(t => t.id)
        .filter(id => id && id.length > 0); // Remove empty IDs

      // Calculate average audio features from user tracks
      const avgFeatures = this.calculateAverageFeatures(tracks.slice(0, 20));

      // Get popular genre seeds as fallback
      const genreSeeds: string[] = [];
      const genreCounts: {[key: string]: number} = {};
      tracks.forEach(t => {
        if (t.genres) {
          t.genres.forEach(g => {
            const normalizedGenre = g.toLowerCase().replace(/[^a-z]/g, '');
            genreCounts[normalizedGenre] = (genreCounts[normalizedGenre] || 0) + 1;
          });
        }
      });
      
      // Get top 3 genres as seeds
      const topGenres = Object.entries(genreCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([genre]) => genre);
      
      if (topGenres.length > 0) {
        genreSeeds.push(...topGenres);
      } else {
        // Ultimate fallback: use popular genres
        genreSeeds.push('pop', 'rock', 'indie');
      }

      // Spotify requires at least 1 seed, max 5 total
      if (seedTracks.length === 0 && genreSeeds.length === 0) {
        console.warn('[PlaylistGeneration] No seeds available for recommendations');
        return tracks.slice(0, totalLimit);
      }

      console.log('[PlaylistGeneration] 🌱 Seeds:', {
        tracks: seedTracks.length,
        genres: genreSeeds.slice(0, 5 - seedTracks.length),
      });

      // Adjust target features based on template for mood-appropriate recommendations
      let targetFeatures = {
        target_energy: avgFeatures.energy,
        target_valence: avgFeatures.valence,
        target_tempo: avgFeatures.tempo,
        target_danceability: avgFeatures.danceability,
        target_acousticness: avgFeatures.acousticness,
      };
      
      // Template-specific adjustments for better mood matching
      if (template === 'morning_energy') {
        targetFeatures.target_energy = Math.max(0.65, avgFeatures.energy);
        targetFeatures.target_valence = Math.max(0.6, avgFeatures.valence);
        targetFeatures.target_tempo = Math.max(110, avgFeatures.tempo);
      } else if (template === 'workout') {
        targetFeatures.target_energy = Math.max(0.75, avgFeatures.energy);
        targetFeatures.target_tempo = Math.max(130, avgFeatures.tempo);
      } else if (template === 'evening_winddown') {
        targetFeatures.target_energy = Math.min(0.5, avgFeatures.energy);
        targetFeatures.target_valence = Math.min(0.6, avgFeatures.valence);
        targetFeatures.target_tempo = Math.min(110, avgFeatures.tempo);
      } else if (template === 'focus_flow') {
        targetFeatures.target_energy = 0.4;
        targetFeatures.target_valence = 0.5;
        targetFeatures.target_acousticness = Math.max(0.3, avgFeatures.acousticness);
      } else if (template === 'rainy_day') {
        targetFeatures.target_energy = Math.min(0.5, avgFeatures.energy);
        targetFeatures.target_acousticness = Math.max(0.4, avgFeatures.acousticness);
      }

      console.log('[PlaylistGeneration] 🎯 Target features:', targetFeatures);

      // REAL WORKING DISCOVERY: Use DiscoveryService (no deprecated API)
      const DiscoveryService = require('./DiscoveryService');
      
      console.log('[PlaylistGeneration] 🔍 Using REAL discovery service (artist top tracks, related artists, etc.)');
      
      const discoveries = await DiscoveryService.discoverTracks(tracks, {
        targetCount: discoveryCount * 2, // Get extra to filter
        excludeTrackIds: tracks.map(t => t.id),
        userTopGenres: genreSeeds,
      });

      if (discoveries.length === 0) {
        console.warn('[PlaylistGeneration] ⚠️ No discoveries found, using user tracks only');
        return tracks.slice(0, totalLimit);
      }

      // Fetch audio features for discoveries
      if (discoveries.length > 0) {
        const discoveryIds = discoveries.map((t: any) => t.id);
        const audioFeatures = await SpotifyService.getAudioFeatures(discoveryIds);

        // Merge with audio features
        let discoveryTracks: TrackWithFeatures[] = discoveries.map((track: any, index: number) => ({
          ...track,
          ...audioFeatures[index],
        }));
        
        // Filter by audio features if template requires it
        if (template === 'morning_energy') {
          discoveryTracks = discoveryTracks.filter(t => 
            (!t.energy || t.energy >= 0.5) && (!t.tempo || t.tempo >= 90)
          );
        } else if (template === 'workout') {
          discoveryTracks = discoveryTracks.filter(t => 
            (!t.energy || t.energy >= 0.6) && (!t.tempo || t.tempo >= 110)
          );
        } else if (template === 'evening_winddown') {
          discoveryTracks = discoveryTracks.filter(t => 
            (!t.energy || t.energy <= 0.65)
          );
        } else if (template === 'focus_flow') {
          discoveryTracks = discoveryTracks.filter(t => 
            (!t.energy || (t.energy >= 0.2 && t.energy <= 0.75))
          );
        } else if (template === 'rainy_day') {
          discoveryTracks = discoveryTracks.filter(t => 
            (!t.energy || t.energy <= 0.75)
          );
        }
        
        // Take up to discoveryCount
        const finalDiscoveries = discoveryTracks.slice(0, discoveryCount);

        console.log('[PlaylistGeneration] ✅ Added', finalDiscoveries.length, 'discovery tracks (filtered from', discoveries.length, 'candidates)');

        // Interleave user tracks with discoveries for variety
        return this.interleaveDiscoveryTracks(
          tracks.slice(0, userTrackCount),
          finalDiscoveries,
        );
      }

      return tracks.slice(0, totalLimit);
    } catch (error) {
      console.error('[PlaylistGeneration] Discovery failed, using user tracks only:', error);
      return tracks.slice(0, totalLimit);
    }
  }

  /**
   * Calculate average audio features from tracks
   */
  private calculateAverageFeatures(tracks: TrackWithFeatures[]): {
    energy: number;
    valence: number;
    tempo: number;
    danceability: number;
    acousticness: number;
  } {
    const sum = tracks.reduce(
      (acc, track) => ({
        energy: acc.energy + (track.energy || 0.5),
        valence: acc.valence + (track.valence || 0.5),
        tempo: acc.tempo + (track.tempo || 120),
        danceability: acc.danceability + (track.danceability || 0.5),
        acousticness: acc.acousticness + (track.acousticness || 0.5),
      }),
      {energy: 0, valence: 0, tempo: 0, danceability: 0, acousticness: 0},
    );

    return {
      energy: sum.energy / tracks.length,
      valence: sum.valence / tracks.length,
      tempo: sum.tempo / tracks.length,
      danceability: sum.danceability / tracks.length,
      acousticness: sum.acousticness / tracks.length,
    };
  }

  /**
   * Interleave discovery tracks with user tracks for natural variety
   * Pattern: User, User, User, Discovery, User, User, Discovery, etc.
   */
  private interleaveDiscoveryTracks(
    userTracks: TrackWithFeatures[],
    discoveryTracks: TrackWithFeatures[],
  ): TrackWithFeatures[] {
    const result: TrackWithFeatures[] = [];
    const artistCount: {[key: string]: number} = {};
    let userIndex = 0;
    let discoveryIndex = 0;

    // Helper to try adding a track (with diversity check)
    const tryAddTrack = (track: TrackWithFeatures): boolean => {
      const artistKey = track.artist_id || track.artist;
      const currentCount = artistCount[artistKey] || 0;
      
      // STRICT LIMIT: Max 2 tracks per artist TOTAL
      if (currentCount >= 2) {
        return false; // Skip this track
      }
      
      result.push(track);
      artistCount[artistKey] = currentCount + 1;
      return true;
    };

    // Add tracks in pattern: 3 user, 1 discovery (but with diversity enforcement)
    while (userIndex < userTracks.length || discoveryIndex < discoveryTracks.length) {
      // Try to add 3 user tracks
      let addedInCycle = 0;
      for (let i = 0; i < 3 && userIndex < userTracks.length; i++) {
        if (tryAddTrack(userTracks[userIndex])) {
          addedInCycle++;
        }
        userIndex++;
      }

      // Try to add 1 discovery track
      if (discoveryIndex < discoveryTracks.length) {
        tryAddTrack(discoveryTracks[discoveryIndex]);
        discoveryIndex++;
      }
    }

    console.log('[PlaylistGeneration] 🎨 Interleaved with diversity:', {
      userTracks: userTracks.length,
      discoveryTracks: discoveryTracks.length,
      total: result.length,
      uniqueArtists: Object.keys(artistCount).length,
      artistDistribution: Object.entries(artistCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([artist, count]) => `${artist}: ${count}`)
        .join(', '),
    });

    return result;
  }

  /**
   * Build playlist object
   */
  private buildPlaylistObject(
    userId: string,
    template: PlaylistTemplate,
    tracks: TrackWithFeatures[],
    options: PlaylistGenerationOptions,
  ): GeneratedPlaylist {
    const totalDuration = tracks.reduce((sum, t) => sum + (t.duration_ms || 0), 0);
    const trackIds = tracks.map(t => t.id);

    return {
      user_id: userId,
      name: this.getTemplateName(template),
      description: this.getTemplateDescription(template),
      context_snapshot: {
        generation_type: template === 'custom' ? 'custom' : 'auto',
        template,
        filters: options.filters,
        options,
        is_context_based: template === 'right_now' || options.use_current_context || false,
      },
      track_ids: trackIds,
      tracks,
      total_tracks: tracks.length,
      total_duration_ms: totalDuration,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Generate playlist name with timestamp
   */
  private generatePlaylistName(playlist: GeneratedPlaylist): string {
    const date = new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    const baseName = this.getTemplateName(
      playlist.context_snapshot.template || 'custom',
    );
    return `${baseName} - ${date}`;
  }

  /**
   * Get template display name
   */
  private getTemplateName(template: PlaylistTemplate): string {
    const names: {[key: string]: string} = {
      morning_energy: 'Morning Energy',
      focus_flow: 'Focus Flow',
      evening_winddown: 'Evening Wind-Down',
      rainy_day: 'Rainy Day Vibes',
      workout: 'Workout Mix',
      weekend_vibes: 'Weekend Vibes',
      right_now: 'Right Now',
      custom: 'Custom Playlist',
    };
    return names[template] || 'ToneMap Playlist';
  }

  /**
   * Get template description
   */
  private getTemplateDescription(template: PlaylistTemplate): string {
    const descriptions: {[key: string]: string} = {
      morning_energy: 'Start your day with high-energy tracks matched to your taste',
      focus_flow: 'Instrumental and low-energy tracks for deep concentration',
      evening_winddown: 'Wind down with mellow tracks that match your mood',
      rainy_day: 'Perfect for cloudy, rainy weather',
      workout: 'High-energy tracks to power your workout',
      weekend_vibes: 'Your perfect weekend soundtrack',
      right_now: 'Perfect for your current mood and context',
      custom: 'Custom-generated playlist by ToneMap',
    };
    return descriptions[template] || 'Generated by ToneMap based on your listening patterns';
  }
}

export const PlaylistGenerationService = new PlaylistGenerationServiceClass();
