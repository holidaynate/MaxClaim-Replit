/**
 * MaxClaim Batch Queue Service
 * Copyright (c) 2023-2025 Nate Chacon. All rights reserved.
 * 
 * Controlled concurrency queue for processing large batch audits.
 * Uses p-queue for rate limiting and parallel processing.
 */

import PQueue from 'p-queue';
import { auditBatch } from '@shared/priceAudit';
import { auditCache } from '../cache/auditCache';

interface QueueStats {
  pending: number;
  size: number;
  concurrency: number;
  isPaused: boolean;
}

interface BatchJobInput {
  items: Array<{ name: string; price: number; qty: number }>;
  zipCode?: string;
}

interface BatchJobResult {
  batchId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  itemCount: number;
  processedCount: number;
  results?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

type BatchJobCallback = (
  batchId: string,
  status: 'processing' | 'completed' | 'failed',
  results?: any,
  error?: string
) => Promise<void>;

class BatchQueueService {
  private queue: PQueue;
  private activeJobs: Map<string, { status: string; progress: number }>;

  constructor() {
    this.queue = new PQueue({
      concurrency: 10,
      interval: 60000,
      intervalCap: 100,
    });

    this.activeJobs = new Map();

    this.queue.on('active', () => {
      console.log(`[BatchQueue] Active jobs: ${this.queue.pending + 1}, Pending: ${this.queue.size}`);
    });

    this.queue.on('idle', () => {
      console.log('[BatchQueue] Queue is idle');
    });

    this.queue.on('error', (error) => {
      console.error('[BatchQueue] Queue error:', error);
    });
  }

  async enqueueBatch(
    batchId: string,
    input: BatchJobInput,
    onStatusChange: BatchJobCallback
  ): Promise<void> {
    this.activeJobs.set(batchId, { status: 'queued', progress: 0 });

    await this.queue.add(async () => {
      try {
        this.activeJobs.set(batchId, { status: 'processing', progress: 0 });
        await onStatusChange(batchId, 'processing');

        console.log(`[BatchQueue] Processing batch ${batchId} with ${input.items.length} items`);

        const results = await this.processBatchWithCaching(batchId, input);

        this.activeJobs.set(batchId, { status: 'completed', progress: 100 });
        await onStatusChange(batchId, 'completed', results);

        console.log(`[BatchQueue] Completed batch ${batchId}`);

        setTimeout(() => {
          this.activeJobs.delete(batchId);
        }, 3600000);

        return results;
      } catch (error: any) {
        this.activeJobs.set(batchId, { status: 'failed', progress: 0 });
        await onStatusChange(batchId, 'failed', undefined, error.message);

        console.error(`[BatchQueue] Failed batch ${batchId}:`, error);
        throw error;
      }
    });
  }

  private async processBatchWithCaching(
    batchId: string,
    input: BatchJobInput
  ): Promise<any> {
    const { cached, uncached } = auditCache.getBatchCached(input.items, input.zipCode);

    console.log(`[BatchQueue] Batch ${batchId}: ${cached.size} cached, ${uncached.length} to process`);

    let computedResults: any = null;
    if (uncached.length > 0) {
      const uncachedItems = uncached.map(u => u.item);
      computedResults = auditBatch(uncachedItems);

      if (computedResults.results) {
        computedResults.results.forEach((result: any, idx: number) => {
          const originalItem = uncachedItems[idx];
          auditCache.set(originalItem.name, result, input.zipCode);
        });
      }
    }

    if (cached.size === 0) {
      return computedResults;
    }

    if (uncached.length === 0) {
      const cachedItems = Array.from(cached.values());
      return this.buildFullResultFromItems(cachedItems, true);
    }

    const mergedItems: any[] = new Array(input.items.length);
    cached.forEach((result, index) => {
      mergedItems[index] = result;
    });
    uncached.forEach((u, idx) => {
      if (computedResults?.results?.[idx]) {
        mergedItems[u.index] = computedResults.results[idx];
      }
    });

    const fullResult = this.buildFullResultFromItems(mergedItems.filter(Boolean), false);
    return {
      ...fullResult,
      partialCache: true,
      cachedCount: cached.size,
      computedCount: uncached.length,
    };
  }

  private buildFullResultFromItems(items: any[], fromCache: boolean): any {
    let totalClaimValue = 0;
    let totalFMV = 0;
    let totalUnderpayment = 0;
    let flaggedItems = 0;
    let fmvItems = 0;
    let lowItems = 0;

    const flagBreakdown = { low: 0, fmv: 0, missing: 0, invalid: 0 };

    items.forEach((item: any) => {
      if (item.subtotal) totalClaimValue += item.subtotal;
      if (item.fmvSubtotal) totalFMV += item.fmvSubtotal;
      if (item.underpaymentOpportunity) totalUnderpayment += item.underpaymentOpportunity;
      
      if (item.flagged) flaggedItems++;
      
      switch (item.status) {
        case 'LOW':
        case 'low':
          lowItems++;
          flagBreakdown.low++;
          break;
        case 'FMV':
        case 'fmv':
          fmvItems++;
          flagBreakdown.fmv++;
          break;
        case 'MISSING_ITEM':
        case 'missing':
          flagBreakdown.missing++;
          break;
        case 'INVALID':
        case 'invalid':
          flagBreakdown.invalid++;
          break;
      }
    });

    return {
      totalItems: items.length,
      flaggedItems,
      fmvItems,
      lowItems,
      totalClaimValue,
      totalFmvValue: totalFMV,
      totalUnderpaymentOpportunity: totalUnderpayment,
      totalClaimValueString: totalClaimValue.toFixed(2),
      totalFmvValueString: totalFMV.toFixed(2),
      totalUnderpaymentString: totalUnderpayment.toFixed(2),
      flagBreakdown,
      results: items,
      fromCache,
    };
  }

  getQueueStats(): QueueStats {
    return {
      pending: this.queue.pending,
      size: this.queue.size,
      concurrency: this.queue.concurrency,
      isPaused: this.queue.isPaused,
    };
  }

  getJobStatus(batchId: string): { status: string; progress: number } | null {
    return this.activeJobs.get(batchId) || null;
  }

  getActiveJobCount(): number {
    return this.activeJobs.size;
  }

  pause(): void {
    this.queue.pause();
    console.log('[BatchQueue] Queue paused');
  }

  resume(): void {
    this.queue.start();
    console.log('[BatchQueue] Queue resumed');
  }

  async clear(): Promise<void> {
    this.queue.clear();
    console.log('[BatchQueue] Queue cleared');
  }
}

export const batchQueue = new BatchQueueService();

console.log('[BatchQueue] Initialized with concurrency: 10, rate limit: 100/min');
