import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Check, 
  Star, 
  Zap, 
  Crown, 
  Wrench, 
  MapPin, 
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign,
  ArrowRight
} from "lucide-react";

type PlanType = "build_your_own" | "standard" | "premium" | "free";

interface RegionData {
  region: string;
  allocatedBudget: number;
  percentage: number;
  estimatedClicks: number;
  estimatedLeads: number;
  cpcRate: number;
  priority: "primary" | "secondary" | "tertiary";
}

interface RegionRecommendation {
  homeRegion: string;
  state: string;
  tradeType: string;
  planType: string;
  totalBudget: number;
  regions: RegionData[];
  communityNeed: string | null;
  activeDisasters: { state: string; region: string; hazards: string[] }[];
  suggestion: string;
  avgCpcRate: number;
  estimatedMonthlyLeads: number;
  competitivenessScore: number;
}

interface PlanSelectorCardsProps {
  zipCode: string;
  tradeType: string;
  selectedPlan: PlanType;
  onPlanSelect: (plan: PlanType) => void;
  onOpenRegionPicker?: (planType?: PlanType) => void;
}

const planConfigs: Record<PlanType, {
  title: string;
  subtitle: string;
  price: string | ((budget: number) => string);
  icon: typeof Star;
  iconColor: string;
  borderColor: string;
  bgGradient: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
  regionCount?: { adjacent: number; nonAdjacent: number };
}> = {
  build_your_own: {
    title: "Build Your Own",
    subtitle: "Full control over every aspect",
    price: (budget) => `From $${budget}/mo`,
    icon: Wrench,
    iconColor: "text-sky-400",
    borderColor: "border-sky-500/50",
    bgGradient: "from-sky-500/10 to-slate-900/80",
    features: [
      "Recommended: $200/mo to stay visible",
      "Choose your own regions",
      "Set custom budget per region",
      "Flexible CPC bidding",
      "Mix and match placements",
      "Full analytics access",
    ],
    regionCount: { adjacent: 0, nonAdjacent: 0 },
    badge: "Flexible",
  },
  standard: {
    title: "Standard",
    subtitle: "Great coverage, simple pricing",
    price: "$500/mo",
    icon: Zap,
    iconColor: "text-purple-400",
    borderColor: "border-purple-500",
    bgGradient: "from-purple-500/20 to-slate-900/80",
    features: [
      "Home region + 2 adjacent areas",
      "+ 1 non-adjacent high-demand area",
      "2x rotation priority",
      "Weekly analytics dashboard",
      "Lead notifications",
    ],
    highlight: true,
    badge: "Most Popular",
    regionCount: { adjacent: 2, nonAdjacent: 1 },
  },
  premium: {
    title: "Premium",
    subtitle: "Maximum reach and visibility",
    price: "$2,000/mo",
    icon: Crown,
    iconColor: "text-amber-400",
    borderColor: "border-amber-500/50",
    bgGradient: "from-amber-500/10 to-slate-900/80",
    features: [
      "Home region + 4 adjacent areas",
      "+ 4 non-adjacent high-demand areas",
      "4x rotation priority",
      "Real-time analytics",
      "Dedicated account manager",
      "Priority disaster response placement",
    ],
    badge: "Best Value",
    regionCount: { adjacent: 4, nonAdjacent: 4 },
  },
  free: {
    title: "Free (Trade Association)",
    subtitle: "For verified association members",
    price: "FREE",
    icon: Star,
    iconColor: "text-emerald-400",
    borderColor: "border-slate-700",
    bgGradient: "from-slate-800/50 to-slate-900/80",
    features: [
      "Basic directory listing",
      "Home region only",
      "0.5x rotation weight",
      "Monthly analytics summary",
    ],
    regionCount: { adjacent: 0, nonAdjacent: 0 },
  },
};

