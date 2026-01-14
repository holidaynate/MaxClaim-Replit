/**
 * Claim Audit Service Router
 * 
 * Implements prefer-primary-else-fallback-else-archived selection behavior.
 * Automatically routes requests to the best available implementation:
 * - v3-llm-openai (primary): LLM-powered, highest quality
 * - v2-rules-advanced (fallback): Database-backed deterministic
 * - v1-rules-basic (archived): Offline-capable basic rules
 */

import * as v1RulesBasic from './v1_rulesBasic';
import * as v2RulesAdvanced from './v2_rulesAdvanced';
import * as v3LlmOpenAI from './v3_llmOpenAI';
import type { ClaimAuditInput, ClaimAuditResult, VersionStatus, VersionRole } from './types';

export type { ClaimAuditInput, ClaimAuditResult, VersionStatus, ClaimLineItem } from './types';

interface FallbackEvent {
  timestamp: Date;
  fromVersion: string;
  toVersion: string;
  reason: string;
}

const fallbackHistory: FallbackEvent[] = [];
const MAX_FALLBACK_HISTORY = 100;

function logFallback(from: string, to: string, reason: string) {
  fallbackHistory.push({
    timestamp: new Date(),
    fromVersion: from,
    toVersion: to,
    reason,
  });
  
  if (fallbackHistory.length > MAX_FALLBACK_HISTORY) {
    fallbackHistory.shift();
  }
  
  console.log(`[ClaimAudit] Fallback: ${from} -> ${to} (${reason})`);
}

export async function analyzeClaimWithFallback(input: ClaimAuditInput): Promise<ClaimAuditResult> {
  const v3Status = v3LlmOpenAI.getStatus();
  const v2Status = await v2RulesAdvanced.getStatusAsync();
  const v1Status = v1RulesBasic.getStatus();

  if (v3Status.available) {
    try {
      const result = await v3LlmOpenAI.analyze(input);
      
      if (result.success) {
        return result;
      }
      
      logFallback('v3-llm-openai', 'v2-rules-advanced', result.fallbackReason || 'v3 returned unsuccessful');
    } catch (error: any) {
      logFallback('v3-llm-openai', 'v2-rules-advanced', error.message || 'v3 threw exception');
    }
  } else {
    logFallback('v3-llm-openai', 'v2-rules-advanced', 'LLM service unavailable');
  }

  if (v2Status.available) {
    try {
      const result = await v2RulesAdvanced.analyze(input);
      
      if (result.success) {
        if (!v3Status.available) {
          result.fallbackReason = 'Using v2 fallback - LLM unavailable';
        }
        return result;
      }
      
      logFallback('v2-rules-advanced', 'v1-rules-basic', result.fallbackReason || 'v2 returned unsuccessful');
    } catch (error: any) {
      logFallback('v2-rules-advanced', 'v1-rules-basic', error.message || 'v2 threw exception');
    }
  } else {
    logFallback('v2-rules-advanced', 'v1-rules-basic', 'Database unavailable');
  }

  try {
    const result = await v1RulesBasic.analyze(input);
    result.fallbackReason = 'Using v1 archived version - all other implementations failed';
    return result;
  } catch (error: any) {
    return {
      success: false,
      version: 'none',
      role: 'archived-but-viable',
      auditedItems: [],
      missingItems: [],
      carrierPatterns: [],
      recommendations: ['All analysis engines failed - please try again later'],
      summary: {
        totalQuoted: input.lineItems.reduce((sum, i) => sum + i.quotedPrice, 0),
        totalMarketValue: 0,
        totalUnderpayment: 0,
        itemsAudited: 0,
        flaggedItems: 0,
      },
      confidence: 0,
      processingTimeMs: 0,
      fallbackReason: `Complete failure: ${error.message}`,
    };
  }
}

export function getVersionStatuses(): VersionStatus[] {
  return [
    v3LlmOpenAI.getStatus(),
    v2RulesAdvanced.getStatus(),
    v1RulesBasic.getStatus(),
  ];
}

export async function getVersionStatusesAsync(): Promise<VersionStatus[]> {
  return [
    v3LlmOpenAI.getStatus(),
    await v2RulesAdvanced.getStatusAsync(),
    v1RulesBasic.getStatus(),
  ];
}

