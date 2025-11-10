/**
 * Supabase Client Configuration
 * Central client for all database operations
 */

// IMPORTANT: Import URL polyfill FIRST before Supabase
import 'react-native-url-polyfill/auto';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Database types
import type { Database } from '../../types/database';

// Singleton client instance
let supabaseClient: SupabaseClient<Database> | null = null;

/**
 * Get or create Supabase client
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase configuration. Check your .env file.');
    }

    supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // Since we use Spotify OAuth, we'll manage auth tokens manually
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseClient;
}

/**
 * Set user session for RLS (Row Level Security)
 * Call this after Spotify login with the Spotify user ID
 */
export async function setUserSession(userId: string): Promise<void> {
  const client = getSupabaseClient();
  
  // For now, we'll use the service role key for operations
  // In production, you'd want to implement proper auth with Supabase Auth
  // and link it to Spotify OAuth
  
  // Store user ID for queries
  // This is a simplified version - in production use proper JWT tokens
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('user_preferences').select('count').limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Supabase connection error:', error);
    return false;
  }
}

export default getSupabaseClient;
