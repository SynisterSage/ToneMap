/**
 * Weather Service
 * Fetches weather data using Open-Meteo API (free, no key required)
 * API Docs: https://open-meteo.com/en/docs
 */

import { WeatherCondition } from '../../types/listening';

interface WeatherData {
  condition: WeatherCondition;
  temperatureCelsius: number;
  description: string;
}

interface OpenMeteoResponse {
  current_weather: {
    temperature: number;
    weathercode: number;
    windspeed: number;
    winddirection: number;
    time: string;
  };
}

/**
 * Map Open-Meteo weather codes to our simplified conditions
 * WMO Weather interpretation codes
 */
function mapWeatherCode(code: number): { condition: WeatherCondition; description: string } {
  if (code === 0) {
    return { condition: 'sunny', description: 'Clear sky' };
  } else if (code >= 1 && code <= 3) {
    return { condition: code === 1 ? 'partly_cloudy' : 'cloudy', description: 'Partly cloudy' };
  } else if (code >= 45 && code <= 48) {
    return { condition: 'foggy', description: 'Foggy' };
  } else if (code >= 51 && code <= 67) {
    return { condition: 'rainy', description: 'Rainy' };
  } else if (code >= 71 && code <= 77) {
    return { condition: 'snowy', description: 'Snowy' };
  } else if (code >= 80 && code <= 99) {
    return { condition: 'stormy', description: 'Stormy' };
  }
  
  return { condition: 'cloudy', description: 'Cloudy' };
}

export class WeatherService {
  private readonly baseUrl = 'https://api.open-meteo.com/v1/forecast';

  /**
   * Get current weather for a location
   */
  async getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData | null> {
    try {
      const url = `${this.baseUrl}?latitude=${latitude}&longitude=${longitude}&current_weather=true`;

      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Weather API error:', response.status);
        return null;
      }

      const data: OpenMeteoResponse = await response.json();
      const { condition, description } = mapWeatherCode(data.current_weather.weathercode);

      return {
        condition,
        temperatureCelsius: Math.round(data.current_weather.temperature),
        description,
      };
    } catch (error) {
      console.error('Failed to fetch weather:', error);
      return null;
    }
  }

  /**
   * Get weather description emoji
   */
  getWeatherEmoji(condition: WeatherCondition): string {
    const emojiMap: Record<WeatherCondition, string> = {
      sunny: '☀️',
      partly_cloudy: '⛅',
      cloudy: '☁️',
      rainy: '🌧️',
      snowy: '❄️',
      foggy: '🌫️',
      stormy: '⛈️',
    };

    return emojiMap[condition] || '🌤️';
  }

  /**
   * Cache for weather data (to avoid excessive API calls)
   */
  private weatherCache: Map<string, { data: WeatherData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Get cached weather or fetch fresh data
   */
  async getWeatherCached(latitude: number, longitude: number): Promise<WeatherData | null> {
    // Round to 2 decimal places for cache key
    const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
    
    const cached = this.weatherCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const freshData = await this.getCurrentWeather(latitude, longitude);
    if (freshData) {
      this.weatherCache.set(key, {
        data: freshData,
        timestamp: Date.now(),
      });
    }

    return freshData;
  }
}

// Export singleton instance
export default new WeatherService();