export function getActiveVersion(): { id: string; role: VersionRole; fallbackChain: string[] } {
  const v3Status = v3LlmOpenAI.getStatus();
  const v2Status = v2RulesAdvanced.getStatus();
  
  const fallbackChain: string[] = [];
  
  if (v3Status.available) {
    fallbackChain.push('v3-llm-openai');
    fallbackChain.push('v2-rules-advanced');
    fallbackChain.push('v1-rules-basic');
    return { id: 'v3-llm-openai', role: 'primary', fallbackChain };
  }
  
  if (v2Status.available) {
    fallbackChain.push('v2-rules-advanced');
    fallbackChain.push('v1-rules-basic');
    return { id: 'v2-rules-advanced', role: 'fallback', fallbackChain };
  }
  
  fallbackChain.push('v1-rules-basic');
  return { id: 'v1-rules-basic', role: 'archived-but-viable', fallbackChain };
}

export async function getActiveVersionAsync(): Promise<{ id: string; role: VersionRole; fallbackChain: string[] }> {
  const v3Status = v3LlmOpenAI.getStatus();
  const v2Status = await v2RulesAdvanced.getStatusAsync();
  
  const fallbackChain: string[] = [];
  
  if (v3Status.available) {
    fallbackChain.push('v3-llm-openai');
    fallbackChain.push('v2-rules-advanced');
    fallbackChain.push('v1-rules-basic');
    return { id: 'v3-llm-openai', role: 'primary', fallbackChain };
  }
  
  if (v2Status.available) {
    fallbackChain.push('v2-rules-advanced');
    fallbackChain.push('v1-rules-basic');
    return { id: 'v2-rules-advanced', role: 'fallback', fallbackChain };
  }
  
  fallbackChain.push('v1-rules-basic');
  return { id: 'v1-rules-basic', role: 'archived-but-viable', fallbackChain };
}

export function getFallbackHistory(): FallbackEvent[] {
  return [...fallbackHistory];
}

export function getServiceHealth(): {
  status: 'healthy' | 'degraded' | 'critical';
  activeVersion: string;
  availableVersions: string[];
  recentFallbacks: number;
  message: string;
} {
  const versions = getVersionStatuses();
  const available = versions.filter(v => v.available);
  const active = getActiveVersion();
  const recentFallbacks = fallbackHistory.filter(
    f => Date.now() - f.timestamp.getTime() < 3600000
  ).length;

  if (available.length === 3 && active.role === 'primary') {
    return {
      status: 'healthy',
      activeVersion: active.id,
      availableVersions: available.map(v => v.id),
      recentFallbacks,
      message: 'All implementations available, using primary LLM-powered analysis',
    };
  }

  if (available.length >= 2 && active.role !== 'archived-but-viable') {
    return {
      status: 'degraded',
      activeVersion: active.id,
      availableVersions: available.map(v => v.id),
      recentFallbacks,
      message: `Operating in ${active.role} mode - ${3 - available.length} implementation(s) unavailable`,
    };
  }

  return {
    status: 'critical',
    activeVersion: active.id,
    availableVersions: available.map(v => v.id),
    recentFallbacks,
    message: 'Operating on archived implementation only - limited analysis capability',
  };
}

export async function getServiceHealthAsync(): Promise<{
  status: 'healthy' | 'degraded' | 'critical';
  activeVersion: string;
  availableVersions: string[];
  recentFallbacks: number;
  message: string;
}> {
  const versions = await getVersionStatusesAsync();
  const available = versions.filter(v => v.available);
  const active = await getActiveVersionAsync();
  const recentFallbacks = fallbackHistory.filter(
    f => Date.now() - f.timestamp.getTime() < 3600000
  ).length;

  if (available.length === 3 && active.role === 'primary') {
    return {
      status: 'healthy',
      activeVersion: active.id,
      availableVersions: available.map(v => v.id),
      recentFallbacks,
      message: 'All implementations available, using primary LLM-powered analysis',
    };
  }

  if (available.length >= 2 && active.role !== 'archived-but-viable') {
    return {
      status: 'degraded',
      activeVersion: active.id,
      availableVersions: available.map(v => v.id),
      recentFallbacks,
      message: `Operating in ${active.role} mode - ${3 - available.length} implementation(s) unavailable`,
    };
  }

  return {
    status: 'critical',
    activeVersion: active.id,
    availableVersions: available.map(v => v.id),
    recentFallbacks,
    message: 'Operating on archived implementation only - limited analysis capability',
  };
}

export { v1RulesBasic, v2RulesAdvanced, v3LlmOpenAI };
