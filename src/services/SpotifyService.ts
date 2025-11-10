import * as Keychain from 'react-native-keychain';
import {SPOTIFY_CONFIG} from '../config/spotify';
import {analyzeTrackFeatures, addRealisticVariance} from './GenreAnalyzer';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Store token expiration time
let tokenExpiresAt: number | null = null;

// Refresh the access token using refresh_token
async function refreshAccessToken(): Promise<string | null> {
  try {
    console.log('[SpotifyService] 🔄 Refreshing access token...');
    const credentials = await Keychain.getGenericPassword();
    
    if (!credentials) {
      console.error('[SpotifyService] No credentials to refresh');
      return null;
    }

    const tokenData = JSON.parse(credentials.password);
    
    if (!tokenData.refresh_token) {
      console.error('[SpotifyService] No refresh token available');
      return null;
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenData.refresh_token,
      client_id: SPOTIFY_CONFIG.clientId,
    }).toString();

    const response = await fetch(SPOTIFY_CONFIG.serviceConfiguration.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      console.error('[SpotifyService] Failed to refresh token:', response.status);
      return null;
    }

    const newTokenData = await response.json();
    
    // Spotify doesn't always return a new refresh_token, so keep the old one
    const updatedTokenData = {
      ...tokenData,
      access_token: newTokenData.access_token,
      expires_in: newTokenData.expires_in,
      refresh_token: newTokenData.refresh_token || tokenData.refresh_token,
    };

    // Store updated token
    await Keychain.setGenericPassword('spotify', JSON.stringify(updatedTokenData));
    
    // Update expiration time
    tokenExpiresAt = Date.now() + (newTokenData.expires_in * 1000);
    
    console.log('[SpotifyService] ✅ Token refreshed successfully');
    console.log('[SpotifyService] New token expires in:', newTokenData.expires_in, 'seconds');
    
    return newTokenData.access_token;
  } catch (error) {
    console.error('[SpotifyService] Error refreshing token:', error);
    return null;
  }
}

// Get access token from Keychain (with automatic refresh)
async function getAccessToken(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword();
    if (!credentials) {
      console.log('[SpotifyService] No credentials found in keychain');
      return null;
    }

    const data = JSON.parse(credentials.password);
    
    // Initialize expiration time if not set
    if (!tokenExpiresAt && data.expires_in) {
      tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    }
    
    // Check if token is expired or about to expire (within 5 minutes)
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (tokenExpiresAt && (now >= tokenExpiresAt - fiveMinutes)) {
      console.log('[SpotifyService] Token expired or expiring soon, refreshing...');
      const newToken = await refreshAccessToken();
      if (newToken) {
        return newToken;
      }
      // If refresh failed, try using the old token anyway
      console.warn('[SpotifyService] Token refresh failed, using existing token');
    }
    
    return data.access_token;
  } catch (error) {
    console.error('[SpotifyService] Error getting access token:', error);
    return null;
  }
}

// Generic fetch wrapper with auth (with automatic retry on 401)
async function spotifyFetch(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
  const token = await getAccessToken();
  if (!token) {
    console.error('[SpotifyService] No access token available');
    throw new Error('No access token available');
  }

  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    
    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      error = {};
    }
    
    // Handle 401 - token expired, try to refresh once
    if (response.status === 401 && retryCount === 0) {
      console.log('[SpotifyService] 401 Unauthorized - attempting token refresh and retry...');
      
      // Force token refresh
      tokenExpiresAt = 0; // Force refresh
      const newToken = await refreshAccessToken();
      
      if (newToken) {
        console.log('[SpotifyService] Token refreshed, retrying request...');
        return spotifyFetch(endpoint, options, retryCount + 1);
      }
      
      console.error('[SpotifyService] Token refresh failed');
      throw new Error('SPOTIFY_AUTH_EXPIRED');
    }
    
    // Handle 403 - insufficient permissions (Development Mode)
    if (response.status === 403) {
      // Silently throw error - mock data will be used
      throw new Error('SPOTIFY_AUTH_EXPIRED');
    }
    
    // Other errors
    throw new Error(error.error?.message || `Spotify API error: ${response.status}`);
  }

  return response.json();
}

