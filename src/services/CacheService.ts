/**
 * Cache Service
 * Provides generic caching with TTL (Time-To-Live) support
 * Stores data in AsyncStorage for persistence across app restarts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@tonemap_cache:';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // TTL in minutes
}

class CacheServiceClass {
  /**
   * Get cached data if it exists and hasn't expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = `${CACHE_PREFIX}${key}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();
      const age = (now - entry.timestamp) / 1000 / 60; // age in minutes

      // Check if cache has expired
      if (age > entry.ttl) {
        console.log(`[Cache] ⏰ Cache expired for key: ${key} (${age.toFixed(1)}min > ${entry.ttl}min)`);
        await this.invalidate(key);
        return null;
      }

      console.log(`[Cache] ✅ Cache hit for key: ${key} (${age.toFixed(1)}min old)`);
      return entry.data;
    } catch (error) {
      console.error(`[Cache] Error getting cache for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  async set<T>(key: string, value: T, ttlMinutes: number): Promise<void> {
    try {
      const cacheKey = `${CACHE_PREFIX}${key}`;
      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl: ttlMinutes,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
      console.log(`[Cache] 💾 Cached data for key: ${key} (TTL: ${ttlMinutes}min)`);
    } catch (error) {
      console.error(`[Cache] Error setting cache for ${key}:`, error);
    }
  }

  /**
   * Invalidate (delete) cached data
   */
  async invalidate(key: string): Promise<void> {
    try {
      const cacheKey = `${CACHE_PREFIX}${key}`;
      await AsyncStorage.removeItem(cacheKey);
      console.log(`[Cache] 🗑️  Invalidated cache for key: ${key}`);
    } catch (error) {
      console.error(`[Cache] Error invalidating cache for ${key}:`, error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`[Cache] 🧹 Cleared ${cacheKeys.length} cache entries`);
      }
    } catch (error) {
      console.error('[Cache] Error clearing all cache:', error);
    }
  }

  /**
   * Get cache info (for debugging)
   */
  async getCacheInfo(): Promise<{key: string; age: number; ttl: number}[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      
      const info = await Promise.all(
        cacheKeys.map(async (cacheKey) => {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (!cached) return null;

          const entry = JSON.parse(cached);
          const now = Date.now();
          const age = (now - entry.timestamp) / 1000 / 60; // age in minutes

          return {
            key: cacheKey.replace(CACHE_PREFIX, ''),
            age: parseFloat(age.toFixed(1)),
            ttl: entry.ttl,
          };
        })
      );

      return info.filter(Boolean) as {key: string; age: number; ttl: number}[];
    } catch (error) {
      console.error('[Cache] Error getting cache info:', error);
      return [];
    }
  }
}

export const CacheService = new CacheServiceClass();
