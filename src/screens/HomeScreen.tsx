import React, {useState, useEffect, useCallback, useRef} from 'react';
import {SafeAreaView, StyleSheet, View, ScrollView, RefreshControl, Alert, Animated, Vibration, Platform, AppState, AppStateStatus} from 'react-native';
import {H1, Body, Caption} from '../components/Typography';
import {useTheme} from '../theme';
import ThemedButton from '../components/ThemedButton';

// New Components
import {NowPlayingCard} from '../components/NowPlayingCard';
import {QuickStatsRow} from '../components/QuickStatsRow';
import {TonePrintMini} from '../components/TonePrintMini';
import {TopTracksWidget} from '../components/TopTracksWidget';
import {ContextualPatternCard} from '../components/ContextualPatternCard';
import {Skeleton} from '../components/Skeleton';
import {GlassCard} from '../components/GlassCard';

// Services
import {HomeDataService, HomeData} from '../services/HomeDataService';
import {PlaylistGenerationService} from '../services/PlaylistGenerationService';
import {PlaylistStorageService} from '../services/PlaylistStorageService';
import {getCurrentUserId} from '../services/UserSession';

interface HomeScreenProps {
  onLogout: () => void;
  navigation?: any; // Optional for navigation
}

export default function HomeScreen({onLogout, navigation}: HomeScreenProps) {
  const {colors, spacing} = useTheme();
  
  // State
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGeneratingPlaylist, setIsGeneratingPlaylist] = useState(false);
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Interval for now playing updates
  const nowPlayingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);

  // Load home data on mount
  useEffect(() => {
    loadHomeData();
    
    // Start now playing polling (every 30 seconds)
    startNowPlayingPolling();
    
    // Listen for app state changes (pause polling when backgrounded)
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      stopNowPlayingPolling();
      subscription.remove();
    };
  }, []);

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to foreground - resume polling
      console.log('[HomeScreen] 🟢 App foregrounded, resuming polling');
      startNowPlayingPolling();
    } else if (nextAppState.match(/inactive|background/)) {
      // App has gone to background - stop polling to save API calls
      console.log('[HomeScreen] 🔴 App backgrounded, pausing polling');
      stopNowPlayingPolling();
    }
    appState.current = nextAppState;
  };

  // Fade in animation when data loads
  useEffect(() => {
    if (homeData && !isLoading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [homeData, isLoading]);

  // Load all home data
  const loadHomeData = async () => {
    try {
      console.log('[HomeScreen] 📊 Loading home data...');
      const data = await HomeDataService.fetchHomeData();
      console.log('[HomeScreen] ✅ Data loaded:', {
        hasNowPlaying: !!data.nowPlaying,
        hasStats: !!data.quickStats,
        hasToneprint: !!data.tonePrintSummary,
        hasTopTracks: !!data.topTracks,
      });
      setHomeData(data);
    } catch (error: any) {
      console.error('[HomeScreen] ❌ Error loading home data:', error?.message || error);
      // Don't show alert for missing Spotify connection
      if (error?.message !== 'No access token available') {
        Alert.alert('Error', 'Failed to load home data. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh data (pull-to-refresh)
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    
    // Invalidate caches
    await HomeDataService.invalidateAllCaches();
    
    // Reload data
    await loadHomeData();
    
    setIsRefreshing(false);
  }, []);

  // Start polling for now playing updates
  const startNowPlayingPolling = () => {
    if (nowPlayingInterval.current) return;

    nowPlayingInterval.current = setInterval(async () => {
      try {
        console.log('[HomeScreen] 🔄 Polling for now playing...');
        const nowPlaying = await HomeDataService.getNowPlaying();
        console.log('[HomeScreen] 🎵 Now playing:', nowPlaying ? nowPlaying.track.name : 'Nothing');
        
        if (homeData) {
          setHomeData({
            ...homeData,
            nowPlaying,
          });
        }
      } catch (error: any) {
        console.error('[HomeScreen] ❌ Error updating now playing:', error?.message || error);
        // Don't stop polling on error - just log it
      }
    }, 30000); // 30 seconds (reduced from 10s to avoid rate limits)
  };

  // Stop polling
  const stopNowPlayingPolling = () => {
    if (nowPlayingInterval.current) {
      clearInterval(nowPlayingInterval.current);
      nowPlayingInterval.current = null;
    }
  };

  // Manual now playing refresh
  const handleRefreshNowPlaying = async () => {
    try {
      const nowPlaying = await HomeDataService.getNowPlaying();
      if (homeData) {
        setHomeData({
          ...homeData,
          nowPlaying,
        });
      }
    } catch (error) {
      console.error('[HomeScreen] Error refreshing now playing:', error);
    }
  };

  // Haptic feedback helper
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (Platform.OS === 'ios') {
      const duration = type === 'light' ? 10 : type === 'medium' ? 20 : 30;
      Vibration.vibrate(duration);
    } else {
      Vibration.vibrate(50);
    }
  };

  // Handle stat press (optional navigation)
  const handleStatPress = (stat: 'tracks' | 'hours' | 'genres' | 'moods') => {
    triggerHaptic('light');
    console.log('[HomeScreen] Stat pressed:', stat);
    // TODO: Navigate to detailed analytics screen
  };

  // Handle TonePrint press
  const handleTonePrintPress = () => {
    triggerHaptic('medium');
    console.log('[HomeScreen] TonePrint pressed');
    // TODO: Navigate to full TonePrint screen
    if (navigation) {
      navigation.navigate('TonePrintStory');
    }
  };

  // Handle track press
  const handleTrackPress = (track: any) => {
    triggerHaptic('light');
    console.log('[HomeScreen] Track pressed:', track.name);
    // TODO: Open in Spotify or show track details
  };

  // Handle view all tracks
  const handleViewAllTracks = () => {
    console.log('[HomeScreen] View all tracks');
    // TODO: Navigate to full tracks list
  };

  // Generate playlist for current context
  const handleGeneratePlaylist = async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      Alert.alert('Error', 'Please log in to generate playlists');
      return;
    }

    if (!homeData?.contextInfo?.pattern) {
      Alert.alert('Info', 'Not enough data to generate a contextual playlist yet.');
      return;
    }

    triggerHaptic('heavy');
    setIsGeneratingPlaylist(true);

    try {
      console.log('[HomeScreen] 🎵 Generating contextual playlist...');
      
      const context = homeData.contextInfo.currentContext;
      const pattern = homeData.contextInfo.pattern;

      // Generate playlist using PlaylistGenerationService
      const playlist = await PlaylistGenerationService.generateRightNow();

      if (playlist && playlist.track_ids && playlist.track_ids.length > 0) {
        // Save playlist to database
        const playlistId = await PlaylistStorageService.saveGeneratedPlaylist(playlist);
        
        if (playlistId) {
          console.log('[HomeScreen] ✅ Playlist saved with ID:', playlistId);
          
          Alert.alert(
            '✅ Playlist Generated!',
            `Created "${playlist.name}" with ${playlist.track_ids.length} tracks perfect for ${context.timeOfDay}.`,
            [
              {text: 'View Playlist', onPress: () => {
                // Navigate to Playlists tab
                if (navigation) {
                  navigation.navigate('Playlists', {
                    playlistId: playlistId,
                    refresh: true,
                  });
                }
              }},
              {text: 'OK'},
            ]
          );
        } else {
          Alert.alert('Error', 'Generated playlist but failed to save. Please try again.');
        }
      } else {
        Alert.alert('Error', 'Failed to generate playlist. Please try again.');
      }
    } catch (error) {
      console.error('[HomeScreen] Error generating playlist:', error);
      Alert.alert('Error', 'Failed to generate playlist. Please try again.');
    } finally {
      setIsGeneratingPlaylist(false);
    }
  };

  // Format last sync time
  const formatLastSync = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';
    
    const now = new Date();
    const sync = new Date(timestamp);
    const diffMs = now.getTime() - sync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
      <ScrollView
        contentContainerStyle={[styles.container, {padding: spacing.large}]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <H1 style={{color: colors.primary, marginBottom: spacing.xsmall}}>
              ToneMap
            </H1>
            <Caption style={{color: colors.textSecondary}}>
              Your personalized music companion
            </Caption>
          </View>
        </View>

        {isLoading ? (
          // Skeleton Loading state
          <View style={styles.content}>
            {/* Now Playing Skeleton */}
            <GlassCard style={{width: '100%'}} variant="medium">
              <View style={{flexDirection: 'row'}}>
                <Skeleton width={80} height={80} borderRadius={8} />
                <View style={{flex: 1, marginLeft: 12, justifyContent: 'center'}}>
                  <Skeleton width="80%" height={16} style={{marginBottom: 8}} />
                  <Skeleton width="60%" height={12} style={{marginBottom: 12}} />
                  <Skeleton width="100%" height={4} borderRadius={2} />
                </View>
              </View>
            </GlassCard>

            {/* Quick Stats Skeleton */}
            <View style={{flexDirection: 'row', gap: 8}}>
              {[1, 2, 3, 4].map(i => (
                <GlassCard key={i} style={{flex: 1, paddingVertical: 16}} variant="light">
                  <View style={{alignItems: 'center'}}>
                    <Skeleton width={40} height={40} borderRadius={20} style={{marginBottom: 8}} />
                    <Skeleton width={30} height={20} style={{marginBottom: 4}} />
                    <Skeleton width={40} height={12} />
                  </View>
                </GlassCard>
              ))}
            </View>

            {/* TonePrint Skeleton */}
            <GlassCard style={{width: '100%'}} variant="medium">
              <Skeleton width="50%" height={24} style={{marginBottom: 16}} />
              <Skeleton width="100%" height={8} style={{marginBottom: 8}} />
              <Skeleton width="100%" height={8} style={{marginBottom: 16}} />
              <View style={{flexDirection: 'row', gap: 8}}>
                <Skeleton width={80} height={24} borderRadius={12} />
                <Skeleton width={80} height={24} borderRadius={12} />
                <Skeleton width={80} height={24} borderRadius={12} />
              </View>
            </GlassCard>
          </View>
        ) : (
          <Animated.View style={[styles.content, {opacity: fadeAnim}]}>
            {/* Now Playing Card */}
            <NowPlayingCard
              data={homeData?.nowPlaying || null}
              onRefresh={handleRefreshNowPlaying}
            />

            {/* Quick Stats Row */}
            <QuickStatsRow
              stats={homeData?.quickStats || null}
              onStatPress={handleStatPress}
            />

            {/* TonePrint Mini */}
            <TonePrintMini
              summary={homeData?.tonePrintSummary || null}
              onPress={handleTonePrintPress}
            />

            {/* Top Tracks Widget */}
            <TopTracksWidget
              tracks={homeData?.topTracks || []}
              onTrackPress={handleTrackPress}
              onViewAll={handleViewAllTracks}
            />

            {/* Contextual Pattern Card */}
            <ContextualPatternCard
              contextInfo={homeData?.contextInfo || null}
              onGeneratePlaylist={handleGeneratePlaylist}
              isGenerating={isGeneratingPlaylist}
            />

            {/* Sync Status */}
            <View style={[styles.syncStatus, {borderColor: colors.borderGlass}]}>
              <Caption style={{color: colors.textSecondary}}>
                Last synced: {formatLastSync(homeData?.lastSync || null)}
              </Caption>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  content: {
    gap: 16,
  },
  syncStatus: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
});
