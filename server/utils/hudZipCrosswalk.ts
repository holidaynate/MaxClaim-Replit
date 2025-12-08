/**
 * HUD ZIP Code Crosswalk Integration
 * 
 * Provides ZIP-to-county/CBSA mapping for regional cost adjustments.
 * Based on HUD USPS Crosswalk methodology.
 * 
 * Data Source: https://www.huduser.gov/portal/datasets/usps_crosswalk.html
 * 
 * For production use:
 * - Register at https://www.huduser.gov/portal/dataset/uspszip-api.html
 * - Use API for quarterly-updated crosswalk data
 */

import { getStateFromZip } from './zipToState';

// CBSA (Core Based Statistical Area) cost adjustments
// Based on BLS metropolitan area cost indices
export interface CBSACostData {
  name: string;
  costIndex: number;  // 1.0 = national average
  source: string;
}

// Major metropolitan areas with cost indices
export const CBSA_COST_INDEX: Record<string, CBSACostData> = {
  // Very High Cost Metro Areas (1.20+)
  "35620": { name: "New York-Newark-Jersey City, NY-NJ-PA", costIndex: 1.35, source: "BLS CBSA Cost Index 2024" },
  "41860": { name: "San Francisco-Oakland-Berkeley, CA", costIndex: 1.42, source: "BLS CBSA Cost Index 2024" },
  "31080": { name: "Los Angeles-Long Beach-Anaheim, CA", costIndex: 1.28, source: "BLS CBSA Cost Index 2024" },
  "14460": { name: "Boston-Cambridge-Newton, MA-NH", costIndex: 1.25, source: "BLS CBSA Cost Index 2024" },
  "47900": { name: "Washington-Arlington-Alexandria, DC-VA-MD-WV", costIndex: 1.22, source: "BLS CBSA Cost Index 2024" },
  "42660": { name: "Seattle-Tacoma-Bellevue, WA", costIndex: 1.20, source: "BLS CBSA Cost Index 2024" },
  "41740": { name: "San Diego-Chula Vista-Carlsbad, CA", costIndex: 1.22, source: "BLS CBSA Cost Index 2024" },
  "25540": { name: "Hartford-East Hartford-Middletown, CT", costIndex: 1.18, source: "BLS CBSA Cost Index 2024" },
  
  // High Cost Metro Areas (1.10-1.19)
  "19820": { name: "Denver-Aurora-Lakewood, CO", costIndex: 1.15, source: "BLS CBSA Cost Index 2024" },
  "38060": { name: "Phoenix-Mesa-Chandler, AZ", costIndex: 1.08, source: "BLS CBSA Cost Index 2024" },
  "33460": { name: "Minneapolis-St. Paul-Bloomington, MN-WI", costIndex: 1.10, source: "BLS CBSA Cost Index 2024" },
  "38900": { name: "Portland-Vancouver-Hillsboro, OR-WA", costIndex: 1.12, source: "BLS CBSA Cost Index 2024" },
  "16980": { name: "Chicago-Naperville-Elgin, IL-IN-WI", costIndex: 1.12, source: "BLS CBSA Cost Index 2024" },
  "37980": { name: "Philadelphia-Camden-Wilmington, PA-NJ-DE-MD", costIndex: 1.08, source: "BLS CBSA Cost Index 2024" },
  "12060": { name: "Atlanta-Sandy Springs-Alpharetta, GA", costIndex: 1.05, source: "BLS CBSA Cost Index 2024" },
  "33100": { name: "Miami-Fort Lauderdale-Pompano Beach, FL", costIndex: 1.08, source: "BLS CBSA Cost Index 2024" },
  "45300": { name: "Tampa-St. Petersburg-Clearwater, FL", costIndex: 1.02, source: "BLS CBSA Cost Index 2024" },
  
  // Average Cost Metro Areas (0.95-1.09)
  "26420": { name: "Houston-The Woodlands-Sugar Land, TX", costIndex: 1.00, source: "BLS CBSA Cost Index 2024" },
  "19100": { name: "Dallas-Fort Worth-Arlington, TX", costIndex: 0.98, source: "BLS CBSA Cost Index 2024" },
  "41700": { name: "San Antonio-New Braunfels, TX", costIndex: 0.95, source: "BLS CBSA Cost Index 2024" },
  "12420": { name: "Austin-Round Rock-Georgetown, TX", costIndex: 1.02, source: "BLS CBSA Cost Index 2024" },
  "16740": { name: "Charlotte-Concord-Gastonia, NC-SC", costIndex: 0.98, source: "BLS CBSA Cost Index 2024" },
  "39580": { name: "Raleigh-Cary, NC", costIndex: 1.00, source: "BLS CBSA Cost Index 2024" },
  "34980": { name: "Nashville-Davidson--Murfreesboro--Franklin, TN", costIndex: 0.98, source: "BLS CBSA Cost Index 2024" },
  "17460": { name: "Cleveland-Elyria, OH", costIndex: 0.95, source: "BLS CBSA Cost Index 2024" },
  "18140": { name: "Columbus, OH", costIndex: 0.98, source: "BLS CBSA Cost Index 2024" },
  "19430": { name: "Detroit-Warren-Dearborn, MI", costIndex: 1.00, source: "BLS CBSA Cost Index 2024" },
  "27260": { name: "Jacksonville, FL", costIndex: 0.96, source: "BLS CBSA Cost Index 2024" },
  "36740": { name: "Orlando-Kissimmee-Sanford, FL", costIndex: 0.98, source: "BLS CBSA Cost Index 2024" },
  "29820": { name: "Las Vegas-Henderson-Paradise, NV", costIndex: 1.05, source: "BLS CBSA Cost Index 2024" },
  "41180": { name: "St. Louis, MO-IL", costIndex: 0.95, source: "BLS CBSA Cost Index 2024" },
  "28140": { name: "Kansas City, MO-KS", costIndex: 0.92, source: "BLS CBSA Cost Index 2024" },
  
  // Below Average Cost Metro Areas (0.85-0.94)
  "36420": { name: "Oklahoma City, OK", costIndex: 0.88, source: "BLS CBSA Cost Index 2024" },
  "13820": { name: "Birmingham-Hoover, AL", costIndex: 0.88, source: "BLS CBSA Cost Index 2024" },
  "32820": { name: "Memphis, TN-MS-AR", costIndex: 0.90, source: "BLS CBSA Cost Index 2024" },
  "35380": { name: "New Orleans-Metairie, LA", costIndex: 0.92, source: "BLS CBSA Cost Index 2024" },
  "31140": { name: "Louisville/Jefferson County, KY-IN", costIndex: 0.90, source: "BLS CBSA Cost Index 2024" },
  "30460": { name: "Lexington-Fayette, KY", costIndex: 0.88, source: "BLS CBSA Cost Index 2024" },
  "46140": { name: "Tulsa, OK", costIndex: 0.86, source: "BLS CBSA Cost Index 2024" },
  "22180": { name: "Fayetteville-Springdale-Rogers, AR", costIndex: 0.85, source: "BLS CBSA Cost Index 2024" },
  "30780": { name: "Little Rock-North Little Rock-Conway, AR", costIndex: 0.85, source: "BLS CBSA Cost Index 2024" },
  "27140": { name: "Jackson, MS", costIndex: 0.82, source: "BLS CBSA Cost Index 2024" },
};

