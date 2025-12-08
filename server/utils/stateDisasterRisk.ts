export type DisasterRiskTier = "critical" | "high" | "moderate" | "low";

export type HazardType = "tornado" | "hurricane" | "wildfire" | "earthquake" | "flood" | "severe_storm" | "hail";

export interface StateRiskProfile {
  tier: DisasterRiskTier;
  hazards: HazardType[];
  femaRegion: number;
  notes?: string;
}

export const STATE_RISK_PROFILES: Record<string, StateRiskProfile> = {
  TX: { tier: "critical", hazards: ["severe_storm", "hurricane", "flood", "hail", "tornado"], femaRegion: 6, notes: "84 billion-dollar disasters (1980-2024)" },
  FL: { tier: "critical", hazards: ["hurricane", "flood", "severe_storm"], femaRegion: 4, notes: "Top coastal disaster state" },
  CA: { tier: "critical", hazards: ["wildfire", "flood", "earthquake", "severe_storm"], femaRegion: 9, notes: "4th highest disaster losses" },
  OK: { tier: "critical", hazards: ["tornado", "severe_storm", "hail", "flood"], femaRegion: 6, notes: "48 billion-dollar disasters" },
  MS: { tier: "critical", hazards: ["flood", "hurricane", "severe_storm", "tornado"], femaRegion: 4, notes: "Ranked #1 most disaster-prone state" },
  IL: { tier: "critical", hazards: ["severe_storm", "tornado", "flood"], femaRegion: 5, notes: "52 billion-dollar disasters" },
  
  MO: { tier: "high", hazards: ["severe_storm", "tornado", "flood"], femaRegion: 7, notes: "51 billion-dollar disasters" },
  VA: { tier: "high", hazards: ["hurricane", "severe_storm", "flood"], femaRegion: 3 },
  GA: { tier: "high", hazards: ["severe_storm", "tornado", "hurricane"], femaRegion: 4 },
  NC: { tier: "high", hazards: ["hurricane", "severe_storm", "flood"], femaRegion: 4 },
  SC: { tier: "high", hazards: ["hurricane", "severe_storm", "flood"], femaRegion: 4 },
  KS: { tier: "high", hazards: ["tornado", "severe_storm", "hail"], femaRegion: 7, notes: "Tornado alley" },
  PA: { tier: "high", hazards: ["severe_storm", "flood"], femaRegion: 3 },
  TN: { tier: "high", hazards: ["severe_storm", "tornado", "flood"], femaRegion: 4 },
  AL: { tier: "high", hazards: ["severe_storm", "tornado", "hurricane"], femaRegion: 4, notes: "High tornado activity" },
  CO: { tier: "high", hazards: ["severe_storm", "wildfire", "hail"], femaRegion: 8, notes: "Mountain weather" },
  NY: { tier: "high", hazards: ["severe_storm", "flood", "hurricane"], femaRegion: 2 },
  WA: { tier: "high", hazards: ["wildfire", "earthquake", "flood"], femaRegion: 10 },
  LA: { tier: "high", hazards: ["hurricane", "flood", "severe_storm"], femaRegion: 6 },
  AR: { tier: "high", hazards: ["severe_storm", "tornado", "flood"], femaRegion: 6, notes: "Tornado & flood corridor" },
  KY: { tier: "high", hazards: ["severe_storm", "flood", "tornado"], femaRegion: 4, notes: "Storm + flood corridor" },
  
  IN: { tier: "moderate", hazards: ["severe_storm", "tornado", "flood"], femaRegion: 5, notes: "Midwest standard" },
  OH: { tier: "moderate", hazards: ["severe_storm", "tornado", "flood"], femaRegion: 5 },
  MI: { tier: "moderate", hazards: ["severe_storm", "flood"], femaRegion: 5 },
  MN: { tier: "moderate", hazards: ["severe_storm", "flood", "tornado"], femaRegion: 5 },
  WI: { tier: "moderate", hazards: ["severe_storm", "flood"], femaRegion: 5 },
  OR: { tier: "moderate", hazards: ["wildfire", "flood", "earthquake"], femaRegion: 10, notes: "Fire-prone" },
  NV: { tier: "moderate", hazards: ["wildfire", "flood"], femaRegion: 9 },
  NM: { tier: "moderate", hazards: ["wildfire", "flood"], femaRegion: 6, notes: "Fire-prone southwest" },
  MT: { tier: "moderate", hazards: ["wildfire", "flood"], femaRegion: 8, notes: "Mountain fire risk" },
  ID: { tier: "moderate", hazards: ["wildfire", "earthquake", "flood"], femaRegion: 10, notes: "Mountain fire risk" },
  WY: { tier: "moderate", hazards: ["wildfire", "severe_storm"], femaRegion: 8 },
  UT: { tier: "moderate", hazards: ["wildfire", "earthquake", "flood"], femaRegion: 8 },
  AZ: { tier: "moderate", hazards: ["wildfire", "flood"], femaRegion: 9, notes: "Fire-prone southwest" },
  IA: { tier: "moderate", hazards: ["severe_storm", "flood", "tornado"], femaRegion: 7, notes: "Flood plains" },
  NE: { tier: "moderate", hazards: ["tornado", "severe_storm", "hail"], femaRegion: 7 },
  SD: { tier: "moderate", hazards: ["severe_storm", "tornado", "flood"], femaRegion: 8 },
  ND: { tier: "moderate", hazards: ["severe_storm", "flood"], femaRegion: 8 },
  AK: { tier: "moderate", hazards: ["earthquake", "flood"], femaRegion: 10, notes: "Unique seismic risk" },
  HI: { tier: "moderate", hazards: ["earthquake", "hurricane", "flood"], femaRegion: 9, notes: "Island-specific" },
  WV: { tier: "moderate", hazards: ["flood", "severe_storm"], femaRegion: 3 },
  
  ME: { tier: "low", hazards: ["severe_storm", "flood"], femaRegion: 1 },
  NH: { tier: "low", hazards: ["severe_storm", "flood"], femaRegion: 1 },
  VT: { tier: "low", hazards: ["severe_storm", "flood"], femaRegion: 1 },
  MA: { tier: "low", hazards: ["severe_storm", "flood"], femaRegion: 1 },
  CT: { tier: "low", hazards: ["severe_storm", "flood"], femaRegion: 1 },
  RI: { tier: "low", hazards: ["severe_storm", "flood"], femaRegion: 1 },
  NJ: { tier: "low", hazards: ["severe_storm", "flood", "hurricane"], femaRegion: 2 },
  DE: { tier: "low", hazards: ["severe_storm", "hurricane", "flood"], femaRegion: 3, notes: "Mid-Atlantic" },
  MD: { tier: "low", hazards: ["severe_storm", "flood", "hurricane"], femaRegion: 3 },
  DC: { tier: "low", hazards: ["severe_storm", "flood"], femaRegion: 3 },
};

