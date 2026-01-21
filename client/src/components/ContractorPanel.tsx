import { useState } from "react";
import { ExternalLink, Phone, Award, Crown, Clock, Building2, ChevronDown, ChevronUp, Globe, Users } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  PROMO_PARTNERS, 
  INDUSTRY_ORGS,
  getPartnersByTrade, 
  getActivePartners,
  isPartnerExpired,
  calculateAdWeight,
  type PromoPartner 
} from "@shared/partners";

interface ApiPartner {
  id: string;
  companyName: string;
  type: string;
  tier: string;
  contactPerson: string;
  email: string;
  phone: string;
  website?: string;
  licenseNumber?: string;
  status: string;
  priority: number;
}

interface LocalProsOrg {
  id: string;
  name: string;
  category: string;
  scope: string;
  website?: string;
  memberDirectoryUrl?: string;
  directoryUrl?: string;
  chapterMapUrl?: string;
  priority?: number;
}

interface LocalProsResponse {
  zip?: string;
  state: string;
  trade?: string;
  organizations: LocalProsOrg[];
  total: number;
  available: number;
}

interface ContractorPanelProps {
  userZip: string;
  trade?: string;
}

function selectPartnersByWeight(partners: ApiPartner[], maxDisplay: number = 3): ApiPartner[] {
  if (partners.length === 0) return [];
  if (partners.length <= maxDisplay) return partners;

  const sorted = [...partners].sort((a, b) => b.priority - a.priority);
  const topTier = sorted.slice(0, Math.min(2, maxDisplay));
  const remaining = sorted.slice(topTier.length);
  
  const numRemaining = maxDisplay - topTier.length;
  if (numRemaining > 0 && remaining.length > 0) {
    const selected: ApiPartner[] = [];
    const available = [...remaining];
    
    for (let i = 0; i < Math.min(numRemaining, available.length); i++) {
      const totalWeight = available.reduce((sum, p) => sum + p.priority, 0);
      const rand = Math.random() * totalWeight;
      let cumulative = 0;
      
      for (let j = 0; j < available.length; j++) {
        cumulative += available[j].priority;
        if (rand <= cumulative) {
          selected.push(available[j]);
          available.splice(j, 1);
          break;
        }
      }
    }
    
    return [...topTier, ...selected];
  }
  
  return topTier;
}

function selectPromoPartnersByWeight(partners: PromoPartner[], maxDisplay: number = 3): PromoPartner[] {
  if (partners.length === 0) return [];
  if (partners.length <= maxDisplay) return partners;

  const sorted = [...partners].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    if (a.tier === 'premium' && b.tier !== 'premium') return -1;
    if (a.tier !== 'premium' && b.tier === 'premium') return 1;
    return 0;
  });

  return sorted.slice(0, maxDisplay);
}

const CATEGORY_LABELS: Record<string, string> = {
  general_contractors: "Contractors",
  remodelers: "Remodelers",
  roofers: "Roofers",
  public_adjusters: "Public Adjusters",
  attorneys: "Attorneys",
  disaster_recovery: "Disaster Recovery",
  regulator: "Regulators",
  disaster: "Disaster Resources",
  licensing: "Licensing",
};

const SCOPE_LABELS: Record<string, string> = {
  national: "National",
  regional: "Regional",
  state: "State",
  local: "Local",
};

function mapTradeToCategory(trade: string): string | undefined {
  const tradeLower = trade.toLowerCase();
  if (tradeLower.includes('roof')) return 'roofers';
  if (tradeLower.includes('contractor') || tradeLower.includes('general')) return 'general_contractors';
  if (tradeLower.includes('remodel') || tradeLower.includes('kitchen') || tradeLower.includes('bath')) return 'remodelers';
  if (tradeLower.includes('adjust')) return 'public_adjusters';
  if (tradeLower.includes('attorney') || tradeLower.includes('lawyer') || tradeLower.includes('legal')) return 'attorneys';
  return undefined;
}

