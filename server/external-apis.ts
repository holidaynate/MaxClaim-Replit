// External API integrations for real-world pricing data
// Free/Open APIs: FEMA, BLS (Bureau of Labor Statistics), Texas DOI

interface FEMAClaim {
  loss_year: string;
  building_payment: number;
  contents_payment: number;
  total_paid: number;
}

interface BLSInflationData {
  seriesId: string;
  year: string;
  period: string;
  value: string;
  inflationRate?: number;
}

interface TexasInsuranceComplaint {
  company: string;
  complaintCount: number;
}

// FEMA NFIP Claims API
export async function getFEMAClaimsByZip(zipCode: string): Promise<FEMAClaim[]> {
  try {
    // Properly encode OData filter query
    const params = new URLSearchParams({
      '$filter': `reportedZipcode eq '${zipCode}'`,
      '$top': '100'
    });
    
    const response = await fetch(
      `https://www.fema.gov/api/open/v2/FimaNfipClaims?${params.toString()}`,
      { 
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    );
    
    if (!response.ok) {
      console.warn(`FEMA API returned status ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    if (!data.FimaNfipClaims || !Array.isArray(data.FimaNfipClaims)) {
      return [];
    }

    return data.FimaNfipClaims.map((claim: any) => ({
      loss_year: claim.yearOfLoss || 'Unknown',
      building_payment: parseFloat(claim.amountPaidOnBuildingClaim) || 0,
      contents_payment: parseFloat(claim.amountPaidOnContentsClaim) || 0,
      total_paid: parseFloat(claim.totalBuildingInsuranceCoverage) || 0
    }));
  } catch (error) {
    console.error('Error fetching FEMA data:', error);
    return [];
  }
}

// BLS (Bureau of Labor Statistics) API - Construction Cost Index
// Series PCU238160238160: Producer Price Index for Construction
export async function getBLSInflationData(apiKey?: string): Promise<BLSInflationData[]> {
  try {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    
    const requestBody = {
      seriesid: ["PCU238160238160"], // Construction PPI
      startyear: lastYear.toString(),
      endyear: currentYear.toString(),
      ...(apiKey && { registrationkey: apiKey })
    };

    const response = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      console.warn(`BLS API returned status ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    if (data.status !== 'REQUEST_SUCCEEDED' || !data.Results?.series?.[0]?.data) {
      return [];
    }

    const seriesData = data.Results.series[0].data;
    
    return seriesData.map((point: any) => ({
      seriesId: 'PCU238160238160',
      year: point.year,
      period: point.period,
      value: point.value,
      inflationRate: parseFloat(point.value)
    }));
  } catch (error) {
    console.error('Error fetching BLS data:', error);
    return [];
  }
}

// Calculate inflation multiplier from BLS data
// Returns year-over-year change as a multiplier (e.g., 3% inflation = 1.03)
export function calculateInflationMultiplier(blsData: BLSInflationData[]): number {
  if (blsData.length < 2) {
    return 1.0; // Need at least 2 data points to calculate YoY change
  }

  // BLS data is sorted most recent first
  const currentIndex = parseFloat(blsData[0].value);
  const priorYearIndex = parseFloat(blsData[blsData.length - 1].value);
  
  if (!currentIndex || !priorYearIndex || priorYearIndex === 0) {
    return 1.0;
  }

  // Calculate year-over-year percentage change
  // Example: If index went from 300 to 309, that's (309-300)/300 = 3% = 1.03 multiplier
  const percentChange = (currentIndex - priorYearIndex) / priorYearIndex;
  const multiplier = 1.0 + percentChange;
  
  // Cap at reasonable bounds (0.8 to 1.2 = -20% to +20% annual change)
  return Math.max(0.8, Math.min(1.2, multiplier));
}

// Texas Department of Insurance - Complaint Data
// Note: Texas TDI uses Socrata platform - endpoint may require dataset ID verification
export async function getTexasInsuranceComplaints(): Promise<Map<string, number>> {
  try {
    // Try the consumer complaints dataset (verified endpoint)
    // Dataset: Consumer Complaint Information
    const response = await fetch(
      'https://data.texas.gov/resource/u2gd-6fqb.json?$limit=1000',
      {
        headers: { 
          'Accept': 'application/json',
          'X-App-Token': process.env.SOCRATA_APP_TOKEN || '' // Optional but helps with rate limits
        },
        signal: AbortSignal.timeout(5000)
      }
    );

    if (!response.ok) {
      console.warn(`Texas DOI API returned status ${response.status} - complaint data unavailable`);
      return new Map();
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      return new Map();
    }

    // Aggregate complaints by company name
    const complaintMap = new Map<string, number>();
    
    data.forEach((complaint: any) => {
      // Try different possible field names for company
      const company = complaint.company_name || complaint.companyname || complaint.insurer || 'Unknown';
      if (company && company !== 'Unknown') {
        complaintMap.set(company, (complaintMap.get(company) || 0) + 1);
      }
    });

    return complaintMap;
  } catch (error) {
    console.error('Error fetching Texas insurance complaints:', error);
    return new Map();
  }
}

// Enriched regional context combining all external data sources
export interface RegionalContext {
  zipCode: string;
  femaClaimCount: number;
  avgFEMAPayment: number;
  constructionInflation: number;
  topInsuranceComplaints: Array<{ company: string; count: number }>;
}

export async function getRegionalContext(zipCode: string, blsApiKey?: string): Promise<RegionalContext> {
  // Fetch all data sources in parallel
  const [femaClaims, blsData, txComplaints] = await Promise.all([
    getFEMAClaimsByZip(zipCode),
    getBLSInflationData(blsApiKey),
    getTexasInsuranceComplaints()
  ]);

  // Calculate FEMA statistics
  const femaClaimCount = femaClaims.length;
  const avgFEMAPayment = femaClaimCount > 0
    ? femaClaims.reduce((sum, claim) => sum + claim.building_payment + claim.contents_payment, 0) / femaClaimCount
    : 0;

  // Get inflation multiplier
  const constructionInflation = calculateInflationMultiplier(blsData);

  // Top 5 complained-about insurers
  const topInsuranceComplaints = Array.from(txComplaints.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([company, count]) => ({ company, count }));

  return {
    zipCode,
    femaClaimCount,
    avgFEMAPayment: Math.round(avgFEMAPayment * 100) / 100,
    constructionInflation: Math.round(constructionInflation * 1000) / 1000,
    topInsuranceComplaints
  };
}