export function PlanSelectorCards({ 
  zipCode, 
  tradeType, 
  selectedPlan, 
  onPlanSelect,
  onOpenRegionPicker 
}: PlanSelectorCardsProps) {
  const [recommendations, setRecommendations] = useState<Record<string, RegionRecommendation>>({});

  const { data: standardRec, isLoading: loadingStandard } = useQuery<{ recommendation: RegionRecommendation }>({
    queryKey: ['/api/regions/recommend', zipCode, tradeType, 'standard'],
    queryFn: async () => {
      const res = await fetch('/api/regions/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip: zipCode, tradeType, planType: 'standard' }),
      });
      if (!res.ok) throw new Error('Failed to get recommendation');
      return res.json();
    },
    enabled: !!zipCode && !!tradeType,
    staleTime: 300000,
  });

  const { data: premiumRec, isLoading: loadingPremium } = useQuery<{ recommendation: RegionRecommendation }>({
    queryKey: ['/api/regions/recommend', zipCode, tradeType, 'premium'],
    queryFn: async () => {
      const res = await fetch('/api/regions/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip: zipCode, tradeType, planType: 'premium' }),
      });
      if (!res.ok) throw new Error('Failed to get recommendation');
      return res.json();
    },
    enabled: !!zipCode && !!tradeType,
    staleTime: 300000,
  });

  const { data: disasters } = useQuery<{ disasters: { state: string; region: string; hazards: string[] }[]; count: number }>({
    queryKey: ['/api/regions/disasters'],
    staleTime: 600000,
  });

  useEffect(() => {
    if (standardRec?.recommendation) {
      setRecommendations(prev => ({ ...prev, standard: standardRec.recommendation }));
    }
    if (premiumRec?.recommendation) {
      setRecommendations(prev => ({ ...prev, premium: premiumRec.recommendation }));
    }
  }, [standardRec, premiumRec]);

  const isLoading = loadingStandard || loadingPremium;
  const hasDisasters = (disasters?.count || 0) > 0;
  const currentStateDisaster = disasters?.disasters.find(d => 
    d.state === (standardRec?.recommendation?.state || premiumRec?.recommendation?.state)
  );

  const renderPlanCard = (planType: PlanType, config: typeof planConfigs[PlanType]) => {
    const Icon = config.icon;
    const isSelected = selectedPlan === planType;
    const rec = recommendations[planType];
    
    const priceDisplay = typeof config.price === 'function' 
      ? config.price(rec?.totalBudget || 300)
      : config.price;

    return (
      <Card
        key={planType}
        className={`relative cursor-pointer transition-all duration-200 ${
          isSelected 
            ? `${config.borderColor} border-2 shadow-lg shadow-${config.iconColor.replace('text-', '')}/20` 
            : 'border-slate-700 hover:border-slate-600'
        } bg-gradient-to-br ${config.bgGradient}`}
        onClick={() => onPlanSelect(planType)}
        data-testid={`card-plan-${planType}`}
      >
        {config.badge && (
          <Badge 
            className={`absolute -top-2.5 right-4 ${
              planType === 'standard' ? 'bg-purple-500' : 'bg-amber-500'
            } text-white border-0`}
            data-testid={`badge-plan-${planType}`}
          >
            {config.badge}
          </Badge>
        )}
        
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-slate-800/80`}>
                <Icon className={`w-5 h-5 ${config.iconColor}`} />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-100">{config.title}</CardTitle>
                <CardDescription className="text-slate-400 text-sm">
                  {config.subtitle}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xl font-bold ${planType === 'free' ? 'text-emerald-400' : 'text-slate-100'}`}>
                {priceDisplay}
              </div>
              {planType !== 'free' && rec && (
                <div className="text-xs text-slate-400">
                  ~{rec.estimatedMonthlyLeads} leads/mo
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {config.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          
          {rec && planType !== 'free' && (
            <div className="pt-3 border-t border-slate-700/50 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {rec.homeRegion}, {rec.state}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {rec.competitivenessScore}% competitive
                </span>
              </div>
              
              {rec.regions.length > 1 && (
                <div className="flex flex-wrap gap-1">
                  {rec.regions.slice(0, 3).map((r, i) => (
                    <Badge 
                      key={i}
                      variant="secondary" 
                      className="text-xs bg-slate-700/50 text-slate-300"
                    >
                      {r.region.length > 15 ? `${r.region.substring(0, 15)}...` : r.region}
                    </Badge>
                  ))}
                  {rec.regions.length > 3 && (
                    <Badge variant="secondary" className="text-xs bg-slate-700/50 text-slate-300">
                      +{rec.regions.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {planType === 'build_your_own' && onOpenRegionPicker && isSelected && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 border-sky-500/50 text-sky-400 hover:bg-sky-500/10"
              onClick={(e) => {
                e.stopPropagation();
                onOpenRegionPicker();
              }}
              data-testid="button-open-region-picker"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Configure Regions
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {isSelected && (
            <div className="flex items-center justify-center pt-2">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                <Check className="w-3 h-3 mr-1" />
                Selected
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent, planType: PlanType) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onPlanSelect(planType);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading plan options">
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-80" aria-hidden="true" />
          ))}
        </div>
        <span className="sr-only">Loading advertising plan options...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {currentStateDisaster && (
        <Card 
          className="bg-amber-500/10 border-amber-500/30"
          role="alert"
          aria-live="polite"
        >
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm text-amber-200 font-medium">
                <span className="sr-only">Warning: </span>
                Active Disaster Declaration: {currentStateDisaster.region}
              </p>
              <p className="text-xs text-amber-300/80">
                High demand for {currentStateDisaster.hazards.join(', ')} recovery services. 
                Premium placement recommended for maximum visibility.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <fieldset className="border-0 p-0 m-0">
        <legend className="sr-only">Select your advertising plan</legend>
        <div 
          className="grid md:grid-cols-3 gap-4"
          role="radiogroup" 
          aria-label="Advertising plan options"
        >
          {(['build_your_own', 'standard', 'premium'] as const).map((planType) => {
            const config = planConfigs[planType];
            const Icon = config.icon;
            const isSelected = selectedPlan === planType;
            const rec = recommendations[planType];
            
            const priceDisplay = typeof config.price === 'function' 
              ? config.price(rec?.totalBudget || 300)
              : config.price;

            return (
              <div key={planType} className="relative">
                <input
                  type="radio"
                  id={`plan-${planType}`}
                  name="advertising-plan"
                  value={planType}
                  checked={isSelected}
                  onChange={() => onPlanSelect(planType)}
                  className="sr-only peer"
                  data-testid={`radio-plan-${planType}`}
                  aria-describedby={`plan-${planType}-description`}
                />
                <label
                  htmlFor={`plan-${planType}`}
                  className="block cursor-pointer"
                  onKeyDown={(e) => handleKeyDown(e, planType)}
                >
                  <Card
                    className={`relative transition-all duration-200 ${
                      isSelected 
                        ? `${config.borderColor} border-2 shadow-lg shadow-${config.iconColor.replace('text-', '')}/20` 
                        : 'border-slate-700 hover:border-slate-600 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2'
                    } bg-gradient-to-br ${config.bgGradient}`}
                    data-testid={`card-plan-${planType}`}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={-1}
                  >
                    {config.badge && (
                      <Badge 
                        className={`absolute -top-2.5 right-4 ${
                          planType === 'standard' ? 'bg-purple-500' : 'bg-amber-500'
                        } text-white border-0`}
                        data-testid={`badge-plan-${planType}`}
                      >
                        {config.badge}
                      </Badge>
                    )}
                    
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-slate-800/80`}>
                            <Icon className={`w-5 h-5 ${config.iconColor}`} aria-hidden="true" />
                          </div>
                          <div>
                            <CardTitle className="text-lg text-slate-100">{config.title}</CardTitle>
                            <CardDescription className="text-slate-400 text-sm" id={`plan-${planType}-description`}>
                              {config.subtitle}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-bold ${planType === 'free' ? 'text-emerald-400' : 'text-slate-100'}`}>
                            {priceDisplay}
                          </div>
                          {planType !== 'free' && rec && (
                            <div className="text-xs text-slate-400">
                              <span className="sr-only">Estimated </span>~{rec.estimatedMonthlyLeads} leads/mo
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <ul className="space-y-2" aria-label={`${config.title} plan features`}>
                        {config.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                            <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${config.iconColor}`} aria-hidden="true" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      {rec && planType !== 'free' && (
                        <div className="pt-3 border-t border-slate-700/50 space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-400 gap-2 flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" aria-hidden="true" />
                              <span className="sr-only">Home region: </span>
                              {rec.homeRegion}, {rec.state}
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" aria-hidden="true" />
                              <span className="sr-only">Competitiveness score: </span>
                              {rec.competitivenessScore}% competitive
                            </span>
                          </div>
                          
                          {rec.regions.length > 1 && (
                            <div className="flex flex-wrap gap-1" aria-label="Included regions">
                              {rec.regions.slice(0, 3).map((r, i) => (
                                <Badge 
                                  key={i}
                                  variant="secondary" 
                                  className="text-xs bg-slate-700/50 text-slate-300"
                                >
                                  {r.region.length > 15 ? `${r.region.substring(0, 15)}...` : r.region}
                                </Badge>
                              ))}
                              {rec.regions.length > 3 && (
                                <Badge variant="secondary" className="text-xs bg-slate-700/50 text-slate-300">
                                  +{rec.regions.length - 3} more regions
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {planType === 'build_your_own' && onOpenRegionPicker && isSelected && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 border-sky-500/50 text-sky-400 hover:bg-sky-500/10 min-h-[44px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onOpenRegionPicker('build_your_own');
                          }}
                          data-testid="button-open-region-picker"
                          aria-label="Configure your custom regions for the Build Your Own plan"
                        >
                          <MapPin className="w-4 h-4 mr-2" aria-hidden="true" />
                          Configure Regions
                          <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                        </Button>
                      )}

                      {(planType === 'standard' || planType === 'premium') && onOpenRegionPicker && isSelected && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={`w-full mt-2 min-h-[44px] ${
                            planType === 'standard' 
                              ? 'border-purple-500/50 text-purple-400 hover:bg-purple-500/10' 
                              : 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onOpenRegionPicker(planType);
                          }}
                          data-testid={`button-edit-regions-${planType}`}
                          aria-label={`Customize your region selections for the ${config.title} plan (${planType === 'standard' ? '3' : '8'} regions included)`}
                        >
                          <MapPin className="w-4 h-4 mr-2" aria-hidden="true" />
                          Edit Regions ({planType === 'standard' ? '3' : '8'} included)
                          <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                        </Button>
                      )}

                      {isSelected && (
                        <div className="flex items-center justify-center pt-2">
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            <Check className="w-3 h-3 mr-1" aria-hidden="true" />
                            Selected
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="pt-4 border-t border-slate-800 border-l-0 border-r-0 border-b-0 p-0 m-0">
        <legend className="sr-only">Free plan option for trade association members</legend>
        <p className="text-xs text-slate-500 mb-3 text-center" aria-hidden="true">
          Trade association members may qualify for free listing
        </p>
        <div className="max-w-md mx-auto opacity-75 hover:opacity-100 transition-opacity">
          {(() => {
            const planType = 'free' as const;
            const config = planConfigs[planType];
            const Icon = config.icon;
            const isSelected = selectedPlan === planType;

            return (
              <div className="relative">
                <input
                  type="radio"
                  id={`plan-${planType}`}
                  name="advertising-plan"
                  value={planType}
                  checked={isSelected}
                  onChange={() => onPlanSelect(planType)}
                  className="sr-only peer"
                  data-testid={`radio-plan-${planType}`}
                  aria-describedby={`plan-${planType}-description`}
                />
                <label
                  htmlFor={`plan-${planType}`}
                  className="block cursor-pointer"
                  onKeyDown={(e) => handleKeyDown(e, planType)}
                >
                  <Card
                    className={`relative transition-all duration-200 ${
                      isSelected 
                        ? `${config.borderColor} border-2 shadow-lg` 
                        : 'border-slate-700 hover:border-slate-600 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2'
                    } bg-gradient-to-br ${config.bgGradient}`}
                    data-testid={`card-plan-${planType}`}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={-1}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-slate-800/80`}>
                            <Icon className={`w-5 h-5 ${config.iconColor}`} aria-hidden="true" />
                          </div>
                          <div>
                            <CardTitle className="text-lg text-slate-100">{config.title}</CardTitle>
                            <CardDescription className="text-slate-400 text-sm" id={`plan-${planType}-description`}>
                              {config.subtitle}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-emerald-400">
                            {config.price as string}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <ul className="space-y-2" aria-label="Free plan features">
                        {config.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                            <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${config.iconColor}`} aria-hidden="true" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {isSelected && (
                        <div className="flex items-center justify-center pt-2">
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            <Check className="w-3 h-3 mr-1" aria-hidden="true" />
                            Selected
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </label>
              </div>
            );
          })()}
        </div>
      </fieldset>

      {standardRec?.recommendation?.suggestion && selectedPlan === 'standard' && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-300">{standardRec.recommendation.suggestion}</p>
                {standardRec.recommendation.communityNeed && (
                  <p className="text-xs text-purple-400 mt-1">
                    {standardRec.recommendation.communityNeed}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {premiumRec?.recommendation?.suggestion && selectedPlan === 'premium' && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-300">{premiumRec.recommendation.suggestion}</p>
                {premiumRec.recommendation.communityNeed && (
                  <p className="text-xs text-amber-400 mt-1">
                    {premiumRec.recommendation.communityNeed}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
