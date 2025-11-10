import {Linking, Alert} from 'react-native';
import * as Keychain from 'react-native-keychain';
import {SPOTIFY_CONFIG} from '../config/spotify';
import {sha256} from 'js-sha256';
import base64 from 'react-native-base64';
import {linkSpotifyAccount} from './UserSession';

// Pure JS PKCE helpers (no native modules needed)
function generateRandomString(length: number): string {
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function base64URLEncode(str: string): string {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function generateCodeChallenge(verifier: string): string {
  const hash = sha256(verifier);
  const bytes = hash.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16));
  const binaryString = String.fromCharCode(...bytes);
  return base64URLEncode(base64.encode(binaryString));
}

class SpotifyAuthServiceClass {
  private codeVerifier: string = '';
  private authInProgress: boolean = false;
  private urlListener: any = null;

  async startAuth(): Promise<boolean> {
    if (this.authInProgress) {
      console.log('[SpotifyAuth] Auth already in progress');
      return false;
    }

    this.authInProgress = true;

    try {
      // Generate PKCE challenge
      this.codeVerifier = generateRandomString(128);
      const challenge = generateCodeChallenge(this.codeVerifier);

      // Set up URL listener
      this.setupUrlListener();

      const params = [
        `client_id=${SPOTIFY_CONFIG.clientId}`,
        `response_type=code`,
        `redirect_uri=${encodeURIComponent(SPOTIFY_CONFIG.redirectUrl)}`,
        `code_challenge_method=S256`,
        `code_challenge=${challenge}`,
        `scope=${encodeURIComponent(SPOTIFY_CONFIG.scopes.join(' '))}`,
        `show_dialog=true`,
      ].join('&');

      const authUrl = `${SPOTIFY_CONFIG.serviceConfiguration.authorizationEndpoint}?${params}`;
      console.log('[SpotifyAuth] Opening Spotify authorization...');

      const supported = await Linking.canOpenURL(authUrl);
      if (supported) {
        await Linking.openURL(authUrl);
        return true;
      } else {
        console.error('[SpotifyAuth] Cannot open Spotify auth URL');
        Alert.alert('Error', 'Cannot open Spotify authorization');
        this.authInProgress = false;
        return false;
      }
    } catch (error) {
      console.error('[SpotifyAuth] Error starting auth:', error);
      this.authInProgress = false;
      return false;
    }
  }

  private setupUrlListener() {
    // Remove existing listener
    if (this.urlListener) {
      this.urlListener.remove();
    }

    // Add new listener
    this.urlListener = Linking.addEventListener('url', async event => {
      console.log('[SpotifyAuth] Received URL:', event.url);

      if (event.url.startsWith('tonemap://auth')) {
        await this.handleRedirect(event.url);
      }
    });
  }

  private async handleRedirect(url: string) {
    try {
      // Parse query params
      const parts = url.split('?');
      if (parts.length < 2) {
        console.log('[SpotifyAuth] No query params in URL');
        this.authInProgress = false;
        return;
      }

      const queryParams: {[key: string]: string} = {};
      parts[1].split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        queryParams[key] = decodeURIComponent(value || '');
      });

      console.log('[SpotifyAuth] Parsed params:', queryParams);

      if (queryParams.error) {
        console.log('[SpotifyAuth] Auth error:', queryParams.error);
        Alert.alert('Spotify Auth Error', queryParams.error);
        this.authInProgress = false;
        return;
      }

      if (queryParams.code) {
        console.log('[SpotifyAuth] Got auth code, exchanging for token...');
        await this.exchangeCodeForToken(queryParams.code);
      }
    } catch (error) {
      console.error('[SpotifyAuth] Error handling redirect:', error);
      this.authInProgress = false;
    }
  }

  private async exchangeCodeForToken(code: string) {
    try {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_CONFIG.redirectUrl,
        client_id: SPOTIFY_CONFIG.clientId,
        code_verifier: this.codeVerifier,
      }).toString();

      console.log('[SpotifyAuth] Exchanging code for token...');

      const response = await fetch(
        SPOTIFY_CONFIG.serviceConfiguration.tokenEndpoint,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          body,
        }
      );

      const data = await response.json();

      if (data.access_token) {
        console.log('[SpotifyAuth] ✅ Got access token, storing...');
        await Keychain.setGenericPassword('spotify', JSON.stringify(data), {
          service: 'spotify',
        });

        // Link Spotify account to Firebase user
        console.log('[SpotifyAuth] Linking Spotify to Firebase user...');
        const linked = await linkSpotifyAccount();

        if (linked) {
          console.log('[SpotifyAuth] ✅ Spotify connected successfully!');
          Alert.alert('Success', 'Spotify account connected!');
        } else {
          console.error('[SpotifyAuth] Failed to link account');
          Alert.alert(
            'Error',
            'Connected to Spotify but failed to link account'
          );
        }
      } else {
        console.error('[SpotifyAuth] Token error:', data);
        Alert.alert(
          'Error',
          data.error_description || data.error || 'Failed to get token'
        );
      }
    } catch (error) {
      console.error('[SpotifyAuth] Token exchange error:', error);
      Alert.alert('Error', 'Failed to exchange token');
    } finally {
      this.authInProgress = false;
      this.codeVerifier = '';
    }
  }

  cleanup() {
    if (this.urlListener) {
      this.urlListener.remove();
      this.urlListener = null;
    }
  }
}

export const SpotifyAuthService = new SpotifyAuthServiceClass();
