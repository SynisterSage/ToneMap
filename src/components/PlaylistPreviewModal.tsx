import React, {useState} from 'react';
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {H1, H2, H3, Body, Small} from './Typography';
import {GlassCard} from './GlassCard';
import ThemedButton from './ThemedButton';
import Icon from './Icon';
import {useTheme} from '../theme';
import type {GeneratedPlaylist, TrackWithFeatures} from '../types/playlists';

interface Props {
  visible: boolean;
  playlist: GeneratedPlaylist | null;
  onClose: () => void;
  onSave: (playlist: GeneratedPlaylist, customName?: string) => Promise<void>;
}

export default function PlaylistPreviewModal({visible, playlist, onClose, onSave}: Props) {
  const {colors, spacing} = useTheme();
  const [tracks, setTracks] = useState<TrackWithFeatures[]>([]);
  const [playlistName, setPlaylistName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (playlist && visible) {
      setTracks(playlist.tracks || []);
      setPlaylistName(playlist.name);
      setIsEditing(false);
    }
  }, [playlist, visible]);

  if (!playlist) return null;

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const calculateStats = () => {
    if (tracks.length === 0) return {avgEnergy: 0, avgValence: 0, totalDuration: 0};

    const sum = tracks.reduce(
      (acc, track) => ({
        energy: acc.energy + (track.energy || 0.5),
        valence: acc.valence + (track.valence || 0.5),
        duration: acc.duration + (track.duration_ms || 0),
      }),
      {energy: 0, valence: 0, duration: 0},
    );

    return {
      avgEnergy: Math.round((sum.energy / tracks.length) * 100),
      avgValence: Math.round((sum.valence / tracks.length) * 100),
      totalDuration: sum.duration,
    };
  };

  const handleRemoveTrack = (trackId: string) => {
    Alert.alert('Remove Track', 'Remove this track from the playlist?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setTracks(tracks.filter(t => t.id !== trackId));
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (tracks.length === 0) {
      Alert.alert('Error', 'Playlist must have at least one track');
      return;
    }

    setIsSaving(true);
    try {
      // Update playlist with edited tracks
      const updatedPlaylist: GeneratedPlaylist = {
        ...playlist,
        tracks,
        track_ids: tracks.map(t => t.id),
        total_tracks: tracks.length,
        total_duration_ms: tracks.reduce((sum, t) => sum + (t.duration_ms || 0), 0),
      };

      await onSave(updatedPlaylist, playlistName !== playlist.name ? playlistName : undefined);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save playlist');
    } finally {
      setIsSaving(false);
    }
  };

  const stats = calculateStats();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        {/* Header */}
        <View style={[styles.header, {borderBottomColor: colors.border}]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="x" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <H2 style={{color: colors.primary, flex: 1, textAlign: 'center'}}>Preview Playlist</H2>
          <View style={{width: 40}} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{padding: spacing.large}}>
          {/* Playlist Name Editor */}
          <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="medium">
            <TouchableOpacity
              style={styles.nameHeader}
              onPress={() => setIsEditing(!isEditing)}
            >
              {isEditing ? (
                <TextInput
                  style={[styles.nameInput, {color: colors.primary, borderColor: colors.primary}]}
                  value={playlistName}
                  onChangeText={setPlaylistName}
                  placeholder="Playlist Name"
                  placeholderTextColor={colors.textSecondary}
                  autoFocus
                  onBlur={() => setIsEditing(false)}
                />
              ) : (
                <>
                  <H2 style={{color: colors.primary, flex: 1}}>{playlistName}</H2>
                  <Icon name="edit-2" size={20} color={colors.textSecondary} />
                </>
              )}
            </TouchableOpacity>

            {playlist.description && (
              <Small style={{color: colors.textSecondary, marginTop: spacing.small}}>
                {playlist.description}
              </Small>
            )}
            
            {/* Context-based badge */}
            {playlist.context_snapshot?.is_context_based && (
              <View style={[styles.contextBadge, {backgroundColor: colors.accent + '20', borderColor: colors.accent, marginTop: spacing.small}]}>
                <Icon name="zap" size={14} color={colors.accent} />
                <Small style={{color: colors.accent, fontWeight: '600', marginLeft: 4}}>
                  Auto-Generated from Context
                </Small>
              </View>
            )}
          </GlassCard>

          {/* Stats Card */}
          <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="light">
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <H3 style={{color: colors.primary}}>{tracks.length}</H3>
                <Small style={{color: colors.textSecondary}}>Tracks</Small>
              </View>
              <View style={styles.statBox}>
                <H3 style={{color: colors.primary}}>{formatTotalDuration(stats.totalDuration)}</H3>
                <Small style={{color: colors.textSecondary}}>Duration</Small>
              </View>
              <View style={styles.statBox}>
                <H3 style={{color: colors.primary}}>{stats.avgEnergy}%</H3>
                <Small style={{color: colors.textSecondary}}>Energy</Small>
              </View>
              <View style={styles.statBox}>
                <H3 style={{color: colors.primary}}>{stats.avgValence}%</H3>
                <Small style={{color: colors.textSecondary}}>Mood</Small>
              </View>
            </View>
          </GlassCard>

          {/* Track List */}
          <View style={{marginBottom: spacing.large}}>
            <H3 style={{color: colors.primary, marginBottom: spacing.medium}}>
              {tracks.length} Tracks
            </H3>

            {tracks.map((track, index) => (
              <View
                key={track.id}
                style={[styles.trackCard, {backgroundColor: colors.surface}]}
              >
                <View style={styles.trackNumber}>
                  <Small style={{color: colors.textSecondary}}>{index + 1}</Small>
                </View>

                {track.album_art ? (
                  <Image source={{uri: track.album_art}} style={styles.albumArt} />
                ) : (
                  <View style={[styles.albumArt, {backgroundColor: colors.border}]}>
                    <Icon name="music" size={20} color={colors.textSecondary} />
                  </View>
                )}

                <View style={styles.trackInfo}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                    <Body style={{color: colors.primary, fontWeight: '600', flex: 1}} numberOfLines={1}>
                      {track.name}
                    </Body>
                    {/* Discovery badges */}
                    {track.is_discovered && (
                      <View style={[styles.discoveryBadge, {backgroundColor: colors.accent + '30', borderColor: colors.accent}]}>
                        <Small style={{color: colors.accent, fontSize: 9, fontWeight: '700'}}>NEW</Small>
                      </View>
                    )}
                    {track.is_from_saved_album && (
                      <View style={[styles.discoveryBadge, {backgroundColor: colors.success + '30', borderColor: colors.success}]}>
                        <Small style={{color: colors.success, fontSize: 9, fontWeight: '700'}}>SAVED</Small>
                      </View>
                    )}
                  </View>
                  <Small style={{color: colors.textSecondary}} numberOfLines={1}>
                    {track.artist}
                  </Small>
                  {/* Energy/Mood indicators */}
                  <View style={styles.trackFeatures}>
                    {track.energy !== undefined && (
                      <View style={styles.featureBadge}>
                        <Small style={{color: colors.textSecondary, fontSize: 10}}>
                          ⚡ {Math.round(track.energy * 100)}%
                        </Small>
                      </View>
                    )}
                    {track.valence !== undefined && (
                      <View style={styles.featureBadge}>
                        <Small style={{color: colors.textSecondary, fontSize: 10}}>
                          😊 {Math.round(track.valence * 100)}%
                        </Small>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.trackActions}>
                  <Small style={{color: colors.textSecondary, marginBottom: 4}}>
                    {formatDuration(track.duration_ms || 0)}
                  </Small>
                  <TouchableOpacity
                    onPress={() => handleRemoveTrack(track.id)}
                    style={[styles.removeButton, {backgroundColor: colors.error + '20'}]}
                  >
                    <Icon name="x" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Info Note */}
          <GlassCard style={{width: '100%', marginBottom: spacing.xlarge}} variant="light">
            <View style={{alignItems: 'center'}}>
              <Body style={{color: colors.textSecondary, textAlign: 'center'}}>
                💡 Remove tracks you don't like or edit the playlist name before saving to Spotify
              </Body>
            </View>
          </GlassCard>
        </ScrollView>

        {/* Footer Actions */}
        <View style={[styles.footer, {borderTopColor: colors.border, backgroundColor: colors.surface}]}>
          <ThemedButton
            title="Cancel"
            onPress={onClose}
            variant="secondary"
            style={{flex: 1, marginRight: spacing.small}}
          />
          <ThemedButton
            title={isSaving ? 'Saving...' : 'Save to Spotify'}
            onPress={handleSave}
            variant="primary"
            style={{flex: 2}}
            disabled={isSaving || tracks.length === 0}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  nameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    padding: 8,
    borderWidth: 2,
    borderRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  trackNumber: {
    width: 24,
    alignItems: 'center',
    marginRight: 8,
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  trackFeatures: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 6,
  },
  featureBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  discoveryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  trackActions: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
  },
});
