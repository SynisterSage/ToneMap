import React, {useState} from 'react';
import {Alert, Button, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {authorize, AuthorizeResult} from 'react-native-app-auth';
import * as Keychain from 'react-native-keychain';
import {SPOTIFY_CONFIG, SpotifyAuthResult} from '../config/spotify';

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const result: AuthorizeResult = await authorize({
        clientId: SPOTIFY_CONFIG.clientId,
        redirectUrl: SPOTIFY_CONFIG.redirectUrl,
        scopes: SPOTIFY_CONFIG.scopes,
        serviceConfiguration: SPOTIFY_CONFIG.serviceConfiguration,
      });

      const auth: SpotifyAuthResult = {
        accessToken: result.accessToken,
        accessTokenExpirationDate: result.accessTokenExpirationDate,
        refreshToken: result.refreshToken,
        tokenType: result.tokenType,
      };

      // Store tokens securely
      await Keychain.setGenericPassword('spotify', JSON.stringify(auth));

      Alert.alert('Connected', 'Spotify account connected successfully.');
    } catch (err: any) {
      console.error('Auth error', err);
      Alert.alert('Auth error', String(err?.message ?? err));
    } finally {
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
    <SafeAreaView style={styles.safe}> 
      <View style={styles.container}>
        <Text style={styles.title}>ToneMap</Text>
        <Text style={styles.subtitle}>Connect your Spotify account to begin</Text>
        <View style={styles.button}>
          <Button title={loading ? 'Connecting…' : 'Connect Spotify'} onPress={handleConnect} disabled={loading} />
        </View>
        <View style={styles.button}>
          <Button title="Show stored credentials (debug)" onPress={debugShowStored} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  container: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20},
  title: {fontSize: 32, fontWeight: '700', marginBottom: 8},
  subtitle: {fontSize: 16, color: '#666', marginBottom: 24, textAlign: 'center'},
  button: {width: '100%', marginTop: 12},
});
