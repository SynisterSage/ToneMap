import React, {useState, useEffect} from 'react';
import {SafeAreaView, StyleSheet, View, ScrollView, Dimensions, Image, ActivityIndicator, Alert} from 'react-native';
import {H1, H2, Body} from '../components/Typography';
import {useTheme} from '../theme';
import {GlassCard} from '../components/GlassCard';
import ThemedButton from '../components/ThemedButton';
import Icon from '../components/Icon';
import WaveformVisualizer from '../components/WaveformVisualizer';
import TonePrintStory from '../components/TonePrintStory';
import * as SpotifyService from '../services/SpotifyService';
import {calculateTonePrint, getMoodEmoji, getEnergyLevel, TonePrint} from '../services/TonePrintEngine';

const {width} = Dimensions.get('window');

interface CurrentTrack {
  track: {
    id: string;
    name: string;
    artist: string;
    albumArt: string | null;
  };
  isPlaying: boolean;
  audioFeatures?: {
    energy: number;
    valence: number;
    tempo: number;
  };
}

export default function TonePrintScreen() {
  const {colors, spacing} = useTheme();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [tonePrint, setTonePrint] = useState<TonePrint | null>(null);
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [showStory, setShowStory] = useState(false);

  useEffect(() => {
    // Initial load
    fetchCurrentlyPlaying();
    
    // Poll for currently playing every 30 seconds
    const interval = setInterval(fetchCurrentlyPlaying, 30000);
    
    return () => clearInterval(interval);
  }, []);

  async function fetchCurrentlyPlaying() {
    try {
      setLoadingCurrent(true);
      const playing = await SpotifyService.getCurrentlyPlaying();
      
      if (playing && playing.track) {
        // Fetch audio features for current track
        const features = await SpotifyService.getSingleAudioFeatures(playing.track.id);
        
        setCurrentTrack({
          track: playing.track,
          isPlaying: playing.isPlaying,
          audioFeatures: features || undefined,
        });
      } else {
        setCurrentTrack(null);
      }
    } catch (error: any) {
      console.error('Error fetching currently playing:', error);
      // Don't show error for currently playing - just silently fail
      if (error.message !== 'SPOTIFY_AUTH_EXPIRED') {
        setCurrentTrack(null);
      }
    } finally {
      setLoadingCurrent(false);
    }
  }

  async function handleAnalyze() {
    setIsAnalyzing(true);
    setAnalysisProgress('');
    try {
      setAnalysisProgress('Fetching your top tracks...');
      const topTracks = await SpotifyService.getTopTracks('short_term', 50);
      console.log(`Got ${topTracks.length} top tracks`);
      
      setAnalysisProgress('Fetching recently played...');
      const recentTracks = await SpotifyService.getRecentlyPlayed(50);
      console.log(`Got ${recentTracks.length} recent tracks`);
      
      // Combine and deduplicate tracks
      const allTracks = [...topTracks, ...recentTracks];
      const uniqueTrackIds = [...new Set(allTracks.map(t => t.id))];
      console.log(`Total unique tracks: ${uniqueTrackIds.length}`);
      
      setAnalysisProgress(`Analyzing ${uniqueTrackIds.length} tracks...`);
      const audioFeatures = await SpotifyService.getAudioFeatures(uniqueTrackIds);
      console.log(`Got audio features for ${audioFeatures.length} tracks`);
      
      setAnalysisProgress('Calculating your TonePrint...');
      const calculatedTonePrint = calculateTonePrint(audioFeatures);
      console.log('🎵 TonePrint calculated:', calculatedTonePrint);
      console.log(`🎭 Your Listening Persona: ${calculatedTonePrint.listeningPersona}`);
      console.log(`⚡ Intensity Score: ${calculatedTonePrint.intensityScore}/100`);
      console.log(`🎯 Diversity Score: ${calculatedTonePrint.diversityScore}/100`);
      console.log(`🎤 Vocal Preference: ${calculatedTonePrint.vocalPreference}/100`);
      console.log(`🔥 Top Vibe: ${calculatedTonePrint.dominantVibe} (${calculatedTonePrint.vibeCategories[calculatedTonePrint.dominantVibe]}%)`);
      console.log(`📊 All Vibes:`, calculatedTonePrint.vibeCategories);
      
      setTonePrint(calculatedTonePrint);
      setAnalysisProgress('');
      
      // Launch story mode after successful analysis
      setTimeout(() => {
        setShowStory(true);
      }, 500);
    } catch (error: any) {
      console.error('Error analyzing:', error);
      setAnalysisProgress('');
      
      if (error.message === 'SPOTIFY_AUTH_EXPIRED') {
        Alert.alert(
          'Session Expired',
          'Your Spotify session has expired. Please log out and log back in to continue.',
          [
            {text: 'OK', style: 'default'}
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to analyze listening data. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleCloseStory() {
    setShowStory(false);
  }

  function handleViewStory() {
    if (tonePrint) {
      setShowStory(true);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
      <ScrollView contentContainerStyle={[styles.container, {padding: spacing.large}]}>
        <H1 style={{marginBottom: spacing.large, color: colors.primary}}>Your TonePrint</H1>
        
        {/* Now Playing Card */}
        {loadingCurrent ? (
          <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="medium">
            <ActivityIndicator color={colors.primary} />
            <Body style={{textAlign: 'center', marginTop: spacing.small, color: colors.textSecondary}}>
              Checking what's playing...
            </Body>
          </GlassCard>
        ) : currentTrack ? (
          <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="heavy">
            <View style={styles.nowPlayingHeader}>
              <Icon name="music" size={20} color={colors.success} />
              <Body style={{marginLeft: spacing.small, color: colors.success, fontWeight: '600'}}>
                {currentTrack.isPlaying ? 'Now Playing' : 'Paused'}
              </Body>
            </View>
            
            <View style={styles.nowPlayingContent}>
              {currentTrack.track.albumArt && (
                <Image 
                  source={{uri: currentTrack.track.albumArt}} 
                  style={styles.albumArt}
                />
              )}
              <View style={{flex: 1}}>
                <H2 style={{color: colors.textPrimary, marginBottom: 4}}>{currentTrack.track.name}</H2>
                <Body style={{color: colors.textSecondary, marginBottom: spacing.medium}}>
                  {currentTrack.track.artist}
                </Body>
                
                {currentTrack.audioFeatures && (
                  <View style={styles.audioFeaturesRow}>
                    <View style={styles.featureBadge}>
                      <Body style={{fontSize: 12, color: colors.textPrimary}}>
                        Energy: {Math.round(currentTrack.audioFeatures.energy * 100)}%
                      </Body>
                    </View>
                    <View style={styles.featureBadge}>
                      <Body style={{fontSize: 12, color: colors.textPrimary}}>
                        {getMoodEmoji(currentTrack.audioFeatures.valence)} {Math.round(currentTrack.audioFeatures.valence * 100)}%
                      </Body>
                    </View>
                    <View style={styles.featureBadge}>
                      <Body style={{fontSize: 12, color: colors.textPrimary}}>
                        {Math.round(currentTrack.audioFeatures.tempo)} BPM
                      </Body>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </GlassCard>
        ) : null}
        
        {/* Interactive Visualizer Frame */}
        <GlassCard style={{width: '100%', marginBottom: spacing.large, padding: 0, overflow: 'hidden'}} variant="heavy">
          <View style={[styles.landscapeContainer, {backgroundColor: colors.surface}]}>
            {showStory && tonePrint ? (
              <TonePrintStory tonePrint={tonePrint} onClose={handleCloseStory} />
            ) : currentTrack && currentTrack.audioFeatures ? (
              <WaveformVisualizer
                energy={currentTrack.audioFeatures.energy}
                tempo={currentTrack.audioFeatures.tempo}
                valence={currentTrack.audioFeatures.valence}
                isPlaying={currentTrack.isPlaying}
              />
            ) : (
              <View style={styles.landscapePlaceholder}>
                <Icon name="wave-square" size={60} color={colors.primary} />
                <Body style={{color: colors.textSecondary, marginTop: spacing.medium, textAlign: 'center'}}>
                  {tonePrint ? 'Interactive TonePrint' : 'Real-time Waveform Visualizer'}
                </Body>
                <Body style={{color: colors.textSecondary, fontSize: 12, marginTop: spacing.small, textAlign: 'center'}}>
                  {loadingCurrent ? 'Loading...' : tonePrint ? 'Tap "View Interactive Story" to explore' : 'Play a song on Spotify to see the waveform'}
                </Body>
              </View>
            )}
          </View>
        </GlassCard>

        {/* Quick Actions */}
        <View style={{width: '100%', marginBottom: spacing.large}}>
          <ThemedButton 
            title={isAnalyzing ? 'Analyzing...' : tonePrint ? 'Refresh TonePrint' : 'Analyze Listening Data'} 
            onPress={handleAnalyze}
            disabled={isAnalyzing}
            variant="primary"
          />
          {tonePrint && !isAnalyzing && (
            <View style={{marginTop: spacing.small}}>
              <ThemedButton 
                title="View Interactive Story 🎨" 
                onPress={handleViewStory}
                variant="glass"
              />
            </View>
          )}
          {isAnalyzing && analysisProgress && (
            <Body style={{textAlign: 'center', marginTop: spacing.small, color: colors.primary, fontSize: 12}}>
              {analysisProgress}
            </Body>
          )}
          {tonePrint && !isAnalyzing && (
            <Body style={{textAlign: 'center', marginTop: spacing.small, color: colors.textSecondary, fontSize: 12}}>
              Last updated: {new Date(tonePrint.lastUpdated).toLocaleString()}
            </Body>
          )}
        </View>

        {/* Energy & Mood Metrics */}
        {tonePrint && (
          <>
            <GlassCard style={{width: '100%', marginBottom: spacing.medium}} variant="medium">
              <H2 style={{marginBottom: spacing.medium, color: colors.primary}}>Energy Distribution</H2>
              <View style={styles.metricRow}>
                <Icon name="battery-full" size={20} color={colors.accent} />
                <Body style={{color: colors.textPrimary, marginLeft: spacing.small}}>
                  High Energy: {tonePrint.energyDistribution.high}%
                </Body>
              </View>
              <View style={styles.metricRow}>
                <Icon name="battery-half" size={20} color={colors.accent} />
                <Body style={{color: colors.textPrimary, marginLeft: spacing.small}}>
                  Medium Energy: {tonePrint.energyDistribution.medium}%
                </Body>
              </View>
              <View style={styles.metricRow}>
                <Icon name="battery-quarter" size={20} color={colors.accent} />
                <Body style={{color: colors.textPrimary, marginLeft: spacing.small}}>
                  Low Energy: {tonePrint.energyDistribution.low}%
                </Body>
              </View>
            </GlassCard>

            {/* Mood Profile */}
            <GlassCard style={{width: '100%', marginBottom: spacing.medium}} variant="medium">
              <H2 style={{marginBottom: spacing.medium, color: colors.primary}}>Mood Profile</H2>
              <View style={styles.metricRow}>
                <Icon name="smile" size={20} color={colors.success} />
                <Body style={{color: colors.textPrimary, marginLeft: spacing.small}}>
                  Positive: {tonePrint.moodProfile.positive}%
                </Body>
              </View>
              <View style={styles.metricRow}>
                <Icon name="meh" size={20} color={colors.warning} />
                <Body style={{color: colors.textPrimary, marginLeft: spacing.small}}>
                  Neutral: {tonePrint.moodProfile.neutral}%
                </Body>
              </View>
              <View style={styles.metricRow}>
                <Icon name="frown" size={20} color={colors.error} />
                <Body style={{color: colors.textPrimary, marginLeft: spacing.small}}>
                  Melancholic: {tonePrint.moodProfile.melancholic}%
                </Body>
              </View>
            </GlassCard>

            {/* Tempo & Acousticness */}
            <GlassCard style={{width: '100%', marginBottom: spacing.large}} variant="light">
              <H2 style={{marginBottom: spacing.medium, color: colors.primary}}>Audio Characteristics</H2>
              <View style={styles.metricRow}>
                <Icon name="tachometer-alt" size={20} color={colors.primary} />
                <Body style={{color: colors.textPrimary, marginLeft: spacing.small}}>
                  Avg Tempo: {tonePrint.audioCharacteristics.avgTempo} BPM
                </Body>
              </View>
              <View style={styles.metricRow}>
                <Icon name="guitar" size={20} color={colors.primary} />
                <Body style={{color: colors.textPrimary, marginLeft: spacing.small}}>
                  Acousticness: {tonePrint.audioCharacteristics.avgAcousticness}%
                </Body>
              </View>
              <View style={styles.metricRow}>
                <Icon name="headphones" size={20} color={colors.primary} />
                <Body style={{color: colors.textPrimary, marginLeft: spacing.small}}>
                  Instrumentalness: {tonePrint.audioCharacteristics.avgInstrumentalness}%
                </Body>
              </View>
              <View style={styles.metricRow}>
                <Icon name="volume-up" size={20} color={colors.primary} />
                <Body style={{color: colors.textPrimary, marginLeft: spacing.small}}>
                  Loudness: {tonePrint.audioCharacteristics.avgLoudness} dB
                </Body>
              </View>
            </GlassCard>
          </>
        )}

        {/* Info Card */}
        <GlassCard style={{width: '100%'}} variant="light">
          <Body style={{textAlign: 'center', color: colors.textSecondary, fontSize: 13}}>
            💡 Your TonePrint analyzes your Spotify listening history to create a unique audio profile. 
            The more you listen, the more accurate it becomes.
          </Body>
          <Body style={{textAlign: 'center', color: colors.textSecondary, fontSize: 11, marginTop: spacing.small}}>
            Note: Spotify sessions expire after 1 hour. If you get an error, log out and log back in.
          </Body>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  container: {flexGrow: 1, paddingVertical: 40},
  landscapeContainer: {
    width: '100%',
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  landscapePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nowPlayingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nowPlayingContent: {
    flexDirection: 'row',
    gap: 16,
  },
  albumArt: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  audioFeaturesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  featureBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
