/**
 * MaxClaim Audit Result Cache Service
 * Copyright (c) 2023-2025 Nate Chacon. All rights reserved.
 * 
 * TTL-based caching for audit results to reduce computation for repeated queries.
 * Keys are constructed from item name + ZIP code for location-aware caching.
 */

import NodeCache from 'node-cache';

interface AuditCacheStats {
  hits: number;
  misses: number;
  keys: number;
  ksize: number;
  vsize: number;
}

interface CachedAuditResult {
  result: any;
  timestamp: number;
  zipCode?: string;
}

class AuditResultCache {
  private cache: NodeCache;
  private hits: number = 0;
  private misses: number = 0;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 3600,
      checkperiod: 600,
      useClones: true,
      deleteOnExpire: true,
    });

    this.cache.on('expired', (key: string, _value: any) => {
      console.log(`[AuditCache] Key expired: ${key}`);
    });
  }

  private generateKey(itemName: string, zipCode?: string): string {
    const normalizedItem = itemName.toLowerCase().trim();
    return zipCode ? `${normalizedItem}:${zipCode}` : normalizedItem;
  }

  get(itemName: string, zipCode?: string): any | null {
    const key = this.generateKey(itemName, zipCode);
    const cached = this.cache.get<CachedAuditResult>(key);
    
    if (cached) {
      this.hits++;
      return { ...cached.result, fromCache: true, cachedAt: cached.timestamp };
    }
    
    this.misses++;
    return null;
  }

  set(itemName: string, result: any, zipCode?: string): void {
    const key = this.generateKey(itemName, zipCode);
    const cacheEntry: CachedAuditResult = {
      result,
      timestamp: Date.now(),
      zipCode,
    };
    this.cache.set(key, cacheEntry);
  }

  getBatchCached(items: Array<{ name: string; price: number; qty: number }>, zipCode?: string): {
    cached: Map<number, any>;
    uncached: Array<{ index: number; item: { name: string; price: number; qty: number } }>;
  } {
    const cached = new Map<number, any>();
    const uncached: Array<{ index: number; item: { name: string; price: number; qty: number } }> = [];

    items.forEach((item, index) => {
      const cachedResult = this.get(item.name, zipCode);
      if (cachedResult) {
        cached.set(index, cachedResult);
      } else {
        uncached.push({ index, item });
      }
    });

    return { cached, uncached };
  }

  getStats(): AuditCacheStats {
    const stats = this.cache.getStats();
    return {
      hits: this.hits,
      misses: this.misses,
      keys: this.cache.keys().length,
      ksize: stats.ksize,
      vsize: stats.vsize,
    };
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? Math.round((this.hits / total) * 100) : 0;
  }

  flush(): void {
    this.cache.flushAll();
    this.hits = 0;
    this.misses = 0;
    console.log('[AuditCache] Cache flushed');
  }

  keys(): string[] {
    return this.cache.keys();
  }
}

export const auditCache = new AuditResultCache();

console.log('[AuditCache] Initialized with 1-hour TTL');
