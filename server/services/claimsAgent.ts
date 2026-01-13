/**
 * Claims Analysis Agent Service
 * LangGraph-style agent for sophisticated claim analysis
 * 
 * This agent uses a multi-step reasoning approach:
 * 1. Document parsing and extraction
 * 2. Line item validation against regional pricing
 * 3. Missing item detection
 * 4. Carrier pattern analysis
 * 5. Final recommendation generation
 * 
 * Now integrated with versioned claim audit service for resilient fallback chain.
 */

import { routeLLMRequest, analyzeClaimWithLLM, getLLMServiceStatus } from "./llmRouter";
import { 
  analyzeClaimWithFallback, 
  getVersionStatuses, 
  getActiveVersion, 
  getServiceHealth,
  type ClaimAuditInput 
} from "./claimAudit";
import { db } from "../db";
import { pricingDataPoints, carrierTrends } from "@shared/schema";
import { sql, eq } from "drizzle-orm";

interface ClaimLineItem {
  description: string;
  quotedPrice: number;
  category: string;
  quantity?: number;
  unit?: string;
}

interface ClaimContext {
  carrier?: string;
  zipCode: string;
  lineItems: ClaimLineItem[];
  documentText?: string;
  claimNumber?: string;
  lossDate?: string;
}

interface AgentState {
  context: ClaimContext;
  extractedItems: ClaimLineItem[];
  validatedItems: Array<{
    item: ClaimLineItem;
    marketPrice: number;
    variance: number;
    flags: string[];
  }>;
  missingItems: string[];
  carrierPatterns: string[];
  recommendations: string[];
  confidence: number;
  steps: Array<{ step: string; result: any; timestamp: Date }>;
}

interface AgentResult {
  success: boolean;
  analysis: {
    validatedItems: AgentState['validatedItems'];
    missingItems: string[];
    carrierPatterns: string[];
    recommendations: string[];
    totalUnderpayment: number;
  };
  confidence: number;
  processingSteps: number;
  llmProvider: string;
  error?: string;
}

// Common missing items by category
const COMMON_MISSING_ITEMS: Record<string, string[]> = {
  roofing: [
    "Ice and water shield (valleys, eaves)",
    "Drip edge (metal)",
    "Valley flashing",
    "Starter strip",
    "Ridge vent",
    "Pipe boots/flashings",
    "Step flashing",
    "Permit and inspection fees",
    "Steep/high roof charge",
    "Debris removal",
  ],
  siding: [
    "House wrap replacement",
    "J-channel trim",
    "Corner posts",
    "Window/door trim",
    "Soffit and fascia",
    "Vapor barrier",
    "Sheathing repair",
  ],
  flooring: [
    "Floor leveling compound",
    "Underlayment",
    "Transition strips",
    "Baseboards/quarter round",
    "Subfloor repair",
    "Moisture barrier",
    "Furniture moving allowance",
  ],
  painting: [
    "Primer",
    "Caulking",
    "Surface preparation",
    "Multiple coats",
    "Trim and detail work",
    "High ceiling charges",
  ],
  drywall: [
    "Texture matching",
    "Primer before paint",
    "Corner bead",
    "Joint compound (multiple coats)",
    "Sanding between coats",
    "Ceiling height adjustment",
  ],
};

/**
 * Step 1: Extract line items from document text
 */
async function extractLineItems(state: AgentState): Promise<AgentState> {
  const step = { step: 'extract_line_items', result: null as any, timestamp: new Date() };
  
  if (!state.context.documentText) {
    state.extractedItems = state.context.lineItems;
    step.result = { itemCount: state.extractedItems.length, source: 'provided' };
    state.steps.push(step);
    return state;
  }

  // Use LLM to extract structured items from document text
  const extractionPrompt = `Extract all line items from this insurance claim document. Return a JSON array of items with: description, quotedPrice (number), category (roofing/flooring/painting/etc), quantity, unit.

Document text:
${state.context.documentText.substring(0, 4000)}

Return only valid JSON array.`;

  const response = await routeLLMRequest(extractionPrompt, {
    systemPrompt: 'You are an insurance document parser. Extract line items precisely.',
  });

  try {
    if (response?.content) {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[0]);
        state.extractedItems = [...state.context.lineItems, ...extracted];
      }
    }
  } catch (error) {
    state.extractedItems = state.context.lineItems;
  }

  step.result = { itemCount: state.extractedItems.length, source: 'llm_extraction' };
  state.steps.push(step);
  return state;
}

/**
 * Step 2: Validate items against market pricing
 */
