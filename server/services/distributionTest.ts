import { 
  calculateRotationWeights, 
  selectPartnersForPlacement,
  PartnerAdConfig,
  RotationWeight 
} from "./competitiveRotation";

export interface DistributionTestConfig {
  iterations: number;
  targetRegion: string;
  targetState: string;
  targetTradeType: string | null;
  slotsPerIteration: number;
}

export interface DistributionResult {
  partnerId: string;
  companyName: string;
  tier: string;
  monthlyBudget: number;
  expectedWeight: number;
  actualSelections: number;
  actualPercentage: number;
  expectedPercentage: number;
  deviation: number;
  chiSquareContrib: number;
}

export interface TestSummary {
  totalIterations: number;
  totalSelections: number;
  chiSquareStatistic: number;
  passed: boolean;
  threshold: number;
  message: string;
  results: DistributionResult[];
  timestamp: Date;
}

function createTestPartners(): PartnerAdConfig[] {
  return [
    {
      partnerId: "test-premium-1",
      companyName: "Premium Roofing Co",
      tradeType: "roofing",
      tier: "premium",
      monthlyBudget: 2000,
      budgetSpent: 500,
      regions: ["TX-Gulf", "TX-Central"],
      state: "TX",
      isTradeAssociation: false,
      status: "active",
      totalImpressions: 1000,
      totalClicks: 50,
    },
    {
      partnerId: "test-standard-1",
      companyName: "Standard Contractor LLC",
      tradeType: "roofing",
      tier: "standard",
      monthlyBudget: 500,
      budgetSpent: 100,
      regions: ["TX-Gulf", "TX-Central"],
      state: "TX",
      isTradeAssociation: false,
      status: "active",
      totalImpressions: 500,
      totalClicks: 20,
    },
    {
      partnerId: "test-standard-2",
      companyName: "Quality Repairs Inc",
      tradeType: "roofing",
      tier: "standard",
      monthlyBudget: 700,
      budgetSpent: 200,
      regions: ["TX-Gulf"],
      state: "TX",
      isTradeAssociation: false,
      status: "active",
      totalImpressions: 300,
      totalClicks: 15,
    },
    {
      partnerId: "test-byo-1",
      companyName: "Build Your Own Partner",
      tradeType: "roofing",
      tier: "build_your_own",
      monthlyBudget: 300,
      budgetSpent: 50,
      regions: ["TX-Gulf", "TX-Central"],
      state: "TX",
      isTradeAssociation: false,
      status: "active",
      totalImpressions: 200,
      totalClicks: 10,
    },
    {
      partnerId: "test-free-1",
      companyName: "Free Tier Contractor",
      tradeType: "roofing",
      tier: "free",
      monthlyBudget: 0,
      budgetSpent: 0,
      regions: ["TX-Gulf", "TX-Central", "TX-West"],
      state: "TX",
      isTradeAssociation: false,
      status: "active",
      totalImpressions: 100,
      totalClicks: 5,
    },
  ];
}

