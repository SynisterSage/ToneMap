import React, {useState, useEffect, useCallback} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Text,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {H1, H2, H3, Body, Small} from '../components/Typography';
import {useTheme} from '../theme';
import {GlassCard} from '../components/GlassCard';
import ThemedButton from '../components/ThemedButton';
import Icon from '../components/Icon';
import PlaylistPreviewModal from '../components/PlaylistPreviewModal';
import CustomPlaylistBuilderModal from '../components/CustomPlaylistBuilderModal';
import {PlaylistGenerationService} from '../services/PlaylistGenerationService';
import {PlaylistStorageService} from '../services/PlaylistStorageService';
import {TemplateRecommendationService} from '../services/TemplateRecommendationService';
import {ContextTrackingService} from '../services/ContextTrackingService';
import {NotificationService} from '../services/NotificationService';
import {FirebaseAuthService} from '../services/FirebaseAuthService';
import type {PlaylistTemplate, GeneratedPlaylist, PlaylistFilters} from '../types/playlists';
import type {TemplateRecommendation} from '../services/TemplateRecommendationService';

export default function PlaylistsScreen({route}: {route?: any}) {
  const {colors, spacing} = useTheme();
  const [loading, setLoading] = useState<string | null>(null);
  const [savedPlaylists, setSavedPlaylists] = useState<GeneratedPlaylist[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [previewPlaylist, setPreviewPlaylist] = useState<GeneratedPlaylist | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [suggestions, setSuggestions] = useState<TemplateRecommendation[]>([]);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<GeneratedPlaylist | null>(null);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [contextualPlaylists, setContextualPlaylists] = useState<GeneratedPlaylist[]>([]);

  // Get all templates for horizontal scroll
  const allTemplates = TemplateRecommendationService.getAllTemplates();

  useEffect(() => {
    initializeContextTracking();
    loadSavedPlaylists();
    loadStats();
    loadSuggestions();
    loadContextualPlaylists();
  }, []);

  // Refresh playlists when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[PlaylistsScreen] Screen focused - refreshing playlists');
      loadSavedPlaylists();
      loadStats();
      
      // Check if we were navigated here with a specific playlist to highlight
      if (route?.params?.refresh) {
        console.log('[PlaylistsScreen] Refresh requested from navigation');
      }
      if (route?.params?.playlistId) {
        console.log('[PlaylistsScreen] Highlighting playlist:', route.params.playlistId);
        // Scroll to and highlight the playlist
      }
    }, [route?.params])
  );

  const initializeContextTracking = async () => {
    try {
      // Request notification permissions
      await NotificationService.promptForPermission();
      
      // Start tracking context changes
      await ContextTrackingService.startTracking();
      
      console.log('[PlaylistsScreen] ✅ Context tracking initialized');
    } catch (error) {
      console.error('[PlaylistsScreen] Error initializing context tracking:', error);
    }
  };

  const loadSuggestions = () => {
    // Get template suggestions based on current context
    const contextSuggestions = TemplateRecommendationService.getSuggestedTemplates();
    setSuggestions(contextSuggestions);
  };

  const loadContextualPlaylists = async () => {
    try {
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) return;

      // Get auto-generated contextual playlists
      const contextPlaylists = await ContextTrackingService.getContextualSuggestions(userId);
      setContextualPlaylists(contextPlaylists);
      
      console.log('[PlaylistsScreen] 📋 Loaded', contextPlaylists.length, 'contextual playlists');
    } catch (error) {
      console.error('[PlaylistsScreen] Error loading contextual playlists:', error);
    }
  };

  const loadSavedPlaylists = async () => {
    try {
      console.log('[PlaylistsScreen] 📚 Loading saved playlists...');
      const playlists = await PlaylistStorageService.getUserPlaylists(undefined, 10);
      console.log('[PlaylistsScreen] ✅ Loaded', playlists.length, 'playlists');
      setSavedPlaylists(playlists);
    } catch (error) {
      console.error('[PlaylistsScreen] ❌ Error loading playlists:', error);
    }
  };

  const loadStats = async () => {
    try {
      const statistics = await PlaylistStorageService.getPlaylistStats();
      setStats(statistics);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleGenerate = async (template: PlaylistTemplate) => {
    try {
      setLoading(template);

      console.log('[PlaylistsScreen] 🎵 Generating playlist:', template);

      // Generate the playlist
      const playlist = await PlaylistGenerationService.generateFromTemplate(template, {
        track_limit: 25,
        smart_transitions: true,
        diversity_level: 'high',
        include_discovery: true, // Enable discovery mode
      });

      if (!playlist) {
        throw new Error('Failed to generate playlist');
      }

      console.log('[PlaylistsScreen] ✅ Playlist generated with', playlist.tracks?.length, 'tracks');

      // Show preview modal instead of saving immediately
      setPreviewPlaylist(playlist);
      setShowPreview(true);
    } catch (error: any) {
      console.error('[PlaylistsScreen] Error:', error);
      
      // More helpful error messages
      const templateInfo = allTemplates.find(t => t.id === template);
      const errorMessage = error.message || 'Failed to generate playlist';
      
      if (errorMessage.includes('No tracks found')) {
        Alert.alert(
          `Couldn't Generate ${templateInfo?.name || 'Playlist'}`,
          `We couldn't find enough tracks in your listening history that match this template.\n\nTry:\n• Listening to more music on Spotify\n• Using a different template\n• Building a custom playlist with broader filters`,
          [{text: 'OK'}]
        );
      } else if (errorMessage.includes('not authenticated')) {
        Alert.alert(
          'Authentication Required',
          'Please log in to Spotify to generate playlists.',
          [{text: 'OK'}]
        );
      } else {
        Alert.alert(
          'Generation Failed',
          errorMessage,
          [{text: 'OK'}]
        );
      }
    } finally {
      setLoading(null);
    }
  };

  const handleSavePlaylist = async (playlist: GeneratedPlaylist, customName?: string) => {
    try {
      console.log('[PlaylistsScreen] 💾 Saving to Spotify...');

      // Save to Spotify and database
      const result = await PlaylistGenerationService.saveToSpotify(playlist, customName);

      if (result.success) {
        // Refresh the list
        await loadSavedPlaylists();
        
        Alert.alert(
          '🎉 Playlist Created!',
          `Your playlist has been saved to Spotify!`,
          [
            {
              text: 'View on Spotify',
              onPress: () => result.spotifyUrl && Linking.openURL(result.spotifyUrl),
            },
            {text: 'OK'},
          ],
        );
      } else {
        throw new Error('Failed to save to Spotify');
      }
    } catch (error: any) {
      console.error('[PlaylistsScreen] Save error:', error);
      Alert.alert('Error', error.message || 'Failed to save playlist to Spotify');
      throw error;
    }
  };

  const handleOpenPlaylist = (playlist: GeneratedPlaylist) => {
    if (playlist.spotify_url) {
      Linking.openURL(playlist.spotify_url);
    }
  };

  const handleGenerateCustom = async (filters: PlaylistFilters, name: string, trackCount: number) => {
    try {
      console.log('[PlaylistsScreen] 🎨 Generating custom playlist:', name);

      const playlist = await PlaylistGenerationService.generateCustom(filters, {
        track_limit: trackCount,
        smart_transitions: true,
        diversity_level: 'high',
        include_discovery: true,
      });

      if (!playlist) {
        throw new Error('Failed to generate playlist');
      }

      // Show preview
      playlist.name = name;
      setPreviewPlaylist(playlist);
      setShowPreview(true);
    } catch (error: any) {
      console.error('[PlaylistsScreen] Custom generation error:', error);
      Alert.alert(
        'Generation Failed',
        error.message || 'Failed to generate custom playlist',
        [{text: 'OK'}]
      );
      throw error;
    }
  };

  const handleDeletePlaylist = (playlist: GeneratedPlaylist) => {
    setSelectedPlaylist(playlist);
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"? This will also remove it from Spotify.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[PlaylistsScreen] 🗑️ Deleting playlist:', playlist.id);
              
              // Delete from Spotify first
              if (playlist.spotify_playlist_id) {
                const SpotifyService = await import('../services/SpotifyService');
                const spotifyDeleted = await SpotifyService.deletePlaylist(playlist.spotify_playlist_id);
                if (!spotifyDeleted) {
                  console.warn('[PlaylistsScreen] Failed to delete from Spotify, but will remove from database');
                }
              }
              
              // Delete from database
              const dbDeleted = playlist.id ? await PlaylistStorageService.deletePlaylist(playlist.id) : false;
              
              if (dbDeleted) {
                await loadSavedPlaylists();
                await loadStats();
                Alert.alert('✅ Deleted', 'Playlist removed from Spotify and ToneMap');
              } else {
                Alert.alert('Error', 'Failed to delete playlist');
              }
            } catch (error) {
              console.error('[PlaylistsScreen] Delete error:', error);
              Alert.alert('Error', 'Failed to delete playlist');
            }
          },
        },
      ]
    );
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
      {/* Preview Modal */}
      <PlaylistPreviewModal
        visible={showPreview}
        playlist={previewPlaylist}
        onClose={() => {
          setShowPreview(false);
          setPreviewPlaylist(null);
        }}
        onSave={handleSavePlaylist}
      />

      {/* Custom Builder Modal */}
      <CustomPlaylistBuilderModal
        visible={showCustomBuilder}
        onClose={() => setShowCustomBuilder(false)}
        onGenerate={handleGenerateCustom}
      />

      <ScrollView contentContainerStyle={[styles.container, {padding: spacing.large}]}>
        <H1 style={{marginBottom: spacing.small, color: colors.primary}}>Playlists</H1>
        <Body style={{marginBottom: spacing.large, color: colors.textSecondary}}>
          AI-powered playlists based on your listening patterns
        </Body>

        {/* Stats Card */}
        {stats && (
          <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="medium">
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <H2 style={{color: colors.primary}}>{stats.total_playlists}</H2>
                <Small style={{color: colors.textSecondary}}>Created</Small>
              </View>
              <View style={styles.statItem}>
                <H2 style={{color: colors.primary}}>{stats.total_tracks_generated}</H2>
                <Small style={{color: colors.textSecondary}}>Tracks</Small>
              </View>
              <View style={styles.statItem}>
                <H2 style={{color: colors.primary}}>⭐ {stats.avg_rating.toFixed(1)}</H2>
                <Small style={{color: colors.textSecondary}}>Avg Rating</Small>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Auto-Generated Contextual Playlists */}
        {contextualPlaylists.length > 0 && (
          <>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.medium}}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Icon name="zap" size={20} color={colors.accent} />
                <H3 style={{marginLeft: 8, color: colors.primary}}>Ready for You</H3>
              </View>
              <TouchableOpacity onPress={() => ContextTrackingService.generateForCurrentContext()}>
                <Icon name="refresh-cw" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {contextualPlaylists.map((playlist, index) => (
              <TouchableOpacity
                key={playlist.id || index}
                style={[styles.contextualCard, {backgroundColor: colors.surface, borderColor: colors.accent}]}
                onPress={() => {
                  setPreviewPlaylist(playlist);
                  setShowPreview(true);
                }}
              >
                <View style={[styles.suggestionGlow, {backgroundColor: colors.accent + '20'}]} />
                
                <View style={{flex: 1}}>
                  <View style={styles.suggestionHeader}>
                    <Icon name="sparkles" size={18} color={colors.accent} />
                    <Body style={{marginLeft: 8, color: colors.primary, fontWeight: '600'}}>
                      {playlist.name}
                    </Body>
                  </View>
                  <Small style={{color: colors.textSecondary, marginTop: 4}}>
                    {playlist.description || 'Auto-generated just for you'}
                  </Small>
                  <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 8}}>
                    <View style={[styles.autoBadge, {backgroundColor: colors.accent + '30', borderColor: colors.accent}]}>
                      <Small style={{color: colors.accent, fontSize: 10, fontWeight: '700'}}>AUTO</Small>
                    </View>
                    <Small style={{color: colors.textSecondary, marginLeft: 8}}>
                      {playlist.total_tracks} tracks • {formatDate(playlist.created_at || new Date().toISOString())}
                    </Small>
                  </View>
                </View>

                <Icon name="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Template Suggestions */}
        {suggestions.length > 0 && (
          <>
            <H3 style={{marginTop: spacing.large, marginBottom: spacing.medium, color: colors.primary}}>
              ✨ Suggested for You
            </H3>
            
            {suggestions.map((suggestion) => {
              const template = allTemplates.find(t => t.id === suggestion.template);
              if (!template) return null;
              
              return (
                <TouchableOpacity
                  key={suggestion.template}
                  style={[styles.suggestionCard, {backgroundColor: colors.surface}]}
                  onPress={() => handleGenerate(suggestion.template)}
                  disabled={loading !== null}
                >
                  <View style={[styles.suggestionGlow, {backgroundColor: template.color + '20'}]} />
                  
                  <View style={{flex: 1}}>
                    <View style={styles.suggestionHeader}>
                      <Text style={{fontSize: 28}}>{template.emoji}</Text>
                      <View style={{marginLeft: spacing.medium, flex: 1}}>
                        <H3 style={{color: colors.primary}}>{template.name}</H3>
                        <Small style={{color: colors.textSecondary, marginTop: 2}}>
                          {suggestion.reason}
                        </Small>
                      </View>
                    </View>
                  </View>
                  
                  {loading === suggestion.template ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <View style={[styles.suggestionButton, {backgroundColor: template.color + '30'}]}>
                      <Icon name="play" size={20} color={template.color} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Quick Templates Horizontal Scroll */}
        <View style={styles.templatesSection}>
          <H3 style={{marginBottom: spacing.medium, color: colors.primary}}>Quick Generate</H3>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templatesScroll}
          >
            {allTemplates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templatePill,
                  {
                    backgroundColor: colors.surface,
                    borderColor: template.color + '40',
                  },
                  loading === template.id && {borderColor: template.color},
                ]}
                onPress={() => handleGenerate(template.id)}
                disabled={loading !== null}
              >
                {loading === template.id ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <>
                    <Text style={{fontSize: 20}}>{template.emoji}</Text>
                    <Small style={{color: colors.primary, marginLeft: spacing.small}}>
                      {template.name}
                    </Small>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Custom Builder Button */}
        <TouchableOpacity
          style={[styles.customButton, {backgroundColor: colors.accent + '15', borderColor: colors.accent}]}
          onPress={() => setShowCustomBuilder(true)}
        >
          <Icon name="sliders" size={24} color={colors.accent} />
          <View style={{marginLeft: spacing.medium, flex: 1}}>
            <H3 style={{color: colors.accent}}>Custom Playlist Builder</H3>
            <Small style={{color: colors.textSecondary}}>Fine-tune every detail</Small>
          </View>
          <Icon name="chevron-right" size={20} color={colors.accent} />
        </TouchableOpacity>

        {/* Saved Playlists */}
        {savedPlaylists.length > 0 && (
          <>
            <H3 style={{marginTop: spacing.large, marginBottom: spacing.medium, color: colors.primary}}>
              Your Playlists
            </H3>
            
            {savedPlaylists.map((playlist) => (
              <TouchableOpacity
                key={playlist.id}
                style={[styles.playlistItem, {backgroundColor: colors.surface}]}
                onPress={() => handleOpenPlaylist(playlist)}
                onLongPress={() => handleDeletePlaylist(playlist)}
              >
                <View style={[styles.playlistIcon, {backgroundColor: colors.primary + '20'}]}>
                  <Icon name="music" size={20} color={colors.primary} />
                </View>
                
                <View style={{flex: 1}}>
                  <H3 style={{color: colors.primary}}>{playlist.name}</H3>
                  <View style={styles.playlistMeta}>
                    <Small style={{color: colors.textSecondary}}>
                      {playlist.total_tracks} tracks • {formatDuration(playlist.total_duration_ms)}
                    </Small>
                    <Small style={{color: colors.textSecondary, marginLeft: spacing.small}}>
                      • {formatDate(playlist.created_at)}
                    </Small>
                  </View>
                  {playlist.user_rating && (
                    <Small style={{color: colors.warning, marginTop: 4}}>
                      {'⭐'.repeat(playlist.user_rating)}
                    </Small>
                  )}
                </View>
                
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                  <TouchableOpacity
                    onPress={() => handleDeletePlaylist(playlist)}
                    style={{padding: 8}}
                  >
                    <Icon name="trash-2" size={18} color={colors.error} />
                  </TouchableOpacity>
                  <Icon name="external-link" size={18} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Empty State */}
        {savedPlaylists.length === 0 && !loading && (
          <GlassCard style={{width: '100%', marginTop: spacing.large, padding: spacing.xlarge}} variant="light">
            <View style={{alignItems: 'center'}}>
              <Text style={{fontSize: 48, marginBottom: spacing.medium}}>🎵</Text>
              <H3 style={{color: colors.primary, textAlign: 'center', marginBottom: spacing.small}}>
                No playlists yet
              </H3>
              <Body style={{color: colors.textSecondary, textAlign: 'center'}}>
                Generate your first AI-powered playlist above!
              </Body>
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  container: {flexGrow: 1, paddingVertical: 40},
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  // Contextual Playlists (Auto-generated)
  contextualCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
  },
  autoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  // Template Suggestion Styles
  suggestionCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  suggestionGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  // Horizontal Templates Styles
  templatesSection: {
    marginBottom: 24,
  },
  templatesScroll: {
    paddingRight: 16,
  },
  templatePill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    minWidth: 120,
  },
  templateIcon: {
    marginBottom: 8,
  },
  customButton: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 16,
  },
  playlistItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  playlistMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
});
