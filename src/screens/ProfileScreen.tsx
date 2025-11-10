import React, {useState, useEffect} from 'react';
import {SafeAreaView, StyleSheet, View, ScrollView, TouchableOpacity, Alert, Image, Switch, Dimensions, Modal} from 'react-native';
import {H1, H2, Body, Caption} from '../components/Typography';
import {useTheme} from '../theme';
import {GlassCard} from '../components/GlassCard';
import ThemedButton from '../components/ThemedButton';
import Icon from '../components/Icon';
import ConnectedAccountsCard from '../components/ConnectedAccountsCard';
import {FirebaseAuthService} from '../services/FirebaseAuthService';
import {getUserProfile, getTopTracks, getTracksWithMetadata} from '../services/SpotifyService';
import AboutScreen from './AboutScreen';
import DataPrivacyScreen from './DataPrivacyScreen';
import WeeklySummaryScreen from './WeeklySummaryScreen';

const {width} = Dimensions.get('window');

interface ProfileScreenProps {
  onLogout: () => void;
  onConnectSpotify: () => void;
  onDisconnectSpotify: () => void;
}

interface UserStats {
  tracksAnalyzed: number;
  topGenre: string;
  listeningTime: string;
  energyLevel: number;
  topArtist: string;
  memberSince: string;
}

type ModalScreen = 'about' | 'privacy' | 'summary' | null;