export function testDistribution(
  partners: PartnerAdConfig[] | null,
  config: Partial<DistributionTestConfig> = {}
): TestSummary {
  const testPartners = partners || createTestPartners();
  
  const fullConfig: DistributionTestConfig = {
    iterations: config.iterations || 1000,
    targetRegion: config.targetRegion || "TX-Gulf",
    targetState: config.targetState || "TX",
    targetTradeType: config.targetTradeType !== undefined ? config.targetTradeType : "roofing",
    slotsPerIteration: config.slotsPerIteration || 3,
  };

  const weights = calculateRotationWeights(
    testPartners,
    fullConfig.targetRegion,
    fullConfig.targetState,
    fullConfig.targetTradeType
  );

  if (weights.length === 0) {
    return {
      totalIterations: 0,
      totalSelections: 0,
      chiSquareStatistic: 0,
      passed: false,
      threshold: 0,
      message: "No eligible partners for the given criteria",
      results: [],
      timestamp: new Date(),
    };
  }

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  const normalizedWeights = weights.map(w => ({
    ...w,
    normalizedWeight: w.weight / totalWeight,
  }));

  const selectionCounts: Record<string, number> = {};
  for (const w of weights) {
    selectionCounts[w.partnerId] = 0;
  }

  for (let i = 0; i < fullConfig.iterations; i++) {
    const selected = weightedRandomSelect(normalizedWeights, fullConfig.slotsPerIteration);
    for (const partnerId of selected) {
      selectionCounts[partnerId]++;
    }
  }

  const totalSelections = fullConfig.iterations * fullConfig.slotsPerIteration;

  const results: DistributionResult[] = normalizedWeights.map(w => {
    const partner = testPartners.find(p => p.partnerId === w.partnerId)!;
    const expectedPercentage = w.normalizedWeight * 100;
    const actualSelections = selectionCounts[w.partnerId];
    const actualPercentage = (actualSelections / totalSelections) * 100;
    const deviation = Math.abs(actualPercentage - expectedPercentage);
    
    const expectedCount = totalSelections * w.normalizedWeight;
    const chiSquareContrib = expectedCount > 0 
      ? Math.pow(actualSelections - expectedCount, 2) / expectedCount 
      : 0;

    return {
      partnerId: w.partnerId,
      companyName: partner.companyName,
      tier: partner.tier,
      monthlyBudget: partner.monthlyBudget,
      expectedWeight: Math.round(w.weight * 1000) / 1000,
      actualSelections,
      actualPercentage: Math.round(actualPercentage * 100) / 100,
      expectedPercentage: Math.round(expectedPercentage * 100) / 100,
      deviation: Math.round(deviation * 100) / 100,
      chiSquareContrib: Math.round(chiSquareContrib * 1000) / 1000,
    };
  });

  const chiSquareStatistic = results.reduce((sum, r) => sum + r.chiSquareContrib, 0);
  
  const degreesOfFreedom = weights.length - 1;
  const threshold = getChiSquareThreshold(degreesOfFreedom, 0.05);
  
  const passed = chiSquareStatistic <= threshold;
  
  const message = passed
    ? `Distribution test PASSED: Chi-square ${chiSquareStatistic.toFixed(2)} <= ${threshold.toFixed(2)} (df=${degreesOfFreedom})`
    : `Distribution test FAILED: Chi-square ${chiSquareStatistic.toFixed(2)} > ${threshold.toFixed(2)} (df=${degreesOfFreedom})`;

  return {
    totalIterations: fullConfig.iterations,
    totalSelections,
    chiSquareStatistic: Math.round(chiSquareStatistic * 1000) / 1000,
    passed,
    threshold: Math.round(threshold * 1000) / 1000,
    message,
    results: results.sort((a, b) => b.expectedWeight - a.expectedWeight),
    timestamp: new Date(),
  };
}

function weightedRandomSelect(
  weights: Array<{ partnerId: string; normalizedWeight: number }>,
  count: number
): string[] {
  const selected: string[] = [];
  const available = [...weights];
  
  for (let i = 0; i < count && available.length > 0; i++) {
    const totalWeight = available.reduce((sum, w) => sum + w.normalizedWeight, 0);
    let random = Math.random() * totalWeight;
    
    for (let j = 0; j < available.length; j++) {
      random -= available[j].normalizedWeight;
      if (random <= 0) {
        selected.push(available[j].partnerId);
        available.splice(j, 1);
        break;
      }
    }
  }
  
  return selected;
}

function getChiSquareThreshold(df: number, alpha: number = 0.05): number {
  const thresholds: Record<number, number> = {
    1: 3.841,
    2: 5.991,
    3: 7.815,
    4: 9.488,
    5: 11.070,
    6: 12.592,
    7: 14.067,
    8: 15.507,
    9: 16.919,
    10: 18.307,
  };
  
  return thresholds[df] || thresholds[10] + (df - 10) * 1.5;
}

export function runQuickTest(): TestSummary {
  return testDistribution(null, { iterations: 500 });
}

export function validateWeightFactors(): {
  valid: boolean;
  issues: string[];
  weights: RotationWeight[];
} {
  const partners = createTestPartners();
  const weights = calculateRotationWeights(partners, "TX-Gulf", "TX", "roofing");
  
  const issues: string[] = [];
  
  if (weights.length === 0) {
    issues.push("No weights generated for test partners");
    return { valid: false, issues, weights };
  }
  
  const premiumWeight = weights.find(w => w.partnerId === "test-premium-1");
  const standardWeight = weights.find(w => w.partnerId === "test-standard-1");
  const freeWeight = weights.find(w => w.partnerId === "test-free-1");
  
  if (premiumWeight && standardWeight) {
    if (premiumWeight.weight <= standardWeight.weight) {
      issues.push("Premium tier should have higher weight than standard tier");
    }
  }
  
  if (standardWeight && freeWeight) {
    if (standardWeight.weight <= freeWeight.weight) {
      issues.push("Standard tier should have higher weight than free tier");
    }
  }
  
  for (const w of weights) {
    if (w.factors.tierMultiplier <= 0) {
      issues.push(`Invalid tier multiplier for ${w.partnerId}: ${w.factors.tierMultiplier}`);
    }
    if (w.factors.budgetFactor <= 0) {
      issues.push(`Invalid budget factor for ${w.partnerId}: ${w.factors.budgetFactor}`);
    }
    if (w.weight <= 0) {
      issues.push(`Invalid total weight for ${w.partnerId}: ${w.weight}`);
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
    weights,
  };
}

export const distributionTest = {
  testDistribution,
  runQuickTest,
  validateWeightFactors,
  createTestPartners,
};