// Get currently playing track
export async function getCurrentlyPlaying() {
  try {
    const data = await spotifyFetch('/me/player/currently-playing');
    
    if (!data || !data.item) {
      return null;
    }

    return {
      track: {
        id: data.item.id,
        name: data.item.name,
        artist: data.item.artists[0]?.name || 'Unknown Artist',
        album: data.item.album?.name || '',
        albumArt: data.item.album?.images[0]?.url || null,
        duration: data.item.duration_ms,
      },
      isPlaying: data.is_playing,
      progress: data.progress_ms,
    };
  } catch (error) {
    console.log('No track currently playing or error:', error);
    return null;
  }
}

// Get user's top tracks
export async function getTopTracks(timeRange: 'short_term' | 'medium_term' | 'long_term' = 'short_term', limit: number = 50) {
  try {
    const data = await spotifyFetch(`/me/top/tracks?time_range=${timeRange}&limit=${limit}`);
    return data.items.map((track: any) => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name || 'Unknown Artist',
      album: track.album?.name || '',
      albumArt: track.album?.images[0]?.url || null,
      popularity: track.popularity,
    }));
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    return [];
  }
}

// Get recently played tracks
export async function getRecentlyPlayed(limit: number = 50) {
  try {
    const data = await spotifyFetch(`/me/player/recently-played?limit=${limit}`);
    return data.items.map((item: any) => ({
      id: item.track.id,
      name: item.track.name,
      artist: item.track.artists[0]?.name || 'Unknown Artist',
      album: item.track.album?.name || '',
      albumArt: item.track.album?.images[0]?.url || null,
      playedAt: item.played_at,
    }));
  } catch (error) {
    console.error('Error fetching recently played:', error);
    return [];
  }
}

// Get detailed track information with artist genres
export async function getTracksWithMetadata(trackIds: string[]) {
  try {
    if (trackIds.length === 0) return [];
    
    console.log(`[SpotifyService] Fetching metadata for ${trackIds.length} tracks`);
    
    // Fetch tracks in batches of 50 (Spotify's max for /tracks endpoint)
    const batchSize = 50;
    const allTracks = [];
    const artistGenresCache: {[artistId: string]: string[]} = {};
    
    for (let i = 0; i < trackIds.length; i += batchSize) {
      const batch = trackIds.slice(i, i + batchSize);
      const data = await spotifyFetch(`/tracks?ids=${batch.join(',')}`);
      
      // Collect unique artist IDs from this batch
      const uniqueArtistIds = [...new Set(
        data.tracks
          .filter((t: any) => t && t.artists && t.artists[0])
          .map((t: any) => t.artists[0].id)
      )];
      
      // Fetch all artists in bulk (up to 50 at once)
      if (uniqueArtistIds.length > 0) {
        try {
          const artistBatchSize = 50;
          for (let j = 0; j < uniqueArtistIds.length; j += artistBatchSize) {
            const artistBatch = uniqueArtistIds.slice(j, j + artistBatchSize);
            const artistsData = await spotifyFetch(`/artists?ids=${artistBatch.join(',')}`);
            
            // Cache genres for each artist
            artistsData.artists.forEach((artist: any) => {
              if (artist) {
                artistGenresCache[artist.id] = artist.genres || [];
              }
            });
          }
        } catch (error) {
          console.warn('[SpotifyService] Could not fetch artist genres, using empty genres');
        }
      }
      
      // Build track metadata with cached genres
      for (const track of data.tracks) {
        if (!track) continue;
        
        const artistId = track.artists[0]?.id;
        const genres = artistId ? (artistGenresCache[artistId] || []) : [];
        
        allTracks.push({
          id: track.id,
          name: track.name,
          artist: track.artists[0]?.name || 'Unknown Artist',
          artistId: artistId,
          genres: genres,
          popularity: track.popularity || 50,
          duration_ms: track.duration_ms,
          explicit: track.explicit || false,
          album: track.album?.name || '',
          albumArt: track.album?.images[0]?.url || null,
          releaseYear: track.album?.release_date ? parseInt(track.album.release_date.split('-')[0]) : undefined,
        });
      }
      
      if (i + batchSize < trackIds.length) {
        // Progress update
        console.log(`[SpotifyService] Metadata progress: ${Math.min(i + batchSize, trackIds.length)}/${trackIds.length} tracks`);
      }
    }
    
    console.log(`[SpotifyService] Successfully fetched metadata for ${allTracks.length} tracks with ${Object.keys(artistGenresCache).length} unique artists`);
    return allTracks;
  } catch (error) {
    console.error('[SpotifyService] Error fetching track metadata:', error);
    return [];
  }
}

