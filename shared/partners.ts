/**
 * MaxClaim Partner & Monetization System v2.0
 */

export interface PromoPartner {
  id: string;
  name: string;
  category: string;
  location: string;
  website: string;
  phone: string;
  email?: string;
  tier: 'premium' | 'standard';
  free: boolean;
  featured?: boolean;
  expiresAt: string;
}

export interface IndustryOrg {
  name: string;
  category: string;
  website: string;
  directory: string;
  contact: string;
}

export interface AdModel {
  name: string;
  suggested: number;
  min: number;
  unit: string;
  description: string;
}

export const PROMO_PARTNERS: PromoPartner[] = [
  { 
    id: 'royal-roofing',
    name: "Royal Roofing Construction", 
    category: "Roofing", 
    location: "Austin, TX",
    website: "https://royalrc.com",
    phone: "(512) 555-0100",
    email: "info@royalrc.com",
    tier: "premium",
    free: true,
    featured: true,
    expiresAt: "2026-12-31"
  },
  { 
    id: 'paint-pros',
    name: "Paint Pros Austin", 
    category: "Painting", 
    location: "Austin, TX",
    website: "https://paintprosaustin.com",
    phone: "(512) 555-0200",
    tier: "standard",
    free: true,
    expiresAt: "2026-06-30"
  },
  { 
    id: 'green-home',
    name: "Green Home Exteriors", 
    category: "Siding", 
    location: "Austin, TX",
    website: "https://greenhomeexteriors.com",
    phone: "(512) 555-0300",
    tier: "standard",
    free: true,
    expiresAt: "2026-03-31"
  }
];

export const INDUSTRY_ORGS: IndustryOrg[] = [
  { 
    name: "National Roofing Contractors Association (NRCA)", 
    category: "Roofing", 
    website: "https://www.nrca.net",
    directory: "https://www.nrca.net/roofing/contractors",
    contact: "membership@nrca.net"
  },
  { 
    name: "Roofing Contractors Association of Texas (RCAT)", 
    category: "Roofing", 
    website: "https://www.rcat.net",
    directory: "https://www.rcat.net/find-a-contractor",
    contact: "info@rcat.net"
  },
  { 
    name: "National Association of the Remodeling Industry (NARI)", 
    category: "Remodel", 
    website: "https://nari.org",
    directory: "https://www.nari.org/Find-a-Pro",
    contact: "info@nari.org"
  },
  { 
    name: "National Association of Public Insurance Adjusters (NAPIA)", 
    category: "Public Adjuster", 
    website: "https://www.napia.com",
    directory: "https://www.napia.com/find-an-adjuster",
    contact: "info@napia.com"
  }
];

export const AD_MODELS: Record<string, AdModel> = {
  CPC: { 
    name: "Cost Per Click / Lead",
    suggested: 50.00, 
    min: 15.00, 
    unit: 'per click',
    description: "Pay only when users click your ad"
  },
  AFFILIATE: { 
    name: "Affiliate Commission",
    suggested: 0.15,
    min: 0.10,
    unit: 'of job value',
    description: "Percentage of closed job value"
  },
  BANNER: { 
    name: "Monthly Banner Ad",
    suggested: 500.00, 
    min: 50.00, 
    unit: 'per month',
    description: "Fixed monthly featured placement"
  }
};

/**
 * Enforce Minimum Viable Bid (MVB)
 */
export function enforceMinBid(model: keyof typeof AD_MODELS, partnerBid: number): { validatedBid: number; message: string } {
  const rateData = AD_MODELS[model];
  if (!rateData) return { validatedBid: 0, message: "Invalid ad model" };

  if (partnerBid < rateData.min) {
    const formattedMin = model === 'AFFILIATE' 
      ? `${(rateData.min * 100).toFixed(0)}%` 
      : `$${rateData.min.toFixed(2)}`;
    
    return {
      validatedBid: rateData.min,
      message: `Bid reverted to minimum (${formattedMin}). Consider bidding higher for better visibility.`
    };
  }

  return { validatedBid: partnerBid, message: "Bid accepted" };
}

/**
 * Calculate ad rotation weight (the "weighing" mechanic)
 */
export function calculateAdWeight(model: keyof typeof AD_MODELS, partnerBid: number): number {
  const mvb = AD_MODELS[model]?.min;
  if (!mvb || mvb === 0) return 0.1;

  const weight = partnerBid / mvb;
  return Math.min(weight, 5.0);
}

/**
 * Get partners by trade/category
 */
export function getPartnersByTrade(trade: string, location: string | null = null): PromoPartner[] {
  const now = new Date();
  
  let partners = PROMO_PARTNERS.filter(p => {
    const expiresAt = new Date(p.expiresAt);
    if (expiresAt < now) return false;
    return p.category.toLowerCase().includes(trade.toLowerCase());
  });

  if (location) {
    partners = partners.filter(p => 
      p.location.toLowerCase().includes(location.toLowerCase())
    );
  }

  partners.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    if (a.tier === 'premium' && b.tier !== 'premium') return -1;
    if (a.tier !== 'premium' && b.tier === 'premium') return 1;
    return 0;
  });

  return partners;
}

/**
 * Get all active partners (not expired)
 */
export function getActivePartners(): PromoPartner[] {
  const now = new Date();
  return PROMO_PARTNERS.filter(p => new Date(p.expiresAt) >= now);
}

/**
 * Get featured partners
 */
export function getFeaturedPartners(): PromoPartner[] {
  return getActivePartners().filter(p => p.featured);
}

/**
 * Check if partner listing is expired
 */
export function isPartnerExpired(partner: PromoPartner): boolean {
  return new Date(partner.expiresAt) < new Date();
}

/**
 * Get industry organizations by category
 */
export function getOrgsByCategory(category: string): IndustryOrg[] {
  return INDUSTRY_ORGS.filter(org => 
    org.category.toLowerCase().includes(category.toLowerCase())
  );
}
