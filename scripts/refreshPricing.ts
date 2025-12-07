#!/usr/bin/env tsx
/**
 * Scheduled Pricing Refresh Script
 * Runs daily to update pricing data from external sources
 * 
 * Usage: npm run refresh:pricing
 * or: npx tsx scripts/refreshPricing.ts
 */

import { getBLSInflationData } from '../server/external-apis';
import { priceDBCache } from '../server/utils/priceDBCache';

async function refreshPricing(): Promise<void> {
  console.log('========================================');
  console.log('MaxClaim Pricing Refresh Script');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('========================================\n');

  const errors: string[] = [];
  
  try {
    // Step 1: Refresh BLS inflation data
    console.log('[1/3] Fetching BLS Construction PPI data...');
    const blsApiKey = process.env.BLS_API_KEY;
    const inflationData = await getBLSInflationData(blsApiKey);
    
    if (inflationData.length > 0) {
      const latestData = inflationData[0];
      console.log(`  Latest PPI: ${latestData.value} (${latestData.period} ${latestData.year})`);
      console.log(`  Inflation Rate: ${latestData.inflationRate || 'N/A'}%`);
    } else {
      errors.push('No BLS inflation data retrieved');
      console.warn('  Warning: No BLS data retrieved');
    }

    // Step 2: Check PriceDB cache status
    console.log('\n[2/3] Checking PriceDB cache...');
    const cacheStats = priceDBCache.getStats();
    console.log(`  Current items: ${cacheStats.itemCount}`);
    console.log(`  Memory size: ${cacheStats.memorySizeKB}KB`);
    console.log(`  Cache age: ${priceDBCache.getCacheAge()} minutes`);
    
    // Trigger TTL-based refresh if needed
    priceDBCache.refreshIfNeeded();
    const newStats = priceDBCache.getStats();
    console.log(`  Updated: ${newStats.memorySizeKB}KB`);

    // Step 3: Log success
    console.log('\n[3/3] Writing refresh log...');
    const summary = {
      timestamp: new Date().toISOString(),
      blsDataPoints: inflationData.length,
      priceDBItems: newStats.memorySizeKB,
      errors: errors.length > 0 ? errors : null,
    };
    console.log(`  Summary: ${JSON.stringify(summary)}`);

  } catch (error: any) {
    console.error('\nFATAL ERROR during refresh:');
    console.error(error.message);
    process.exit(1);
  }

  console.log('\n========================================');
  console.log(`Completed at: ${new Date().toISOString()}`);
  console.log(`Errors: ${errors.length}`);
  console.log('========================================');
  
  if (errors.length > 0) {
    console.warn('\nWarnings encountered:');
    errors.forEach((e, i) => console.warn(`  ${i + 1}. ${e}`));
  }
  
  process.exit(0);
}

refreshPricing().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
