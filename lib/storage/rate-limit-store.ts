/**
 * Rate Limit Storage Implementation
 * Handles in-memory storage of rate limit data with automatic cleanup
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
  firstRequest: number;
}

interface RateLimitOptions {
  cleanupInterval?: number; // How often to clean expired entries (ms)
  maxEntries?: number; // Maximum entries to store
}

/**
 * In-memory rate limit storage with automatic cleanup
 */
export class RateLimitStore {
  private store = new Map<string, RateLimitRecord>();
  private cleanupTimer?: NodeJS.Timeout;
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions = {}) {
    this.options = {
      cleanupInterval: options.cleanupInterval || 60000, // 1 minute
      maxEntries: options.maxEntries || 10000,
    };

    // Start automatic cleanup
    this.startAutoCleanup();
  }

  /**
   * Get rate limit record for a key
   */
  get(key: string): RateLimitRecord | undefined {
    const record = this.store.get(key);
    
    // Clean up expired records on access
    if (record && Date.now() > record.resetTime) {
      this.store.delete(key);
      return undefined;
    }
    
    return record;
  }

  /**
   * Set rate limit record for a key
   */
  set(key: string, record: RateLimitRecord): void {
    // Enforce max entries limit
    if (this.store.size >= this.options.maxEntries && !this.store.has(key)) {
      this.cleanup();
      
      // If still at limit, remove oldest entry
      if (this.store.size >= this.options.maxEntries) {
        const firstKey = this.store.keys().next().value;
        if (firstKey) {
          this.store.delete(firstKey);
        }
      }
    }

    this.store.set(key, record);
  }

  /**
   * Increment count for a key
   */
  increment(key: string, window: number): RateLimitRecord {
    const now = Date.now();
    const existing = this.get(key);

    if (existing && now < existing.resetTime) {
      // Within existing window, increment count
      existing.count++;
      this.set(key, existing);
      return existing;
    } else {
      // New window or expired, reset count
      const newRecord: RateLimitRecord = {
        count: 1,
        resetTime: now + window,
        firstRequest: now,
      };
      this.set(key, newRecord);
      return newRecord;
    }
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.store.delete(key));
  }

  /**
   * Start automatic cleanup process
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Stop automatic cleanup (useful for testing)
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Get current store size
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get all keys (for debugging)
   */
  keys(): string[] {
    return Array.from(this.store.keys());
  }
}

/**
 * Memory-efficient store with LRU eviction
 */
export class MemoryEfficientStore extends RateLimitStore {
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;

  get(key: string): RateLimitRecord | undefined {
    const record = super.get(key);
    if (record) {
      // Update access order for LRU
      this.accessOrder.set(key, this.accessCounter++);
    }
    return record;
  }

  set(key: string, record: RateLimitRecord): void {
    // If at capacity, remove least recently used
    if (this.size() >= this.options.maxEntries && !this.store.has(key)) {
      this.evictLRU();
    }

    super.set(key, record);
    this.accessOrder.set(key, this.accessCounter++);
  }

  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestAccess = Infinity;

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.reset(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  reset(key: string): void {
    super.reset(key);
    this.accessOrder.delete(key);
  }

  clear(): void {
    super.clear();
    this.accessOrder.clear();
  }
}

/**
 * Auto-cleanup utility
 */
export class AutoCleanup {
  private stores: RateLimitStore[] = [];
  private globalCleanupTimer?: NodeJS.Timeout;

  constructor(private interval: number = 300000) { // 5 minutes
    this.startGlobalCleanup();
  }

  addStore(store: RateLimitStore): void {
    this.stores.push(store);
  }

  removeStore(store: RateLimitStore): void {
    const index = this.stores.indexOf(store);
    if (index > -1) {
      this.stores.splice(index, 1);
    }
  }

  private startGlobalCleanup(): void {
    this.globalCleanupTimer = setInterval(() => {
      this.stores.forEach(store => store.cleanup());
    }, this.interval);
  }

  stop(): void {
    if (this.globalCleanupTimer) {
      clearInterval(this.globalCleanupTimer);
      this.globalCleanupTimer = undefined;
    }
    this.stores.forEach(store => store.stopAutoCleanup());
  }
}

// Global store instance
export const globalRateLimitStore = new RateLimitStore();

// Export aliases for backwards compatibility and testing
export { MemoryEfficientStore, AutoCleanup };