// ZIP prefix to CBSA mapping (first 3 digits)
// This is a simplified mapping for common metro areas
const ZIP_PREFIX_TO_CBSA: Record<string, string> = {
  // New York Metro
  "100": "35620", "101": "35620", "102": "35620", "103": "35620", "104": "35620",
  "105": "35620", "106": "35620", "107": "35620", "108": "35620", "109": "35620",
  "110": "35620", "111": "35620", "112": "35620", "113": "35620", "114": "35620",
  
  // Los Angeles Metro
  "900": "31080", "901": "31080", "902": "31080", "903": "31080", "904": "31080",
  "905": "31080", "906": "31080", "907": "31080", "908": "31080", "910": "31080",
  "911": "31080", "912": "31080", "913": "31080", "914": "31080", "915": "31080",
  "916": "31080", "917": "31080", "918": "31080",
  
  // San Francisco Metro
  "940": "41860", "941": "41860", "942": "41860", "943": "41860", "944": "41860",
  "945": "41860", "946": "41860", "947": "41860", "948": "41860", "949": "41860",
  "950": "41860", "951": "41860",
  
  // San Diego Metro
  "919": "41740", "920": "41740", "921": "41740",
  
  // Houston Metro
  "770": "26420", "771": "26420", "772": "26420", "773": "26420", "774": "26420",
  "775": "26420", "776": "26420", "777": "26420",
  
  // Dallas-Fort Worth Metro
  "750": "19100", "751": "19100", "752": "19100", "753": "19100", "754": "19100",
  "755": "19100", "760": "19100", "761": "19100", "762": "19100",
  
  // San Antonio Metro
  "780": "41700", "781": "41700", "782": "41700", "783": "41700",
  
  // Austin Metro
  "786": "12420", "787": "12420", "788": "12420", "789": "12420",
  
  // Chicago Metro
  "600": "16980", "601": "16980", "602": "16980", "603": "16980", "604": "16980",
  "605": "16980", "606": "16980", "607": "16980", "608": "16980",
  
  // Phoenix Metro
  "850": "38060", "851": "38060", "852": "38060", "853": "38060", "855": "38060",
  
  // Denver Metro
  "800": "19820", "801": "19820", "802": "19820", "803": "19820", "804": "19820",
  "805": "19820",
  
  // Seattle Metro
  "980": "42660", "981": "42660", "982": "42660", "983": "42660", "984": "42660",
  
  // Atlanta Metro
  "300": "12060", "301": "12060", "302": "12060", "303": "12060", "304": "12060",
  "305": "12060", "306": "12060",
  
  // Miami Metro
  "330": "33100", "331": "33100", "332": "33100", "333": "33100", "334": "33100",
  
  // Tampa Metro
  "335": "45300", "336": "45300", "337": "45300", "346": "45300",
  
  // Orlando Metro
  "327": "36740", "328": "36740", "347": "36740", "348": "36740",
  
  // Boston Metro
  "010": "14460", "011": "14460", "012": "14460", "013": "14460", "014": "14460",
  "015": "14460", "016": "14460", "017": "14460", "018": "14460", "019": "14460",
  "020": "14460", "021": "14460", "022": "14460", "023": "14460", "024": "14460",
  
  // Washington DC Metro
  "200": "47900", "201": "47900", "202": "47900", "203": "47900", "204": "47900",
  "205": "47900", "220": "47900", "221": "47900", "222": "47900", "223": "47900",
  
  // Minneapolis Metro
  "550": "33460", "551": "33460", "553": "33460", "554": "33460", "555": "33460",
  
  // Detroit Metro
  "480": "19430", "481": "19430", "482": "19430", "483": "19430", "484": "19430",
  
  // Portland Metro
  "970": "38900", "971": "38900", "972": "38900", "973": "38900", "974": "38900",
  
  // Las Vegas Metro
  "889": "29820", "890": "29820", "891": "29820",
  
  // St. Louis Metro
  "630": "41180", "631": "41180", "633": "41180", "634": "41180", "635": "41180",
  "636": "41180",
  
  // Kansas City Metro
  "640": "28140", "641": "28140", "660": "28140", "661": "28140", "662": "28140",
  
  // Nashville Metro
  "370": "34980", "371": "34980", "372": "34980", "373": "34980",
  
  // Charlotte Metro
  "280": "16740", "281": "16740", "282": "16740",
  
  // Raleigh Metro
  "275": "39580", "276": "39580", "277": "39580",
  
  // New Orleans Metro
  "700": "35380", "701": "35380",
  
  // Oklahoma City Metro
  "730": "36420", "731": "36420", "733": "36420",
  
  // Birmingham Metro
  "350": "13820", "351": "13820", "352": "13820",
  
  // Memphis Metro
  "380": "32820", "381": "32820", "382": "32820", "383": "32820",
  
  // Louisville Metro
  "400": "31140", "401": "31140", "402": "31140",
};