export default function ProfileScreen({
  onLogout,
  onConnectSpotify,
  onDisconnectSpotify,
}: ProfileScreenProps) {
  const {colors, spacing, scheme, toggleScheme} = useTheme();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<ModalScreen>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    tracksAnalyzed: 0,
    topGenre: 'Loading...',
    listeningTime: '0h',
    energyLevel: 0,
    topArtist: 'Loading...',
    memberSince: 'Today',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      // Get Firebase user
      const firebaseUser = FirebaseAuthService.getCurrentUser();
      console.log('[ProfileScreen] Firebase user:', firebaseUser?.uid);
      
      // Get Spotify profile
      try {
        const spotifyProfile = await getUserProfile();
        console.log('[ProfileScreen] Spotify profile:', spotifyProfile?.displayName);
        setUserProfile(spotifyProfile);
      } catch (error) {
        console.error('[ProfileScreen] Could not fetch Spotify profile:', error);
      }

      // Get user stats from real data
      try {
        console.log('[ProfileScreen] Fetching top tracks...');
        const topTracks = await getTopTracks('short_term', 50);
        console.log('[ProfileScreen] Got top tracks:', topTracks?.length);
        
        // Calculate member since date
        const memberSince = firebaseUser?.metadata?.creationTime 
          ? new Date(firebaseUser.metadata.creationTime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : 'Today';

        // Get full metadata with genres
        const trackIds = topTracks.map((t: any) => t.id);
        const tracksWithMetadata = await getTracksWithMetadata(trackIds);
        console.log('[ProfileScreen] Got tracks with metadata:', tracksWithMetadata?.length);
        
        // Count artist frequencies to find top artist
        const artistCount: {[key: string]: number} = {};
        tracksWithMetadata.forEach((track: any) => {
          if (track.artist) {
            artistCount[track.artist] = (artistCount[track.artist] || 0) + 1;
          }
        });
        
        const topArtist = Object.entries(artistCount)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Loading...';

        // Count genre frequencies from all tracks
        const genreCount: {[key: string]: number} = {};
        tracksWithMetadata.forEach((track: any) => {
          if (track.genres && Array.isArray(track.genres)) {
            track.genres.forEach((genre: string) => {
              genreCount[genre] = (genreCount[genre] || 0) + 1;
            });
          }
        });

        // Get top genre and capitalize properly
        const topGenreEntry = Object.entries(genreCount)
          .sort(([, a], [, b]) => b - a)[0];
        const topGenre = topGenreEntry 
          ? topGenreEntry[0].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          : 'Discovering...';

        // Calculate total listening time (approximate based on track count and average song length ~3.5 min)
        const avgSongMinutes = 3.5;
        const totalMinutes = topTracks.length * avgSongMinutes;
        const listeningTime = totalMinutes >= 60 
          ? `${Math.round(totalMinutes / 60)}h`
          : `${Math.round(totalMinutes)}m`;

        // Calculate energy level from available data
        // If we have popularity data, use it as a proxy for energy
        const avgPopularity = tracksWithMetadata.length > 0
          ? tracksWithMetadata.reduce((sum: number, t: any) => 
              sum + (t.popularity || 50), 0) / tracksWithMetadata.length
          : 50;
        const energyLevel = Math.round(avgPopularity) || 0;

        setUserStats({
          tracksAnalyzed: topTracks.length || 0,
          topGenre: topGenre || 'Discovering...',
          listeningTime: listeningTime || '0m',
          energyLevel: energyLevel || 0,
          topArtist: topArtist || 'Loading...',
          memberSince: memberSince || 'Today',
        });
      } catch (error) {
        console.log('Could not fetch user stats:', error);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFirebaseLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of ToneMap?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            // Call onLogout immediately for instant UI update
            // The actual Firebase signout happens in App.tsx's handleLogout
            onLogout();
          },
        },
      ]
    );
  };

  const renderStatCard = (icon: string, label: string, value: string | number, accentColor: string) => (
    <TouchableOpacity 
      style={[styles.statCard, {backgroundColor: `${accentColor}15`}]}
      onPress={() => Alert.alert(label, `${value}`)}
    >
      <Icon name={icon} size={24} color={accentColor} />
      <Body style={{marginTop: spacing.small, color: colors.textSecondary, fontSize: 12}}>
        {label}
      </Body>
      <H2 
        style={{marginTop: spacing.xsmall, color: colors.primary, textAlign: 'center'}} 
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {value}
      </H2>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Cover Banner with User Profile */}
        <View style={[styles.coverBanner, {backgroundColor: colors.accent + '20'}]}>
          <View style={styles.gradientOverlay} />
          
          {/* Profile Content */}
          <View style={styles.profileContent}>
            {userProfile?.images?.[0]?.url || FirebaseAuthService.getCurrentUser()?.photoURL ? (
              <Image
                source={{uri: userProfile?.images?.[0]?.url || FirebaseAuthService.getCurrentUser()?.photoURL || ''}}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.profileImage, {backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center'}]}>
                <Icon name="user" size={40} color={colors.background} />
              </View>
            )}
            
            <H1 style={{color: colors.primary, marginTop: spacing.medium}}>
              {userProfile?.displayName || FirebaseAuthService.getCurrentUser()?.displayName || 'Music Lover'}
            </H1>
            
            <View style={styles.userMeta}>
              <Icon name="envelope" size={14} color={colors.textSecondary} />
              <Caption style={{marginLeft: 6, color: colors.textSecondary}}>
                {FirebaseAuthService.getCurrentUser()?.email || 'user@tonemap.app'}
              </Caption>
            </View>
            
            <View style={styles.userMeta}>
              <Icon name="calendar" size={14} color={colors.textSecondary} />
              <Caption style={{marginLeft: 6, color: colors.textSecondary}}>
                Member since {userStats.memberSince}
              </Caption>
            </View>

            {userProfile?.product && (
              <View style={[styles.badge, {backgroundColor: colors.accent + '30', marginTop: spacing.small}]}>
                <Icon name="crown" size={12} color={colors.accent} />
                <Caption style={{marginLeft: 6, color: colors.accent, fontWeight: '600'}}>
                  Spotify {userProfile.product === 'premium' ? 'Premium' : 'Free'}
                </Caption>
              </View>
            )}
          </View>

          {/* Connected Accounts Embedded */}
          <View style={{paddingHorizontal: spacing.large, marginTop: spacing.medium}}>
            <ConnectedAccountsCard 
              onConnectSpotify={onConnectSpotify}
              onDisconnectSpotify={onDisconnectSpotify}
            />
          </View>
        </View>

        {/* Interactive Stats Grid */}
        <View style={{padding: spacing.large}}>
          <H2 style={{marginBottom: spacing.medium, color: colors.primary}}>Your Stats</H2>
          <View style={styles.statsGrid}>
            {renderStatCard('chart-bar', 'Tracks', userStats.tracksAnalyzed, colors.accent)}
            {renderStatCard('fire', 'Energy', `${userStats.energyLevel}%`, '#ef4444')}
            {renderStatCard('music', 'Top Genre', userStats.topGenre, '#8b5cf6')}
            {renderStatCard('star', 'Top Artist', userStats.topArtist, '#f59e0b')}
            {renderStatCard('clock', 'Listen Time', userStats.listeningTime, '#10b981')}
            {renderStatCard('headphones', 'Sessions', '42', '#3b82f6')}
          </View>
        </View>

        {/* Settings */}
        <View style={{paddingHorizontal: spacing.large}}>
          <GlassCard style={{width: '100%', marginBottom: spacing.medium}} variant="light">
            <H2 style={{marginBottom: spacing.medium, color: colors.primary}}>Settings</H2>
            
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => setActiveModal('summary')}
            >
              <Icon name="bell" size={18} color={colors.textSecondary} />
              <Body style={{marginLeft: spacing.small, color: colors.textPrimary, flex: 1}}>
                Weekly Summary
              </Body>
              <Icon name="chevron-right" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => setActiveModal('privacy')}
            >
              <Icon name="shield-alt" size={18} color={colors.textSecondary} />
              <Body style={{marginLeft: spacing.small, color: colors.textPrimary, flex: 1}}>
                Data & Privacy
              </Body>
              <Icon name="chevron-right" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            
            {/* Theme Toggle - Inline */}
            <View style={styles.settingRow}>
              <Icon name="palette" size={18} color={colors.textSecondary} />
              <Body style={{marginLeft: spacing.small, color: colors.textPrimary, flex: 1}}>
                Dark Mode
              </Body>
              <Switch
                value={scheme === 'dark'}
                onValueChange={toggleScheme}
                trackColor={{false: colors.border, true: colors.accent}}
                thumbColor={scheme === 'dark' ? colors.primary : colors.textSecondary}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.settingRow, {marginBottom: 0}]}
              onPress={() => setActiveModal('about')}
            >
              <Icon name="info-circle" size={18} color={colors.textSecondary} />
              <Body style={{marginLeft: spacing.small, color: colors.textPrimary, flex: 1}}>
                About ToneMap
              </Body>
              <Icon name="chevron-right" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </GlassCard>

          <View style={{width: '100%', marginBottom: spacing.xlarge}}>
            <ThemedButton 
              title="Log Out" 
              onPress={handleFirebaseLogout} 
              variant="glass" 
            />
          </View>
        </View>
      </ScrollView>

      {/* Modal Screens */}
      <Modal
        visible={activeModal === 'about'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(null)}
      >
        <AboutScreen />
        <TouchableOpacity 
          style={[styles.closeButton, {backgroundColor: colors.background}]}
          onPress={() => setActiveModal(null)}
        >
          <Icon name="times" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={activeModal === 'privacy'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(null)}
      >
        <DataPrivacyScreen />
        <TouchableOpacity 
          style={[styles.closeButton, {backgroundColor: colors.background}]}
          onPress={() => setActiveModal(null)}
        >
          <Icon name="times" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={activeModal === 'summary'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(null)}
      >
        <WeeklySummaryScreen />
        <TouchableOpacity 
          style={[styles.closeButton, {backgroundColor: colors.background}]}
          onPress={() => setActiveModal(null)}
        >
          <Icon name="times" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  container: {flexGrow: 1},
  coverBanner: {
    width: '100%',
    paddingTop: 60,
    paddingBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  profileContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: (width - 48 - 12) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
