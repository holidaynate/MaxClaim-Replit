import { ExternalLink, Phone, Star, Award } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Partner {
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

interface ContractorPanelProps {
  userZip: string;
}

// Weighted random selection based on priority
function selectPartnersByWeight(partners: Partner[], maxDisplay: number = 3): Partner[] {
  if (partners.length === 0) return [];
  if (partners.length <= maxDisplay) return partners;

  // Sort by priority descending
  const sorted = [...partners].sort((a, b) => b.priority - a.priority);
  
  // Always show top priority partners
  const topTier = sorted.slice(0, Math.min(2, maxDisplay));
  const remaining = sorted.slice(topTier.length);
  
  // Randomly select from remaining based on weight
  const numRemaining = maxDisplay - topTier.length;
  if (numRemaining > 0 && remaining.length > 0) {
    const selected = [];
    const available = [...remaining];
    
    for (let i = 0; i < Math.min(numRemaining, available.length); i++) {
      // Recalculate total weight for current available partners
      const totalWeight = available.reduce((sum, p) => sum + p.priority, 0);
      const rand = Math.random() * totalWeight;
      let cumulative = 0;
      
      for (let j = 0; j < available.length; j++) {
        cumulative += available[j].priority;
        if (rand <= cumulative) {
          selected.push(available[j]);
          available.splice(j, 1); // Remove selected partner
          break;
        }
      }
    }
    
    return [...topTier, ...selected];
  }
  
  return topTier;
}

export default function ContractorPanel({ userZip }: ContractorPanelProps) {
  // Query partners for this ZIP code
  const { data: partnersData, isLoading } = useQuery<{ partners: Partner[] }>({
    queryKey: ['/api/partners', userZip],
    enabled: !!userZip,
    queryFn: async () => {
      if (!userZip) return { partners: [] };
      const response = await fetch(`/api/partners?zipCode=${userZip}&status=approved`);
      if (!response.ok) throw new Error('Failed to fetch partners');
      return response.json();
    },
  });

  // Track partner lead clicks
  const trackClick = useMutation({
    mutationFn: async (partnerId: string) => {
      return apiRequest('POST', `/api/partners/${partnerId}/leads`, {
        leadType: 'click',
        zipCode: userZip,
      });
    },
  });

  const partners = partnersData?.partners || [];
  const displayedPartners = selectPartnersByWeight(partners, 3);

  const handlePartnerClick = (partnerId: string) => {
    trackClick.mutate(partnerId);
  };

  return (
    <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between mb-2">
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
        homeowners and may receive referral fees from some partners. Always
        verify licenses and insurance.
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
      {userZip && !isLoading && displayedPartners.length === 0 && (
        <div className="p-6 rounded-xl border border-slate-700 bg-slate-950/70 text-center" data-testid="message-no-contractors">
          <p className="text-xs text-slate-400">
            No contractors available in your area yet. Check back soon!
          </p>
        </div>
      )}
      <div className="space-y-3">
        {userZip && !isLoading && displayedPartners.map((partner) => (
          <div
            key={partner.id}
            className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 hover-elevate"
            data-testid={`card-contractor-${partner.companyName.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs font-semibold text-slate-50">
                    {partner.companyName}
                  </h4>
                  {partner.tier === "partner" && (
                    <Award className="w-3 h-3 text-sky-400 fill-sky-400" />
                  )}
                  <span className="inline-flex items-center rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-sky-300 border border-sky-500/20">
                    Sponsored
                  </span>
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
