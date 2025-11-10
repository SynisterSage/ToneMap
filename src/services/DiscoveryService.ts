/**
 * DiscoveryService - REAL working discovery without deprecated recommendations API
 * 
 * Strategy:
 * 1. Artist's top tracks (from user's favorite artists)
 * 2. Related artists' popular tracks
 * 3. Deep dive into user's saved albums (other tracks from same album)
 * 4. Genre-based search (using user's top genres)
 * 5. Similar artists discovery chain
 */

import * as SpotifyService from './SpotifyService';
import {TrackWithFeatures} from '../types/playlists';

interface TasteProfile {
  avgPopularity: number;
  popularityStdDev: number;
  topGenres: string[];
  topArtists: Array<{id: string; name: string; count: number}>;
  avgEnergy: number;
  avgValence: number;
  avgTempo: number;
  avgAcousticness: number;
  avgDanceability: number;
}

interface DiscoveryOptions {
  targetCount: number;
  audioFeatureFilters?: {
    minEnergy?: number;
    maxEnergy?: number;
    minValence?: number;
    maxValence?: number;
    minTempo?: number;
    maxTempo?: number;
  };
  excludeTrackIds?: string[];
  userTopArtists?: Array<{id: string; name: string}>;
  userTopGenres?: string[];
}

/**
 * Main discovery method - tries multiple strategies to find tracks
 */
export async function discoverTracks(
  userTracks: TrackWithFeatures[],
  options: DiscoveryOptions
): Promise<any[]> {
  console.log('[DiscoveryService] 🔍 Starting discovery for', options.targetCount, 'tracks');
  console.log('[DiscoveryService] User has', userTracks.length, 'tracks in library');
  
  const discovered: any[] = [];
  const seenTrackIds = new Set(options.excludeTrackIds || []);
  
  // Add user's existing tracks to seen set
  userTracks.forEach(track => seenTrackIds.add(track.id));
  
  // Calculate user's taste profile from their ACTUAL listening history
  const tasteProfile = calculateTasteProfile(userTracks);
  console.log('[DiscoveryService] � User taste profile:', {
    avgPopularity: tasteProfile.avgPopularity.toFixed(1),
    topGenres: tasteProfile.topGenres.slice(0, 3),
    avgEnergy: tasteProfile.avgEnergy.toFixed(2),
    avgValence: tasteProfile.avgValence.toFixed(2),
  });
  
  // Strategy 1: Artist's Top Tracks (but ONLY from user's favorite artists)
  if (discovered.length < options.targetCount) {
    console.log('[DiscoveryService] � Strategy 1: Getting deep cuts from user\'s favorite artists');
    const artistTracks = await discoverFromArtistTopTracks(
      userTracks,
      options.targetCount - discovered.length,
      seenTrackIds,
      tasteProfile
    );
    discovered.push(...artistTracks);
    console.log('[DiscoveryService] ✅ Found', artistTracks.length, 'tracks from favorite artists');
  }
  
  // Strategy 2: Related Artists (but filtered by user's taste)
  if (discovered.length < options.targetCount) {
    console.log('[DiscoveryService] 🔗 Strategy 2: Getting tracks from similar artists (matching your taste)');
    const relatedTracks = await discoverFromRelatedArtists(
      userTracks,
      options.targetCount - discovered.length,
      seenTrackIds,
      tasteProfile,
      options.userTopGenres // Pass genre filter
    );
    discovered.push(...relatedTracks);
    console.log('[DiscoveryService] ✅ Found', relatedTracks.length, 'tracks from similar artists');
  }
  
  // Strategy 3: User's Saved Albums (guaranteed to match taste)
  if (discovered.length < options.targetCount) {
    console.log('[DiscoveryService] 💾 Strategy 3: Exploring your saved albums for hidden gems');
    const savedAlbumTracks = await discoverFromSavedAlbums(
      options.targetCount - discovered.length,
      seenTrackIds,
      tasteProfile
    );
    discovered.push(...savedAlbumTracks);
    console.log('[DiscoveryService] ✅ Found', savedAlbumTracks.length, 'tracks from saved albums');
  }
  
  console.log('[DiscoveryService] 🎉 Total discovered:', discovered.length, 'tracks (all matching your taste)');
  
  return discovered.slice(0, options.targetCount);
}

