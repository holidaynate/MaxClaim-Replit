/**
 * MaxClaim Feature Flags Service
 * Environment-based feature toggles for premium features
 */

export type FeatureName =
  | 'advanced-analytics'
  | 'multi-agent-swarm'
  | 'realtime-notifications'
  | 'carrier-intelligence'
  | 'local-ai-fallback'
  | 'paddle-ocr'
  | 'crawl4ai-scraper'
  | 'redis-cache';

export type UserTier = 'free' | 'standard' | 'premium' | 'enterprise';

interface FeatureDefinition {
  name: FeatureName;
  envVar: string;
  defaultEnabled: boolean;
  requiredTier: UserTier;
  description: string;
}

const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    name: 'carrier-intelligence',
    envVar: 'ENABLE_CARRIER_INTELLIGENCE',
    defaultEnabled: true,
    requiredTier: 'free',
    description: 'Historical underpayment patterns by carrier',
  },
  {
    name: 'advanced-analytics',
    envVar: 'ENABLE_ADVANCED_ANALYTICS',
    defaultEnabled: false,
    requiredTier: 'premium',
    description: 'Detailed claim analytics and reporting',
  },
  {
    name: 'multi-agent-swarm',
    envVar: 'ENABLE_MULTI_AGENT_SWARM',
    defaultEnabled: false,
    requiredTier: 'enterprise',
    description: 'Multi-agent AI system for complex claims',
  },
  {
    name: 'realtime-notifications',
    envVar: 'ENABLE_REALTIME_NOTIFICATIONS',
    defaultEnabled: false,
    requiredTier: 'standard',
    description: 'Real-time push notifications for claim updates',
  },
  {
    name: 'local-ai-fallback',
    envVar: 'ENABLE_LOCAL_AI',
    defaultEnabled: false,
    requiredTier: 'enterprise',
    description: 'Self-hosted LLM for cost savings',
  },
  {
    name: 'paddle-ocr',
    envVar: 'PADDLEOCR_API_URL',
    defaultEnabled: false,
    requiredTier: 'standard',
    description: 'GPU-accelerated OCR for faster document processing',
  },
  {
    name: 'crawl4ai-scraper',
    envVar: 'ENABLE_CRAWL4AI',
    defaultEnabled: false,
    requiredTier: 'enterprise',
    description: 'Automated pricing data scraping',
  },
  {
    name: 'redis-cache',
    envVar: 'REDIS_URL',
    defaultEnabled: false,
    requiredTier: 'premium',
    description: 'Distributed Redis caching layer',
  },
];

// Tier hierarchy for permission checking
const TIER_LEVELS: Record<UserTier, number> = {
  free: 0,
  standard: 1,
  premium: 2,
  enterprise: 3,
};

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(
  feature: FeatureName,
  userTier: UserTier = 'free'
): boolean {
  const definition = FEATURE_DEFINITIONS.find((f) => f.name === feature);
  if (!definition) return false;

  // Check tier permission
  const userLevel = TIER_LEVELS[userTier];
  const requiredLevel = TIER_LEVELS[definition.requiredTier];
  
  if (userLevel < requiredLevel) {
    return false;
  }

  // Check environment variable
  const envValue = process.env[definition.envVar];
  
  // For URL-type env vars, check if they exist
  if (definition.envVar.includes('URL')) {
    return !!envValue;
  }
  
  // For boolean toggles
  if (envValue === 'true' || envValue === '1') {
    return true;
  }
  if (envValue === 'false' || envValue === '0') {
    return false;
  }
  
  return definition.defaultEnabled;
}

/**
 * Get all feature flags status
 */
export function getAllFeatureFlags(userTier: UserTier = 'free'): Array<{
  name: FeatureName;
  enabled: boolean;
  available: boolean;
  requiredTier: UserTier;
  description: string;
}> {
  return FEATURE_DEFINITIONS.map((def) => {
    const userLevel = TIER_LEVELS[userTier];
    const requiredLevel = TIER_LEVELS[def.requiredTier];
    const available = userLevel >= requiredLevel;
    
    return {
      name: def.name,
      enabled: isFeatureEnabled(def.name, userTier),
      available,
      requiredTier: def.requiredTier,
      description: def.description,
    };
  });
}

/**
 * Get features available for upgrade
 */
export function getUpgradeFeatures(currentTier: UserTier): Array<{
  name: FeatureName;
  requiredTier: UserTier;
  description: string;
}> {
  const currentLevel = TIER_LEVELS[currentTier];
  
  return FEATURE_DEFINITIONS
    .filter((def) => TIER_LEVELS[def.requiredTier] > currentLevel)
    .map((def) => ({
      name: def.name,
      requiredTier: def.requiredTier,
      description: def.description,
    }));
}

/**
 * Feature gate decorator for API routes
 */
export function requireFeature(feature: FeatureName, minTier: UserTier = 'free') {
  return (req: any, res: any, next: any) => {
    // Get user tier from session or default to free
    const userTier = req.session?.userTier || 'free';
    
    if (!isFeatureEnabled(feature, userTier)) {
      const definition = FEATURE_DEFINITIONS.find((f) => f.name === feature);
      return res.status(403).json({
        error: 'Feature not available',
        feature,
        requiredTier: definition?.requiredTier || minTier,
        currentTier: userTier,
        message: `Upgrade to ${definition?.requiredTier || minTier} to access this feature`,
      });
    }
    
    next();
  };
}

/**
 * Get feature configuration for client-side
 */
export function getClientFeatureConfig(userTier: UserTier = 'free'): Record<FeatureName, boolean> {
  const config: Record<string, boolean> = {};
  
  for (const def of FEATURE_DEFINITIONS) {
    config[def.name] = isFeatureEnabled(def.name, userTier);
  }
  
  return config as Record<FeatureName, boolean>;
}
