/**
 * MaxClaim Unified Cache Service
 * Supports Redis (distributed) and node-cache (local) with automatic fallback
 * 
 * TTL Configuration:
 * - Audit results: 7 days (604800 seconds)
 * - Partner weights: 1 hour (3600 seconds)
 * - Pricing data: 24 hours (86400 seconds)
 * - Session data: 4 hours (14400 seconds)
 */

import NodeCache from "node-cache";
import { createClient, type RedisClientType } from "redis";

type CacheProvider = "redis" | "node-cache";

interface CacheConfig {
  provider: CacheProvider;
  redisUrl?: string;
  defaultTtl: number;
}

interface CacheStats {
  provider: CacheProvider;
  hits: number;
  misses: number;
  keys: number;
  hitRate: number;
  redisConnected?: boolean;
}

// TTL presets in seconds
export const CACHE_TTL = {
  AUDIT_RESULTS: 604800,    // 7 days
  PARTNER_WEIGHTS: 3600,    // 1 hour
  PRICING_DATA: 86400,      // 24 hours
  SESSION_DATA: 14400,      // 4 hours
  CARRIER_TRENDS: 3600,     // 1 hour
  FEATURE_FLAGS: 300,       // 5 minutes
} as const;

// Cache key prefixes for namespacing
export const CACHE_PREFIX = {
  AUDIT: "audit:",
  PARTNER: "partner:",
  PRICING: "pricing:",
  SESSION: "session:",
  CARRIER: "carrier:",
  FEATURE: "feature:",
} as const;

class CacheService {
  private localCache: NodeCache;
  private redisClient: RedisClientType | null = null;
  private provider: CacheProvider = "node-cache";
  private stats = { hits: 0, misses: 0 };
  private redisConnected = false;

  constructor() {
    this.localCache = new NodeCache({
      stdTTL: 3600,
      checkperiod: 120,
      useClones: false,
    });

    this.initializeProvider();
  }

  private async initializeProvider(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      try {
        console.log("[CacheService] Initializing Redis connection...");
        
        this.redisClient = createClient({ url: redisUrl });
        
        this.redisClient.on("error", (err) => {
          console.error("[CacheService] Redis error:", err.message);
          this.redisConnected = false;
        });
        
        this.redisClient.on("connect", () => {
          console.log("[CacheService] Redis connected");
          this.redisConnected = true;
        });
        
        this.redisClient.on("reconnecting", () => {
          console.log("[CacheService] Redis reconnecting...");
        });
        
        await this.redisClient.connect();
        this.provider = "redis";
        this.redisConnected = true;
        console.log("[CacheService] Using Redis as cache provider");
      } catch (error: any) {
        console.warn("[CacheService] Redis connection failed:", error.message);
        console.log("[CacheService] Falling back to local node-cache");
        this.provider = "node-cache";
        this.redisClient = null;
      }
    } else {
      console.log("[CacheService] No REDIS_URL configured, using local node-cache");
      this.provider = "node-cache";
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.provider === "redis" && this.redisClient) {
        const value = await this.redisClient.get(key);
        if (value) {
          this.stats.hits++;
          return JSON.parse(value);
        }
        this.stats.misses++;
        return null;
      }

