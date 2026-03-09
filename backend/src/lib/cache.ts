/**
 * In-Memory Cache with TTL Support
 * 
 * Production-grade caching layer for frequently accessed data
 * Reduces database load and improves response times
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheOptions {
  ttlSeconds?: number;
  maxEntries?: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxEntries: number;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * In-flight fetch deduplication.
   * When the cache is empty / expired AND thousands of requests hit
   * `getOrSet()` at once, only the **first** request calls the callback.
   * All others await the same Promise.  This prevents the "thundering herd"
   * pattern that killed the Supabase connection pool under 10K VU load.
   */
  private inflight: Map<string, Promise<any>> = new Map();

  constructor(options: CacheOptions = {}) {
    this.maxEntries = options.maxEntries || 1000;
    this.defaultTTL = options.ttlSeconds || 300; // 5 minutes default

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set item in cache with optional TTL
   */
  set<T>(key: string, data: T, ttlSeconds?: number): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }

    const ttl = ttlSeconds || this.defaultTTL;
    const now = Date.now();

    this.cache.set(key, {
      data,
      createdAt: now,
      expiresAt: now + (ttl * 1000),
    });
  }

  /**
   * Get or set with callback — stampede-safe.
   *
   * If the value is cached, returns it immediately.
   * If not, only ONE callback runs; concurrent callers await the same
   * Promise so Supabase never sees more than 1 fetch per cache key.
   */
  async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    // Deduplicate: if another request is already fetching this key, piggy-back.
    const existing = this.inflight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const fetching = callback()
      .then((data) => {
        this.set(key, data, ttlSeconds);
        return data;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, fetching);
    return fetching;
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string): number {
    let deleted = 0;
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxEntries: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
    };
  }

  /**
   * Alias for getStats() - for backward compatibility
   */
  stats() {
    return this.getStats();
  }

  /**
   * Evict oldest entries
   */
  private evictOldest(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldest = key;
        oldestTime = entry.createdAt;
      }
    }

    if (oldest) {
      this.cache.delete(oldest);
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    // Clean up every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 60000);

    // Don't keep process alive just for cleanup
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop cleanup interval (for graceful shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Singleton instances for different cache purposes
export const apiCache = new CacheManager({ ttlSeconds: 60, maxEntries: 500 }); // Short TTL for API responses
export const courseCache = new CacheManager({ ttlSeconds: 300, maxEntries: 200 }); // 5 min for courses
export const userCache = new CacheManager({ ttlSeconds: 600, maxEntries: 500 }); // 10 min for user data

/**
 * Cache key generators for consistent key naming
 */
export const cacheKeys = {
  // Course keys
  allCourses: (filters?: any) => `courses:all:${JSON.stringify(filters || {})}`,
  course: (id: string) => `courses:${id}`,
  courseEnrollments: (courseId: string) => `courses:${courseId}:enrollments`,
  
  // User keys
  user: (userId: string) => `users:${userId}`,
  userProfile: (clerkId: string) => `users:profile:${clerkId}`,
  userCourses: (userId: string) => `users:${userId}:courses`,
  
  // Meeting keys
  pendingMeetings: () => `meetings:pending`,
  teacherSlots: (teacherId: string, date?: string) => 
    date ? `slots:${teacherId}:${date}` : `slots:${teacherId}`,
  
  // Teacher keys
  allTeachers: () => `teachers:all`,
  teacherPrice: (teacherId: string) => `teachers:${teacherId}:price`,
};

/**
 * Invalidation helpers
 */
export const invalidateCache = {
  courses: () => {
    courseCache.deletePattern('courses:');
  },
  course: (courseId: string) => {
    courseCache.delete(cacheKeys.course(courseId));
    courseCache.deletePattern('courses:all:');
  },
  user: (userId: string) => {
    userCache.deletePattern(`users:${userId}`);
  },
  meetings: () => {
    apiCache.delete(cacheKeys.pendingMeetings());
  },
  teachers: () => {
    userCache.deletePattern('teachers:');
  },
};

export default CacheManager;
