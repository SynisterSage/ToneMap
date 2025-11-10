import React, {useState, useEffect, useRef} from 'react';
import {Alert, SafeAreaView, StyleSheet, View, Linking} from 'react-native';
import 'react-native-url-polyfill/auto';
import * as Keychain from 'react-native-keychain';
import {SPOTIFY_CONFIG} from '../config/spotify';
import ThemedButton from '../components/ThemedButton';
import {H1, Body} from '../components/Typography';
import {useTheme} from '../theme';
import {sha256} from 'js-sha256';
import base64 from 'react-native-base64';

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
  const {colors, spacing} = useTheme();

  useEffect(() => {
    // Check for initial URL (if app was closed and opened via redirect)
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('Initial URL:', url);
        handleOpenURL({url});
      }
    });

    // Listen for redirect while app is running
    const subscription = Linking.addEventListener('url', handleOpenURL);
    return () => subscription.remove();
  }, []);

  async function handleOpenURL(event: {url: string}) {
    console.log('Received URL:', event.url);
    if (event.url.startsWith('tonemap://auth')) {
      // Parse query params manually
      const parts = event.url.split('?');
      if (parts.length < 2) {
        console.log('No query params in URL');
        setLoading(false);
        return;
      }
      
      const queryParams: {[key: string]: string} = {};
      parts[1].split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        queryParams[key] = decodeURIComponent(value || '');
      });
      
      console.log('Query params:', queryParams);
      const code = queryParams.code;
      const error = queryParams.error;

      if (error) {
        console.log('Auth error from Spotify:', error);
        Alert.alert('Auth Error', error);
        setLoading(false);
        return;
      }

      if (code) {
        console.log('Got auth code, verifier exists:', !!codeVerifierRef.current);
        if (codeVerifierRef.current) {
          await exchangeCodeForToken(code, codeVerifierRef.current);
        } else {
          console.error('Code verifier missing!');
          Alert.alert('Error', 'Code verifier missing. Please try again.');
          setLoading(false);
        }
      } else {
        console.log('No code in redirect');
        setLoading(false);
      }
    }
  }

  async function exchangeCodeForToken(code: string, verifier: string) {
    console.log('Exchanging code for token...');
    try {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_CONFIG.redirectUrl,
        client_id: SPOTIFY_CONFIG.clientId,
        code_verifier: verifier,
      }).toString();

      console.log('Token request body:', body);

      const response = await fetch(SPOTIFY_CONFIG.serviceConfiguration.tokenEndpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body,
      });

      const data = await response.json();
      console.log('Token response:', data);

      if (data.access_token) {
        await Keychain.setGenericPassword('spotify', JSON.stringify(data));
        console.log('Token stored successfully');
        setLoading(false);
        // Navigate to home screen
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          Alert.alert('Connected', 'Spotify account connected successfully.');
        }
      } else {
        console.error('Token error:', data);
        Alert.alert('Error', data.error_description || data.error || 'Failed to get token');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Token exchange error:', err);
      Alert.alert('Error', err.message);
      setLoading(false);
    }
  }

  async function handleConnect() {
    setLoading(true);
    try {
      const verifier = generateRandomString(128);
      codeVerifierRef.current = verifier;
      console.log('Generated verifier:', verifier.substring(0, 20) + '...');
      
      const challenge = generateCodeChallenge(verifier);

      const params = [
        `client_id=${SPOTIFY_CONFIG.clientId}`,
        `response_type=code`,
        `redirect_uri=${encodeURIComponent(SPOTIFY_CONFIG.redirectUrl)}`,
        `code_challenge_method=S256`,
        `code_challenge=${challenge}`,
        `scope=${encodeURIComponent(SPOTIFY_CONFIG.scopes.join(' '))}`,
      ].join('&');

      const authUrl = `${SPOTIFY_CONFIG.serviceConfiguration.authorizationEndpoint}?${params}`;
      console.log('Opening auth URL');
      
      const supported = await Linking.canOpenURL(authUrl);
      if (supported) {
        await Linking.openURL(authUrl);
      } else {
        Alert.alert('Error', 'Cannot open Spotify auth URL');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      Alert.alert('Error', err.message);
      setLoading(false);
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
      <View style={[styles.container, {padding: spacing.medium}]}> 
        <H1 style={{marginBottom: spacing.small}}>ToneMap</H1>
        <Body style={{textAlign: 'center', marginBottom: spacing.large}}>
          Connect your Spotify account to begin — ToneMap will analyze your listening and build your TonePrint.
        </Body>

        <View style={{width: '100%'}}>
          <ThemedButton title={loading ? 'Connecting…' : 'Connect Spotify'} onPress={handleConnect} disabled={loading} />
        </View>

        <View style={{width: '100%', marginTop: spacing.small}}>
          <ThemedButton title="Show stored credentials (debug)" onPress={debugShowStored} variant="ghost" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  container: {flex: 1, alignItems: 'center', justifyContent: 'center'},
});
