/**
 * User Session Manager (Firebase-based)
 * 
 * Authentication flow:
 * 1. User signs up/in with Firebase (email/password or OAuth)
 * 2. User connects Spotify account (OAuth)
 * 3. Spotify data is linked to Firebase UID
 * 4. All database operations use Firebase UID
 */

import { FirebaseAuthService } from './FirebaseAuthService';
import * as SpotifyService from './SpotifyService';
import * as Keychain from 'react-native-keychain';

export interface UserSession {
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  spotifyConnected: boolean;
  spotifyUserId?: string;
  spotifyDisplayName?: string;
}

let currentSession: UserSession | null = null;

/**
 * Initialize session from Firebase auth state
 * Call this on app startup
 */
export async function initializeSession(): Promise<UserSession | null> {
  try {
    console.log('[UserSession] Checking Firebase auth state...');
    
    const firebaseUser = FirebaseAuthService.getCurrentUser();
    if (!firebaseUser) {
      console.log('[UserSession] No Firebase user signed in');
      return null;
    }

    console.log('[UserSession] ✅ Firebase user found:', firebaseUser.uid);

    // Check if Spotify is connected by looking in the correct keychain service
    const credentials = await Keychain.getGenericPassword({service: 'spotify'});
    const spotifyConnected = !!credentials;

    let spotifyUserId: string | undefined;
    let spotifyDisplayName: string | undefined;

    if (spotifyConnected) {
      console.log('[UserSession] 🔑 Found Spotify credentials in keychain');
      try {
        const profile = await SpotifyService.getUserProfile();
        if (profile) {
          spotifyUserId = profile.id;
          spotifyDisplayName = profile.displayName;
          console.log('[UserSession] ✅ Spotify connected:', spotifyDisplayName);
        } else {
          console.warn('[UserSession] ⚠️  Could not fetch Spotify profile, but tokens exist');
        }
      } catch (error: any) {
        console.warn('[UserSession] Failed to get Spotify profile:', error);
        
        // If Spotify auth is expired, clear tokens and mark as disconnected
        if (error.message === 'SPOTIFY_AUTH_EXPIRED' || error.message === 'No access token available') {
          console.log('[UserSession] ⚠️  Spotify session expired or invalid, clearing tokens');
          try {
            await Keychain.resetGenericPassword({service: 'spotify'});
          } catch (keychainError) {
            console.log('[UserSession] Keychain clear error:', keychainError);
          }
          // User will need to reconnect Spotify
          return {
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            spotifyConnected: false,
          };
        }
      }
    } else {
      console.log('[UserSession] ⚠️  No Spotify credentials found in keychain');
    }

    currentSession = {
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      spotifyConnected,
      spotifyUserId,
      spotifyDisplayName,
    };

    console.log('[UserSession] ✅ Session initialized');
    return currentSession;

  } catch (error) {
    console.error('[UserSession] Error initializing session:', error);
    return null;
  }
}

/**
 * Link Spotify account to current Firebase user
 * Call this after successful Spotify OAuth
 */
export async function linkSpotifyAccount(): Promise<boolean> {
  try {
    console.log('[UserSession] Linking Spotify account...');

    const firebaseUid = FirebaseAuthService.getCurrentUserId();
    if (!firebaseUid) {
      throw new Error('No Firebase user signed in');
    }

    // Get Spotify tokens from Keychain
    const credentials = await Keychain.getGenericPassword({service: 'spotify'});
    if (!credentials) {
      throw new Error('No Spotify tokens found');
    }

    const tokenData = JSON.parse(credentials.password);

    // Get Spotify profile
    const profile = await SpotifyService.getUserProfile();
    if (!profile) {
      throw new Error('Failed to get Spotify profile');
    }

    console.log('[UserSession] Spotify profile:', profile.displayName);

    // Link Spotify to Firebase user
    await FirebaseAuthService.linkSpotifyAccount(
      tokenData.access_token,
      tokenData.refresh_token,
      profile.id,
      profile.email,
      profile.displayName
    );

    // Update current session
    if (currentSession) {
      currentSession.spotifyConnected = true;
      currentSession.spotifyUserId = profile.id;
      currentSession.spotifyDisplayName = profile.displayName;
    }

    console.log('[UserSession] ✅ Spotify account linked successfully');
    return true;

  } catch (error) {
    console.error('[UserSession] Error linking Spotify account:', error);
    return false;
  }
}

/**
 * Refresh session - re-initialize from current Firebase auth state
 * Call this after login or when session might be stale
 */
export async function refreshSession(): Promise<UserSession | null> {
  console.log('[UserSession] Refreshing session...');
  return await initializeSession();
}

/**
 * Get current user session
 */
export function getCurrentSession(): UserSession | null {
  return currentSession;
}

/**
 * Get current Firebase UID
 * This is the primary user identifier
 * Falls back to Firebase directly if session not initialized
 */
export function getCurrentUserId(): string | null {
  if (currentSession?.firebaseUid) {
    return currentSession.firebaseUid;
  }
  // Fallback: check Firebase directly
  return FirebaseAuthService.getCurrentUserId();
}

/**
 * Clear Spotify connection from session (disconnect Spotify only)
 */
export async function clearSpotifyFromSession(): Promise<void> {
  console.log('[UserSession] Clearing Spotify from session...');
  
  // Clear Spotify tokens from keychain
  try {
    await Keychain.resetGenericPassword({service: 'spotify'});
    console.log('[UserSession] ✅ Spotify tokens cleared from keychain');
  } catch (error) {
    console.log('[UserSession] Error clearing Spotify tokens:', error);
  }
  
  // Update current session
  if (currentSession) {
    currentSession.spotifyConnected = false;
    currentSession.spotifyUserId = undefined;
    currentSession.spotifyDisplayName = undefined;
  }
  
  console.log('[UserSession] ✅ Spotify cleared from session');
}

/**
 * Clear user session (logout)
 */
export async function clearUserSession(): Promise<void> {
  await FirebaseAuthService.signOut();
  currentSession = null;
  console.log('[UserSession] ✅ Session cleared');
}
