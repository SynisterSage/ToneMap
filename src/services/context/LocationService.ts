/**
 * Location Service
 * Handles geolocation requests with permissions
 */

import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid } from 'react-native';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export class LocationService {
  private hasPermission: boolean = false;

  /**
   * Request location permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // iOS permissions are requested automatically on first use
        // We can configure in Info.plist
        this.hasPermission = true;
        return true;
      }

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'ToneMap needs access to your location to provide context-aware music recommendations based on weather and place.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        this.hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        return this.hasPermission;
      }

      return false;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<Location | null> {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          console.error('Failed to get location:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: false, // Use network location for faster response
          timeout: 10000,
          maximumAge: 300000, // Accept cached location up to 5 minutes old
        }
      );
    });
  }

  /**
   * Get location if permission granted, otherwise return null
   */
  async getLocationIfPermitted(): Promise<Location | null> {
    if (!this.hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) {
        return null;
      }
    }

    return this.getCurrentLocation();
  }

  /**
   * Simple location name detection (can be enhanced with reverse geocoding)
   * For now, we'll use simple distance-based detection
   */
  private savedLocations: Array<{
    name: string;
    latitude: number;
    longitude: number;
    radius: number; // in meters
  }> = [];

  /**
   * Save a named location (e.g., "home", "work", "gym")
   */
  saveLocation(name: string, latitude: number, longitude: number, radius: number = 100): void {
    this.savedLocations.push({ name, latitude, longitude, radius });
  }

  /**
   * Get location name if current location matches a saved location
   */
  getLocationName(currentLocation: Location): string | undefined {
    for (const saved of this.savedLocations) {
      const distance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        saved.latitude,
        saved.longitude
      );

      if (distance <= saved.radius) {
        return saved.name;
      }
    }

    return undefined;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns distance in meters
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

// Export singleton instance
export default new LocationService();