async function validatePricing(state: AgentState): Promise<AgentState> {
  const step = { step: 'validate_pricing', result: null as any, timestamp: new Date() };
  const validatedItems: AgentState['validatedItems'] = [];
  
  for (const item of state.extractedItems) {
    // Query pricing database for similar items
    const pricingResults = await db.select({
      avgPrice: sql<number>`AVG(price_avg)`,
      maxPrice: sql<number>`MAX(price_high)`,
    }).from(pricingDataPoints)
      .where(sql`LOWER(description) LIKE LOWER(${`%${item.description.substring(0, 20)}%`})`);
    
    const marketPrice = pricingResults[0]?.avgPrice || item.quotedPrice;
    const maxPrice = pricingResults[0]?.maxPrice || marketPrice * 1.5;
    
    const variance = marketPrice > 0 
      ? ((marketPrice - item.quotedPrice) / marketPrice) * 100 
      : 0;
    
    const flags: string[] = [];
    
    if (variance > 20) {
      flags.push(`Underpaid by ${variance.toFixed(1)}% vs market`);
    }
    if (item.quotedPrice > maxPrice) {
      flags.push('Exceeds typical insurance maximum');
    }
    if (item.quotedPrice < marketPrice * 0.5) {
      flags.push('Significantly below market rate');
    }

    validatedItems.push({
      item,
      marketPrice,
      variance,
      flags,
    });
  }

  state.validatedItems = validatedItems;
  step.result = { 
    itemsValidated: validatedItems.length,
    flaggedItems: validatedItems.filter(v => v.flags.length > 0).length,
  };
  state.steps.push(step);
  return state;
}

/**
 * Step 3: Detect missing items
 */
async function detectMissingItems(state: AgentState): Promise<AgentState> {
  const step = { step: 'detect_missing_items', result: null as any, timestamp: new Date() };
  const missingItems: string[] = [];
  
  // Get categories from extracted items
  const categories = new Set(state.extractedItems.map(i => 
    i.category?.toLowerCase() || 'other'
  ));
  
  // Check each category for common missing items
  for (const category of Array.from(categories)) {
    const commonItems = COMMON_MISSING_ITEMS[category] || [];
    const extractedDescriptions = state.extractedItems
      .map(i => i.description.toLowerCase())
      .join(' ');
    
    for (const commonItem of commonItems) {
      const keywords = commonItem.toLowerCase().split(/\s+/);
      const hasItem = keywords.some(kw => extractedDescriptions.includes(kw));
      
      if (!hasItem) {
        missingItems.push(`${category}: ${commonItem}`);
      }
    }
  }

  state.missingItems = missingItems.slice(0, 10); // Limit to top 10
  step.result = { potentialMissing: missingItems.length };
  state.steps.push(step);
  return state;
}

/**
 * Step 4: Analyze carrier patterns
 */
async function analyzeCarrierPatterns(state: AgentState): Promise<AgentState> {
  const step = { step: 'analyze_carrier', result: null as any, timestamp: new Date() };
  const patterns: string[] = [];
  
  if (state.context.carrier) {
    // Query carrier trends from database
    const trends = await db.select().from(carrierTrends)
      .where(eq(carrierTrends.carrierName, state.context.carrier.toLowerCase()))
      .limit(5);
    
    if (trends.length > 0) {
      for (const trend of trends) {
        if (trend.commonStrategy && trend.frequency && trend.frequency > 10) {
          patterns.push(`${state.context.carrier} has ${trend.frequency} reported ${trend.commonStrategy.toLowerCase()} patterns for ${trend.lineItemDescription}`);
        }
      }
    }
    
    // Add known carrier behaviors
    const knownPatterns: Record<string, string[]> = {
      'state farm': ['Often omits O&P on first estimate', 'May require multiple supplements'],
      'allstate': ['Known for depreciation disputes', 'May undervalue labor rates'],
      'farmers': ['Conservative on scope of work', 'May miss hidden damage'],
      'geico': ['Limited contractor network', 'May push preferred vendors'],
      'usaa': ['Generally fair but thorough documentation required'],
    };
    
    const carrierLower = state.context.carrier.toLowerCase();
    for (const [carrier, carrierPatterns] of Object.entries(knownPatterns)) {
      if (carrierLower.includes(carrier)) {
        patterns.push(...carrierPatterns);
      }
    }
  }

  state.carrierPatterns = patterns;
  step.result = { patternsFound: patterns.length };
  state.steps.push(step);
  return state;
}

/**
 * Step 5: Generate final recommendations
 */
