/**
 * Firebase Authentication Service
 * 
 * Provides authentication methods including:
 * - Email/Password sign up and login
 * - OAuth providers (Google, Spotify via custom OAuth)
 * - Session management with Firebase UID
 */

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import * as Keychain from 'react-native-keychain';
import { getSupabaseClient } from './database/supabase';

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export class FirebaseAuthService {
  private static authStateListener: (() => void) | null = null;

  /**
   * Get the current authenticated user
   */
  static getCurrentUser(): FirebaseAuthTypes.User | null {
    return auth().currentUser;
  }

  /**
   * Get Firebase UID of current user
   */
  static getCurrentUserId(): string | null {
    return auth().currentUser?.uid || null;
  }

  /**
   * Sign up with email and password
   */
  static async signUpWithEmail(
    email: string,
    password: string,
    displayName?: string
  ): Promise<FirebaseUser> {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(
        email,
        password
      );

      // Update display name if provided
      if (displayName && userCredential.user) {
        await userCredential.user.updateProfile({ displayName });
      }

      // Send email verification
      await userCredential.user.sendEmailVerification();

      console.log('✅ User signed up:', userCredential.user.uid);

      // Create user preferences in Supabase
      await this.createUserPreferences(userCredential.user.uid, email);

      return this.mapFirebaseUser(userCredential.user);
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      throw this.mapAuthError(error);
    }
  }

  /**
   * Sign in with email and password
   */
  static async signInWithEmail(
    email: string,
    password: string
  ): Promise<FirebaseUser> {
    try {
      const userCredential = await auth().signInWithEmailAndPassword(
        email,
        password
      );

      console.log('✅ User signed in:', userCredential.user.uid);

      return this.mapFirebaseUser(userCredential.user);
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      throw this.mapAuthError(error);
    }
  }

  /**
   * Sign out
   * NOTE: Does NOT clear Spotify tokens - user stays connected to Spotify
   */
  static async signOut(): Promise<void> {
    try {
      // Sign out from Firebase only (keep Spotify tokens)
      await auth().signOut();
      console.log('✅ User signed out from Firebase (Spotify tokens preserved)');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
  }

  /**
   * Delete user account permanently
   */
  static async deleteAccount(): Promise<void> {
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('No user signed in');
      }

      const userId = user.uid;

      // Delete user data from Supabase
      const supabase = getSupabaseClient();
      await supabase.from('user_preferences').delete().eq('user_id', userId);
      await supabase.from('listening_events').delete().eq('user_id', userId);
      await supabase.from('patterns').delete().eq('user_id', userId);
      await supabase.from('toneprints').delete().eq('user_id', userId);

      // Delete Firebase user
      await user.delete();

      // Clear local data
      await Keychain.resetGenericPassword();

      console.log('✅ User account deleted:', userId);
    } catch (error) {
      console.error('❌ Delete account error:', error);
      throw error;
    }
  }

  /**
   * Sign in with Google
   */
  static async signInWithGoogle(): Promise<FirebaseUser> {
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      
      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Get the user's ID token
      const response = await GoogleSignin.signIn();
      
      if (!response.data?.idToken) {
        throw new Error('No ID token received from Google');
      }
      
      // Create a Google credential with the token
      const googleCredential = auth.GoogleAuthProvider.credential(response.data.idToken);
      
      // Sign-in the user with the credential
      const userCredential = await auth().signInWithCredential(googleCredential);
      
      console.log('✅ User signed in with Google:', userCredential.user.uid);
      
      // Create user preferences in Supabase
      if (userCredential.user.email) {
        await this.createUserPreferences(userCredential.user.uid, userCredential.user.email);
      }
      
      return this.mapFirebaseUser(userCredential.user);
    } catch (error: any) {
      console.error('❌ Google sign in error:', error);
      throw this.mapAuthError(error);
    }
  }

  /**
   * Send phone verification code
   */
  static async sendPhoneVerification(phoneNumber: string): Promise<string> {
    try {
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      console.log('✅ Verification code sent to:', phoneNumber);
      
      if (!confirmation.verificationId) {
        throw new Error('No verification ID received');
      }
      
      return confirmation.verificationId as string;
    } catch (error: any) {
      console.error('❌ Phone verification error:', error);
      throw this.mapAuthError(error);
    }
  }

  /**
   * Verify phone code and sign in
   */
  static async verifyPhoneCode(
    verificationId: string,
    code: string
  ): Promise<FirebaseUser> {
    try {
      const credential = auth.PhoneAuthProvider.credential(verificationId, code);
      const userCredential = await auth().signInWithCredential(credential);
      
      console.log('✅ User signed in with phone:', userCredential.user.uid);
      
      // Create user preferences in Supabase
      if (userCredential.user.phoneNumber) {
        await this.createUserPreferences(userCredential.user.uid, userCredential.user.phoneNumber);
      }
      
      return this.mapFirebaseUser(userCredential.user);
    } catch (error: any) {
      console.error('❌ Phone verification error:', error);
      throw this.mapAuthError(error);
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await auth().sendPasswordResetEmail(email);
      console.log('✅ Password reset email sent to:', email);
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      throw this.mapAuthError(error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates: {
    displayName?: string;
    photoURL?: string;
  }): Promise<void> {
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('No user signed in');
      }

      await user.updateProfile(updates);
      console.log('✅ Profile updated');
    } catch (error) {
      console.error('❌ Update profile error:', error);
      throw error;
    }
  }

  /**
   * Link Spotify account to Firebase user
   * Stores Spotify tokens and profile data
   */
  static async linkSpotifyAccount(
    spotifyAccessToken: string,
    spotifyRefreshToken: string,
    spotifyUserId: string,
    spotifyEmail?: string,
    spotifyDisplayName?: string
  ): Promise<void> {
    try {
      const firebaseUid = this.getCurrentUserId();
      if (!firebaseUid) {
        throw new Error('No Firebase user signed in');
      }

      // Store Spotify tokens in Keychain with 'spotify' service
      // Note: This doesn't actually store the tokens here anymore since SpotifyAuthService 
      // already stored them. This is just for backwards compatibility with the DB update.
      // The actual tokens are in keychain service 'spotify' via SpotifyAuthService

      // Update user_preferences with Spotify connection
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: firebaseUid,
          spotify_user_id: spotifyUserId,
          spotify_email: spotifyEmail,
          spotify_display_name: spotifyDisplayName,
          spotify_connected: true,
          updated_at: new Date().toISOString(),
        } as any);

      if (error) {
        console.error('❌ Failed to update Spotify link in DB:', error);
        throw error;
      }

      console.log('✅ Spotify account linked to Firebase user:', firebaseUid);
    } catch (error) {
      console.error('❌ Link Spotify account error:', error);
      throw error;
    }
  }

  /**
   * Get Spotify tokens from Keychain
   * IMPORTANT: Reads from 'spotify' service to match SpotifyAuthService storage
   */
  static async getSpotifyTokens(): Promise<{
    accessToken: string;
    refreshToken: string;
  } | null> {
    try {
      // Read from 'spotify' service - this is where SpotifyAuthService stores tokens
      const credentials = await Keychain.getGenericPassword({service: 'spotify'});
      if (credentials) {
        // SpotifyAuthService stores tokens as JSON in password field
        try {
          const tokenData = JSON.parse(credentials.password);
          return {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
          };
        } catch (parseError) {
          console.error('❌ Failed to parse Spotify token data:', parseError);
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error('❌ Get Spotify tokens error:', error);
      return null;
    }
  }

  /**
   * Listen to auth state changes
   */
  static onAuthStateChanged(
    callback: (user: FirebaseUser | null) => void
  ): () => void {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      if (user) {
        callback(this.mapFirebaseUser(user));
      } else {
        callback(null);
      }
    });

    return unsubscribe;
  }

  /**
   * Create default user preferences in Supabase
   */
  private static async createUserPreferences(
    userId: string,
    email: string
  ): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('user_preferences').insert({
        user_id: userId,
        email: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      if (error && error.code !== '23505') {
        // Ignore duplicate key errors
        console.error('❌ Failed to create user preferences:', error);
      } else {
        console.log('✅ User preferences created for:', userId);
      }
    } catch (error) {
      console.error('❌ Create user preferences error:', error);
    }
  }

  /**
   * Map Firebase user to our FirebaseUser interface
   */
  private static mapFirebaseUser(
    user: FirebaseAuthTypes.User
  ): FirebaseUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
    };
  }

  /**
   * Map Firebase auth errors to user-friendly messages
   */
  private static mapAuthError(error: any): Error {
    const code = error.code;
    let message = error.message;

    switch (code) {
      case 'auth/email-already-in-use':
        message = 'This email is already registered. Please sign in instead.';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address.';
        break;
      case 'auth/weak-password':
        message = 'Password must be at least 6 characters.';
        break;
      case 'auth/user-not-found':
        message = 'No account found with this email.';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password.';
        break;
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/network-request-failed':
        message = 'Network error. Please check your connection.';
        break;
      default:
        message = error.message || 'Authentication failed. Please try again.';
    }

    return new Error(message);
  }
}
