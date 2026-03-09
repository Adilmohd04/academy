/**
 * Cache Provider Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MemoryCacheProvider, createCacheProvider } from '../../lib/cacheProvider';

describe('MemoryCacheProvider', () => {
  let cache: MemoryCacheProvider;

  beforeEach(() => {
    cache = new MemoryCacheProvider({ ttlSeconds: 5, maxEntries: 10 });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      await cache.set('key1', { name: 'test' });
      const result = await cache.get('key1');

      expect(result).toEqual({ name: 'test' });
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('missing');
      expect(result).toBeNull();
    });

    it('should delete a key', async () => {
      await cache.set('key1', 'value');
      const deleted = await cache.delete('key1');

      expect(deleted).toBe(true);
      expect(await cache.get('key1')).toBeNull();
    });

    it('should check key existence', async () => {
      await cache.set('exists', true);

      expect(await cache.has('exists')).toBe(true);
      expect(await cache.has('missing')).toBe(false);
    });

    it('should clear all entries', async () => {
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.clear();

      expect(await cache.get('a')).toBeNull();
      expect(await cache.get('b')).toBeNull();
    });
  });

  describe('TTL', () => {
    it('should expire entries after TTL', async () => {
      const shortCache = new MemoryCacheProvider({ ttlSeconds: 1 });
      await shortCache.set('expiring', 'value');

      expect(await shortCache.get('expiring')).toBe('value');

      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(await shortCache.get('expiring')).toBeNull();
      shortCache.destroy();
    });
  });

  describe('Pattern Deletion', () => {
    it('should delete keys matching a pattern', async () => {
      await cache.set('courses:1', 'a');
      await cache.set('courses:2', 'b');
      await cache.set('users:1', 'c');

      const deleted = await cache.deletePattern('courses:');

      expect(deleted).toBe(2);
      expect(await cache.get('courses:1')).toBeNull();
      expect(await cache.get('users:1')).toBe('c');
    });
  });

  describe('Max Entries', () => {
    it('should evict old entries when at capacity', async () => {
      const small = new MemoryCacheProvider({ maxEntries: 3, ttlSeconds: 60 });

      await small.set('k1', 'v1');
      await small.set('k2', 'v2');
      await small.set('k3', 'v3');
      await small.set('k4', 'v4'); // evicts k1

      expect(await small.get('k4')).toBe('v4');
      expect(small.getStats().size).toBeLessThanOrEqual(3);
      small.destroy();
    });
  });

  describe('Stampede Prevention (getOrSet)', () => {
    it('should only call callback once for concurrent reads', async () => {
      let callCount = 0;
      const slowFetch = () =>
        new Promise<string>((resolve) => {
          callCount++;
          setTimeout(() => resolve('result'), 50);
        });

      // Fire 10 concurrent getOrSet calls
      const promises = Array.from({ length: 10 }, () =>
        cache.getOrSet('shared', slowFetch),
      );

      const results = await Promise.all(promises);

      // All should get the same value
      expect(results.every(r => r === 'result')).toBe(true);
      // But the callback should only have been called ONCE
      expect(callCount).toBe(1);
    });
  });
});

describe('createCacheProvider factory', () => {
  it('should create a MemoryCacheProvider by default', () => {
    const provider = createCacheProvider();
    expect(provider).toBeInstanceOf(MemoryCacheProvider);
    provider.destroy();
  });
});