async function generateRecommendations(state: AgentState): Promise<AgentState> {
  const step = { step: 'generate_recommendations', result: null as any, timestamp: new Date() };
  const recommendations: string[] = [];
  
  // Add recommendations based on validation
  const significantUndervalued = state.validatedItems.filter(v => v.variance > 15);
  if (significantUndervalued.length > 0) {
    recommendations.push(
      `Request re-inspection for ${significantUndervalued.length} undervalued items totaling potential $${
        significantUndervalued.reduce((sum, v) => sum + (v.marketPrice - v.item.quotedPrice), 0).toFixed(0)
      } in additional compensation`
    );
  }

  // Add recommendations for missing items
  if (state.missingItems.length > 0) {
    recommendations.push(
      `Submit supplement for ${state.missingItems.length} potentially omitted items: ${state.missingItems.slice(0, 3).join(', ')}${state.missingItems.length > 3 ? '...' : ''}`
    );
  }

  // Add carrier-specific recommendations
  if (state.carrierPatterns.length > 0) {
    recommendations.push(
      `Document all work thoroughly - ${state.context.carrier} has known patterns of ${state.carrierPatterns[0].toLowerCase()}`
    );
  }

  // General recommendations
  recommendations.push('Get multiple contractor quotes to support fair market value claims');
  recommendations.push('Take detailed photos before, during, and after all repairs');

  // Calculate confidence
  const llmStatus = getLLMServiceStatus();
  let confidence = 0.6; // Base confidence
  if (llmStatus.available.includes('openai')) confidence += 0.2;
  if (state.carrierPatterns.length > 0) confidence += 0.1;
  if (state.validatedItems.length > 0) confidence += 0.1;

  state.recommendations = recommendations;
  state.confidence = Math.min(confidence, 0.95);
  step.result = { recommendationCount: recommendations.length, confidence: state.confidence };
  state.steps.push(step);
  return state;
}

/**
 * Run the claims analysis agent
 */
export async function runClaimsAgent(context: ClaimContext): Promise<AgentResult> {
  const startTime = Date.now();
  
  // Initialize state
  let state: AgentState = {
    context,
    extractedItems: [],
    validatedItems: [],
    missingItems: [],
    carrierPatterns: [],
    recommendations: [],
    confidence: 0,
    steps: [],
  };

  try {
    // Run the agent pipeline
    state = await extractLineItems(state);
    state = await validatePricing(state);
    state = await detectMissingItems(state);
    state = await analyzeCarrierPatterns(state);
    state = await generateRecommendations(state);

    // Calculate total underpayment
    const totalUnderpayment = state.validatedItems
      .filter(v => v.variance > 0)
      .reduce((sum, v) => sum + (v.marketPrice - v.item.quotedPrice), 0);

    const llmStatus = getLLMServiceStatus();

    return {
      success: true,
      analysis: {
        validatedItems: state.validatedItems,
        missingItems: state.missingItems,
        carrierPatterns: state.carrierPatterns,
        recommendations: state.recommendations,
        totalUnderpayment: Math.max(0, totalUnderpayment),
      },
      confidence: state.confidence,
      processingSteps: state.steps.length,
      llmProvider: llmStatus.available.includes('openai') ? 'openai' : 
                   llmStatus.available.includes('local-ai') ? 'localai' : 'rule-based',
    };
  } catch (error: any) {
    console.error('[ClaimsAgent] Error:', error.message);
    return {
      success: false,
      analysis: {
        validatedItems: [],
        missingItems: [],
        carrierPatterns: [],
        recommendations: ['Error occurred during analysis - please try again'],
        totalUnderpayment: 0,
      },
      confidence: 0,
      processingSteps: state.steps.length,
      llmProvider: 'none',
      error: error.message,
    };
  }
}

/**
 * Run versioned claim audit with automatic fallback
 * Uses the new versioned service architecture for resilient analysis
 */
export async function runVersionedClaimAudit(context: ClaimContext) {
  const input: ClaimAuditInput = {
    carrier: context.carrier,
    zipCode: context.zipCode,
    lineItems: context.lineItems.map(item => ({
      description: item.description,
      quotedPrice: item.quotedPrice,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
    })),
    documentText: context.documentText,
    claimNumber: context.claimNumber,
    lossDate: context.lossDate,
  };

  return analyzeClaimWithFallback(input);
}

/**
 * Get agent status
 */
export function getAgentStatus() {
  const llmStatus = getLLMServiceStatus();
  const versionedStatus = getServiceHealth();
  const activeVersion = getActiveVersion();
  
  return {
    enabled: true,
    llmAvailable: llmStatus.available.includes('openai') || llmStatus.available.includes('local-ai'),
    primaryProvider: llmStatus.available.includes('openai') ? 'openai' : 
                     llmStatus.available.includes('local-ai') ? 'localai' : 'rule-based',
    versionedService: {
      status: versionedStatus.status,
      activeVersion: activeVersion.id,
      role: activeVersion.role,
      fallbackChain: activeVersion.fallbackChain,
      recentFallbacks: versionedStatus.recentFallbacks,
    },
    steps: [
      'extract_line_items',
      'validate_pricing',
      'detect_missing_items',
      'analyze_carrier',
      'generate_recommendations',
    ],
    capabilities: {
      documentParsing: true,
      pricingValidation: true,
      missingItemDetection: true,
      carrierAnalysis: true,
      recommendationGeneration: true,
      versionedFallback: true,
    },
  };
}

/**
 * Get versioned service status details
 */
export function getVersionedServiceStatus() {
  return {
    versions: getVersionStatuses(),
    active: getActiveVersion(),
    health: getServiceHealth(),
  };
}
