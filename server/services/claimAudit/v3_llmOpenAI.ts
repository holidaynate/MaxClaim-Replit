/**
 * Claim Audit v3 - LLM-Powered Analysis
 * Role: primary
 * 
 * Current default flow using LangChain + OpenAI for highest quality analysis.
 * Provides sophisticated reasoning, nuanced recommendations, and context-aware
 * assessment of claims beyond what rule-based systems can achieve.
 */

import { routeLLMRequest, getLLMServiceStatus } from '../llmRouter';
import { db } from '../../db';
import { pricingDataPoints, carrierTrends } from '@shared/schema';
import { sql, eq, like } from 'drizzle-orm';
import type { ClaimAuditInput, ClaimAuditResult, AuditedLineItem, ClaimLineItem, VersionStatus } from './types';

const VERSION_ID = 'v3-llm-openai';

const SYSTEM_PROMPT = `You are an expert insurance claim analyst with deep knowledge of construction costs, contractor pricing, and insurance industry practices. Your role is to:

1. Analyze each line item for potential underpayment
2. Identify commonly omitted items that should be included
3. Recognize carrier-specific patterns and tactics
4. Provide actionable recommendations for claim recovery

Always prioritize accuracy and homeowner advocacy. Base your analysis on fair market value principles.

Respond in JSON format with:
{
  "itemAnalysis": [{ "description": string, "assessment": string, "suggestedAdjustment": number, "flags": string[] }],
  "missingItems": string[],
  "carrierInsights": string[],
  "recommendations": string[],
  "overallAssessment": string,
  "confidence": number (0-100)
}`;

async function enrichWithPricingData(items: ClaimAuditInput['lineItems']): Promise<Map<string, { avgPrice: number; maxPrice: number }>> {
  const pricingMap = new Map();
  
  for (const item of items) {
    try {
      const searchTerm = item.description.substring(0, 30).toLowerCase();
      const results = await db.select({
        avgPrice: sql<number>`AVG(price_avg)`,
        maxPrice: sql<number>`MAX(price_high)`,
      }).from(pricingDataPoints)
        .where(sql`LOWER(description) LIKE ${`%${searchTerm}%`}`);
      
      if (results[0]?.avgPrice) {
        pricingMap.set(item.description, {
          avgPrice: Number(results[0].avgPrice),
          maxPrice: Number(results[0].maxPrice) || Number(results[0].avgPrice) * 1.5,
        });
      }
    } catch {
    }
  }
  
  return pricingMap;
}

async function getCarrierContext(carrier?: string): Promise<string[]> {
  if (!carrier) return [];
  
  const patterns: string[] = [];
  
  try {
    const dbPatterns = await db.select().from(carrierTrends)
      .where(like(carrierTrends.carrierName, `%${carrier.toLowerCase()}%`))
      .limit(10);
    
    for (const trend of dbPatterns) {
      if (trend.commonStrategy && trend.frequency) {
        patterns.push(`${trend.lineItemDescription}: ${trend.commonStrategy} (${trend.frequency} occurrences)`);
      }
    }
  } catch {
  }
  
  return patterns;
}

