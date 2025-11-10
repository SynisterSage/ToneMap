import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import TonePrintScreen from '../screens/TonePrintScreen';
import PlaylistsScreen from '../screens/PlaylistsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import GlassTabBar from './GlassTabBar';

const Tab = createBottomTabNavigator();

interface MainNavigatorProps {
  onLogout: () => void;
  onConnectSpotify: () => void;
  onDisconnectSpotify: () => void;
}

export default function MainNavigator({
  onLogout,
  onConnectSpotify,
  onDisconnectSpotify,
}: MainNavigatorProps) {
  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <GlassTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}>
        <Tab.Screen name="Home">
          {() => <HomeScreen onLogout={onLogout} />}
        </Tab.Screen>
        <Tab.Screen name="TonePrint" component={TonePrintScreen} />
        <Tab.Screen name="Playlists" component={PlaylistsScreen} />
        <Tab.Screen name="Profile">
          {() => (
            <ProfileScreen
              onLogout={onLogout}
              onConnectSpotify={onConnectSpotify}
              onDisconnectSpotify={onDisconnectSpotify}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