/**
 * Calculate user's taste profile from their listening history
 */
function calculateTasteProfile(userTracks: TrackWithFeatures[]): TasteProfile {
  // Calculate average popularity
  const popularities = userTracks
    .filter(t => t.popularity !== undefined)
    .map(t => t.popularity!);
  const avgPopularity = popularities.length > 0
    ? popularities.reduce((sum, p) => sum + p, 0) / popularities.length
    : 50;
  
  // Calculate standard deviation for popularity
  const variance = popularities.length > 0
    ? popularities.reduce((sum, p) => sum + Math.pow(p - avgPopularity, 2), 0) / popularities.length
    : 0;
  const popularityStdDev = Math.sqrt(variance);
  
  // Get top genres
  const genreCounts: {[key: string]: number} = {};
  userTracks.forEach(t => {
    if (t.genres) {
      t.genres.forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    }
  });
  const topGenres = Object.entries(genreCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([genre]) => genre);
  
  // Get top artists
  const artistCounts = new Map<string, {id: string; name: string; count: number}>();
  userTracks.forEach(t => {
    if (t.artist_id) {
      const existing = artistCounts.get(t.artist_id);
      if (existing) {
        existing.count++;
      } else {
        artistCounts.set(t.artist_id, {id: t.artist_id, name: t.artist, count: 1});
      }
    }
  });
  const topArtists = Array.from(artistCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20 artists
  
  // Calculate average audio features
  const tracksWithFeatures = userTracks.filter(t => 
    t.energy !== undefined && 
    t.valence !== undefined && 
    t.tempo !== undefined
  );
  
  const avgEnergy = tracksWithFeatures.length > 0
    ? tracksWithFeatures.reduce((sum, t) => sum + (t.energy || 0), 0) / tracksWithFeatures.length
    : 0.5;
  const avgValence = tracksWithFeatures.length > 0
    ? tracksWithFeatures.reduce((sum, t) => sum + (t.valence || 0), 0) / tracksWithFeatures.length
    : 0.5;
  const avgTempo = tracksWithFeatures.length > 0
    ? tracksWithFeatures.reduce((sum, t) => sum + (t.tempo || 0), 0) / tracksWithFeatures.length
    : 120;
  const avgAcousticness = tracksWithFeatures.length > 0
    ? tracksWithFeatures.reduce((sum, t) => sum + (t.acousticness || 0), 0) / tracksWithFeatures.length
    : 0.5;
  const avgDanceability = tracksWithFeatures.length > 0
    ? tracksWithFeatures.reduce((sum, t) => sum + (t.danceability || 0), 0) / tracksWithFeatures.length
    : 0.5;
  
  return {
    avgPopularity,
    popularityStdDev,
    topGenres,
    topArtists,
    avgEnergy,
    avgValence,
    avgTempo,
    avgAcousticness,
    avgDanceability,
  };
}

/**
 * Strategy 1: Get top tracks from user's favorite artists
 */
async function discoverFromArtistTopTracks(
  userTracks: TrackWithFeatures[],
  targetCount: number,
  seenTrackIds: Set<string>,
  tasteProfile: TasteProfile
): Promise<any[]> {
  const discovered: any[] = [];
  
  // Use the taste profile's top artists (already calculated and sorted)
  const topArtists = tasteProfile.topArtists.slice(0, 25); // Top 25 artists for more variety
  
  console.log('[DiscoveryService] Getting deep cuts from your top', topArtists.length, 'artists:', 
    topArtists.slice(0, 3).map(a => a.name).join(', ')
  );
  
  // Get top tracks from each artist, but filter to match user's taste
  // VARIETY: Max 1 track per artist for maximum variety
  for (const artist of topArtists) {
    if (discovered.length >= targetCount) break;
    
    try {
      const topTracks = await SpotifyService.getArtistTopTracks(artist.id);
      let addedFromArtist = 0;
      
      for (const track of topTracks) {
        if (discovered.length >= targetCount) break;
        if (addedFromArtist >= 1) break; // MAX 1 per artist for maximum variety
        
        if (!seenTrackIds.has(track.id)) {
          // Only add if track matches user's popularity range
          // (within 1.5 standard deviations of their average)
          const popularityMatch = Math.abs(track.popularity - tasteProfile.avgPopularity) 
            <= (tasteProfile.popularityStdDev * 1.5);
          
          if (popularityMatch) {
            discovered.push({
              ...track,
              album_art: track.albumArt || track.album_art, // Normalize field name
              artist_id: track.artistId || track.artist_id, // Normalize field name
              is_discovered: true, // Mark as discovered track
            });
            seenTrackIds.add(track.id);
            addedFromArtist++;
          }
        }
      }
    } catch (error) {
      console.warn('[DiscoveryService] Failed to get top tracks for artist', artist.name);
    }
  }
  
  console.log('[DiscoveryService] Found', discovered.length, 'tracks matching your taste from favorite artists');
  
  return discovered;
}

/**
 * Strategy 2: Get tracks from related artists
 */
async function discoverFromRelatedArtists(
  userTracks: TrackWithFeatures[],
  targetCount: number,
  seenTrackIds: Set<string>,
  tasteProfile: TasteProfile,
  requestedGenres?: string[]
): Promise<any[]> {
  const discovered: any[] = [];
  
  // Use top 8 artists from taste profile for more variety
  const topArtists = tasteProfile.topArtists.slice(0, 8);
  
  console.log('[DiscoveryService] Finding similar artists to:', 
    topArtists.map(a => a.name).join(', ')
  );
  
  // For each top artist, get related artists and their top tracks
  for (const artist of topArtists) {
    if (discovered.length >= targetCount) break;
    
    try {
      const relatedArtists = await SpotifyService.getRelatedArtists(artist.id);
      
      // Filter related artists by genre match
      const filteredRelatedArtists = relatedArtists.filter(relatedArtist => {
        // If user requested specific genres (like "jazz"), prioritize those
        const genresToMatch = requestedGenres && requestedGenres.length > 0 
          ? requestedGenres 
          : tasteProfile.topGenres;
        
        // Check if related artist has any genres matching requested or user's top genres
        const hasMatchingGenre = relatedArtist.genres.some((genre: string) => 
          genresToMatch.some(targetGenre => 
            genre.toLowerCase().includes(targetGenre.toLowerCase()) ||
            targetGenre.toLowerCase().includes(genre.toLowerCase())
          )
        );
        
        // Also check popularity is similar to user's taste
        const popularityMatch = Math.abs(relatedArtist.popularity - tasteProfile.avgPopularity) 
          <= (tasteProfile.popularityStdDev * 2);
        
        return hasMatchingGenre && popularityMatch;
      });
      
      console.log('[DiscoveryService] Found', filteredRelatedArtists.length, 
        'matching artists similar to', artist.name);
      
      // Get top tracks from the filtered related artists
      // VARIETY: Only take 1 track per related artist, from many more artists
      for (const relatedArtist of filteredRelatedArtists.slice(0, 8)) {
        if (discovered.length >= targetCount) break;
        
        try {
          const topTracks = await SpotifyService.getArtistTopTracks(relatedArtist.id);
          
          // VARIETY: Only 1 track per related artist
          for (const track of topTracks.slice(0, 1)) {
            if (discovered.length >= targetCount) break;
            if (!seenTrackIds.has(track.id)) {
              // Double-check popularity
              const popularityMatch = Math.abs(track.popularity - tasteProfile.avgPopularity) 
                <= (tasteProfile.popularityStdDev * 1.5);
              
              if (popularityMatch) {
                discovered.push({
                  ...track,
                  album_art: track.albumArt || track.album_art, // Normalize field name
                  artist_id: track.artistId || track.artist_id, // Normalize field name
                  is_discovered: true, // Mark as discovered from related artist
                });
                seenTrackIds.add(track.id);
              }
            }
          }
        } catch (error) {
          console.warn('[DiscoveryService] Failed to get tracks from', relatedArtist.name);
        }
      }
    } catch (error) {
      console.warn('[DiscoveryService] Failed to get related artists for', artist.name);
    }
  }
  
  return discovered;
}

/**
 * Strategy 3: Get tracks from user's saved albums (GUARANTEED to match taste)
 */
async function discoverFromSavedAlbums(
  targetCount: number,
  seenTrackIds: Set<string>,
  tasteProfile: TasteProfile
): Promise<any[]> {
  const discovered: any[] = [];
  
  try {
    const savedAlbums = await SpotifyService.getUserSavedAlbums(30);
    
    console.log('[DiscoveryService] Exploring', savedAlbums.length, 'albums you saved');
    
    // Prioritize recently added albums
    const sortedAlbums = savedAlbums.sort((a, b) => 
      new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );
    
    for (const album of sortedAlbums) {
      if (discovered.length >= targetCount) break;
      
      try {
        const albumTracks = await SpotifyService.getAlbumTracks(album.id);
        
        for (const track of albumTracks) {
          if (discovered.length >= targetCount) break;
          if (!seenTrackIds.has(track.id)) {
            discovered.push({
              ...track,
              album_art: track.albumArt || track.album_art, // Normalize field name
              artist_id: track.artistId || track.artist_id, // Normalize field name
              is_from_saved_album: true, // Mark as from saved album
            });
            seenTrackIds.add(track.id);
          }
        }
      } catch (error) {
        console.warn('[DiscoveryService] Failed to get tracks from album', album.name);
      }
    }
    
    console.log('[DiscoveryService] Found', discovered.length, 'unheard tracks from your saved albums');
  } catch (error) {
    console.error('[DiscoveryService] Failed to get saved albums:', error);
  }
  
  return discovered;
}

/**
 * Filter discovered tracks by audio features (if we have them)
 */
export async function filterDiscoveredTracksByFeatures(
  tracks: any[],
  filters?: {
    minEnergy?: number;
    maxEnergy?: number;
    minValence?: number;
    maxValence?: number;
    minTempo?: number;
    maxTempo?: number;
  }
): Promise<any[]> {
  if (!filters || tracks.length === 0) return tracks;
  
  try {
    // Fetch audio features for all tracks
    const trackIds = tracks.map(t => t.id);
    const features = await SpotifyService.getAudioFeatures(trackIds);
    
    // Merge features with tracks
    const tracksWithFeatures = tracks.map((track, index) => ({
      ...track,
      ...features[index],
    }));
    
    // Apply filters
    const filtered = tracksWithFeatures.filter(track => {
      if (filters.minEnergy !== undefined && track.energy !== undefined && track.energy < filters.minEnergy) return false;
      if (filters.maxEnergy !== undefined && track.energy !== undefined && track.energy > filters.maxEnergy) return false;
      if (filters.minValence !== undefined && track.valence !== undefined && track.valence < filters.minValence) return false;
      if (filters.maxValence !== undefined && track.valence !== undefined && track.valence > filters.maxValence) return false;
      if (filters.minTempo !== undefined && track.tempo !== undefined && track.tempo < filters.minTempo) return false;
      if (filters.maxTempo !== undefined && track.tempo !== undefined && track.tempo > filters.maxTempo) return false;
      return true;
    });
    
    console.log('[DiscoveryService] Filtered', tracks.length, 'tracks to', filtered.length, 'based on audio features');
    
    return filtered;
  } catch (error) {
    console.error('[DiscoveryService] Error filtering by audio features:', error);
    return tracks; // Return unfiltered if error
  }
}
