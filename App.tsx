/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useState, useEffect} from 'react';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import { ThemeProvider } from './src/theme';
import * as Keychain from 'react-native-keychain';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const creds = await Keychain.getGenericPassword();
      setIsAuthenticated(!!creds);
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setIsChecking(false);
    }
  }

  async function handleLogout() {
    await Keychain.resetGenericPassword();
    setIsAuthenticated(false);
  }

  function handleLoginSuccess() {
    setIsAuthenticated(true);
  }

  if (isChecking) {
    return null; // Or a loading spinner
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.container}>
          {isAuthenticated ? (
            <HomeScreen onLogout={handleLogout} />
          ) : (
            <AuthScreen onLoginSuccess={handleLoginSuccess} />
          )}
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