export async function analyze(input: ClaimAuditInput): Promise<ClaimAuditResult> {
  const startTime = Date.now();
  
  const llmStatus = getLLMServiceStatus();
  if (!llmStatus.available.includes('openai') && !llmStatus.available.includes('local-ai')) {
    return {
      success: false,
      version: VERSION_ID,
      role: 'primary',
      auditedItems: [],
      missingItems: [],
      carrierPatterns: [],
      recommendations: ['LLM service unavailable - falling back to rules engine'],
      summary: {
        totalQuoted: 0,
        totalMarketValue: 0,
        totalUnderpayment: 0,
        itemsAudited: 0,
        flaggedItems: 0,
      },
      confidence: 0,
      processingTimeMs: Date.now() - startTime,
      fallbackReason: 'LLM services unavailable',
    };
  }

  const [pricingData, carrierContext] = await Promise.all([
    enrichWithPricingData(input.lineItems),
    getCarrierContext(input.carrier),
  ]);

  const enrichedItems = input.lineItems.map((item: ClaimLineItem) => ({
    ...item,
    marketData: pricingData.get(item.description),
  }));

  const prompt = `Analyze this insurance claim for potential underpayment:

Claim Details:
- ZIP Code: ${input.zipCode}
- Carrier: ${input.carrier || 'Unknown'}
- Document Reference: ${input.claimNumber || 'N/A'}

Line Items:
${JSON.stringify(enrichedItems, null, 2)}

${carrierContext.length > 0 ? `Known carrier patterns:\n${carrierContext.join('\n')}` : ''}

Provide comprehensive analysis focusing on:
1. Price validation against market rates
2. Commonly omitted items for these work categories
3. Carrier-specific tactics if applicable
4. Specific actionable recommendations`;

  try {
    const response = await routeLLMRequest(prompt, { systemPrompt: SYSTEM_PROMPT });
    
    if (response.provider === 'rule-based') {
      return {
        success: false,
        version: VERSION_ID,
        role: 'primary',
        auditedItems: [],
        missingItems: [],
        carrierPatterns: [],
        recommendations: ['LLM returned rule-based response - should use fallback'],
        summary: {
          totalQuoted: 0,
          totalMarketValue: 0,
          totalUnderpayment: 0,
          itemsAudited: 0,
          flaggedItems: 0,
        },
        confidence: 0,
        processingTimeMs: Date.now() - startTime,
        fallbackReason: 'LLM fell through to rule-based extraction',
      };
    }

    let llmAnalysis: any;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        llmAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      llmAnalysis = {
        itemAnalysis: [],
        missingItems: [],
        carrierInsights: [],
        recommendations: [response.content],
        overallAssessment: 'See detailed analysis',
        confidence: 60,
      };
    }

    const auditedItems: AuditedLineItem[] = input.lineItems.map((item: ClaimLineItem, idx: number) => {
      const llmItem = llmAnalysis.itemAnalysis?.[idx];
      const pricing = pricingData.get(item.description);
      const quantity = item.quantity || 1;
      const marketPrice = pricing 
        ? pricing.avgPrice * quantity 
        : item.quotedPrice * 1.15;
      
      const variance = marketPrice > 0 
        ? ((marketPrice - item.quotedPrice) / marketPrice) * 100 
        : 0;

      return {
        original: item,
        marketPrice,
        variance,
        flags: llmItem?.flags || (variance > 20 ? [`Underpaid by ${variance.toFixed(1)}%`] : []),
        recommendation: llmItem?.assessment || (variance > 15 ? 'Request re-evaluation' : 'Price acceptable'),
        llmInsight: llmItem?.assessment,
      };
    });

    const totalQuoted = input.lineItems.reduce((sum: number, i: ClaimLineItem) => sum + i.quotedPrice, 0);
    const totalMarket = auditedItems.reduce((sum: number, i: AuditedLineItem) => sum + i.marketPrice, 0);
    const totalUnderpayment = Math.max(0, totalMarket - totalQuoted);

    const baseConfidence = (llmAnalysis.confidence || 70) / 100;
    const providerBonus = response.provider === 'openai' ? 0.15 : 0.05;
    const confidence = Math.min(baseConfidence + providerBonus, 0.95);

    return {
      success: true,
      version: VERSION_ID,
      role: 'primary',
      auditedItems,
      missingItems: llmAnalysis.missingItems || [],
      carrierPatterns: llmAnalysis.carrierInsights || carrierContext,
      recommendations: llmAnalysis.recommendations || ['Manual review recommended'],
      summary: {
        totalQuoted,
        totalMarketValue: totalMarket,
        totalUnderpayment,
        itemsAudited: auditedItems.length,
        flaggedItems: auditedItems.filter(i => i.flags.length > 0).length,
      },
      confidence,
      processingTimeMs: Date.now() - startTime,
      llmProvider: response.provider,
      llmModel: response.model,
      overallAssessment: llmAnalysis.overallAssessment,
    };
  } catch (error: any) {
    return {
      success: false,
      version: VERSION_ID,
      role: 'primary',
      auditedItems: [],
      missingItems: [],
      carrierPatterns: [],
      recommendations: [],
      summary: {
        totalQuoted: 0,
        totalMarketValue: 0,
        totalUnderpayment: 0,
        itemsAudited: 0,
        flaggedItems: 0,
      },
      confidence: 0,
      processingTimeMs: Date.now() - startTime,
      fallbackReason: error.message || 'LLM request failed',
    };
  }
}

export function getStatus(): VersionStatus {
  const llmStatus = getLLMServiceStatus();
  return {
    id: VERSION_ID,
    role: 'primary' as const,
    available: llmStatus.available.includes('openai') || llmStatus.available.includes('local-ai'),
    description: 'LLM-powered analysis using OpenAI/LocalAI for highest quality results',
    llmProvider: llmStatus.primary,
    circuitBreakers: llmStatus.circuitBreakers,
  };
}
