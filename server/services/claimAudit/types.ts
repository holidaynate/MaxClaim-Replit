/**
 * Claim Audit Service Types
 * Shared types for all versioned implementations
 */

export interface ClaimLineItem {
  description: string;
  quotedPrice: number;
  category?: string;
  quantity?: number;
  unit?: string;
}

export interface ClaimAuditInput {
  carrier?: string;
  zipCode: string;
  lineItems: ClaimLineItem[];
  documentText?: string;
  claimNumber?: string;
  lossDate?: string;
}

export interface AuditedLineItem {
  original: ClaimLineItem;
  marketPrice: number;
  variance: number;
  flags: string[];
  recommendation: string;
  llmInsight?: string;
}

export interface ClaimAuditResult {
  success: boolean;
  version: string;
  role: 'primary' | 'fallback' | 'archived-but-viable';
  auditedItems: AuditedLineItem[];
  missingItems: string[];
  carrierPatterns: string[];
  recommendations: string[];
  summary: {
    totalQuoted: number;
    totalMarketValue: number;
    totalUnderpayment: number;
    itemsAudited: number;
    flaggedItems: number;
  };
  confidence: number;
  processingTimeMs: number;
  fallbackReason?: string;
  llmProvider?: string;
  llmModel?: string;
  overallAssessment?: string;
}

export type VersionRole = 'primary' | 'fallback' | 'archived-but-viable';

export interface VersionStatus {
  id: string;
  role: VersionRole;
  available: boolean;
  description: string;
  llmProvider?: string;
  circuitBreakers?: Record<string, { isOpen: boolean; failures: number }>;
}

export type SelectionBehavior = 'prefer-primary-else-fallback-else-archived';
