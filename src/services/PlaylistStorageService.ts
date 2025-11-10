/**
 * Playlist Storage Service
 * Manages saving, retrieving, and updating generated playlists in Supabase
 */

import {getSupabaseClient} from './database/supabase';
import {FirebaseAuthService} from './FirebaseAuthService';
import type {
  GeneratedPlaylist,
  PlaylistFeedback,
  PlaylistStats,
  PlaylistTemplate,
} from '../types/playlists';

class PlaylistStorageServiceClass {
  /**
   * Save a generated playlist to the database
   */
  async saveGeneratedPlaylist(playlist: GeneratedPlaylist): Promise<string | null> {
    try {
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) {
        console.error('[PlaylistStorage] ❌ No user ID found - user not authenticated');
        throw new Error('User not authenticated');
      }

      console.log('[PlaylistStorage] 💾 Saving playlist:', playlist.name);
      console.log('[PlaylistStorage] 👤 User ID:', userId);
      console.log('[PlaylistStorage] 🎵 Track count:', playlist.track_ids?.length || 0);

      const supabase = getSupabaseClient();

      const playlistData = {
        user_id: userId,
        name: playlist.name,
        description: playlist.description,
        context_snapshot: playlist.context_snapshot,
        track_ids: playlist.track_ids,
        total_tracks: playlist.total_tracks,
        total_duration_ms: playlist.total_duration_ms,
        spotify_playlist_id: playlist.spotify_playlist_id,
        user_rating: playlist.user_rating,
        tracks_skipped: playlist.tracks_skipped || [],
        tracks_loved: playlist.tracks_loved || [],
        created_at: playlist.created_at || new Date().toISOString(),
      };

      console.log('[PlaylistStorage] 📤 Inserting into Supabase...');

      const {data, error} = await (supabase as any)
        .from('generated_playlists')
        .insert(playlistData)
        .select()
        .single();

      if (error) {
        console.error('[PlaylistStorage] ❌ Supabase error:', error);
        console.error('[PlaylistStorage] Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      if (!data) {
        console.error('[PlaylistStorage] ❌ No data returned from insert');
        throw new Error('No data returned from Supabase');
      }

      console.log('[PlaylistStorage] ✅ Playlist saved successfully!');
      console.log('[PlaylistStorage] 🆔 Playlist ID:', data.id);
      return data.id;
    } catch (error: any) {
      console.error('[PlaylistStorage] ❌ Failed to save playlist:', error);
      console.error('[PlaylistStorage] Error message:', error?.message);
      console.error('[PlaylistStorage] Error stack:', error?.stack);
      return null;
    }
  }

