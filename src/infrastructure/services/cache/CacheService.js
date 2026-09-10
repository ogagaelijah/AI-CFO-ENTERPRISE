// src/infrastructure/services/cache/CacheService.js
// Production-grade in-memory cache with LRU eviction, TTL, and stale-while-revalidate
// v1.0.0-prod | Designed for 10K+ concurrent users

'use strict';

/**
 * CacheService
 * 
 * Features:
 * - In-memory LRU cache with TTL
 * - Stale-while-revalidate pattern (prevents cache stampede)
 * - Namespaced keys for multi-tenant isolation
 * - Size and count limits
 * - Pattern-based invalidation
 * - Zero-dependency
 * 
 * Design: Stateless singleton, safe for concurrent use.
 */
class CacheService {
  static VERSION = '1.0.0-prod';

  static DEFAULTS = Object.freeze({
    maxKeys: 10_000,
    maxSizeBytes: 500 * 1024 * 1024, // 500MB
    maxValueSize: 500 * 1024,        // 500KB per key
    defaultTTL: 120_000,             // 2 minutes
    staleTTL: 60_000,                // 1 minute extra for stale-while-revalidate
    cleanupInterval: 60_000,         // 1 minute
  });

  constructor(options = {}) {
    this.maxKeys = options.maxKeys || CacheService.DEFAULTS.maxKeys;
    this.maxSizeBytes = options.maxSizeBytes || CacheService.DEFAULTS.maxSizeBytes;
    this.maxValueSize = options.maxValueSize || CacheService.DEFAULTS.maxValueSize;
    this.defaultTTL = options.defaultTTL || CacheService.DEFAULTS.defaultTTL;
    this.staleTTL = options.staleTTL || CacheService.DEFAULTS.staleTTL;

    // Storage: Map preserves insertion order (LRU via delete+set)
    this._store = new Map();
    this._currentSize = 0;
    this._stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      invalidations: 0,
      staleHits: 0,
    };

