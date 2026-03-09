/**
 * Cache System Unit Tests
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import CacheManager, { cacheKeys, invalidateCache, courseCache } from '../../lib/cache';

describe('Cache System', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager({ ttlSeconds: 5, maxEntries: 10 });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', { data: 'test' });
      const result = cache.get('key1');
      
      expect(result).toEqual({ data: 'test' });
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete values', () => {
      cache.set('key1', 'value1');
      cache.delete('key1');
      
      expect(cache.get('key1')).toBeNull();
    });

    it('should clear all values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('TTL Expiration', () => {
    it('should expire values after TTL', async () => {
      const shortCache = new CacheManager({ ttlSeconds: 1 });
      shortCache.set('expiring', 'value');
      
      expect(shortCache.get('expiring')).toBe('value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(shortCache.get('expiring')).toBeNull();
      shortCache.destroy();
    });

    it('should respect custom TTL per entry', async () => {
      cache.set('short', 'value', 1);
      cache.set('long', 'value', 10);
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(cache.get('short')).toBeNull();
      expect(cache.get('long')).toBe('value');
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      cache.set('existing', 'cached-value');
      const callback = jest.fn<() => Promise<string>>().mockResolvedValue('new-value');
      
      const result = await cache.getOrSet<string>('existing', callback);
      
      expect(result).toBe('cached-value');
      expect(callback).not.toHaveBeenCalled();
    });

    it('should call callback and cache result if not exists', async () => {
      const callback = jest.fn<() => Promise<string>>().mockResolvedValue('new-value');
      
      const result = await cache.getOrSet<string>('new-key', callback);
      
      expect(result).toBe('new-value');
      expect(callback).toHaveBeenCalledTimes(1);
      expect(cache.get('new-key')).toBe('new-value');
    });
  });

  describe('Pattern Deletion', () => {
    it('should delete keys matching pattern', () => {
      cache.set('courses:1', 'course1');
      cache.set('courses:2', 'course2');
      cache.set('users:1', 'user1');
      
      const deleted = cache.deletePattern('courses:');
      
      expect(deleted).toBe(2);
      expect(cache.get('courses:1')).toBeNull();
      expect(cache.get('courses:2')).toBeNull();
      expect(cache.get('users:1')).toBe('user1');
    });
  });

  describe('Max Entries', () => {
    it('should evict oldest entries when at capacity', () => {
      const smallCache = new CacheManager({ maxEntries: 3 });
      
      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3');
      smallCache.set('key4', 'value4'); // Should evict key1
      
      expect(smallCache.get('key1')).toBeNull();
      expect(smallCache.get('key4')).toBe('value4');
      
      smallCache.destroy();
    });
  });

  describe('Cache Key Generators', () => {
    it('should generate consistent course keys', () => {
      expect(cacheKeys.course('abc')).toBe('courses:abc');
      expect(cacheKeys.allCourses({ status: 'published' })).toBe('courses:all:{"status":"published"}');
    });

    it('should generate consistent user keys', () => {
      expect(cacheKeys.user('user123')).toBe('users:user123');
      expect(cacheKeys.userProfile('clerk_123')).toBe('users:profile:clerk_123');
    });
  });
});