  /**
   * Get all playlists for a user
   */
  async getUserPlaylists(
    userId?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<GeneratedPlaylist[]> {
    try {
      const uid = userId || FirebaseAuthService.getCurrentUserId();
      if (!uid) {
        console.error('[PlaylistStorage] ❌ No user ID - cannot fetch playlists');
        throw new Error('User not authenticated');
      }

      console.log('[PlaylistStorage] 📚 Fetching playlists for user:', uid);
      console.log('[PlaylistStorage] 📊 Limit:', limit, 'Offset:', offset);

      const supabase = getSupabaseClient();

      const {data, error} = await (supabase as any)
        .from('generated_playlists')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', {ascending: false})
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('[PlaylistStorage] ❌ Supabase error fetching playlists:', error);
        console.error('[PlaylistStorage] Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('[PlaylistStorage] ✅ Successfully fetched', data?.length || 0, 'playlists');
      
      if (data && data.length > 0) {
        console.log('[PlaylistStorage] 📋 First playlist:', data[0].name);
      } else {
        console.log('[PlaylistStorage] ⚠️  No playlists found for this user');
      }

      return data.map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        name: p.name,
        description: p.description,
        context_snapshot: p.context_snapshot,
        track_ids: p.track_ids,
        total_tracks: p.total_tracks,
        total_duration_ms: p.total_duration_ms,
        user_rating: p.user_rating,
        tracks_skipped: p.tracks_skipped || [],
        tracks_loved: p.tracks_loved || [],
        spotify_playlist_id: p.spotify_playlist_id,
        spotify_url: p.spotify_playlist_id
          ? `https://open.spotify.com/playlist/${p.spotify_playlist_id}`
          : undefined,
        created_at: p.created_at,
      }));
    } catch (error) {
      console.error('[PlaylistStorage] Failed to fetch playlists:', error);
      return [];
    }
  }

  /**
   * Get a single playlist by ID
   */
  async getPlaylistById(playlistId: string): Promise<GeneratedPlaylist | null> {
    try {
      const supabase = getSupabaseClient();

      const {data, error} = await (supabase as any)
        .from('generated_playlists')
        .select('*')
        .eq('id', playlistId)
        .single();

      if (error || !data) {
        console.error('[PlaylistStorage] Playlist not found:', error);
        return null;
      }

      return {
        id: data.id,
        user_id: data.user_id,
        name: data.name,
        description: data.description,
        context_snapshot: data.context_snapshot,
        track_ids: data.track_ids,
        total_tracks: data.total_tracks,
        total_duration_ms: data.total_duration_ms,
        user_rating: data.user_rating,
        tracks_skipped: data.tracks_skipped || [],
        tracks_loved: data.tracks_loved || [],
        spotify_playlist_id: data.spotify_playlist_id,
        spotify_url: data.spotify_playlist_id
          ? `https://open.spotify.com/playlist/${data.spotify_playlist_id}`
          : undefined,
        created_at: data.created_at,
      };
    } catch (error) {
      console.error('[PlaylistStorage] Failed to get playlist:', error);
      return null;
    }
  }

  /**
   * Update playlist rating
   */
  async updatePlaylistRating(playlistId: string, rating: number): Promise<boolean> {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      console.log('[PlaylistStorage] ⭐ Updating rating for playlist:', playlistId);

      const supabase = getSupabaseClient();

      const {error} = await (supabase as any)
        .from('generated_playlists')
        .update({user_rating: rating})
        .eq('id', playlistId);

      if (error) {
        console.error('[PlaylistStorage] Error updating rating:', error);
        throw error;
      }

      console.log('[PlaylistStorage] ✅ Rating updated to:', rating);
      return true;
    } catch (error) {
      console.error('[PlaylistStorage] Failed to update rating:', error);
      return false;
    }
  }

  /**
   * Update playlist feedback (skipped/loved tracks)
   */
  async updatePlaylistFeedback(feedback: PlaylistFeedback): Promise<boolean> {
    try {
      console.log('[PlaylistStorage] 💬 Updating feedback for:', feedback.playlist_id);

      const supabase = getSupabaseClient();

      const updates: any = {};

      if (feedback.user_rating !== undefined) {
        updates.user_rating = feedback.user_rating;
      }
      if (feedback.tracks_skipped !== undefined) {
        updates.tracks_skipped = feedback.tracks_skipped;
      }
      if (feedback.tracks_loved !== undefined) {
        updates.tracks_loved = feedback.tracks_loved;
      }

      const {error} = await (supabase as any)
        .from('generated_playlists')
        .update(updates)
        .eq('id', feedback.playlist_id);

      if (error) {
        console.error('[PlaylistStorage] Error updating feedback:', error);
        throw error;
      }

      console.log('[PlaylistStorage] ✅ Feedback updated');
      return true;
    } catch (error) {
      console.error('[PlaylistStorage] Failed to update feedback:', error);
      return false;
    }
  }

  /**
   * Delete a playlist
   */
  async deletePlaylist(playlistId: string): Promise<boolean> {
    try {
      console.log('[PlaylistStorage] 🗑️  Deleting playlist:', playlistId);

      const supabase = getSupabaseClient();

      const {error} = await (supabase as any)
        .from('generated_playlists')
        .delete()
        .eq('id', playlistId);

      if (error) {
        console.error('[PlaylistStorage] Error deleting playlist:', error);
        throw error;
      }

      console.log('[PlaylistStorage] ✅ Playlist deleted');
      return true;
    } catch (error) {
      console.error('[PlaylistStorage] Failed to delete playlist:', error);
      return false;
    }
  }

  /**
   * Update Spotify playlist ID after creation
   */
  async updateSpotifyPlaylistId(
    playlistId: string,
    spotifyPlaylistId: string,
  ): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();

      const {error} = await (supabase as any)
        .from('generated_playlists')
        .update({spotify_playlist_id: spotifyPlaylistId})
        .eq('id', playlistId);

      if (error) {
        console.error('[PlaylistStorage] Error updating Spotify ID:', error);
        throw error;
      }

      console.log('[PlaylistStorage] ✅ Spotify playlist ID updated');
      return true;
    } catch (error) {
      console.error('[PlaylistStorage] Failed to update Spotify ID:', error);
      return false;
    }
  }

  /**
   * Get playlist statistics for a user
   */
  async getPlaylistStats(userId?: string): Promise<PlaylistStats | null> {
    try {
      const uid = userId || FirebaseAuthService.getCurrentUserId();
      if (!uid) throw new Error('User not authenticated');

      console.log('[PlaylistStorage] 📊 Calculating playlist stats...');

      const supabase = getSupabaseClient();

      // Get all playlists
      const {data: playlists, error} = await (supabase as any)
        .from('generated_playlists')
        .select('*')
        .eq('user_id', uid);

      if (error || !playlists) {
        console.error('[PlaylistStorage] Error fetching playlists for stats:', error);
        return null;
      }

      // Calculate stats
      const totalPlaylists = playlists.length;
      const totalTracks = playlists.reduce(
        (sum: number, p: any) => sum + (p.total_tracks || 0),
        0,
      );

      const ratingsSum = playlists
        .filter((p: any) => p.user_rating)
        .reduce((sum: number, p: any) => sum + p.user_rating, 0);
      const ratingsCount = playlists.filter((p: any) => p.user_rating).length;
      const avgRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;

      // Find favorite template
      const templateCounts: {[key: string]: number} = {};
      const templateRatings: {[key: string]: {sum: number; count: number}} = {};

      playlists.forEach((p: any) => {
        const template = p.context_snapshot?.template || 'custom';
        templateCounts[template] = (templateCounts[template] || 0) + 1;

        if (p.user_rating) {
          if (!templateRatings[template]) {
            templateRatings[template] = {sum: 0, count: 0};
          }
          templateRatings[template].sum += p.user_rating;
          templateRatings[template].count += 1;
        }
      });

      const favoriteTemplate = Object.entries(templateCounts).sort(
        ([, a], [, b]) => b - a,
      )[0]?.[0] as PlaylistTemplate | undefined;

      // Template breakdown
      const templateBreakdown = Object.entries(templateCounts).map(([template, count]) => ({
        template: template as PlaylistTemplate,
        count,
        avg_rating: templateRatings[template]
          ? templateRatings[template].sum / templateRatings[template].count
          : 0,
      }));

      // Generation history (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentPlaylists = playlists.filter(
        (p: any) => new Date(p.created_at) >= thirtyDaysAgo,
      );

      // Group by date
      const dateCounts: {[date: string]: number} = {};
      recentPlaylists.forEach((p: any) => {
        const date = new Date(p.created_at).toISOString().split('T')[0];
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      });

      const generationHistory = Object.entries(dateCounts).map(([date, count]) => ({
        date,
        count,
      }));

      const stats: PlaylistStats = {
        total_playlists: totalPlaylists,
        total_tracks_generated: totalTracks,
        avg_rating: Math.round(avgRating * 10) / 10,
        favorite_template: favoriteTemplate,
        most_used_context: favoriteTemplate, // Could be more specific
        generation_history: generationHistory,
        template_breakdown: templateBreakdown,
      };

      console.log('[PlaylistStorage] ✅ Stats calculated:', stats);

      return stats;
    } catch (error) {
      console.error('[PlaylistStorage] Failed to calculate stats:', error);
      return null;
    }
  }

  /**
   * Get recently generated playlists
   */
  async getRecentPlaylists(limit: number = 5): Promise<GeneratedPlaylist[]> {
    return this.getUserPlaylists(undefined, limit, 0);
  }

  /**
   * Search playlists by name
   */
  async searchPlaylists(query: string, userId?: string): Promise<GeneratedPlaylist[]> {
    try {
      const uid = userId || FirebaseAuthService.getCurrentUserId();
      if (!uid) throw new Error('User not authenticated');

      const supabase = getSupabaseClient();

      const {data, error} = await (supabase as any)
        .from('generated_playlists')
        .select('*')
        .eq('user_id', uid)
        .ilike('name', `%${query}%`)
        .order('created_at', {ascending: false})
        .limit(20);

      if (error) {
        console.error('[PlaylistStorage] Error searching playlists:', error);
        return [];
      }

      return data.map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        name: p.name,
        description: p.description,
        context_snapshot: p.context_snapshot,
        track_ids: p.track_ids,
        total_tracks: p.total_tracks,
        total_duration_ms: p.total_duration_ms,
        user_rating: p.user_rating,
        tracks_skipped: p.tracks_skipped || [],
        tracks_loved: p.tracks_loved || [],
        spotify_playlist_id: p.spotify_playlist_id,
        spotify_url: p.spotify_playlist_id
          ? `https://open.spotify.com/playlist/${p.spotify_playlist_id}`
          : undefined,
        created_at: p.created_at,
      }));
    } catch (error) {
      console.error('[PlaylistStorage] Failed to search playlists:', error);
      return [];
    }
  }
}

export const PlaylistStorageService = new PlaylistStorageServiceClass();