export default function ContractorPanel({ userZip, trade = "Roofing" }: ContractorPanelProps) {
  const [showAllOrgs, setShowAllOrgs] = useState(false);
  
  const { data: partnersData, isLoading } = useQuery<{ partners: ApiPartner[] }>({
    queryKey: ['/api/partners', userZip],
    enabled: !!userZip,
    queryFn: async () => {
      if (!userZip) return { partners: [] };
      const response = await fetch(`/api/partners?zipCode=${userZip}&status=approved`);
      if (!response.ok) throw new Error('Failed to fetch partners');
      return response.json();
    },
  });

  const { data: localProsData, isLoading: isLoadingOrgs } = useQuery<LocalProsResponse>({
    queryKey: ['/api/local-pros', userZip, trade],
    enabled: !!userZip,
    queryFn: async () => {
      if (!userZip) return { state: '', organizations: [], total: 0, available: 0 };
      const response = await fetch('/api/local-pros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zip: userZip,
          trade: mapTradeToCategory(trade),
          limit: 6,
        }),
      });
      if (!response.ok) throw new Error('Failed to fetch local pros');
      return response.json();
    },
  });

  const trackClick = useMutation({
    mutationFn: async (partnerId: string) => {
      return apiRequest('POST', `/api/partners/${partnerId}/leads`, {
        leadType: 'click',
        zipCode: userZip,
      });
    },
  });

  const apiPartners = partnersData?.partners || [];
  const displayedApiPartners = selectPartnersByWeight(apiPartners, 2);
  
  const promoPartners = getActivePartners();
  const tradePartners = getPartnersByTrade(trade, null);
  const displayedPromoPartners = selectPromoPartnersByWeight(
    tradePartners.length > 0 ? tradePartners : promoPartners, 
    3
  );

  const handlePartnerClick = (partnerId: string) => {
    trackClick.mutate(partnerId);
  };

  const localOrganizations = localProsData?.organizations || [];
  const visibleOrgs = showAllOrgs ? localOrganizations : localOrganizations.slice(0, 3);
  const hasMoreOrgs = localOrganizations.length > 3;

  const fallbackOrgs = INDUSTRY_ORGS.filter(org => 
    org.category.toLowerCase().includes(trade.toLowerCase()) ||
    org.category.toLowerCase().includes('adjuster')
  ).slice(0, 2);

  return (
    <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-slate-50" data-testid="text-contractor-panel-heading">
          Local Pros to Fix It Right
        </h3>
        {userZip && (
          <span className="text-[11px] text-slate-400" data-testid="text-contractor-zip">
            ZIP {userZip}
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-400 mb-3">
        These are independent, licensed contractors. MaxClaim is free for
        homeowners and may receive referral fees from some partners.
      </p>

      {!userZip && (
        <div className="p-6 rounded-xl border border-slate-700 bg-slate-950/70 text-center" data-testid="message-enter-zip">
          <p className="text-xs text-slate-400">
            Please enter your ZIP code above to see contractors in your area.
          </p>
        </div>
      )}

      {userZip && isLoading && (
        <div className="p-6 rounded-xl border border-slate-700 bg-slate-950/70 text-center">
          <p className="text-xs text-slate-400">Loading local contractors...</p>
        </div>
      )}

      <div className="space-y-3">
        {displayedPromoPartners.map((partner) => (
          <div
            key={partner.id}
            className={`rounded-xl border p-3 hover-elevate ${
              partner.tier === 'premium' 
                ? 'border-amber-500/30 bg-gradient-to-br from-slate-950/90 to-amber-950/20' 
                : 'border-slate-700 bg-slate-950/70'
            }`}
            data-testid={`card-promo-${partner.id}`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs font-semibold text-slate-50 truncate">
                    {partner.name}
                  </h4>
                  {partner.tier === "premium" && (
                    <Crown className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                  )}
                  {partner.featured && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex-shrink-0">
                      Featured
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {partner.category} • {partner.location}
                </p>
                {partner.free && (
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-sky-400" />
                    <span className="text-[10px] text-sky-400">
                      Free listing until {new Date(partner.expiresAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
              <Badge 
                variant="outline" 
                className={`text-[9px] px-1.5 py-0.5 flex-shrink-0 ${
                  partner.tier === 'premium' 
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' 
                    : 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                }`}
              >
                {partner.tier === 'premium' ? 'Premium' : 'Sponsored'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <a
                href={`tel:${partner.phone.replace(/\D/g, '')}`}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 text-[11px] font-semibold text-sky-300 hover:bg-sky-500/20 transition"
                data-testid={`button-call-${partner.id}`}
              >
                <Phone className="w-3 h-3" />
                Call Now
              </a>
              <a
                href={partner.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-600 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-sky-400 hover:text-sky-200 transition"
                data-testid={`button-website-${partner.id}`}
              >
                <ExternalLink className="w-3 h-3" />
                Website
              </a>
            </div>
          </div>
        ))}

        {userZip && !isLoading && displayedApiPartners.map((partner) => (
          <div
            key={partner.id}
            className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 hover-elevate"
            data-testid={`card-contractor-${partner.companyName.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs font-semibold text-slate-50 truncate">
                    {partner.companyName}
                  </h4>
                  {partner.tier === "partner" && (
                    <Award className="w-3 h-3 text-sky-400 fill-sky-400 flex-shrink-0" />
                  )}
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 bg-sky-500/10 text-sky-300 border-sky-500/20 flex-shrink-0">
                    Sponsored
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {partner.type === "contractor" ? "Licensed Contractor" : 
                   partner.type === "adjuster" ? "Public Adjuster" : "Insurance Agency"}
                  {partner.licenseNumber && ` • Lic# ${partner.licenseNumber}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <a
                href={`tel:${partner.phone.replace(/\D/g, '')}`}
                onClick={() => handlePartnerClick(partner.id)}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 text-[11px] font-semibold text-sky-300 hover:bg-sky-500/20 transition"
                data-testid={`button-call-${partner.companyName.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Phone className="w-3 h-3" />
                Call Now
              </a>
              {partner.website && (
                <a
                  href={partner.website}
                  onClick={() => handlePartnerClick(partner.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-600 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-sky-400 hover:text-sky-200 transition"
                  data-testid={`button-website-${partner.companyName.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <ExternalLink className="w-3 h-3" />
                  Website
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {(visibleOrgs.length > 0 || (!userZip && fallbackOrgs.length > 0)) && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              <h4 className="text-[11px] font-semibold text-slate-300">
                Professional Organizations
                {localProsData?.state && (
                  <span className="text-slate-500 font-normal"> in {localProsData.state}</span>
                )}
              </h4>
            </div>
            {localProsData?.available && localProsData.available > 0 && (
              <span className="text-[9px] text-slate-500" data-testid="text-org-count">
                {localProsData.total} of {localProsData.available}
              </span>
            )}
          </div>
          
          {isLoadingOrgs ? (
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/50 text-center">
              <p className="text-[10px] text-slate-400">Finding organizations...</p>
            </div>
          ) : visibleOrgs.length > 0 ? (
            <>
              <div className="space-y-2">
                {visibleOrgs.map((org) => (
                  <div
                    key={org.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5 hover-elevate"
                    data-testid={`card-org-${org.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-slate-200 truncate">{org.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 bg-slate-800/50 text-slate-400 border-slate-700">
                            {CATEGORY_LABELS[org.category] || org.category}
                          </Badge>
                          <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 bg-sky-500/10 text-sky-400 border-sky-500/20">
                            {SCOPE_LABELS[org.scope] || org.scope}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-2">
                      {org.website && (
                        <a
                          href={org.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-[9px] font-medium text-slate-300 hover:border-sky-500/50 hover:text-sky-300 transition"
                          data-testid={`button-org-website-${org.id}`}
                        >
                          <Globe className="w-2.5 h-2.5" />
                          Website
                        </a>
                      )}
                      {(org.memberDirectoryUrl || org.directoryUrl) && (
                        <a
                          href={org.memberDirectoryUrl || org.directoryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-sky-500/10 border border-sky-500/20 px-2 py-1 text-[9px] font-medium text-sky-300 hover:bg-sky-500/20 transition"
                          data-testid={`button-org-directory-${org.id}`}
                        >
                          <Users className="w-2.5 h-2.5" />
                          Find a Pro
                        </a>
                      )}
                      {org.chapterMapUrl && (
                        <a
                          href={org.chapterMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-[9px] font-medium text-slate-400 hover:border-slate-600 hover:text-slate-300 transition"
                          data-testid={`button-org-chapters-${org.id}`}
                        >
                          Local Chapters
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {hasMoreOrgs && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllOrgs(!showAllOrgs)}
                  className="w-full mt-2 h-7 text-[10px] text-slate-400 hover:text-slate-200"
                  data-testid="button-toggle-orgs"
                >
                  {showAllOrgs ? (
                    <>
                      <ChevronUp className="w-3 h-3 mr-1" />
                      Show fewer
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Show {localOrganizations.length - 3} more
                    </>
                  )}
                </Button>
              )}
            </>
          ) : fallbackOrgs.length > 0 ? (
            <div className="space-y-2">
              {fallbackOrgs.map((org, idx) => (
                <a
                  key={idx}
                  href={org.directory}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2 rounded-lg border border-slate-800 hover:border-slate-600 transition"
                  data-testid={`link-fallback-org-${idx}`}
                >
                  <p className="text-[10px] font-medium text-slate-300 truncate">{org.name}</p>
                  <p className="text-[9px] text-slate-500">Find certified professionals</p>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {userZip && (
        <div className="mt-4 p-3 rounded-lg bg-sky-500/5 border border-sky-500/10">
          <p className="text-[11px] text-slate-400">
            <span className="font-semibold text-sky-300">Contractor?</span> Join our referral network.{" "}
            <a href="#partner-with-maxclaim" className="text-sky-300 underline hover:text-sky-200">
              Learn more
            </a>
          </p>
        </div>
      )}
    </aside>
  );
}