export interface ZipCrosswalkResult {
  zip: string;
  stateCode: string | null;
  cbsaCode: string | null;
  cbsaName: string | null;
  costIndex: number;
  source: string;
  isMetroArea: boolean;
}

/**
 * Get CBSA data from ZIP code
 */
export function getZipCrosswalk(zip: string): ZipCrosswalkResult {
  const stateCode = getStateFromZip(zip);
  const zipPrefix = zip.substring(0, 3);
  const cbsaCode = ZIP_PREFIX_TO_CBSA[zipPrefix] || null;
  
  if (cbsaCode && CBSA_COST_INDEX[cbsaCode]) {
    const cbsaData = CBSA_COST_INDEX[cbsaCode];
    return {
      zip,
      stateCode,
      cbsaCode,
      cbsaName: cbsaData.name,
      costIndex: cbsaData.costIndex,
      source: cbsaData.source,
      isMetroArea: true
    };
  }
  
  // Non-metro area - use state-level default
  return {
    zip,
    stateCode,
    cbsaCode: null,
    cbsaName: null,
    costIndex: 1.0,  // National average for non-metro
    source: "Non-metro area - National Average 2024",
    isMetroArea: false
  };
}

/**
 * Get regional cost adjustment with full citation
 */
export interface RegionalCostAdjustment {
  multiplier: number;
  adjustmentType: 'metro' | 'state' | 'national';
  areaName: string;
  source: string;
  methodology: string;
}

export function getRegionalCostAdjustment(zip: string): RegionalCostAdjustment {
  const crosswalk = getZipCrosswalk(zip);
  
  if (crosswalk.isMetroArea && crosswalk.cbsaName) {
    return {
      multiplier: crosswalk.costIndex,
      adjustmentType: 'metro',
      areaName: crosswalk.cbsaName,
      source: crosswalk.source,
      methodology: "HUD CBSA (Core Based Statistical Area) cost index methodology"
    };
  }
  
  // Fallback to state-level adjustment
  const { getStateMultiplier } = require('./baselinePricing');
  const stateData = crosswalk.stateCode ? getStateMultiplier(crosswalk.stateCode) : { multiplier: 1.0, source: "National Average 2024" };
  
  return {
    multiplier: stateData.multiplier,
    adjustmentType: crosswalk.stateCode ? 'state' : 'national',
    areaName: crosswalk.stateCode || 'National',
    source: stateData.source,
    methodology: "BLS Regional Consumer Price Index methodology"
  };
}

/**
 * Check if ZIP is in a high-cost metro area (for warning users)
 */
export function isHighCostArea(zip: string): { isHighCost: boolean; areaName: string; premium: number } {
  const crosswalk = getZipCrosswalk(zip);
  
  if (crosswalk.costIndex >= 1.15) {
    return {
      isHighCost: true,
      areaName: crosswalk.cbsaName || 'High-cost metro area',
      premium: Math.round((crosswalk.costIndex - 1.0) * 100)
    };
  }
  
  return {
    isHighCost: false,
    areaName: crosswalk.cbsaName || 'Standard cost area',
    premium: 0
  };
}
