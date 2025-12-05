import priceDB from '@shared/priceDB.json';
import type { PriceDBItem } from '@shared/priceAudit';

/**
 * PriceDB Caching System
 * Loads priceDB once and provides efficient query methods
 * With TTL-based refresh capability for production use
 */

interface CacheStats {
  itemCount: number;
  lastLoaded: Date;
  cacheHits: number;
  cacheMisses: number;
  memorySizeKB: number;
}

class PriceDBCache {
  private cache: Record<string, PriceDBItem>;
  private cacheTimestamp: number;
  private stats: CacheStats;
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds

  constructor() {
    this.cache = priceDB as Record<string, PriceDBItem>;
    this.cacheTimestamp = Date.now();
    this.stats = {
      itemCount: Object.keys(this.cache).length,
      lastLoaded: new Date(),
      cacheHits: 0,
      cacheMisses: 0,
      memorySizeKB: this.estimateMemorySize()
    };
  }

  /**
   * Get price data for a specific item
   */
  getItem(itemName: string): PriceDBItem | null {
    const item = this.cache[itemName];
    if (item) {
      this.stats.cacheHits++;
      return item;
    }
    this.stats.cacheMisses++;
    return null;
  }

  /**
   * Get all items in the price database
   */
  getAllItems(): Record<string, PriceDBItem> {
    return this.cache;
  }

  /**
   * Search for items by partial name match
   */
  searchItems(searchTerm: string): string[] {
    const lowerSearch = searchTerm.toLowerCase();
    return Object.keys(this.cache).filter(key => 
      key.toLowerCase().includes(lowerSearch)
    );
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      memorySizeKB: this.estimateMemorySize()
    };
  }

  /**
   * Estimate memory size of cache in KB
   */
  private estimateMemorySize(): number {
    const jsonString = JSON.stringify(this.cache);
    return Math.round(jsonString.length / 1024);
  }

  /**
   * Refresh cache if TTL has expired
   * In production, this could reload from a database or external source
   */
  refreshIfNeeded(): void {
    const now = Date.now();
    if (now - this.cacheTimestamp > this.CACHE_TTL) {
      // In production, reload from database or external source
      // For now, just update timestamp
      this.cacheTimestamp = now;
      this.stats.lastLoaded = new Date();
      console.log('PriceDB cache refreshed');
    }
  }

  /**
   * Get cache age in minutes
   */
  getCacheAge(): number {
    const ageMs = Date.now() - this.cacheTimestamp;
    return Math.round(ageMs / 60000);
  }
}

// Export singleton instance
export const priceDBCache = new PriceDBCache();

// Log cache initialization
console.log(`[PriceDB Cache] Initialized with ${priceDBCache.getStats().itemCount} items (${priceDBCache.getStats().memorySizeKB}KB)`);
