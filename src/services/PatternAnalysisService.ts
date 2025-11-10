/**
 * Pattern Analysis Service
 * Analyzes listening history to learn user preferences for different contexts
 */

import {getSupabaseClient} from './database/supabase';
import {FirebaseAuthService} from './FirebaseAuthService';

interface ContextPattern {
  context_type: 'time' | 'weather' | 'activity' | 'combined';
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night' | null;
  day_of_week?: string | null;
  weather_condition?: string | null;
  activity_type?: string | null;
  
  avg_energy?: number;
  avg_valence?: number;
  avg_tempo?: number;
  avg_danceability?: number;
  avg_acousticness?: number;
  avg_instrumentalness?: number;
  
  top_genres?: any[];
  top_artists?: any[];
  
  sample_size: number;
  confidence_score: number;
}

class PatternAnalysisServiceClass {
  private analysisInterval: ReturnType<typeof setInterval> | null = null;
  private isAnalyzing = false;

  /**
   * Start periodic pattern analysis (runs every 3 hours)
   */
  startPeriodicAnalysis() {
    if (this.analysisInterval) {
      console.log('[PatternAnalysis] Already running periodic analysis');
      return;
    }

    console.log('[PatternAnalysis] 🧠 Starting periodic pattern analysis...');
    
    // Run immediately
    this.analyzePatterns();

    // Then run every 3 hours
    this.analysisInterval = setInterval(() => {
      this.analyzePatterns();
    }, 3 * 60 * 60 * 1000); // 3 hours in milliseconds
  }

