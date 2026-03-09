/**
 * Cache Provider Interface
 * 
 * Abstracts cache storage so the application can swap between:
 *  - MemoryCacheProvider  (current, default — single-process, fast, zero-dependency)
 *  - RedisCacheProvider   (optional future — multi-process, shared, persistent)
 *
 * All cache consumers use this interface, not the concrete implementation.
 */

export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  deletePattern(pattern: string): Promise<number>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  getStats(): { size: number; maxEntries: number };
  destroy(): void;
}

export interface CacheProviderOptions {
  ttlSeconds?: number;
  maxEntries?: number;
  /** Redis connection string — when provided, RedisCacheProvider is selected */
  redisUrl?: string;
  /** Key prefix to namespace cache entries */
  prefix?: string;
}

/**
 * Memory-backed cache provider (default).
 *
 * This is the production implementation. It wraps the existing CacheManager
 * behind the ICacheProvider interface so swapping to Redis requires ZERO
 * changes in service code.
 */
export class MemoryCacheProvider implements ICacheProvider {
  private cache: Map<string, { data: unknown; expiresAt: number }> = new Map();
  private maxEntries: number;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private inflight: Map<string, Promise<unknown>> = new Map();

  constructor(options: CacheProviderOptions = {}) {
    this.maxEntries = options.maxEntries || 1000;
    this.defaultTTL = options.ttlSeconds || 300;
    this.startCleanup();
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (this.cache.size >= this.maxEntries) this.evictOldest();

    const ttl = ttlSeconds || this.defaultTTL;
    this.cache.set(key, {
      data: value,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async deletePattern(pattern: string): Promise<number> {
    let deleted = 0;
    const regex = new RegExp(pattern);
    for (const k of this.cache.keys()) {
      if (regex.test(k)) {
        this.cache.delete(k);
        deleted++;
      }
    }
    return deleted;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  getStats() {
    return { size: this.cache.size, maxEntries: this.maxEntries };
  }

  /**
   * Stampede-safe getOrSet — identical to the in-memory CacheManager version.
   */
  async getOrSet<T>(key: string, callback: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const existing = this.inflight.get(key);
    if (existing) return existing as Promise<T>;

    const fetching = callback()
      .then(async (data) => {
        await this.set(key, data, ttlSeconds);
        return data;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, fetching);
    return fetching;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }

  private evictOldest(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;
    for (const [k, v] of this.cache.entries()) {
      if (v.expiresAt < oldestTime) {
        oldest = k;
        oldestTime = v.expiresAt;
      }
    }
    if (oldest) this.cache.delete(oldest);
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now > v.expiresAt) this.cache.delete(k);
      }
    }, 60_000);
    if (this.cleanupInterval.unref) this.cleanupInterval.unref();
  }
}

/**
 * Redis-backed cache provider (future implementation placeholder).
 *
 * When you're ready to switch to Redis:
 * 1. `npm install ioredis`
 * 2. Implement this class using ioredis
 * 3. Set REDIS_URL in .env
 * 4. The factory below auto-selects Redis when REDIS_URL is present
 */
export class RedisCacheProvider implements ICacheProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_options: CacheProviderOptions = {}) {
    // TODO: Initialize ioredis client here
    //   import Redis from 'ioredis';
    //   this.redis = new Redis(options.redisUrl);
    throw new Error(
      'RedisCacheProvider is not yet implemented. Install ioredis and complete this class.',
    );
  }

  async get<T>(_key: string): Promise<T | null> { return null; }
  async set<T>(_key: string, _value: T, _ttl?: number): Promise<void> {}
  async delete(_key: string): Promise<boolean> { return false; }
  async deletePattern(_pattern: string): Promise<number> { return 0; }
  async clear(): Promise<void> {}
  async has(_key: string): Promise<boolean> { return false; }
  getStats() { return { size: 0, maxEntries: 0 }; }
  destroy(): void {}
}

/**
 * Factory — automatically selects the appropriate cache provider.
 *
 * Environment-driven:
 *  - If REDIS_URL is set → RedisCacheProvider
 *  - Otherwise → MemoryCacheProvider (default)
 */
export function createCacheProvider(options: CacheProviderOptions = {}): ICacheProvider {
  const redisUrl = options.redisUrl || process.env.REDIS_URL;

  if (redisUrl) {
    // Redis available — use distributed cache
    // Uncomment when RedisCacheProvider is implemented:
    // return new RedisCacheProvider({ ...options, redisUrl });
    console.warn('⚠️  REDIS_URL is set but RedisCacheProvider is not yet implemented. Falling back to memory cache.');
  }

  return new MemoryCacheProvider(options);
}

export default createCacheProvider;