      const value = this.localCache.get<T>(key);
      if (value !== undefined) {
        this.stats.hits++;
        return value;
      }
      this.stats.misses++;
      return null;
    } catch (error) {
      console.error("[CacheService] Get error:", error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      if (this.provider === "redis" && this.redisClient) {
        await this.redisClient.set(
          key,
          JSON.stringify(value),
          { EX: ttl || CACHE_TTL.SESSION_DATA }
        );
        return true;
      }

      return this.localCache.set(key, value, ttl || CACHE_TTL.SESSION_DATA);
    } catch (error) {
      console.error("[CacheService] Set error:", error);
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<boolean> {
    try {
      if (this.provider === "redis" && this.redisClient) {
        await this.redisClient.del(key);
        return true;
      }

      return this.localCache.del(key) > 0;
    } catch (error) {
      console.error("[CacheService] Delete error:", error);
      return false;
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async delByPrefix(prefix: string): Promise<number> {
    try {
      if (this.provider === "redis" && this.redisClient) {
        const keys = await this.redisClient.keys(`${prefix}*`);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
        return keys.length;
      }

      const allKeys = this.localCache.keys();
      const matchingKeys = allKeys.filter((k) => k.startsWith(prefix));
      this.localCache.del(matchingKeys);
      return matchingKeys.length;
    } catch (error) {
      console.error("[CacheService] Delete by prefix error:", error);
      return 0;
    }
  }

  /**
   * Check if a key exists
   */
  async has(key: string): Promise<boolean> {
    try {
      if (this.provider === "redis" && this.redisClient) {
        return (await this.redisClient.exists(key)) > 0;
      }

      return this.localCache.has(key);
    } catch (error) {
      return false;
    }
  }

  /**
   * Flush all cache
   */
  async flush(): Promise<void> {
    try {
      if (this.provider === "redis" && this.redisClient) {
        await this.redisClient.flushDb();
      } else {
        this.localCache.flushAll();
      }
      this.stats = { hits: 0, misses: 0 };
    } catch (error) {
      console.error("[CacheService] Flush error:", error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const keys = this.provider === "redis" 
      ? 0 // Would need async call
      : this.localCache.keys().length;

    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? Math.round((this.stats.hits / total) * 100) : 0;

    return {
      provider: this.provider,
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys,
      hitRate,
      redisConnected: this.redisConnected,
    };
  }

  /**
   * Get provider status
   */
  getProviderStatus(): {
    provider: CacheProvider;
    redisConfigured: boolean;
    redisConnected: boolean;
    healthy: boolean;
  } {
    return {
      provider: this.provider,
      redisConfigured: !!process.env.REDIS_URL,
      redisConnected: this.redisConnected,
      healthy: this.provider === "redis" ? this.redisConnected : true,
    };
  }

  /**
   * Check if Redis is connected and healthy
   */
  isRedisHealthy(): boolean {
    return this.provider === "redis" && this.redisConnected && this.redisClient !== null;
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Convenience functions for common operations

/**
 * Cache audit result
 */
export async function cacheAuditResult(
  key: string,
  result: any
): Promise<boolean> {
  return cacheService.set(
    `${CACHE_PREFIX.AUDIT}${key}`,
    result,
    CACHE_TTL.AUDIT_RESULTS
  );
}

/**
 * Get cached audit result
 */
export async function getCachedAuditResult<T>(key: string): Promise<T | null> {
  return cacheService.get<T>(`${CACHE_PREFIX.AUDIT}${key}`);
}

/**
 * Cache partner weights
 */
export async function cachePartnerWeights(
  key: string,
  weights: any
): Promise<boolean> {
  return cacheService.set(
    `${CACHE_PREFIX.PARTNER}${key}`,
    weights,
    CACHE_TTL.PARTNER_WEIGHTS
  );
}

/**
 * Get cached partner weights
 */
export async function getCachedPartnerWeights<T>(key: string): Promise<T | null> {
  return cacheService.get<T>(`${CACHE_PREFIX.PARTNER}${key}`);
}

/**
 * Cache pricing data
 */
export async function cachePricingData(
  key: string,
  data: any
): Promise<boolean> {
  return cacheService.set(
    `${CACHE_PREFIX.PRICING}${key}`,
    data,
    CACHE_TTL.PRICING_DATA
  );
}

/**
 * Get cached pricing data
 */
export async function getCachedPricingData<T>(key: string): Promise<T | null> {
  return cacheService.get<T>(`${CACHE_PREFIX.PRICING}${key}`);
}

/**
 * Cache carrier trend data
 */
export async function cacheCarrierTrend(
  carrier: string,
  data: any
): Promise<boolean> {
  return cacheService.set(
    `${CACHE_PREFIX.CARRIER}${carrier.toLowerCase()}`,
    data,
    CACHE_TTL.CARRIER_TRENDS
  );
}

/**
 * Get cached carrier trend data
 */
export async function getCachedCarrierTrend<T>(carrier: string): Promise<T | null> {
  return cacheService.get<T>(`${CACHE_PREFIX.CARRIER}${carrier.toLowerCase()}`);
}
