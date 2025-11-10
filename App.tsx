// CRITICAL: URL polyfill must be imported FIRST before any Supabase imports
import 'react-native-url-polyfill/auto';

import React, {useState, useEffect} from 'react';
import {ActivityIndicator, View, AppState, AppStateStatus} from 'react-native';
import * as Keychain from 'react-native-keychain';
import {ThemeProvider} from './src/theme';
import MainNavigator from './src/navigation/MainNavigator';
import AuthScreen from './src/screens/AuthScreen';
import { FirebaseAuthScreen } from './src/screens/FirebaseAuthScreen';
import AppPreloader from './src/components/AppPreloader';

// Phase 1 Testing
import { testConnection } from './src/services/database/supabase';
import { initializeSession, getCurrentSession } from './src/services/UserSession';
import { FirebaseAuthService } from './src/services/FirebaseAuthService';
import { SpotifyAuthService } from './src/services/SpotifyAuthService';
import { ListeningHistoryService } from './src/services/ListeningHistoryService';
import { PatternAnalysisService } from './src/services/PatternAnalysisService';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    // Run Phase 1 tests automatically on startup
    testDatabaseConnection();
    
    // Add auth state listener to handle automatic logout if Firebase session expires
    // This won't trigger on manual logout since we update state immediately
    const unsubscribe = FirebaseAuthService.onAuthStateChanged((user) => {
      if (!user && isAuthenticated) {
        // Session expired (not manual logout, which sets isAuthenticated=false first)
        console.log('[App] Firebase session expired, logging out');
        handleLogout();
      } else if (user && !isAuthenticated && !isLoading) {
        // User signed in externally, update state
        console.log('[App] Firebase user signed in externally');
        checkAuthStatus();
      }
    });
    
    // Listen to app state changes (foreground/background)
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [isAuthenticated, isLoading]);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && isAuthenticated) {
      console.log('[App] App became active, refreshing session...');
      // Refresh session when app comes to foreground
      try {
        const session = await initializeSession();
        if (!session) {
          console.log('[App] Session refresh failed, logging out');
          handleLogout();
        } else if (!session.spotifyConnected && spotifyConnected) {
          // Spotify session expired
          console.log('[App] Spotify session expired');
          setSpotifyConnected(false);
        }
      } catch (error) {
        console.log('[App] Error refreshing session:', error);
      }
    }
  };

  // Test database connection on startup
  async function testDatabaseConnection() {
    console.log('\n🧪 Testing Database Connection...');
    try {
      const connected = await testConnection();
      if (connected) {
        console.log('✅ Database connected successfully!');
      } else {
        console.log('❌ Database connection failed');
        console.log('⚠️  Make sure you ran the SQL migration in Supabase');
      }
    } catch (error) {
      console.log('❌ Database test error:', error);
    }
  }



  async function checkAuthStatus() {
    try {
      console.log('[App] Checking authentication status...');
      
      // Check Firebase auth state
      const firebaseUser = FirebaseAuthService.getCurrentUser();
      
      if (firebaseUser) {
        console.log('[App] ✅ Firebase user found:', firebaseUser.uid);
        setIsAuthenticated(true);
        
        // Initialize session (checks Spotify connection)
        const session = await initializeSession();
        
        if (session && session.spotifyConnected) {
          console.log('[App] ✅ Spotify connected:', session.spotifyDisplayName);
          setSpotifyConnected(true);
          // Start tracking listening history
          ListeningHistoryService.startTracking();
          // Start pattern analysis (runs weekly)
          PatternAnalysisService.startPeriodicAnalysis();
        } else {
          console.log('[App] ⚠️  Spotify not connected yet');
          setSpotifyConnected(false);
        }
      } else {
        console.log('[App] No Firebase user signed in');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.log('[App] Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    // Immediately update UI state for instant feedback
    setIsAuthenticated(false);
    setSpotifyConnected(false);
    
    try {
      console.log('[App] Logging out...');
      // Stop all services before logout
      ListeningHistoryService.stopTracking();
      PatternAnalysisService.stopPeriodicAnalysis();
      
      // Clear session
      const {clearUserSession} = require('./src/services/UserSession');
      await clearUserSession();
      
      console.log('[App] ✅ Logged out successfully');
    } catch (error) {
      console.log('[App] Error logging out:', error);
    }
  }

  async function handleFirebaseAuthSuccess() {
    console.log('[App] Firebase auth successful');
    setIsInitializing(true);
    
    try {
      // Initialize session to check if Spotify is already connected
      const session = await initializeSession();
      setIsAuthenticated(true);
      
      if (session?.spotifyConnected) {
        console.log('[App] User already has Spotify connected');
        setSpotifyConnected(true);
        ListeningHistoryService.startTracking();
        PatternAnalysisService.startPeriodicAnalysis();
      } else {
        console.log('[App] User needs to connect Spotify');
      }
    } finally {
      setIsInitializing(false);
    }
  }

  async function handleConnectSpotify() {
    console.log('[App] Opening Spotify connection...');
    const success = await SpotifyAuthService.startAuth();
    if (success) {
      console.log('[App] Spotify auth started');
      // The service will handle the redirect and show success alert
      // Refresh session after connection
      setTimeout(async () => {
        const session = await initializeSession(); // Force refresh
        if (session?.spotifyConnected) {
          console.log('[App] ✅ Spotify connected after auth');
          setSpotifyConnected(true);
          // Start tracking listening history
          ListeningHistoryService.startTracking();
          // Start pattern analysis
          PatternAnalysisService.startPeriodicAnalysis();
        } else {
          console.log('[App] ⚠️ Session not showing Spotify connected');
        }
      }, 1000);
    }
  }

  async function handleDisconnectSpotify() {
    console.log('[App] Spotify disconnected');
    // Stop all services when disconnected
    ListeningHistoryService.stopTracking();
    PatternAnalysisService.stopPeriodicAnalysis();
    setSpotifyConnected(false);
  }

  if (isLoading) {
    return (
      <ThemeProvider>
        <AppPreloader visible={true} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      {isAuthenticated ? (
        <MainNavigator 
          onLogout={handleLogout}
          onConnectSpotify={handleConnectSpotify}
          onDisconnectSpotify={handleDisconnectSpotify}
        />
      ) : (
        <View style={{flex: 1}}>
          <FirebaseAuthScreen onAuthSuccess={handleFirebaseAuthSuccess} />
        </View>
      )}
      
      {/* Show preloader during session initialization */}
      <AppPreloader 
        visible={isInitializing} 
        message="Syncing with Spotify..." 
      />
    </ThemeProvider>
  );
}
