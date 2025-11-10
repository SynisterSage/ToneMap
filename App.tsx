import React, {useState, useEffect} from 'react';
import {ActivityIndicator, View} from 'react-native';
import * as Keychain from 'react-native-keychain';
import {ThemeProvider} from './src/theme';
import MainNavigator from './src/navigation/MainNavigator';
import AuthScreen from './src/screens/AuthScreen';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  async function checkAuthStatus() {
    try {
      // Note: Keychain stores with username 'spotify', not a service name
      const credentials = await Keychain.getGenericPassword();
      if (credentials && credentials.password) {
        const authData = JSON.parse(credentials.password);
        // Check if token exists (don't check expiry here - let SpotifyService handle refresh)
        if (authData.access_token) {
          console.log('[App] Found valid credentials, logging in');
          setIsAuthenticated(true);
        } else {
          console.log('[App] No access token in credentials');
        }
      } else {
        console.log('[App] No credentials found');
      }
    } catch (error) {
      console.log('[App] Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await Keychain.resetGenericPassword();
      setIsAuthenticated(false);
    } catch (error) {
      console.log('Error logging out:', error);
    }
  }

  function handleLoginSuccess() {
    setIsAuthenticated(true);
  }

  if (isLoading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a'}}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      {isAuthenticated ? (
        <MainNavigator onLogout={handleLogout} />
      ) : (
        <View style={{flex: 1}}>
          <AuthScreen onLoginSuccess={handleLoginSuccess} />
        </View>
      )}
    </ThemeProvider>
  );
}
