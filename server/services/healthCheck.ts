/**
 * MaxClaim Health Check Service
 * Service redundancy and failover monitoring
 */

import { db } from "../db";
import { priceDBCache } from "../utils/priceDBCache";
import { getServiceHealthAsync, getVersionStatusesAsync, getActiveVersionAsync } from "./claimAudit";

interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latency_ms?: number;
  message?: string;
  lastChecked: string;
}

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime_seconds: number;
  services: ServiceStatus[];
}

interface FeatureStatus {
  name: string;
  enabled: boolean;
  requiredTier: string;
  envVar: string;
}

const startTime = Date.now();

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await db.execute("SELECT 1");
    return {
      name: "postgresql",
      status: "healthy",
      latency_ms: Date.now() - start,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name: "postgresql",
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Database connection failed",
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Check pricing cache status
 */
function checkPricingCache(): ServiceStatus {
  try {
    const stats = priceDBCache.getStats();
    const cacheSize = stats.itemCount;
    return {
      name: "pricing-cache",
      status: cacheSize > 0 ? "healthy" : "degraded",
      message: `${cacheSize} items cached (${stats.memorySizeKB}KB)`,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name: "pricing-cache",
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Cache check failed",
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Check OCR service availability
 */
async function checkOCRService(): Promise<ServiceStatus> {
  const hasPaddleOCR = !!process.env.PADDLEOCR_API_URL;
  const hasOcrSpaceKey = !!process.env.OCR_SPACE_API_KEY;
  
  let status: "healthy" | "degraded" | "unhealthy" = "degraded";
  let message = "Using Tesseract.js fallback only";
  
  if (hasPaddleOCR) {
    status = "healthy";
    message = "PaddleOCR (GPU) primary, OCR.space + Tesseract.js fallbacks";
  } else if (hasOcrSpaceKey) {
    status = "healthy";
    message = "OCR.space API primary, Tesseract.js fallback ready";
  }
  
  return {
    name: "ocr-service",
    status,
    message,
    lastChecked: new Date().toISOString(),
  };
}

/**
 * Check LLM service availability
 */
async function checkLLMService(): Promise<ServiceStatus> {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasLocalAI = !!process.env.LOCAL_AI_URL;
  
  let status: "healthy" | "degraded" | "unhealthy" = "degraded";
  let message = "Using rule-based fallback (no LLM configured)";
  
  if (hasOpenAIKey) {
    status = "healthy";
    message = hasLocalAI 
      ? "OpenAI primary, LocalAI + rule-based fallbacks" 
      : "OpenAI API configured, rule-based fallback";
  } else if (hasLocalAI) {
    status = "healthy";
    message = "LocalAI configured, rule-based fallback";
  }
  
  return {
    name: "llm-service",
    status,
    message,
    lastChecked: new Date().toISOString(),
  };
}

/**
 * Check Stripe connectivity
 */
function checkStripe(): ServiceStatus {
  const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
  
  return {
    name: "stripe",
    status: hasStripeKey ? "healthy" : "degraded",
    message: hasStripeKey ? "Stripe configured" : "Stripe not configured",
    lastChecked: new Date().toISOString(),
  };
}

/**
 * Check email service
 */
function checkEmailService(): ServiceStatus {
  const hasSendGridKey = !!process.env.SENDGRID_API_KEY;
  
  return {
    name: "email-service",
    status: hasSendGridKey ? "healthy" : "degraded",
    message: hasSendGridKey ? "SendGrid configured" : "Email logging only",
    lastChecked: new Date().toISOString(),
  };
}

/**
 * Get primary services health
 */
export async function getPrimaryHealth(): Promise<HealthCheckResult> {
  const services = await Promise.all([
    checkDatabase(),
    checkOCRService(),
    checkLLMService(),
    checkStripe(),
  ]);

  const unhealthyCount = services.filter((s) => s.status === "unhealthy").length;
  const degradedCount = services.filter((s) => s.status === "degraded").length;

  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (unhealthyCount > 0) overallStatus = "unhealthy";
  else if (degradedCount > 0) overallStatus = "degraded";

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    services,
  };
}

/**
 * Check versioned claim audit service status
 */
async function checkClaimAuditService(): Promise<ServiceStatus> {
  const health = await getServiceHealthAsync();
  const active = await getActiveVersionAsync();
  
  let status: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (health.status === 'critical') status = "unhealthy";
  else if (health.status === 'degraded') status = "degraded";
  
  return {
    name: "claim-audit-service",
    status,
    message: `${health.message} (active: ${active.id}, fallback chain: ${active.fallbackChain.length} versions)`,
    lastChecked: new Date().toISOString(),
  };
}

/**
 * Get fallback services health
 */
export async function getFallbackHealth(): Promise<HealthCheckResult> {
  const services: ServiceStatus[] = [
    checkPricingCache(),
    await checkClaimAuditService(),
    {
      name: "tesseract-fallback",
      status: "healthy",
      message: "Tesseract.js always available",
      lastChecked: new Date().toISOString(),
    },
    {
      name: "manual-entry",
      status: "healthy",
      message: "Manual entry form available",
      lastChecked: new Date().toISOString(),
    },
    checkEmailService(),
  ];

  const unhealthyCount = services.filter((s) => s.status === "unhealthy").length;

  return {
    status: unhealthyCount > 0 ? "degraded" : "healthy",
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    services,
  };
}

/**
 * Get feature flags status
 */
export function getFeatureStatus(): FeatureStatus[] {
  return [
    {
      name: "advanced-analytics",
      enabled: process.env.ENABLE_ADVANCED_ANALYTICS === "true",
      requiredTier: "premium",
      envVar: "ENABLE_ADVANCED_ANALYTICS",
    },
    {
      name: "multi-agent-swarm",
      enabled: process.env.ENABLE_MULTI_AGENT_SWARM === "true",
      requiredTier: "enterprise",
      envVar: "ENABLE_MULTI_AGENT_SWARM",
    },
    {
      name: "realtime-notifications",
      enabled: process.env.ENABLE_REALTIME_NOTIFICATIONS === "true",
      requiredTier: "standard",
      envVar: "ENABLE_REALTIME_NOTIFICATIONS",
    },
    {
      name: "carrier-intelligence",
      enabled: process.env.ENABLE_CARRIER_INTELLIGENCE !== "false",
      requiredTier: "free",
      envVar: "ENABLE_CARRIER_INTELLIGENCE",
    },
    {
      name: "local-ai-fallback",
      enabled: process.env.ENABLE_LOCAL_AI === "true",
      requiredTier: "enterprise",
      envVar: "ENABLE_LOCAL_AI",
    },
  ];
}

/**
 * Get versioned service detailed status
 */
export async function getVersionedServiceHealth() {
  return {
    health: await getServiceHealthAsync(),
    versions: await getVersionStatusesAsync(),
    active: await getActiveVersionAsync(),
  };
}

/**
 * Get combined health status
 */
export async function getCombinedHealth(): Promise<{
  primary: HealthCheckResult;
  fallback: HealthCheckResult;
  features: FeatureStatus[];
  versionedService: Awaited<ReturnType<typeof getVersionedServiceHealth>>;
  overall: "healthy" | "degraded" | "unhealthy";
}> {
  const [primary, fallback] = await Promise.all([
    getPrimaryHealth(),
    getFallbackHealth(),
  ]);

  const features = getFeatureStatus();
  const versionedService = await getVersionedServiceHealth();

  let overall: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (primary.status === "unhealthy" && fallback.status === "unhealthy") {
    overall = "unhealthy";
  } else if (primary.status === "unhealthy" || primary.status === "degraded") {
    overall = "degraded";
  } else if (versionedService.health.status === 'critical') {
    overall = "degraded";
  }

  return {
    primary,
    fallback,
    features,
    versionedService,
    overall,
  };
}

/**
 * Run all registered service self-tests
 * Centralized test runner for QA validation
 */
export async function runAllServiceTests(): Promise<{
  timestamp: string;
  totalPassed: number;
  totalFailed: number;
  services: Array<{
    name: string;
    passed: number;
    failed: number;
    results: string[];
  }>;
  overallStatus: "pass" | "partial" | "fail";
}> {
  const { runCarrierIntelSelfTests } = await import("./carrierIntel");
  const { runRotationSelfTests } = await import("./competitiveRotation");

  const services: Array<{
    name: string;
    passed: number;
    failed: number;
    results: string[];
  }> = [];

  const carrierIntelTests = runCarrierIntelSelfTests();
  services.push({
    name: "carrierIntel",
    passed: carrierIntelTests.passed,
    failed: carrierIntelTests.failed,
    results: carrierIntelTests.results,
  });

  const rotationTests = runRotationSelfTests();
  services.push({
    name: "competitiveRotation",
    passed: rotationTests.passed,
    failed: rotationTests.failed,
    results: rotationTests.results,
  });

  const totalPassed = services.reduce((sum, s) => sum + s.passed, 0);
  const totalFailed = services.reduce((sum, s) => sum + s.failed, 0);

  let overallStatus: "pass" | "partial" | "fail" = "pass";
  if (totalFailed > 0 && totalPassed > 0) {
    overallStatus = "partial";
  } else if (totalFailed > 0 && totalPassed === 0) {
    overallStatus = "fail";
  }

  console.log(`[healthCheck] All service tests: ${totalPassed} passed, ${totalFailed} failed (${overallStatus})`);

  return {
    timestamp: new Date().toISOString(),
    totalPassed,
    totalFailed,
    services,
    overallStatus,
  };
}
