/**
 * Template Recommendation Service
 * Suggests contextually relevant playlist templates based on time, weather, activity
 */

import type {PlaylistTemplate} from '../types/playlists';

export interface TemplateRecommendation {
  template: PlaylistTemplate;
  reason: string;
  confidence: number; // 0-1
}

export class TemplateRecommendationService {
  /**
   * Get 1-2 contextually relevant template suggestions
   */
  static getSuggestedTemplates(context?: {
    timeOfDay?: string;
    weather?: string;
    dayOfWeek?: string;
    currentActivity?: string;
  }): TemplateRecommendation[] {
    const suggestions: TemplateRecommendation[] = [];
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday

    // Determine time of day if not provided
    const timeOfDay = context?.timeOfDay || this.getTimeOfDay(hour);

    // 1. Time-based suggestions (highest priority)
    if (timeOfDay === 'morning' || hour < 11) {
      suggestions.push({
        template: 'morning_energy',
        reason: "Rise and shine! It's morning",
        confidence: 0.95,
      });
    } else if (timeOfDay === 'evening' || hour >= 18) {
      suggestions.push({
        template: 'evening_winddown',
        reason: 'Wind down after your day',
        confidence: 0.9,
      });
    }

    // 2. Weather-based suggestions
    if (context?.weather) {
      const weatherLower = context.weather.toLowerCase();
      if (weatherLower.includes('rain') || weatherLower.includes('cloud')) {
        suggestions.push({
          template: 'rainy_day',
          reason: `Perfect for ${context.weather} weather`,
          confidence: 0.85,
        });
      }
    }

    // 3. Activity-based suggestions
    if (context?.currentActivity) {
      const activity = context.currentActivity.toLowerCase();
      if (
        activity.includes('run') ||
        activity.includes('workout') ||
        activity.includes('gym') ||
        activity.includes('exercise')
      ) {
        suggestions.push({
          template: 'workout',
          reason: 'Pump up your workout',
          confidence: 0.9,
        });
      } else if (
        activity.includes('work') ||
        activity.includes('study') ||
        activity.includes('focus')
      ) {
        suggestions.push({
          template: 'focus_flow',
          reason: 'Lock in and focus',
          confidence: 0.85,
        });
      }
    }

    // 4. Work hours = focus suggestion
    if (hour >= 9 && hour < 17 && !context?.currentActivity) {
      suggestions.push({
        template: 'focus_flow',
        reason: 'Deep work hours',
        confidence: 0.7,
      });
    }

    // 5. Weekend vibes
    if ((day === 0 || day === 6) && !suggestions.length) {
      suggestions.push({
        template: 'right_now',
        reason: "Weekend vibes - we've got you",
        confidence: 0.75,
      });
    }

    // 6. Default fallback - always show "Right Now"
    if (suggestions.length === 0) {
      suggestions.push({
        template: 'right_now',
        reason: 'Perfect for right now',
        confidence: 0.8,
      });
    }

    // Sort by confidence and return top 2
    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 2);
  }

  /**
   * Get all available templates with metadata
   */
  static getAllTemplates() {
    return [
      {
        id: 'right_now' as PlaylistTemplate,
        name: 'Right Now',
        emoji: '✨',
        description: 'Perfect for your current vibe',
        color: '#FFD700',
      },
      {
        id: 'morning_energy' as PlaylistTemplate,
        name: 'Morning Energy',
        emoji: '🌅',
        description: 'Start your day strong',
        color: '#FF6B35',
      },
      {
        id: 'focus_flow' as PlaylistTemplate,
        name: 'Focus Flow',
        emoji: '🎯',
        description: 'Deep concentration mode',
        color: '#6C5CE7',
      },
      {
        id: 'evening_winddown' as PlaylistTemplate,
        name: 'Evening Chill',
        emoji: '🌙',
        description: 'Wind down and relax',
        color: '#A29BFE',
      },
      {
        id: 'rainy_day' as PlaylistTemplate,
        name: 'Rainy Day',
        emoji: '🌧️',
        description: 'Cozy vibes',
        color: '#74B9FF',
      },
      {
        id: 'workout' as PlaylistTemplate,
        name: 'Workout',
        emoji: '💪',
        description: 'High energy pump',
        color: '#FF6348',
      },
    ];
  }

  /**
   * Get time of day category
   */
  private static getTimeOfDay(hour: number): string {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }
}
