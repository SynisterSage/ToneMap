import React, {useState, useEffect} from 'react';
import {View, StyleSheet, TouchableOpacity, Alert, Image} from 'react-native';
import {H2, Body, Caption} from './Typography';
import {GlassCard} from './GlassCard';
import ThemedButton from './ThemedButton';
import Icon from './Icon';
import {useTheme} from '../theme';
import {getCurrentSession} from '../services/UserSession';
import {getUserProfile} from '../services/SpotifyService';
import * as Keychain from 'react-native-keychain';

interface ConnectedAccount {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  email?: string;
  displayName?: string;
  profileImage?: string;
}

interface ConnectedAccountsCardProps {
  onConnectSpotify: () => void;
  onDisconnectSpotify: () => void;
}

export default function ConnectedAccountsCard({
  onConnectSpotify,
  onDisconnectSpotify,
}: ConnectedAccountsCardProps) {
  const {colors, spacing} = useTheme();
  
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([
    {
      id: 'spotify',
      name: 'Spotify',
      icon: 'spotify',
      connected: false,
    },
  ]);

  useEffect(() => {
    checkSpotifyConnection();
    
    // Check periodically but less aggressively to avoid rate limits
    const interval = setInterval(checkSpotifyConnection, 60000); // Check every 60 seconds to avoid rate limits
    return () => clearInterval(interval);
  }, []);

  async function checkSpotifyConnection() {
    try {
      // Import refreshSession dynamically to get fresh state
      const {refreshSession} = require('../services/UserSession');
      const session = await refreshSession();
      
      if (session && session.spotifyConnected) {
        // Try to get full profile info
        try {
          const profile = await getUserProfile();
          if (profile) {
            setAccounts(prev =>
              prev.map(acc =>
                acc.id === 'spotify'
                  ? {
                      ...acc,
                      connected: true,
                      displayName: profile.displayName,
                      email: profile.email,
                      profileImage: profile.images?.[0]?.url,
                    }
                  : acc
              )
            );
            return;
          }
        } catch (profileError) {
          console.log('Could not fetch Spotify profile:', profileError);
        }
        
        // Fallback to session data
        setAccounts(prev =>
          prev.map(acc =>
            acc.id === 'spotify'
              ? {
                  ...acc,
                  connected: true,
                  displayName: session.spotifyDisplayName || 'Connected',
                }
              : acc
          )
        );
      }
    } catch (error) {
      console.log('Error checking Spotify connection:', error);
    }
  }

  const handleConnect = async (accountId: string) => {
    if (accountId === 'spotify') {
      console.log('[ConnectedAccountsCard] Connecting to Spotify...');
      await onConnectSpotify();
      // Recheck connection status after OAuth completes
      await checkSpotifyConnection();
    }
  };

  const handleDisconnect = (accountId: string) => {
    if (accountId === 'spotify') {
      Alert.alert(
        'Disconnect Spotify',
        'Are you sure you want to disconnect your Spotify account? You will need to reconnect to use ToneMap features.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('[ConnectedAccountsCard] Disconnecting Spotify...');
                
                // Update UI immediately
                setAccounts(prev =>
                  prev.map(acc =>
                    acc.id === accountId
                      ? {...acc, connected: false, email: undefined, displayName: undefined, profileImage: undefined}
                      : acc
                  )
                );
                
                // Call parent disconnect handler (which clears keychain and session)
                await onDisconnectSpotify();
                
                console.log('[ConnectedAccountsCard] ✅ Spotify disconnected');
              } catch (error) {
                console.log('[ConnectedAccountsCard] Error disconnecting Spotify:', error);
              }
            },
          },
        ]
      );
    }
  };

  return (
    <GlassCard style={{width: '100%'}} variant="medium">
      <H2 style={{marginBottom: spacing.medium, color: colors.primary}}>
        Connected Accounts
      </H2>
      
      {accounts.map(account => (
        <View
          key={account.id}
          style={[
            styles.accountRow,
            {borderBottomColor: colors.border, paddingVertical: spacing.medium},
          ]}>
          <View style={styles.accountInfo}>
            {account.connected && account.profileImage ? (
              <Image
                source={{uri: account.profileImage}}
                style={styles.profileImage}
              />
            ) : (
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: account.connected
                      ? `${colors.accent}20`
                      : `${colors.textSecondary}20`,
                  },
                ]}>
                <Icon
                  name={account.icon}
                  size={24}
                  color={account.connected ? colors.accent : colors.textSecondary}
                />
              </View>
            )}
            <View style={{flex: 1, marginLeft: spacing.medium}}>
              <Body style={{color: colors.textPrimary, fontWeight: '600'}}>
                {account.connected && account.displayName
                  ? account.displayName
                  : account.name}
              </Body>
              {account.connected && account.email ? (
                <Caption style={{color: colors.textSecondary, marginTop: 2}}>
                  {account.email}
                </Caption>
              ) : account.connected && account.displayName ? (
                <Caption style={{color: colors.textSecondary, marginTop: 2}}>
                  Connected to {account.name}
                </Caption>
              ) : (
                <Caption style={{color: colors.textSecondary, marginTop: 2}}>
                  Not connected
                </Caption>
              )}
            </View>
          </View>
          
          {account.connected ? (
            <TouchableOpacity
              onPress={() => handleDisconnect(account.id)}
              style={[
                styles.disconnectButton,
                {backgroundColor: `${colors.error}20`, borderColor: colors.error},
              ]}>
              <Caption style={{color: colors.error, fontWeight: '600'}}>
                Disconnect
              </Caption>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => handleConnect(account.id)}
              style={[
                styles.connectButton,
                {backgroundColor: colors.accent, borderColor: colors.accent},
              ]}>
              <Caption style={{color: colors.background, fontWeight: '600'}}>
                Connect
              </Caption>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    marginBottom: 0,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  connectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  disconnectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
});