    // Background cleanup
    if (options.autoCleanup !== false) {
      this._cleanupTimer = setInterval(() => this._cleanup(), CacheService.DEFAULTS.cleanupInterval);
      // Don't block process exit
      if (this._cleanupTimer.unref) this._cleanupTimer.unref();
    }
  }

  /**
   * Get a value from cache.
   * Returns null if missing OR expired (past stale window).
   * 
   * @param {string} key
   * @param {object} [options]
   * @param {boolean} [options.allowStale=false] - Return stale data if available
   * @returns {{ value: any, isStale: boolean } | null}
   */
  get(key, options = {}) {
    const entry = this._store.get(key);
    if (!entry) {
      this._stats.misses++;
      return null;
    }

    const now = Date.now();
    const age = now - entry.createdAt;

    // Hard expired (past stale window) → remove
    if (age > entry.ttl + this.staleTTL) {
      this._delete(key);
      this._stats.misses++;
      return null;
    }

    // Fresh
    if (age <= entry.ttl) {
      // LRU: move to end
      this._store.delete(key);
      this._store.set(key, entry);
      this._stats.hits++;
      return { value: entry.value, isStale: false };
    }

    // Stale but within stale window
    if (options.allowStale) {
      this._stats.staleHits++;
      return { value: entry.value, isStale: true };
    }

    this._stats.misses++;
    return null;
  }

  /**
   * Set a value in cache.
   * @param {string} key
   * @param {any} value
   * @param {number} [ttlMs]
   * @returns {boolean}
   */
  set(key, value, ttlMs = null) {
    // Size check
    const sizeBytes = this._estimateSize(value);
    if (sizeBytes > this.maxValueSize) {
      console.warn(`⚠️ [CacheService] Value too large for key ${key}: ${sizeBytes} bytes`);
      return false;
    }

    // Remove existing entry (updates size)
    if (this._store.has(key)) {
      this._delete(key);
    }

    // Evict LRU if at capacity
    while (this._store.size >= this.maxKeys || (this._currentSize + sizeBytes) > this.maxSizeBytes) {
      const oldestKey = this._store.keys().next().value;
      if (oldestKey === undefined) break;
      this._delete(oldestKey);
      this._stats.evictions++;
    }

    this._store.set(key, {
      value,
      ttl: ttlMs || this.defaultTTL,
      createdAt: Date.now(),
      sizeBytes,
    });
    this._currentSize += sizeBytes;
    this._stats.sets++;
    return true;
  }

  /**
   * Get-or-set pattern with stale-while-revalidate.
   * 
   * @param {string} key
   * @param {Function} fetcher - async () => value
   * @param {number} [ttlMs]
   * @returns {Promise<any>}
   */
  async getOrSet(key, fetcher, ttlMs = null) {
    const cached = this.get(key, { allowStale: true });

    // Fresh hit
    if (cached && !cached.isStale) {
      return cached.value;
    }

    // Stale hit → return stale + refresh in background
    if (cached && cached.isStale) {
      // Fire-and-forget refresh (don't await)
      this._refreshInBackground(key, fetcher, ttlMs);
      return cached.value;
    }

    // Cache miss → block and fetch
    try {
      const value = await fetcher();
      if (value !== undefined && value !== null) {
        this.set(key, value, ttlMs);
      }
      return value;
    } catch (error) {
      console.error(`❌ [CacheService] Fetcher failed for ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete a specific key.
   */
  _delete(key) {
    const entry = this._store.get(key);
    if (entry) {
      this._currentSize -= entry.sizeBytes;
      this._store.delete(key);
    }
  }

  /**
   * Invalidate all keys matching a pattern.
   * Pattern supports: `*` wildcard
   * Example: `aicfo:dashboard:123:*`
   */
  invalidate(pattern) {
    if (!pattern) return 0;

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let count = 0;

    for (const key of this._store.keys()) {
      if (regex.test(key)) {
        this._delete(key);
        count++;
      }
    }

    this._stats.invalidations += count;
    return count;
  }

  /**
   * Invalidate all cache for a specific business.
   * Uses consistent key prefix.
   */
  invalidateBusiness(businessId) {
    return this.invalidate(`aicfo:*:${businessId}:*`) + this.invalidate(`aicfo:*:${businessId}`);
  }

  /**
   * Clear all cache (use only in tests or emergencies).
   */
  clear() {
    this._store.clear();
    this._currentSize = 0;
  }

  /**
   * Get cache statistics.
   */
  getStats() {
    const total = this._stats.hits + this._stats.misses;
    return {
      ...this._stats,
      keys: this._store.size,
      sizeBytes: this._currentSize,
      sizeMB: Math.round(this._currentSize / 1024 / 1024 * 100) / 100,
      hitRate: total > 0 ? Math.round((this._stats.hits / total) * 10000) / 100 : 0,
    };
  }

  /**
   * Background refresh (stale-while-revalidate).
   */
  _refreshInBackground(key, fetcher, ttlMs) {
    fetcher()
      .then((value) => {
        if (value !== undefined && value !== null) {
          this.set(key, value, ttlMs);
        }
      })
      .catch((error) => {
        console.warn(`⚠️ [CacheService] Background refresh failed for ${key}:`, error.message);
      });
  }

  /**
   * Periodic cleanup of expired entries.
   */
  _cleanup() {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this._store.entries()) {
      if (now - entry.createdAt > entry.ttl + this.staleTTL) {
        this._delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      // Silent cleanup
    }
  }

  /**
   * Estimate size of a value in bytes.
   */
  _estimateSize(value) {
    try {
      return Buffer.byteLength(JSON.stringify(value), 'utf8');
    } catch {
      return 1024; // Fallback estimate
    }
  }

  /**
   * Shutdown cleanup timer.
   */
  shutdown() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
    this.clear();
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = { CacheService, cacheService };