export function getStateRiskProfile(state: string): StateRiskProfile | null {
  return STATE_RISK_PROFILES[state.toUpperCase()] || null;
}

export function getStateDisasterTier(state: string): DisasterRiskTier | null {
  const profile = getStateRiskProfile(state);
  return profile?.tier || null;
}

export function getStatePrimaryHazards(state: string): HazardType[] {
  const profile = getStateRiskProfile(state);
  return profile?.hazards || [];
}

export function getStateFemaRegion(state: string): number | null {
  const profile = getStateRiskProfile(state);
  return profile?.femaRegion || null;
}

export function getStatesByRiskTier(tier: DisasterRiskTier): string[] {
  return Object.entries(STATE_RISK_PROFILES)
    .filter(([_, profile]) => profile.tier === tier)
    .map(([state, _]) => state);
}

export function getPriorityWeight(tier: DisasterRiskTier): number {
  switch (tier) {
    case "critical": return 4;
    case "high": return 3;
    case "moderate": return 2;
    case "low": return 1;
    default: return 1;
  }
}

export const FEMA_REGIONS: Record<number, { name: string; states: string[]; hq: string }> = {
  1: { name: "Region 1 - New England", states: ["CT", "ME", "MA", "NH", "RI", "VT"], hq: "Boston, MA" },
  2: { name: "Region 2 - Mid-Atlantic", states: ["NJ", "NY", "PR", "VI"], hq: "New York, NY" },
  3: { name: "Region 3 - Mid-Atlantic", states: ["DC", "DE", "MD", "PA", "VA", "WV"], hq: "Philadelphia, PA" },
  4: { name: "Region 4 - Southeast", states: ["AL", "FL", "GA", "KY", "MS", "NC", "SC", "TN"], hq: "Atlanta, GA" },
  5: { name: "Region 5 - Midwest", states: ["IL", "IN", "MI", "MN", "OH", "WI"], hq: "Chicago, IL" },
  6: { name: "Region 6 - South Central", states: ["AR", "LA", "NM", "OK", "TX"], hq: "Denton, TX" },
  7: { name: "Region 7 - Central", states: ["IA", "KS", "MO", "NE"], hq: "Kansas City, MO" },
  8: { name: "Region 8 - Mountain", states: ["CO", "MT", "ND", "SD", "UT", "WY"], hq: "Denver, CO" },
  9: { name: "Region 9 - Southwest", states: ["AZ", "CA", "HI", "NV"], hq: "Oakland, CA" },
  10: { name: "Region 10 - Northwest", states: ["AK", "ID", "OR", "WA"], hq: "Bothell, WA" },
};