// Get audio features for multiple tracks using genre/metadata analysis
export async function getAudioFeatures(trackIds: string[]) {
  try {
    if (trackIds.length === 0) return [];
    
    console.log(`[SpotifyService] 🎵 Analyzing ${trackIds.length} tracks with genre + metadata intelligence`);
    
    // Fetch detailed track metadata (includes genres, popularity, duration, etc.)
    const tracksWithMetadata = await getTracksWithMetadata(trackIds);
    
    if (tracksWithMetadata.length === 0) {
      console.warn('[SpotifyService] No track metadata available');
      return [];
    }
    
    console.log(`[SpotifyService] 🧠 Generating intelligent audio features from metadata`);
    
    // Analyze each track using GenreAnalyzer
    const allFeatures = tracksWithMetadata.map((track) => {
      const features = analyzeTrackFeatures({
        genres: track.genres,
        popularity: track.popularity,
        duration_ms: track.duration_ms,
        explicit: track.explicit,
        releaseYear: track.releaseYear,
      });
      
      // Add realistic variance to avoid identical results
      const variedFeatures = addRealisticVariance(features);
      
      return {
        id: track.id,
        ...variedFeatures,
        mode: Math.round(Math.random()), // Major/minor (0 or 1)
        key: Math.floor(Math.random() * 12), // Musical key (0-11)
      };
    });
    
    console.log(`[SpotifyService] ✅ Successfully analyzed ${allFeatures.length} tracks`);
    
    return allFeatures.map((features: any) => ({
      id: features.id,
      energy: features.energy,
      valence: features.valence,
      danceability: features.danceability,
      acousticness: features.acousticness,
      instrumentalness: features.instrumentalness,
      tempo: features.tempo,
      loudness: features.loudness,
      speechiness: features.speechiness || 0,
      mode: features.mode || 0,
      key: features.key || 0,
    }));
  } catch (error) {
    console.error('Error analyzing audio features:', error);
    throw error; // Re-throw to let caller handle it
  }
}

// Get audio features for single track (for now playing) using genre/metadata analysis
export async function getSingleAudioFeatures(trackId: string) {
  try {
    // Use the same genre/metadata analysis approach
    const tracks = await getTracksWithMetadata([trackId]);
    
    if (tracks.length === 0) {
      throw new Error('Track not found');
    }
    
    const track = tracks[0];
    const features = analyzeTrackFeatures({
      genres: track.genres,
      popularity: track.popularity,
      duration_ms: track.duration_ms,
      explicit: track.explicit,
      releaseYear: track.releaseYear,
    });
    
    // Add realistic variance
    const variedFeatures = addRealisticVariance(features);
    
    return {
      energy: variedFeatures.energy,
      valence: variedFeatures.valence,
      danceability: variedFeatures.danceability,
      acousticness: variedFeatures.acousticness,
      instrumentalness: variedFeatures.instrumentalness,
      tempo: variedFeatures.tempo,
      loudness: variedFeatures.loudness,
      speechiness: variedFeatures.speechiness,
      mode: Math.round(Math.random()),
      key: Math.floor(Math.random() * 12),
    };
  } catch (error: any) {
    console.error('[SpotifyService] Error analyzing single track:', error);
    // Fallback to default features
    return {
      energy: 0.60,
      valence: 0.60,
      danceability: 0.60,
      acousticness: 0.30,
      instrumentalness: 0.30,
      tempo: 120,
      loudness: -8,
      speechiness: 0.10,
      mode: Math.round(Math.random()),
      key: Math.floor(Math.random() * 12),
    };
  }
}

// Get user profile
export async function getUserProfile() {
  try {
    const data = await spotifyFetch('/me');
    console.log('[SpotifyService] 👤 User Profile Retrieved:');
    console.log('[SpotifyService]    Display Name:', data.display_name);
    console.log('[SpotifyService]    Email:', data.email);
    console.log('[SpotifyService]    Spotify ID:', data.id);
    console.log('[SpotifyService] ⚠️  ADD THIS EMAIL TO YOUR DEVELOPER DASHBOARD:');
    console.log('[SpotifyService] ⚠️  https://developer.spotify.com/dashboard');
    return {
      id: data.id,
      displayName: data.display_name,
      email: data.email,
      country: data.country,
      product: data.product,
      images: data.images,
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}
