/**
 * Listening Event Store
 * Handles saving and retrieving listening events from Supabase
 */

import getSupabaseClient from './supabase';
import { ListeningEvent, ListeningEventRow, rowToListeningEvent, listeningEventToRow } from '../../types/listening';

export class ListeningEventStore {
  /**
   * Save a single listening event
   */
  async saveEvent(event: ListeningEvent): Promise<void> {
    const client = getSupabaseClient();
    const row = listeningEventToRow(event);

    const { error } = await client
      .from('listening_events')
      .insert(row as any);

    if (error) {
      console.error('Failed to save listening event:', error);
      throw new Error(`Failed to save listening event: ${error.message}`);
    }
  }

  /**
   * Save multiple listening events in batch
   */
  async saveEvents(events: ListeningEvent[]): Promise<void> {
    if (events.length === 0) return;

    const client = getSupabaseClient();
    const rows = events.map(listeningEventToRow);

    const { error } = await client
      .from('listening_events')
      .insert(rows as any);

    if (error) {
      console.error('Failed to save listening events:', error);
      throw new Error(`Failed to save listening events: ${error.message}`);
    }

    console.log(`✅ Saved ${events.length} listening events`);
  }

  /**
   * Get listening events for a user in a date range
   */
  async getEventsInRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ListeningEvent[]> {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('listening_events')
      .select('*')
      .eq('user_id', userId)
      .gte('played_at', startDate.toISOString())
      .lte('played_at', endDate.toISOString())
      .order('played_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch listening events:', error);
      throw new Error(`Failed to fetch listening events: ${error.message}`);
    }

    return (data as ListeningEventRow[]).map(rowToListeningEvent);
  }

  /**
   * Get recent listening events (last N days)
   */
  async getRecentEvents(userId: string, days: number = 7): Promise<ListeningEvent[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.getEventsInRange(userId, startDate, endDate);
  }

  /**
   * Get events matching specific context
   */
  async getEventsByContext(
    userId: string,
    filters: {
      timeOfDay?: string;
      dayOfWeek?: string;
      weatherCondition?: string;
      activityType?: string;
    }
  ): Promise<ListeningEvent[]> {
    const client = getSupabaseClient();

    let query = client
      .from('listening_events')
      .select('*')
      .eq('user_id', userId);

    if (filters.timeOfDay) {
      query = query.eq('time_of_day', filters.timeOfDay);
    }
    if (filters.dayOfWeek) {
      query = query.eq('day_of_week', filters.dayOfWeek);
    }
    if (filters.weatherCondition) {
      query = query.eq('weather_condition', filters.weatherCondition);
    }
    if (filters.activityType) {
      query = query.eq('activity_type', filters.activityType);
    }

    query = query.order('played_at', { ascending: false }).limit(1000);

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch events by context:', error);
      throw new Error(`Failed to fetch events by context: ${error.message}`);
    }

    return (data as ListeningEventRow[]).map(rowToListeningEvent);
  }

  /**
   * Get the most recent event for a user
   */
  async getLastEvent(userId: string): Promise<ListeningEvent | null> {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('listening_events')
      .select('*')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Failed to fetch last event:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return rowToListeningEvent(data[0] as ListeningEventRow);
  }

  /**
   * Check if a track has already been recorded (to avoid duplicates)
   */
  async hasEvent(userId: string, trackId: string, playedAt: Date): Promise<boolean> {
    const client = getSupabaseClient();

    // Check if there's an event within 5 minutes of this timestamp
    const fiveMinutesAgo = new Date(playedAt.getTime() - 5 * 60 * 1000);
    const fiveMinutesLater = new Date(playedAt.getTime() + 5 * 60 * 1000);

    const { data, error } = await client
      .from('listening_events')
      .select('id')
      .eq('user_id', userId)
      .eq('track_id', trackId)
      .gte('played_at', fiveMinutesAgo.toISOString())
      .lte('played_at', fiveMinutesLater.toISOString())
      .limit(1);

    if (error) {
      console.error('Failed to check for duplicate event:', error);
      return false;
    }

    return data && data.length > 0;
  }

  /**
   * Get total event count for a user
   */
  async getEventCount(userId: string): Promise<number> {
    const client = getSupabaseClient();

    const { count, error } = await client
      .from('listening_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to get event count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Update engagement metrics for an event
   */
  async updateEngagement(
    eventId: string,
    engagement: {
      skipped?: boolean;
      playDurationMs?: number;
      completed?: boolean;
      repeated?: boolean;
      rating?: number;
    }
  ): Promise<void> {
    const client = getSupabaseClient();

    const updateData: Record<string, any> = {};
    if (engagement.skipped !== undefined) updateData.skipped = engagement.skipped;
    if (engagement.playDurationMs !== undefined) updateData.play_duration_ms = engagement.playDurationMs;
    if (engagement.completed !== undefined) updateData.completed = engagement.completed;
    if (engagement.repeated !== undefined) updateData.repeated = engagement.repeated;
    if (engagement.rating !== undefined) updateData.rating = engagement.rating;

    const { error } = await (client as any)
      .from('listening_events')
      .update(updateData)
      .eq('id', eventId);

    if (error) {
      console.error('Failed to update engagement:', error);
      throw new Error(`Failed to update engagement: ${error.message}`);
    }
  }

  /**
   * Delete old events (for data management)
   */
  async deleteOldEvents(userId: string, olderThanDays: number): Promise<number> {
    const client = getSupabaseClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { data, error } = await client
      .from('listening_events')
      .delete()
      .eq('user_id', userId)
      .lt('played_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      console.error('Failed to delete old events:', error);
      throw new Error(`Failed to delete old events: ${error.message}`);
    }

    return data?.length || 0;
  }
}

// Export singleton instance
export default new ListeningEventStore();