  /**
   * Stop periodic analysis
   */
  stopPeriodicAnalysis() {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
      console.log('[PatternAnalysis] ⏸️  Stopped periodic analysis');
    }
  }

  /**
   * Analyze listening patterns (can be called manually)
   */
  async analyzePatterns() {
    if (this.isAnalyzing) {
      console.log('[PatternAnalysis] Analysis already in progress');
      return;
    }

    this.isAnalyzing = true;

    try {
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) {
        console.log('[PatternAnalysis] No user signed in');
        return;
      }

      console.log('[PatternAnalysis] 🧠 Starting pattern analysis...');

      // First, show what's currently in the patterns table
      const supabase = getSupabaseClient();
      const {data: existingPatterns} = await (supabase as any)
        .from('listening_patterns')
        .select('context_type, time_of_day, day_of_week, weather_condition, sample_size')
        .eq('user_id', userId);
      
      console.log('[PatternAnalysis] 📋 Existing patterns in DB:', existingPatterns);

      // Analyze different context types
      await this.analyzeTimePatterns(userId);
      await this.analyzeDayOfWeekPatterns(userId);
      await this.analyzeWeatherPatterns(userId);
      await this.analyzeActivityPatterns(userId);
      await this.analyzeCombinedPatterns(userId);

      console.log('[PatternAnalysis] ✅ Pattern analysis complete');
    } catch (error) {
      console.error('[PatternAnalysis] ❌ Error analyzing patterns:', error);
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Analyze patterns by time (morning, afternoon, evening, night)
   */
  private async analyzeTimePatterns(userId: string) {
    console.log('[PatternAnalysis] Analyzing time-based patterns...');

    const supabase = getSupabaseClient();
    
    // First, check what time_of_day values exist in the database
    const {data: allEvents} = await (supabase as any)
      .from('listening_events')
      .select('time_of_day, day_of_week, weather_condition')
      .eq('user_id', userId)
      .limit(10);
    
    console.log('[PatternAnalysis] 🔍 Sample events from DB:', allEvents);

    const timePeriods = ['morning', 'afternoon', 'evening', 'night'];

    for (const timeOfDay of timePeriods) {
      try {
        // Get listening events for this time period
        const {data: events, error} = await (supabase as any)
          .from('listening_events')
          .select('*')
          .eq('user_id', userId)
          .eq('time_of_day', timeOfDay)
          .not('energy', 'is', null) // Only events with audio features
          .order('played_at', {ascending: false})
          .limit(200); // Last 200 tracks for this time

        if (error) {
          console.error(`[PatternAnalysis] Error fetching ${timeOfDay} events:`, error);
          continue;
        }

        console.log(`[PatternAnalysis] Found ${events?.length || 0} events for ${timeOfDay}`);

        if (!events || events.length < 3) {
          console.log(`[PatternAnalysis] Not enough data for ${timeOfDay} (${events?.length || 0} tracks)`);
          continue;
        }

        // Calculate average audio features
        const pattern = this.calculateAverageFeatures(events);
        pattern.context_type = 'time';
        pattern.time_of_day = timeOfDay as any;
        // For time-only patterns, explicitly set others to null
        pattern.day_of_week = null as any;
        pattern.weather_condition = null as any;
        pattern.activity_type = null as any;
        pattern.sample_size = events.length;
        pattern.confidence_score = this.calculateConfidence(events.length);

        // Get top genres and artists
        pattern.top_genres = this.getTopItems(events, 'genres');
        pattern.top_artists = this.getTopItems(events, 'artist_name');

        // Save or update pattern
        await this.savePattern(userId, pattern);
        
        console.log(`[PatternAnalysis] ✅ ${timeOfDay}: ${events.length} tracks, confidence: ${pattern.confidence_score.toFixed(2)}`);
      } catch (error) {
        console.error(`[PatternAnalysis] Error analyzing ${timeOfDay}:`, error);
      }
    }
  }

  /**
   * Analyze patterns by day of week (Monday, Tuesday, etc.)
   */
  private async analyzeDayOfWeekPatterns(userId: string) {
    console.log('[PatternAnalysis] Analyzing day-of-week patterns...');

    const supabase = getSupabaseClient();
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    for (const dayOfWeek of daysOfWeek) {
      try {
        // Get listening events for this day of the week
        const {data: events, error} = await (supabase as any)
          .from('listening_events')
          .select('*')
          .eq('user_id', userId)
          .eq('day_of_week', dayOfWeek)
          .not('energy', 'is', null) // Only events with audio features
          .order('played_at', {ascending: false})
          .limit(200); // Last 200 tracks for this day

        if (error) {
          console.error(`[PatternAnalysis] Error fetching ${dayOfWeek} events:`, error);
          continue;
        }

        if (!events || events.length < 3) {
          console.log(`[PatternAnalysis] Not enough data for ${dayOfWeek} (${events?.length || 0} tracks)`);
          continue;
        }

        // Calculate average audio features
        const pattern = this.calculateAverageFeatures(events);
        pattern.context_type = 'time';
        // For day-only patterns, explicitly set others to null
        pattern.time_of_day = null as any;
        pattern.day_of_week = dayOfWeek;
        pattern.weather_condition = null as any;
        pattern.activity_type = null as any;
        pattern.sample_size = events.length;
        pattern.confidence_score = this.calculateConfidence(events.length);

        // Get top genres and artists
        pattern.top_genres = this.getTopItems(events, 'genres');
        pattern.top_artists = this.getTopItems(events, 'artist_name');

        // Save or update pattern
        await this.savePattern(userId, pattern);
        
        console.log(`[PatternAnalysis] ✅ ${dayOfWeek}: ${events.length} tracks, confidence: ${pattern.confidence_score.toFixed(2)}`);
      } catch (error) {
        console.error(`[PatternAnalysis] Error analyzing ${dayOfWeek}:`, error);
      }
    }
  }

  /**
   * Analyze patterns by weather conditions
   */
  private async analyzeWeatherPatterns(userId: string) {
    console.log('[PatternAnalysis] Analyzing weather-based patterns...');

    const supabase = getSupabaseClient();
    
    // Check what weather values actually exist
    const {data: weatherCheck} = await (supabase as any)
      .from('listening_events')
      .select('weather_condition, temperature')
      .eq('user_id', userId)
      .not('weather_condition', 'is', null)
      .limit(5);
    
    console.log('[PatternAnalysis] 🌤️  Weather in DB:', weatherCheck);
    
    const weatherConditions = ['sunny', 'partly_cloudy', 'cloudy', 'rainy', 'snowy', 'foggy', 'stormy'];

    for (const weather of weatherConditions) {
      try {
        const {data: events, error} = await (supabase as any)
          .from('listening_events')
          .select('*')
          .eq('user_id', userId)
          .eq('weather_condition', weather)
          .not('energy', 'is', null)
          .order('played_at', {ascending: false})
          .limit(200);
        
        console.log(`[PatternAnalysis] Found ${events?.length || 0} events for weather: ${weather}`);

        if (error || !events || events.length < 3) continue;

        const pattern = this.calculateAverageFeatures(events);
        pattern.context_type = 'weather';
        // For weather-only patterns, explicitly set others to null
        pattern.time_of_day = null as any;
        pattern.day_of_week = null as any;
        pattern.weather_condition = weather;
        pattern.activity_type = null as any;
        pattern.sample_size = events.length;
        pattern.confidence_score = this.calculateConfidence(events.length);
        pattern.top_genres = this.getTopItems(events, 'genres');
        pattern.top_artists = this.getTopItems(events, 'artist_name');

        await this.savePattern(userId, pattern);
        
        console.log(`[PatternAnalysis] ✅ ${weather}: ${events.length} tracks`);
      } catch (error) {
        console.error(`[PatternAnalysis] Error analyzing ${weather}:`, error);
      }
    }
  }

  /**
   * Analyze patterns by activity type
   */
  private async analyzeActivityPatterns(userId: string) {
    console.log('[PatternAnalysis] Analyzing activity-based patterns...');

    const supabase = getSupabaseClient();
    const activities = ['stationary', 'walking', 'running', 'driving', 'cycling'];

    for (const activity of activities) {
      try {
        const {data: events, error} = await (supabase as any)
          .from('listening_events')
          .select('*')
          .eq('user_id', userId)
          .eq('activity_type', activity)
          .not('energy', 'is', null)
          .order('played_at', {ascending: false})
          .limit(200);

        if (error || !events || events.length < 3) continue;

        const pattern = this.calculateAverageFeatures(events);
        pattern.context_type = 'activity';
        // For activity-only patterns, explicitly set others to null
        pattern.time_of_day = null as any;
        pattern.day_of_week = null as any;
        pattern.weather_condition = null as any;
        pattern.activity_type = activity;
        pattern.sample_size = events.length;
        pattern.confidence_score = this.calculateConfidence(events.length);
        pattern.top_genres = this.getTopItems(events, 'genres');
        pattern.top_artists = this.getTopItems(events, 'artist_name');

        await this.savePattern(userId, pattern);
        
        console.log(`[PatternAnalysis] ✅ ${activity}: ${events.length} tracks`);
      } catch (error) {
        console.error(`[PatternAnalysis] Error analyzing ${activity}:`, error);
      }
    }
  }

  /**
   * Analyze combined patterns (e.g., "Monday morning + sunny + driving")
   */
  private async analyzeCombinedPatterns(userId: string) {
    console.log('[PatternAnalysis] Analyzing combined patterns...');
    
    // For now, we'll analyze common combinations
    // In future, we can make this more sophisticated
    
    const supabase = getSupabaseClient();
    
    // Example: Weekend mornings
    try {
      const {data: events, error} = await (supabase as any)
        .from('listening_events')
        .select('*')
        .eq('user_id', userId)
        .in('day_of_week', ['saturday', 'sunday'])
        .eq('time_of_day', 'morning')
        .not('energy', 'is', null)
        .order('played_at', {ascending: false})
        .limit(100);

      if (!error && events && events.length >= 10) {
        const pattern = this.calculateAverageFeatures(events);
        pattern.context_type = 'combined';
        pattern.time_of_day = 'morning' as any;
        // For combined patterns, set unused fields to null
        pattern.day_of_week = null as any;
        pattern.weather_condition = null as any;
        pattern.activity_type = null as any;
        pattern.sample_size = events.length;
        pattern.confidence_score = this.calculateConfidence(events.length);
        pattern.top_genres = this.getTopItems(events, 'genres');
        pattern.top_artists = this.getTopItems(events, 'artist_name');

        await this.savePattern(userId, pattern);
        console.log(`[PatternAnalysis] ✅ Weekend mornings: ${events.length} tracks`);
      }
    } catch (error) {
      console.error('[PatternAnalysis] Error analyzing combined patterns:', error);
    }
  }

  /**
   * Calculate average audio features from events
   */
  private calculateAverageFeatures(events: any[]): ContextPattern {
    const validEvents = events.filter(e => e.energy != null);
    const count = validEvents.length;

    return {
      context_type: 'time',
      avg_energy: validEvents.reduce((sum, e) => sum + (e.energy || 0), 0) / count,
      avg_valence: validEvents.reduce((sum, e) => sum + (e.valence || 0), 0) / count,
      avg_tempo: validEvents.reduce((sum, e) => sum + (e.tempo || 0), 0) / count,
      avg_danceability: validEvents.reduce((sum, e) => sum + (e.danceability || 0), 0) / count,
      avg_acousticness: validEvents.reduce((sum, e) => sum + (e.acousticness || 0), 0) / count,
      avg_instrumentalness: validEvents.reduce((sum, e) => sum + (e.instrumentalness || 0), 0) / count,
      sample_size: count,
      confidence_score: 0,
    };
  }

  /**
   * Get top genres or artists from events
   */
  private getTopItems(events: any[], field: string): any[] {
    const counts: {[key: string]: number} = {};

    events.forEach(event => {
      if (field === 'genres' && event.genres) {
        event.genres.forEach((genre: string) => {
          counts[genre] = (counts[genre] || 0) + 1;
        });
      } else if (field === 'artist_name' && event.artist_name) {
        counts[event.artist_name] = (counts[event.artist_name] || 0) + 1;
      }
    });

    // Sort by count and return top 10
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({name, count}));
  }

  /**
   * Calculate confidence score based on sample size
   */
  private calculateConfidence(sampleSize: number): number {
    // Confidence increases with sample size, caps at 1.0
    // 10 samples = 0.1, 50 samples = 0.5, 100+ samples = 1.0
    return Math.min(sampleSize / 100, 1.0);
  }

  /**
   * Save or update a pattern in the database
   */
  private async savePattern(userId: string, pattern: ContextPattern) {
    try {
      const supabase = getSupabaseClient();
      
      // Ensure proper null handling - convert undefined to null explicitly
      const patternData: any = {
        user_id: userId,
        context_type: pattern.context_type,
        time_of_day: pattern.time_of_day ?? null,
        day_of_week: pattern.day_of_week ?? null,
        weather_condition: pattern.weather_condition ?? null,
        activity_type: pattern.activity_type ?? null,
        avg_energy: pattern.avg_energy,
        avg_valence: pattern.avg_valence,
        avg_tempo: pattern.avg_tempo,
        avg_danceability: pattern.avg_danceability,
        avg_acousticness: pattern.avg_acousticness,
        avg_instrumentalness: pattern.avg_instrumentalness,
        top_genres: JSON.stringify(pattern.top_genres || []),
        top_artists: JSON.stringify(pattern.top_artists || []),
        sample_size: pattern.sample_size,
        confidence_score: pattern.confidence_score,
        last_updated: new Date().toISOString(),
      };

      console.log('[PatternAnalysis] 💾 Saving pattern:', {
        context: pattern.context_type,
        time_of_day: patternData.time_of_day,
        day_of_week: patternData.day_of_week,
        weather: patternData.weather_condition,
        activity: patternData.activity_type,
        sample_size: patternData.sample_size
      });

      // First, try to find existing pattern with the same signature
      const {data: existing} = await (supabase as any)
        .from('listening_patterns')
        .select('id')
        .eq('user_id', userId)
        .eq('context_type', pattern.context_type)
        .is('time_of_day', patternData.time_of_day)
        .is('day_of_week', patternData.day_of_week)
        .is('weather_condition', patternData.weather_condition)
        .is('activity_type', patternData.activity_type)
        .maybeSingle();

      let error;
      if (existing) {
        // Update existing pattern
        const result = await (supabase as any)
          .from('listening_patterns')
          .update(patternData)
          .eq('id', existing.id);
        error = result.error;
      } else {
        // Insert new pattern
        const result = await (supabase as any)
          .from('listening_patterns')
          .insert(patternData);
        error = result.error;
      }

      if (error) {
        console.error('[PatternAnalysis] ❌ Error saving pattern:', error);
        console.error('[PatternAnalysis] Error details:', JSON.stringify(error, null, 2));
      } else {
        console.log('[PatternAnalysis] ✅ Pattern saved successfully');
        
        // Verify it was saved by querying it back
        const {data: verify} = await (supabase as any)
          .from('listening_patterns')
          .select('time_of_day, day_of_week, weather_condition, activity_type')
          .eq('user_id', userId)
          .eq('context_type', pattern.context_type)
          .is('time_of_day', patternData.time_of_day)
          .is('day_of_week', patternData.day_of_week)
          .is('weather_condition', patternData.weather_condition)
          .is('activity_type', patternData.activity_type)
          .maybeSingle();
        
        console.log('[PatternAnalysis] 🔍 Verified saved pattern:', verify);
      }
    } catch (error) {
      console.error('[PatternAnalysis] Error in savePattern:', error);
    }
  }

  /**
   * Get patterns for current context
   */
  async getPatternsForContext(
    timeOfDay?: string,
    weather?: string,
    activity?: string
  ): Promise<any[]> {
    try {
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) return [];

      const supabase = getSupabaseClient();
      let query = (supabase as any)
        .from('listening_patterns')
        .select('*')
        .eq('user_id', userId);

      if (timeOfDay) query = query.eq('time_of_day', timeOfDay);
      if (weather) query = query.eq('weather_condition', weather);
      if (activity) query = query.eq('activity_type', activity);

      const {data, error} = await query
        .order('confidence_score', {ascending: false})
        .limit(5);

      if (error) {
        console.error('[PatternAnalysis] Error fetching patterns:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[PatternAnalysis] Error getting patterns:', error);
      return [];
    }
  }

  /**
   * Get user's overall music taste summary
   */
  async getMusicTasteSummary(): Promise<any> {
    try {
      const userId = FirebaseAuthService.getCurrentUserId();
      if (!userId) return null;

      const supabase = getSupabaseClient();
      
      // Get all patterns
      const {data: patterns, error} = await (supabase as any)
        .from('listening_patterns')
        .select('*')
        .eq('user_id', userId);

      if (error || !patterns || patterns.length === 0) return null;

      // Calculate overall averages
      const avgEnergy = patterns.reduce((sum: number, p: any) => sum + (p.avg_energy || 0), 0) / patterns.length;
      const avgValence = patterns.reduce((sum: number, p: any) => sum + (p.avg_valence || 0), 0) / patterns.length;
      const avgTempo = patterns.reduce((sum: number, p: any) => sum + (p.avg_tempo || 0), 0) / patterns.length;

      // Aggregate all top genres
      const allGenres: {[key: string]: number} = {};
      patterns.forEach((p: any) => {
        try {
          const genres = typeof p.top_genres === 'string' ? JSON.parse(p.top_genres) : p.top_genres;
          if (Array.isArray(genres)) {
            genres.forEach((g: any) => {
              allGenres[g.name] = (allGenres[g.name] || 0) + g.count;
            });
          }
        } catch (e) {}
      });

      const topGenres = Object.entries(allGenres)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([name]) => name);

      return {
        avgEnergy,
        avgValence,
        avgTempo,
        topGenres,
        totalPatterns: patterns.length,
      };
    } catch (error) {
      console.error('[PatternAnalysis] Error getting taste summary:', error);
      return null;
    }
  }
}

export const PatternAnalysisService = new PatternAnalysisServiceClass();
