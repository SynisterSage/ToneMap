/**
 * Context Detector
 * Auto-detects context from available data (time, weather, location, activity)
 */

import { TimeOfDay, DayOfWeek, ListeningContext, WeatherCondition } from '../../types/listening';
import WeatherService from './WeatherService';
import LocationService, { Location } from './LocationService';

export class ContextDetector {
  /**
   * Detect time of day from current hour
   */
  detectTimeOfDay(date: Date = new Date()): TimeOfDay {
    const hour = date.getHours();

    if (hour >= 6 && hour < 12) {
      return 'morning';
    } else if (hour >= 12 && hour < 18) {
      return 'afternoon';
    } else if (hour >= 18 && hour < 22) {
      return 'evening';
    } else {
      return 'night';
    }
  }

  /**
   * Detect day of week
   */
  detectDayOfWeek(date: Date = new Date()): DayOfWeek {
    const days: DayOfWeek[] = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];

    return days[date.getDay()];
  }

  /**
   * Detect full context (combines all detection methods)
   */
  async detectContext(
    weatherEnabled: boolean = true,
    locationEnabled: boolean = false
  ): Promise<ListeningContext> {
    const now = new Date();

    const context: ListeningContext = {
      timeOfDay: this.detectTimeOfDay(now),
      dayOfWeek: this.detectDayOfWeek(now),
    };

    // Get weather if enabled
    if (weatherEnabled && locationEnabled) {
      const location = await LocationService.getLocationIfPermitted();
      
      if (location) {
        const weather = await WeatherService.getWeatherCached(
          location.latitude,
          location.longitude
        );

        if (weather) {
          context.weatherCondition = weather.condition;
          context.temperatureCelsius = weather.temperatureCelsius;
          context.weatherDescription = weather.description;
        }

        // Store location data
        context.latitude = location.latitude;
        context.longitude = location.longitude;
        context.locationName = LocationService.getLocationName(location);
      }
    }

    // Activity detection (simplified for now - can be enhanced with sensors)
    // For MVP, we'll skip complex activity detection
    context.activityType = 'stationary'; // Default

    return context;
  }

  /**
   * Get context description for display
   */
  getContextDescription(context: ListeningContext): string {
    const parts: string[] = [];

    // Time
    const timeEmojis = {
      morning: '☀️',
      afternoon: '🌤️',
      evening: '🌆',
      night: '🌙',
    };
    parts.push(`${timeEmojis[context.timeOfDay]} ${context.timeOfDay}`);

    // Day
    const dayName = context.dayOfWeek.charAt(0).toUpperCase() + context.dayOfWeek.slice(1);
    parts.push(dayName);

    // Weather
    if (context.weatherCondition) {
      const emoji = WeatherService.getWeatherEmoji(context.weatherCondition);
      parts.push(`${emoji} ${context.weatherDescription || context.weatherCondition}`);
    }

    // Location
    if (context.locationName) {
      parts.push(`📍 ${context.locationName}`);
    }

    // Activity
    if (context.activityType && context.activityType !== 'stationary') {
      const activityEmojis = {
        stationary: '🧘',
        walking: '🚶',
        running: '🏃',
        driving: '🚗',
        cycling: '🚴',
      };
      parts.push(`${activityEmojis[context.activityType]} ${context.activityType}`);
    }

    return parts.join(' • ');
  }

  /**
   * Get a short context tag for UI (e.g., "Monday Morning ☀️")
   */
  getContextTag(context: ListeningContext): string {
    const timeEmojis = {
      morning: '☀️',
      afternoon: '🌤️',
      evening: '🌆',
      night: '🌙',
    };

    const dayName = context.dayOfWeek.charAt(0).toUpperCase() + context.dayOfWeek.slice(1);
    const timeName = context.timeOfDay.charAt(0).toUpperCase() + context.timeOfDay.slice(1);

    let tag = `${dayName} ${timeName} ${timeEmojis[context.timeOfDay]}`;

    if (context.weatherCondition) {
      const weatherEmoji = WeatherService.getWeatherEmoji(context.weatherCondition);
      tag += ` ${weatherEmoji}`;
    }

    return tag;
  }

  /**
   * Check if two contexts are similar (for pattern matching)
   */
  contextsMatch(
    context1: Partial<ListeningContext>,
    context2: Partial<ListeningContext>,
    matchWeather: boolean = false,
    matchActivity: boolean = false
  ): boolean {
    // Always match time and day
    if (context1.timeOfDay !== context2.timeOfDay) return false;
    if (context1.dayOfWeek !== context2.dayOfWeek) return false;

    // Optionally match weather
    if (matchWeather && context1.weatherCondition !== context2.weatherCondition) {
      return false;
    }

    // Optionally match activity
    if (matchActivity && context1.activityType !== context2.activityType) {
      return false;
    }

    return true;
  }

  /**
   * Get context similarity score (0-1)
   */
  getContextSimilarity(context1: ListeningContext, context2: ListeningContext): number {
    let score = 0;
    let totalFactors = 0;

    // Time of day (most important)
    totalFactors++;
    if (context1.timeOfDay === context2.timeOfDay) {
      score += 0.4;
    }

    // Day of week
    totalFactors++;
    if (context1.dayOfWeek === context2.dayOfWeek) {
      score += 0.3;
    } else if (
      // Weekend vs weekday similarity
      ['saturday', 'sunday'].includes(context1.dayOfWeek) ===
      ['saturday', 'sunday'].includes(context2.dayOfWeek)
    ) {
      score += 0.15;
    }

    // Weather
    if (context1.weatherCondition && context2.weatherCondition) {
      totalFactors++;
      if (context1.weatherCondition === context2.weatherCondition) {
        score += 0.2;
      }
    }

    // Activity
    if (context1.activityType && context2.activityType) {
      totalFactors++;
      if (context1.activityType === context2.activityType) {
        score += 0.1;
      }
    }

    return score;
  }
}

// Export singleton instance
export default new ContextDetector();
