import React, {useState} from 'react';
import {Alert, SafeAreaView, StyleSheet, View} from 'react-native';
import {authorize, AuthorizeResult} from 'react-native-app-auth';
import * as Keychain from 'react-native-keychain';
import {SPOTIFY_CONFIG, SpotifyAuthResult} from '../config/spotify';
import ThemedButton from '../components/ThemedButton';
import {H1, Body} from '../components/Typography';
import {useTheme} from '../theme';

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const {colors, spacing} = useTheme();

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
