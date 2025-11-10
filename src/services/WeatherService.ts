/**
 * Weather Service
 * Fetches current weather conditions using Open-Meteo API (free, no API key needed)
 * https://open-meteo.com/
 */

import Geolocation from '@react-native-community/geolocation';

export interface WeatherData {
  temperature: number; // Celsius
  condition: 'sunny' | 'partly_cloudy' | 'cloudy' | 'rainy' | 'snowy' | 'foggy' | 'stormy';
  weatherCode: number; // WMO Weather Code
  humidity: number; // Percentage
  windSpeed: number; // km/h
  timestamp: string;
}

interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

class WeatherServiceClass {
  private lastWeather: WeatherData | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  /**
   * Get current location
   */
  private async getCurrentLocation(): Promise<{latitude: number; longitude: number}> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position: GeolocationPosition) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('[Weather] Location error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }

  /**
   * Map WMO weather code to simple condition
   * https://open-meteo.com/en/docs
   */
  private mapWeatherCode(code: number): WeatherData['condition'] {
    if (code === 0) return 'sunny'; // Clear sky
    if (code >= 1 && code <= 3) return 'partly_cloudy'; // Mainly clear, partly cloudy, overcast
    if (code >= 45 && code <= 48) return 'foggy'; // Fog
    if (code >= 51 && code <= 67) return 'rainy'; // Drizzle, rain
    if (code >= 71 && code <= 77) return 'snowy'; // Snow
    if (code >= 80 && code <= 99) return 'stormy'; // Rain showers, thunderstorms
    return 'cloudy'; // Default
  }

  /**
   * Fetch current weather from Open-Meteo API
   */
  async getCurrentWeather(): Promise<WeatherData | null> {
    try {
      // Check cache
      const now = Date.now();
      if (this.lastWeather && (now - this.lastFetchTime) < this.CACHE_DURATION) {
        console.log('[Weather] Using cached weather data');
        return this.lastWeather;
      }

      console.log('[Weather] Fetching current location...');
      const location = await this.getCurrentLocation();

      console.log('[Weather] Fetching weather data...');
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.current) {
        console.error('[Weather] Invalid weather data:', data);
        return null;
      }

      const weather: WeatherData = {
        temperature: data.current.temperature_2m,
        condition: this.mapWeatherCode(data.current.weather_code),
        weatherCode: data.current.weather_code,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        timestamp: new Date().toISOString(),
      };

      // Cache the result
      this.lastWeather = weather;
      this.lastFetchTime = now;

      console.log('[Weather] ☁️ Current weather:', weather.condition, `${weather.temperature}°C`);
      return weather;
    } catch (error) {
      console.error('[Weather] Error fetching weather:', error);
      return null;
    }
  }

  /**
   * Get weather description
   */
  getWeatherDescription(condition: WeatherData['condition']): string {
    const descriptions: Record<WeatherData['condition'], string> = {
      sunny: '☀️ Sunny',
      partly_cloudy: '⛅ Partly Cloudy',
      cloudy: '☁️ Cloudy',
      rainy: '🌧️ Rainy',
      snowy: '❄️ Snowy',
      foggy: '🌫️ Foggy',
      stormy: '⛈️ Stormy',
    };
    return descriptions[condition];
  }

  /**
   * Clear cache (for testing)
   */
  clearCache() {
    this.lastWeather = null;
    this.lastFetchTime = 0;
  }
}

export const WeatherService = new WeatherServiceClass();
