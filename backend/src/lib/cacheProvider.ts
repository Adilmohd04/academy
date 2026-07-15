export interface CacheProviderStats {
  size: number;
  maxEntries: number;
}

export interface MemoryCacheOptions {
  ttlSeconds?: number;
  maxEntries?: number;
}

type CacheEntry<T> = {
  value: T;
  expiresAt: number | null;
  createdAt: number;
};

export class MemoryCacheProvider {
  private readonly ttlSeconds: number;
  private readonly maxEntries: number;
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly pending = new Map<string, Promise<unknown>>();

  constructor(options: MemoryCacheOptions = {}) {
    this.ttlSeconds = options.ttlSeconds ?? 300;
    this.maxEntries = options.maxEntries ?? 1000;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.evictIfNeeded(key);

    const now = Date.now();
    const expiresAt = this.ttlSeconds > 0 ? now + this.ttlSeconds * 1000 : null;
    this.store.set(key, {
      value,
      expiresAt,
      createdAt: now,
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.pending.clear();
  }

  async deletePattern(prefix: string): Promise<number> {
    let deleted = 0;
    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        deleted += 1;
      }
    }

    return deleted;
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const existing = await this.get<T>(key);
    if (existing !== null) {
      return existing;
    }

    const pending = this.pending.get(key) as Promise<T> | undefined;
    if (pending) {
      return pending;
    }

    const promise = (async () => {
      const value = await factory();
      await this.set(key, value);
      return value;
    })();

    this.pending.set(key, promise);

    try {
      return await promise;
    } finally {
      this.pending.delete(key);
    }
  }

  getStats(): CacheProviderStats {
    return {
      size: this.store.size,
      maxEntries: this.maxEntries,
    };
  }

  destroy(): void {
    this.store.clear();
    this.pending.clear();
  }

  private evictIfNeeded(incomingKey: string): void {
    if (this.store.has(incomingKey)) {
      return;
    }

    if (this.store.size < this.maxEntries) {
      return;
    }

    const oldestKey = this.findOldestKey();
    if (oldestKey !== null) {
      this.store.delete(oldestKey);
    }
  }

  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestCreatedAt = Number.POSITIVE_INFINITY;

    for (const [key, entry] of this.store.entries()) {
      if (entry.createdAt < oldestCreatedAt) {
        oldestCreatedAt = entry.createdAt;
        oldestKey = key;
      }
    }

    return oldestKey;
  }
}

export const createCacheProvider = (options?: MemoryCacheOptions): MemoryCacheProvider => {
  return new MemoryCacheProvider(options);
};
