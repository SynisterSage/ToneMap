import React from 'react';
import {SafeAreaView, StyleSheet, View, ScrollView} from 'react-native';
import {H1, H2, Body} from '../components/Typography';
import {useTheme} from '../theme';
import ThemedButton from '../components/ThemedButton';
import * as Keychain from 'react-native-keychain';

export default function HomeScreen({onLogout}: {onLogout: () => void}) {
  const {colors, spacing} = useTheme();

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
      <ScrollView contentContainerStyle={[styles.container, {padding: spacing.large}]}>
        <H1 style={{marginBottom: spacing.small}}>Welcome to ToneMap</H1>
        <Body style={{marginBottom: spacing.xlarge, textAlign: 'center'}}>
          Your Spotify account is connected. We'll start analyzing your music to build your TonePrint.
        </Body>

        <View style={styles.section}>
          <H2 style={{marginBottom: spacing.medium}}>Coming Soon</H2>
          <Body style={{marginBottom: spacing.small}}>• View your TonePrint visualization</Body>
          <Body style={{marginBottom: spacing.small}}>• Get personalized adaptive playlists</Body>
          <Body style={{marginBottom: spacing.small}}>• Track mood & energy over time</Body>
          <Body style={{marginBottom: spacing.small}}>• Weekly listening summaries</Body>
        </View>

        <View style={{marginTop: spacing.xlarge, width: '100%'}}>
          <ThemedButton title="Disconnect Spotify" onPress={onLogout} variant="secondary" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  container: {flexGrow: 1, alignItems: 'center', paddingVertical: 40},
  section: {width: '100%', marginTop: 20},
});
