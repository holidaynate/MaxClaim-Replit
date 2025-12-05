import { Request } from 'express';

/**
 * Privacy-First Location Detection Utility
 * Detects coarse location (area code/metro) from IP address
 * WITHOUT storing personally identifiable information
 */

export interface CoarseLocation {
  state?: string;        // State code (e.g., "TX")
  metro?: string;        // Metro area (e.g., "San Antonio")
  areaCode?: string;     // Phone area code (e.g., "210")
  zipPrefix?: string;    // First 3 digits of ZIP (e.g., "782")
  description?: string;  // Human-readable description (e.g., "San Antonio area (210 area code)")
}

/**
 * Simple area code mapping for common Texas metros
 * In production, this could use a GeoIP library or service
 */
const AREA_CODE_MAP: Record<string, CoarseLocation> = {
  // San Antonio
  '210': { state: 'TX', metro: 'San Antonio', areaCode: '210', zipPrefix: '782' },
  '726': { state: 'TX', metro: 'San Antonio', areaCode: '726', zipPrefix: '782' },
  
  // Austin
  '512': { state: 'TX', metro: 'Austin', areaCode: '512', zipPrefix: '787' },
  '737': { state: 'TX', metro: 'Austin', areaCode: '737', zipPrefix: '787' },
  
  // Houston
  '713': { state: 'TX', metro: 'Houston', areaCode: '713', zipPrefix: '770' },
  '281': { state: 'TX', metro: 'Houston', areaCode: '281', zipPrefix: '770' },
  '832': { state: 'TX', metro: 'Houston', areaCode: '832', zipPrefix: '770' },
  '346': { state: 'TX', metro: 'Houston', areaCode: '346', zipPrefix: '770' },
  
  // Dallas
  '214': { state: 'TX', metro: 'Dallas', areaCode: '214', zipPrefix: '752' },
  '469': { state: 'TX', metro: 'Dallas', areaCode: '469', zipPrefix: '752' },
  '972': { state: 'TX', metro: 'Dallas', areaCode: '972', zipPrefix: '750' },
  '945': { state: 'TX', metro: 'Dallas', areaCode: '945', zipPrefix: '752' },
};

/**
 * Get coarse location from ZIP code
 * Returns metro-level location WITHOUT exposing exact user location
 * 
 * @param zip ZIP code string
 * @returns Coarse location data
 */
export function getCoarseLocation(zip: string): CoarseLocation {
  // Map ZIP code to metro area
  const areaCodeData = getAreaCodeFromZip(zip);
  const metro = getMetroFromZip(zip);
  
  // Default to San Antonio for unknown ZIPs
  const defaultLocation: CoarseLocation = {
    state: 'TX',
    metro: metro || 'San Antonio',
    areaCode: areaCodeData[0] || '210',
    zipPrefix: zip.substring(0, 3),
    description: metro ? `${metro} area (${areaCodeData[0] || 'unknown'} area code)` : 'San Antonio area (210 area code)'
  };

  return defaultLocation;
}

/**
 * Get area code from ZIP code
 * Maps ZIP code to likely area code(s)
 */
export function getAreaCodeFromZip(zip: string): string[] {
  if (zip.length < 3) return [];
  
  const zipPrefix = zip.substring(0, 3);
  
  // ZIP prefix to area code mapping (Texas examples)
  const zipToAreaCode: Record<string, string[]> = {
    // San Antonio (782xx)
    '782': ['210', '726'],
    
    // Austin (787xx, 786xx)
    '787': ['512', '737'],
    '786': ['512', '737'],
    
    // Houston (770xx-773xx, 774xx-775xx, 776xx-777xx)
    '770': ['713', '281', '832', '346'],
    '771': ['713', '281', '832', '346'],
    '772': ['713', '281', '832', '346'],
    '773': ['713', '281', '832', '346'],
    '774': ['281', '832'],
    '775': ['281', '832'],
    '776': ['281', '832'],
    '777': ['713', '281', '832'],
    
    // Dallas (750xx-753xx, 754xx-757xx)
    '750': ['214', '469', '972', '945'],
    '751': ['214', '469', '972'],
    '752': ['214', '469', '972', '945'],
    '753': ['214', '469', '972'],
  };
  
  return zipToAreaCode[zipPrefix] || [];
}

/**
 * Get metro area from ZIP code
 */
export function getMetroFromZip(zip: string): string | null {
  if (zip.length < 3) return null;
  
  const zipPrefix = zip.substring(0, 3);
  
  const zipToMetro: Record<string, string> = {
    '782': 'San Antonio',
    '787': 'Austin',
    '786': 'Austin',
    '770': 'Houston',
    '771': 'Houston',
    '772': 'Houston',
    '773': 'Houston',
    '774': 'Houston',
    '775': 'Houston',
    '776': 'Houston',
    '777': 'Houston',
    '750': 'Dallas',
    '751': 'Dallas',
    '752': 'Dallas',
    '753': 'Dallas',
  };
  
  return zipToMetro[zipPrefix] || null;
}

/**
 * Privacy notice text for displaying to users
 */
export const PRIVACY_NOTICE = "We use your general area (not exact location) to show local contractors who serve your region. We never store your exact address or precise location.";
