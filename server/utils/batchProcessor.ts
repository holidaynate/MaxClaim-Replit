/**
 * Batch Processing Utility
 * Processes large arrays in smaller batches to prevent memory issues
 * and avoid overwhelming the system with concurrent operations
 */

export interface BatchProcessOptions {
  batchSize?: number;
  onBatchComplete?: (batchIndex: number, batchResults: any[]) => void;
  onProgress?: (processed: number, total: number) => void;
}

/**
 * Process array items in batches
 * @param items Array of items to process
 * @param processFn Function to process each item (can be async)
 * @param options Batch processing options
 * @returns Array of results
 */
export async function processBatch<T, R>(
  items: T[],
  processFn: (item: T, index: number) => Promise<R> | R,
  options: BatchProcessOptions = {}
): Promise<R[]> {
  const {
    batchSize = 10, // Default: 10 items at a time
    onBatchComplete,
    onProgress
  } = options;

  const results: R[] = [];
  const totalItems = items.length;

  for (let i = 0; i < totalItems; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchIndex = Math.floor(i / batchSize);

    // Process batch concurrently
    const batchResults = await Promise.all(
      batch.map((item, idx) => processFn(item, i + idx))
    );

    results.push(...batchResults);

    // Callbacks
    if (onBatchComplete) {
      onBatchComplete(batchIndex, batchResults);
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, totalItems), totalItems);
    }

    // Optional: Force garbage collection if available
    if (global.gc && batchIndex > 0) {
      global.gc();
    }
  }

  return results;
}

/**
 * Process claim items in batches to prevent memory issues
 * Recommended for claims with more than 20 items
 */
export async function processClaimItemsInBatches<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  batchSize: number = 10
): Promise<R[]> {
  if (items.length <= batchSize) {
    // Small enough to process all at once
    return Promise.all(items.map(processFn));
  }

  console.log(`Processing ${items.length} claim items in batches of ${batchSize}`);

  return processBatch(items, processFn, {
    batchSize,
    onBatchComplete: (batchIndex, batchResults) => {
      console.log(`Completed batch ${batchIndex + 1}, processed ${batchResults.length} items`);
    }
  });
}

/**
 * Validate batch size limits
 * Prevents users from submitting unreasonably large batches
 */
export function validateBatchSize(itemCount: number, maxItems: number = 100): void {
  if (itemCount > maxItems) {
    throw new Error(`Too many items. Maximum ${maxItems} items allowed per claim. You submitted ${itemCount} items.`);
  }

  if (itemCount === 0) {
    throw new Error('At least one item is required');
  }
}
