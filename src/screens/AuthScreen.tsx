import React, {useState, useEffect, useRef} from 'react';
import {Alert, SafeAreaView, StyleSheet, View, Linking} from 'react-native';
import 'react-native-url-polyfill/auto';
import * as Keychain from 'react-native-keychain';
import {SPOTIFY_CONFIG} from '../config/spotify';
import ThemedButton from '../components/ThemedButton';
import {GlassCard} from '../components/GlassCard';
import {H1, Body} from '../components/Typography';
import {useTheme} from '../theme';
import {sha256} from 'js-sha256';
import base64 from 'react-native-base64';
import { linkSpotifyAccount } from '../services/UserSession';

// Pure JS PKCE helpers (no native modules needed)
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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

type AuthScreenProps = {
  onLoginSuccess?: () => void;
};

export default function AuthScreen({onLoginSuccess}: AuthScreenProps) {
  const [loading, setLoading] = useState(false);
  const codeVerifierRef = useRef<string>('');
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {colors, spacing} = useTheme();

  useEffect(() => {
    console.log('[AuthScreen] Component mounted, setting up URL listeners');
    
    // Check for initial URL (if app was closed and opened via redirect)
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('[AuthScreen] Initial URL:', url);
        handleOpenURL({url});
      }
    });

    // Listen for redirect while app is running
    const subscription = Linking.addEventListener('url', handleOpenURL);
    
    return () => {
      console.log('[AuthScreen] Cleaning up listeners');
      subscription.remove();
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  async function handleOpenURL(event: {url: string}) {
    console.log('[AuthScreen] handleOpenURL called with:', event.url);
    
    // Clear loading timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    if (event.url.startsWith('tonemap://auth')) {
      // Parse query params manually
      const parts = event.url.split('?');
      if (parts.length < 2) {
        console.log('[AuthScreen] No query params in URL');
        setLoading(false);
        return;
      }
      
      const queryParams: {[key: string]: string} = {};
      parts[1].split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        queryParams[key] = decodeURIComponent(value || '');
      });
      
      console.log('[AuthScreen] Parsed query params:', queryParams);
      const code = queryParams.code;
      const error = queryParams.error;

      if (error) {
        console.log('[AuthScreen] Auth error from Spotify:', error);
        Alert.alert('Auth Error', error);
        setLoading(false);
        return;
      }

      if (code) {
        console.log('[AuthScreen] Got auth code, verifier exists:', !!codeVerifierRef.current);
        if (codeVerifierRef.current) {
          await exchangeCodeForToken(code, codeVerifierRef.current);
        } else {
          console.error('[AuthScreen] Code verifier missing!');
          Alert.alert('Error', 'Code verifier missing. Please try connecting again.');
          setLoading(false);
        }
      } else {
        console.log('[AuthScreen] No code in redirect');
        setLoading(false);
      }
    } else {
      console.log('[AuthScreen] URL does not match tonemap://auth scheme');
    }
  }

  async function exchangeCodeForToken(code: string, verifier: string) {
    console.log('[AuthScreen] exchangeCodeForToken: Starting token exchange');
    try {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_CONFIG.redirectUrl,
        client_id: SPOTIFY_CONFIG.clientId,
        code_verifier: verifier,
      }).toString();

      console.log('[AuthScreen] Token request body:', body);

      const response = await fetch(SPOTIFY_CONFIG.serviceConfiguration.tokenEndpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body,
      });

      console.log('[AuthScreen] Token response status:', response.status);
      const data = await response.json();
      console.log('[AuthScreen] Token response data:', data);

      if (data.access_token) {
        console.log('[AuthScreen] ✅ Access token received, storing in keychain');
        await Keychain.setGenericPassword('spotify', JSON.stringify(data), {
          service: 'spotify',
        });
        console.log('[AuthScreen] ✅ Token stored successfully');
        
        // Link Spotify account to Firebase user
        console.log('[AuthScreen] 🔄 Linking Spotify account to Firebase user...');
        const linked = await linkSpotifyAccount();
        
        if (linked) {
          console.log('[AuthScreen] ✅ Spotify account linked successfully');
          setLoading(false);
          
          // Small delay to ensure state updates
          setTimeout(() => {
            console.log('[AuthScreen] ✅ Calling onLoginSuccess');
            if (onLoginSuccess) {
              onLoginSuccess();
            } else {
              Alert.alert('Connected', 'Your Spotify account has been connected!');
            }
          }, 100);
        } else {
          console.error('[AuthScreen] ❌ Failed to link Spotify account');
          Alert.alert('Error', 'Connected to Spotify but failed to link account. Please try again.');
          setLoading(false);
        }
      } else {
        console.error('[AuthScreen] ❌ Token error:', data);
        Alert.alert('Error', data.error_description || data.error || 'Failed to get token');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('[AuthScreen] ❌ Token exchange error:', err);
      Alert.alert('Error', err.message || 'Failed to exchange token');
      setLoading(false);
    }
  }

  async function handleConnect() {
    setLoading(true);
    try {
      const verifier = generateRandomString(128);
      codeVerifierRef.current = verifier;
      console.log('[AuthScreen] Generated verifier:', verifier.substring(0, 20) + '...');
      
      const challenge = generateCodeChallenge(verifier);
      console.log('[AuthScreen] Generated challenge:', challenge.substring(0, 20) + '...');

      const params = [
        `client_id=${SPOTIFY_CONFIG.clientId}`,
        `response_type=code`,
        `redirect_uri=${encodeURIComponent(SPOTIFY_CONFIG.redirectUrl)}`,
        `code_challenge_method=S256`,
        `code_challenge=${challenge}`,
        `scope=${encodeURIComponent(SPOTIFY_CONFIG.scopes.join(' '))}`,
        `show_dialog=true`, // Force Spotify to show login screen (bypass cache)
      ].join('&');

      const authUrl = `${SPOTIFY_CONFIG.serviceConfiguration.authorizationEndpoint}?${params}`;
      console.log('[AuthScreen] Opening auth URL');
      console.log('[AuthScreen] Redirect URI:', SPOTIFY_CONFIG.redirectUrl);
      
      // Set a timeout to detect if redirect never comes back
      loadingTimeoutRef.current = setTimeout(() => {
        console.log('[AuthScreen] WARNING: No redirect received after 60 seconds');
        Alert.alert(
          'Connection Timeout',
          'The Spotify authorization may not have completed. Please try again.',
          [
            {
              text: 'Retry',
              onPress: () => {
                setLoading(false);
                setTimeout(handleConnect, 100);
              },
            },
            {
              text: 'Cancel',
              onPress: () => setLoading(false),
              style: 'cancel',
            },
          ]
        );
      }, 60000);
      
      const supported = await Linking.canOpenURL(authUrl);
      if (supported) {
        await Linking.openURL(authUrl);
        console.log('[AuthScreen] Safari opened, waiting for redirect...');
      } else {
        console.error('[AuthScreen] Cannot open Spotify auth URL');
        Alert.alert('Error', 'Cannot open Spotify auth URL');
        setLoading(false);
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      }
    } catch (err: any) {
      console.error('[AuthScreen] Auth error:', err);
      Alert.alert('Error', err.message);
      setLoading(false);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    }
  }

  async function debugShowStored() {
    const creds = await Keychain.getGenericPassword();
    if (creds) {
      Alert.alert('Stored creds', creds.password);
    } else {
      Alert.alert('No creds', 'No stored Spotify credentials found.');
    }
  }

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
      <View style={[styles.container, {padding: spacing.large}]}>
        <H1 style={{marginBottom: spacing.small, color: colors.primary}}>Welcome to ToneMap</H1>

        <GlassCard style={{width: '100%', marginBottom: spacing.xlarge}}>
          <Body style={{textAlign: 'center', color: colors.textSecondary}}>
            Connect your Spotify account to begin — ToneMap will analyze your listening and build your TonePrint.
          </Body>
        </GlassCard>

        <View style={{width: '100%'}}>
          <ThemedButton title={loading ? 'Connecting…' : 'Connect Spotify'} onPress={handleConnect} disabled={loading} />
        </View>

        <View style={{width: '100%', marginTop: spacing.small}}>
          <ThemedButton title="Show stored credentials (debug)" onPress={debugShowStored} variant="glass" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  container: {flex: 1, alignItems: 'center', justifyContent: 'center'},
});
