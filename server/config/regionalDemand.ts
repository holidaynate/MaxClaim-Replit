/**
 * MaxClaim Regional Demand Data
 * Copyright (c) 2024 MaxClaim. All rights reserved.
 * 
 * Demand metrics for each region including competitor counts, disaster declarations,
 * population density, and average contractor budgets.
 */

export interface RegionDemandFactor {
  baseMultiplier: number;
  competitorCount: number;
  disasterDeclaration: boolean;
  primaryHazards: string[];
  populationDensity: 'rural' | 'suburban' | 'urban';
  avgContractorBudget: number;
  demandIndex: number;
  lastUpdated: string;
}

export interface StateDemandData {
  [region: string]: RegionDemandFactor;
}

export const REGIONAL_DEMAND_DATA: Record<string, StateDemandData> = {
  TX: {
    'North Texas': {
      baseMultiplier: 1.2,
      competitorCount: 28,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'hail', 'severe_storm'],
      populationDensity: 'urban',
      avgContractorBudget: 650,
      demandIndex: 75,
      lastUpdated: '2024-12-01'
    },
    'Houston Metro': {
      baseMultiplier: 1.4,
      competitorCount: 35,
      disasterDeclaration: true,
      primaryHazards: ['hurricane', 'flood', 'severe_storm'],
      populationDensity: 'urban',
      avgContractorBudget: 900,
      demandIndex: 88,
      lastUpdated: '2024-12-01'
    },
    'Austin Area': {
      baseMultiplier: 1.3,
      competitorCount: 24,
      disasterDeclaration: false,
      primaryHazards: ['flood', 'hail', 'wildfire'],
      populationDensity: 'urban',
      avgContractorBudget: 750,
      demandIndex: 82,
      lastUpdated: '2024-12-01'
    },
    'San Antonio Area': {
      baseMultiplier: 0.95,
      competitorCount: 14,
      disasterDeclaration: false,
      primaryHazards: ['hail', 'flood'],
      populationDensity: 'suburban',
      avgContractorBudget: 450,
      demandIndex: 60,
      lastUpdated: '2024-12-01'
    },
    'Dallas-Fort Worth Metroplex': {
      baseMultiplier: 1.35,
      competitorCount: 32,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'hail', 'severe_storm'],
      populationDensity: 'urban',
      avgContractorBudget: 800,
      demandIndex: 85,
      lastUpdated: '2024-12-01'
    },
    'East Texas': {
      baseMultiplier: 0.8,
      competitorCount: 8,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'flood'],
      populationDensity: 'rural',
      avgContractorBudget: 300,
      demandIndex: 45,
      lastUpdated: '2024-12-01'
    },
    'West Texas': {
      baseMultiplier: 0.7,
      competitorCount: 6,
      disasterDeclaration: false,
      primaryHazards: ['hail', 'severe_storm', 'wildfire'],
      populationDensity: 'rural',
      avgContractorBudget: 250,
      demandIndex: 35,
      lastUpdated: '2024-12-01'
    },
    'South Texas': {
      baseMultiplier: 1.1,
      competitorCount: 12,
      disasterDeclaration: false,
      primaryHazards: ['hurricane', 'flood'],
      populationDensity: 'suburban',
      avgContractorBudget: 400,
      demandIndex: 55,
      lastUpdated: '2024-12-01'
    }
  },
  
  FL: {
    'South Florida': {
      baseMultiplier: 1.5,
      competitorCount: 48,
      disasterDeclaration: true,
      primaryHazards: ['hurricane', 'flood', 'severe_storm'],
      populationDensity: 'urban',
      avgContractorBudget: 1200,
      demandIndex: 95,
      lastUpdated: '2024-12-01'
    },
    'Central Florida': {
      baseMultiplier: 1.25,
      competitorCount: 30,
      disasterDeclaration: false,
      primaryHazards: ['hurricane', 'tornado', 'flood'],
      populationDensity: 'urban',
      avgContractorBudget: 700,
      demandIndex: 78,
      lastUpdated: '2024-12-01'
    },
    'Jacksonville Area': {
      baseMultiplier: 1.1,
      competitorCount: 18,
      disasterDeclaration: false,
      primaryHazards: ['hurricane', 'flood'],
      populationDensity: 'urban',
      avgContractorBudget: 550,
      demandIndex: 65,
      lastUpdated: '2024-12-01'
    },
    'Southwest Florida': {
      baseMultiplier: 1.35,
      competitorCount: 26,
      disasterDeclaration: true,
      primaryHazards: ['hurricane', 'flood'],
      populationDensity: 'suburban',
      avgContractorBudget: 850,
      demandIndex: 85,
      lastUpdated: '2024-12-01'
    },
    'Panhandle': {
      baseMultiplier: 1.3,
      competitorCount: 16,
      disasterDeclaration: true,
      primaryHazards: ['hurricane', 'tornado', 'flood'],
      populationDensity: 'suburban',
      avgContractorBudget: 600,
      demandIndex: 81,
      lastUpdated: '2024-12-01'
    }
  },
  
  CA: {
    'Bay Area': {
      baseMultiplier: 1.4,
      competitorCount: 42,
      disasterDeclaration: false,
      primaryHazards: ['earthquake', 'wildfire'],
      populationDensity: 'urban',
      avgContractorBudget: 1100,
      demandIndex: 85,
      lastUpdated: '2024-12-01'
    },
    'Los Angeles Metro': {
      baseMultiplier: 1.35,
      competitorCount: 55,
      disasterDeclaration: true,
      primaryHazards: ['wildfire', 'earthquake', 'flood'],
      populationDensity: 'urban',
      avgContractorBudget: 1000,
      demandIndex: 83,
      lastUpdated: '2024-12-01'
    },
    'San Diego Area': {
      baseMultiplier: 1.2,
      competitorCount: 28,
      disasterDeclaration: false,
      primaryHazards: ['wildfire', 'earthquake'],
      populationDensity: 'urban',
      avgContractorBudget: 800,
      demandIndex: 72,
      lastUpdated: '2024-12-01'
    },
    'Central Valley': {
      baseMultiplier: 0.95,
      competitorCount: 18,
      disasterDeclaration: false,
      primaryHazards: ['wildfire', 'flood'],
      populationDensity: 'suburban',
      avgContractorBudget: 500,
      demandIndex: 55,
      lastUpdated: '2024-12-01'
    },
    'Inland Empire': {
      baseMultiplier: 1.15,
      competitorCount: 22,
      disasterDeclaration: true,
      primaryHazards: ['wildfire', 'earthquake'],
      populationDensity: 'suburban',
      avgContractorBudget: 650,
      demandIndex: 68,
      lastUpdated: '2024-12-01'
    },
    'Northern California': {
      baseMultiplier: 1.0,
      competitorCount: 12,
      disasterDeclaration: false,
      primaryHazards: ['wildfire', 'flood'],
      populationDensity: 'rural',
      avgContractorBudget: 450,
      demandIndex: 50,
      lastUpdated: '2024-12-01'
    }
  },
  
  OK: {
    'Oklahoma City Metro': {
      baseMultiplier: 1.3,
      competitorCount: 22,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'hail', 'severe_storm'],
      populationDensity: 'urban',
      avgContractorBudget: 600,
      demandIndex: 80,
      lastUpdated: '2024-12-01'
    },
    'Tulsa Area': {
      baseMultiplier: 1.25,
      competitorCount: 18,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'hail', 'flood'],
      populationDensity: 'urban',
      avgContractorBudget: 550,
      demandIndex: 75,
      lastUpdated: '2024-12-01'
    },
    'Southwest Oklahoma': {
      baseMultiplier: 0.9,
      competitorCount: 6,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'severe_storm'],
      populationDensity: 'rural',
      avgContractorBudget: 300,
      demandIndex: 45,
      lastUpdated: '2024-12-01'
    },
    'Northeast Oklahoma': {
      baseMultiplier: 0.85,
      competitorCount: 8,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'flood'],
      populationDensity: 'rural',
      avgContractorBudget: 350,
      demandIndex: 40,
      lastUpdated: '2024-12-01'
    }
  },
  
  LA: {
    'New Orleans Metro': {
      baseMultiplier: 1.45,
      competitorCount: 32,
      disasterDeclaration: true,
      primaryHazards: ['hurricane', 'flood', 'severe_storm'],
      populationDensity: 'urban',
      avgContractorBudget: 950,
      demandIndex: 92,
      lastUpdated: '2024-12-01'
    },
    'Baton Rouge Area': {
      baseMultiplier: 1.2,
      competitorCount: 18,
      disasterDeclaration: false,
      primaryHazards: ['hurricane', 'flood'],
      populationDensity: 'suburban',
      avgContractorBudget: 600,
      demandIndex: 70,
      lastUpdated: '2024-12-01'
    },
    'Shreveport-Bossier': {
      baseMultiplier: 0.9,
      competitorCount: 10,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'severe_storm'],
      populationDensity: 'suburban',
      avgContractorBudget: 400,
      demandIndex: 50,
      lastUpdated: '2024-12-01'
    },
    'Acadiana': {
      baseMultiplier: 1.1,
      competitorCount: 12,
      disasterDeclaration: false,
      primaryHazards: ['hurricane', 'flood'],
      populationDensity: 'suburban',
      avgContractorBudget: 500,
      demandIndex: 60,
      lastUpdated: '2024-12-01'
    }
  },
  
  MS: {
    'Jackson Metro': {
      baseMultiplier: 1.0,
      competitorCount: 14,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'flood'],
      populationDensity: 'suburban',
      avgContractorBudget: 450,
      demandIndex: 55,
      lastUpdated: '2024-12-01'
    },
    'Gulf Coast': {
      baseMultiplier: 1.25,
      competitorCount: 18,
      disasterDeclaration: true,
      primaryHazards: ['hurricane', 'flood'],
      populationDensity: 'suburban',
      avgContractorBudget: 650,
      demandIndex: 75,
      lastUpdated: '2024-12-01'
    },
    'Northern Mississippi': {
      baseMultiplier: 0.8,
      competitorCount: 8,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'severe_storm'],
      populationDensity: 'rural',
      avgContractorBudget: 300,
      demandIndex: 40,
      lastUpdated: '2024-12-01'
    },
    'Delta Region': {
      baseMultiplier: 0.75,
      competitorCount: 5,
      disasterDeclaration: false,
      primaryHazards: ['flood', 'tornado'],
      populationDensity: 'rural',
      avgContractorBudget: 250,
      demandIndex: 35,
      lastUpdated: '2024-12-01'
    }
  },
  
  IL: {
    'Chicago Metro': {
      baseMultiplier: 1.2,
      competitorCount: 45,
      disasterDeclaration: false,
      primaryHazards: ['severe_storm', 'flood', 'tornado'],
      populationDensity: 'urban',
      avgContractorBudget: 800,
      demandIndex: 75,
      lastUpdated: '2024-12-01'
    },
    'Northern Illinois': {
      baseMultiplier: 0.95,
      competitorCount: 16,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'severe_storm'],
      populationDensity: 'suburban',
      avgContractorBudget: 450,
      demandIndex: 50,
      lastUpdated: '2024-12-01'
    },
    'Central Illinois': {
      baseMultiplier: 0.85,
      competitorCount: 12,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'flood'],
      populationDensity: 'rural',
      avgContractorBudget: 350,
      demandIndex: 45,
      lastUpdated: '2024-12-01'
    },
    'Southern Illinois': {
      baseMultiplier: 0.8,
      competitorCount: 8,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'flood'],
      populationDensity: 'rural',
      avgContractorBudget: 300,
      demandIndex: 40,
      lastUpdated: '2024-12-01'
    }
  },
  
  GA: {
    'Atlanta Metro': {
      baseMultiplier: 1.2,
      competitorCount: 38,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'severe_storm', 'hail'],
      populationDensity: 'urban',
      avgContractorBudget: 750,
      demandIndex: 78,
      lastUpdated: '2024-12-01'
    },
    'North Georgia': {
      baseMultiplier: 0.95,
      competitorCount: 14,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'severe_storm'],
      populationDensity: 'suburban',
      avgContractorBudget: 450,
      demandIndex: 50,
      lastUpdated: '2024-12-01'
    },
    'Savannah Area': {
      baseMultiplier: 1.1,
      competitorCount: 12,
      disasterDeclaration: false,
      primaryHazards: ['hurricane', 'flood'],
      populationDensity: 'suburban',
      avgContractorBudget: 550,
      demandIndex: 62,
      lastUpdated: '2024-12-01'
    },
    'Augusta Area': {
      baseMultiplier: 0.9,
      competitorCount: 10,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'severe_storm'],
      populationDensity: 'suburban',
      avgContractorBudget: 400,
      demandIndex: 48,
      lastUpdated: '2024-12-01'
    },
    'Columbus Area': {
      baseMultiplier: 0.85,
      competitorCount: 8,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'severe_storm'],
      populationDensity: 'suburban',
      avgContractorBudget: 350,
      demandIndex: 42,
      lastUpdated: '2024-12-01'
    }
  },
  
  NC: {
    'Charlotte Metro': {
      baseMultiplier: 1.15,
      competitorCount: 28,
      disasterDeclaration: false,
      primaryHazards: ['hurricane', 'tornado', 'severe_storm'],
      populationDensity: 'urban',
      avgContractorBudget: 700,
      demandIndex: 72,
      lastUpdated: '2024-12-01'
    },
    'Raleigh-Durham-Chapel Hill': {
      baseMultiplier: 1.1,
      competitorCount: 22,
      disasterDeclaration: false,
      primaryHazards: ['hurricane', 'tornado'],
      populationDensity: 'urban',
      avgContractorBudget: 650,
      demandIndex: 68,
      lastUpdated: '2024-12-01'
    },
    'Greensboro Area': {
      baseMultiplier: 0.95,
      competitorCount: 16,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'severe_storm'],
      populationDensity: 'suburban',
      avgContractorBudget: 500,
      demandIndex: 55,
      lastUpdated: '2024-12-01'
    },
    'Coastal': {
      baseMultiplier: 1.2,
      competitorCount: 18,
      disasterDeclaration: true,
      primaryHazards: ['hurricane', 'flood'],
      populationDensity: 'suburban',
      avgContractorBudget: 600,
      demandIndex: 75,
      lastUpdated: '2024-12-01'
    },
    'Western NC': {
      baseMultiplier: 0.9,
      competitorCount: 10,
      disasterDeclaration: false,
      primaryHazards: ['severe_storm', 'flood'],
      populationDensity: 'rural',
      avgContractorBudget: 400,
      demandIndex: 45,
      lastUpdated: '2024-12-01'
    }
  },
  
  CO: {
    'Denver Metro': {
      baseMultiplier: 1.25,
      competitorCount: 32,
      disasterDeclaration: false,
      primaryHazards: ['hail', 'wildfire', 'severe_storm'],
      populationDensity: 'urban',
      avgContractorBudget: 800,
      demandIndex: 78,
      lastUpdated: '2024-12-01'
    },
    'Front Range': {
      baseMultiplier: 1.15,
      competitorCount: 18,
      disasterDeclaration: false,
      primaryHazards: ['hail', 'wildfire'],
      populationDensity: 'suburban',
      avgContractorBudget: 600,
      demandIndex: 65,
      lastUpdated: '2024-12-01'
    },
    'Western Colorado': {
      baseMultiplier: 0.85,
      competitorCount: 8,
      disasterDeclaration: false,
      primaryHazards: ['wildfire', 'flood'],
      populationDensity: 'rural',
      avgContractorBudget: 350,
      demandIndex: 40,
      lastUpdated: '2024-12-01'
    },
    'Southern Colorado': {
      baseMultiplier: 0.8,
      competitorCount: 6,
      disasterDeclaration: false,
      primaryHazards: ['wildfire', 'hail'],
      populationDensity: 'rural',
      avgContractorBudget: 300,
      demandIndex: 35,
      lastUpdated: '2024-12-01'
    }
  },
  
  WA: {
    'Seattle Metro': {
      baseMultiplier: 1.1,
      competitorCount: 28,
      disasterDeclaration: false,
      primaryHazards: ['earthquake', 'flood', 'severe_storm'],
      populationDensity: 'urban',
      avgContractorBudget: 750,
      demandIndex: 68,
      lastUpdated: '2024-12-01'
    },
    'Tacoma Area': {
      baseMultiplier: 1.0,
      competitorCount: 16,
      disasterDeclaration: false,
      primaryHazards: ['earthquake', 'flood'],
      populationDensity: 'suburban',
      avgContractorBudget: 550,
      demandIndex: 55,
      lastUpdated: '2024-12-01'
    },
    'Vancouver Area': {
      baseMultiplier: 0.95,
      competitorCount: 10,
      disasterDeclaration: false,
      primaryHazards: ['flood', 'wildfire'],
      populationDensity: 'suburban',
      avgContractorBudget: 450,
      demandIndex: 48,
      lastUpdated: '2024-12-01'
    },
    'Spokane Area': {
      baseMultiplier: 0.85,
      competitorCount: 12,
      disasterDeclaration: false,
      primaryHazards: ['wildfire', 'severe_storm'],
      populationDensity: 'suburban',
      avgContractorBudget: 400,
      demandIndex: 42,
      lastUpdated: '2024-12-01'
    },
    'Central Washington': {
      baseMultiplier: 0.75,
      competitorCount: 6,
      disasterDeclaration: false,
      primaryHazards: ['wildfire', 'flood'],
      populationDensity: 'rural',
      avgContractorBudget: 300,
      demandIndex: 32,
      lastUpdated: '2024-12-01'
    }
  },
  
  NY: {
    'New York City': {
      baseMultiplier: 1.1,
      competitorCount: 65,
      disasterDeclaration: false,
      primaryHazards: ['hurricane', 'flood', 'severe_storm'],
      populationDensity: 'urban',
      avgContractorBudget: 950,
      demandIndex: 72,
      lastUpdated: '2024-12-01'
    },
    'Long Island': {
      baseMultiplier: 1.15,
      competitorCount: 32,
      disasterDeclaration: false,
      primaryHazards: ['hurricane', 'flood'],
      populationDensity: 'suburban',
      avgContractorBudget: 800,
      demandIndex: 70,
      lastUpdated: '2024-12-01'
    },
    'Hudson Valley': {
      baseMultiplier: 0.95,
      competitorCount: 18,
      disasterDeclaration: false,
      primaryHazards: ['flood', 'severe_storm'],
      populationDensity: 'suburban',
      avgContractorBudget: 600,
      demandIndex: 55,
      lastUpdated: '2024-12-01'
    },
    'Buffalo Area': {
      baseMultiplier: 0.85,
      competitorCount: 14,
      disasterDeclaration: false,
      primaryHazards: ['severe_storm', 'flood'],
      populationDensity: 'suburban',
      avgContractorBudget: 450,
      demandIndex: 45,
      lastUpdated: '2024-12-01'
    },
    'Rochester-Syracuse': {
      baseMultiplier: 0.8,
      competitorCount: 12,
      disasterDeclaration: false,
      primaryHazards: ['severe_storm', 'flood'],
      populationDensity: 'suburban',
      avgContractorBudget: 400,
      demandIndex: 42,
      lastUpdated: '2024-12-01'
    }
  },
  
  MO: {
    'Kansas City Metro': {
      baseMultiplier: 1.2,
      competitorCount: 24,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'hail', 'severe_storm'],
      populationDensity: 'urban',
      avgContractorBudget: 650,
      demandIndex: 72,
      lastUpdated: '2024-12-01'
    },
    'St. Louis Metro': {
      baseMultiplier: 1.2,
      competitorCount: 28,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'severe_storm', 'flood'],
      populationDensity: 'urban',
      avgContractorBudget: 700,
      demandIndex: 75,
      lastUpdated: '2024-12-01'
    },
    'Springfield Area': {
      baseMultiplier: 0.9,
      competitorCount: 10,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'severe_storm'],
      populationDensity: 'suburban',
      avgContractorBudget: 400,
      demandIndex: 48,
      lastUpdated: '2024-12-01'
    },
    'Central Missouri': {
      baseMultiplier: 0.8,
      competitorCount: 8,
      disasterDeclaration: false,
      primaryHazards: ['tornado', 'flood'],
      populationDensity: 'rural',
      avgContractorBudget: 350,
      demandIndex: 40,
      lastUpdated: '2024-12-01'
    }
  },
  
  VA: {
    'Northern Virginia': {
      baseMultiplier: 1.05,
      competitorCount: 28,
      disasterDeclaration: false,
      primaryHazards: ['hurricane', 'flood', 'severe_storm'],
      populationDensity: 'urban',
      avgContractorBudget: 750,
      demandIndex: 62,
      lastUpdated: '2024-12-01'
    },
    'Richmond Area': {
      baseMultiplier: 0.95,
      competitorCount: 18,
      disasterDeclaration: false,
      primaryHazards: ['hurricane', 'tornado'],
      populationDensity: 'suburban',
      avgContractorBudget: 550,
      demandIndex: 52,
      lastUpdated: '2024-12-01'
    },
    'Hampton Roads': {
      baseMultiplier: 1.1,
      competitorCount: 22,
      disasterDeclaration: false,
      primaryHazards: ['hurricane', 'flood'],
      populationDensity: 'urban',
      avgContractorBudget: 650,
      demandIndex: 65,
      lastUpdated: '2024-12-01'
    },
    'Southwest Virginia': {
      baseMultiplier: 0.8,
      competitorCount: 8,
      disasterDeclaration: false,
      primaryHazards: ['flood', 'severe_storm'],
      populationDensity: 'rural',
      avgContractorBudget: 350,
      demandIndex: 38,
      lastUpdated: '2024-12-01'
    }
  }
};

export const BASE_CPC_BY_TRADE: Record<string, number> = {
  roofer: 4.50,
  roofing: 4.50,
  general_contractor: 3.75,
  remodeler: 3.25,
  electrician: 3.50,
  plumber: 3.00,
  plumbing: 3.00,
  hvac: 3.25,
  restoration: 3.50,
  public_adjuster: 8.00,
  insurance_attorney: 12.00,
  attorney: 12.00,
  organization: 2.50
};

export function getRegionDemand(state: string, region: string): RegionDemandFactor | null {
  return REGIONAL_DEMAND_DATA[state]?.[region] || null;
}

export function getBaseCpcForTrade(tradeType: string): number {
  return BASE_CPC_BY_TRADE[tradeType.toLowerCase()] || 4.00;
}

export function getAllDisasterRegions(): { state: string; region: string; hazards: string[] }[] {
  const results: { state: string; region: string; hazards: string[] }[] = [];
  
  for (const [state, regions] of Object.entries(REGIONAL_DEMAND_DATA)) {
    for (const [region, data] of Object.entries(regions)) {
      if (data.disasterDeclaration) {
        results.push({ state, region, hazards: data.primaryHazards });
      }
    }
  }
  
  return results;
}
