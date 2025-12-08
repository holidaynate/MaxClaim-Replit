import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  TrendingUp, 
  DollarSign, 
  MousePointer, 
  Eye, 
  Users, 
  Target,
  Lightbulb,
  LayoutGrid,
  MapPin,
  Sparkles
} from "lucide-react";

interface PlanRecommendation {
  tier: string;
  tradeType: string;
  zipCode: string;
  state: string | null;
  riskMultiplier: number;
  recommendedMonthlyBudget: number;
  minBudget: number;
  maxBudget: number;
  recommendedCpc: number;
  minCpc: number;
  maxCpc: number;
  recommendedAffiliatePercent: number;
  minAffiliate: number;
  maxAffiliate: number;
  recommendedPlacements: {
    id: string;
    name: string;
    description: string;
    priority: number;
    estimatedImpressions: number;
    estimatedClicks: number;
    estimatedLeads: number;
  }[];
  recommendedBanners: {
    placement: string;
    sizes: { width: number; height: number; label: string; performance: string }[];
  }[];
  monthlyProjections: {
    estimatedImpressions: number;
    estimatedClicks: number;
    estimatedLeads: number;
    estimatedCost: number;
    estimatedRevenue: number;
    estimatedRoi: number;
  };
  tierFeatures: string[];
  insights: string[];
}

interface PlanBuilderStepProps {
  zipCode: string;
  tradeType: string;
  tier: "free" | "standard" | "premium";
  onRecommendationLoad?: (recommendation: PlanRecommendation) => void;
}

export function PlanBuilderStep({ zipCode, tradeType, tier, onRecommendationLoad }: PlanBuilderStepProps) {
  const { data, isLoading, error } = useQuery<{ recommendation: PlanRecommendation }>({
    queryKey: ['/api/plan-builder/recommend', zipCode, tradeType, tier],
    queryFn: async () => {
      const res = await fetch('/api/plan-builder/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCode, tradeType, tier }),
      });
      if (!res.ok) throw new Error('Failed to generate recommendations');
      return res.json();
    },
    enabled: !!zipCode && !!tradeType && !!tier,
    staleTime: 300000,
  });

  const recommendation = data?.recommendation;

  useEffect(() => {
    if (recommendation && onRecommendationLoad) {
      onRecommendationLoad(recommendation);
    }
  }, [recommendation, onRecommendationLoad]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sky-400">
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span>Generating personalized recommendations...</span>
        </div>
        <div className="grid gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-32" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  if (error || !recommendation) {
    return (
      <Card className="bg-red-500/10 border-red-500/30">
        <CardContent className="py-4">
          <p className="text-red-400">
            Unable to generate recommendations. Please go back and verify your information.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatNumber = (n: number) => n.toLocaleString();
  const formatCurrency = (n: number) => `$${n.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-sky-500/20">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Your Personalized Ad Plan</h3>
          <p className="text-sm text-slate-400">
            Based on {recommendation.state || recommendation.zipCode} market data and {tradeType.replace(/_/g, ' ')} industry benchmarks
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Market Risk</span>
              <MapPin className="w-3 h-3 text-slate-400" />
            </div>
            <div className="text-lg font-bold text-sky-400" data-testid="text-risk-multiplier">
              {recommendation.riskMultiplier}x
            </div>
            <p className="text-xs text-slate-500">Disaster exposure</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Rec. CPC</span>
              <MousePointer className="w-3 h-3 text-slate-400" />
            </div>
            <div className="text-lg font-bold text-emerald-400" data-testid="text-rec-cpc">
              {formatCurrency(recommendation.recommendedCpc)}
            </div>
            <p className="text-xs text-slate-500">${recommendation.minCpc} - ${recommendation.maxCpc}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Affiliate %</span>
              <Users className="w-3 h-3 text-slate-400" />
            </div>
            <div className="text-lg font-bold text-purple-400" data-testid="text-affiliate-percent">
              {recommendation.recommendedAffiliatePercent}%
            </div>
            <p className="text-xs text-slate-500">{recommendation.minAffiliate}% - {recommendation.maxAffiliate}%</p>
          </CardContent>
        </Card>

        {tier !== "free" && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Budget</span>
                <DollarSign className="w-3 h-3 text-slate-400" />
              </div>
              <div className="text-lg font-bold text-amber-400" data-testid="text-rec-budget">
                {formatCurrency(recommendation.recommendedMonthlyBudget)}
              </div>
              <p className="text-xs text-slate-500">/month</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" />
            Monthly Projections
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-sky-400" data-testid="text-est-impressions">
                {formatNumber(recommendation.monthlyProjections.estimatedImpressions)}
              </div>
              <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <Eye className="w-3 h-3" /> Impressions
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400" data-testid="text-est-clicks">
                {formatNumber(recommendation.monthlyProjections.estimatedClicks)}
              </div>
              <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <MousePointer className="w-3 h-3" /> Clicks
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400" data-testid="text-est-leads">
                {formatNumber(recommendation.monthlyProjections.estimatedLeads)}
              </div>
              <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <Users className="w-3 h-3" /> Leads
              </div>
            </div>
          </div>

          {tier !== "free" && recommendation.monthlyProjections.estimatedRoi > 0 && (
            <div className="pt-2 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Estimated ROI</span>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30" data-testid="badge-est-roi">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {recommendation.monthlyProjections.estimatedRoi}%
                </Badge>
              </div>
              <Progress 
                value={Math.min(recommendation.monthlyProjections.estimatedRoi, 100)} 
                className="h-1 mt-2" 
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-sky-400" />
            Recommended Placements ({recommendation.recommendedPlacements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recommendation.recommendedPlacements.map((placement) => (
              <Tooltip key={placement.id}>
                <TooltipTrigger asChild>
                  <div 
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors cursor-help"
                    data-testid={`placement-${placement.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{placement.priority}
                      </Badge>
                      <span className="text-sm text-slate-200">{placement.name}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      ~{formatNumber(placement.estimatedLeads)} leads/mo
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[200px]">
                  <p>{placement.description}</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Est. {formatNumber(placement.estimatedImpressions)} impressions
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </CardContent>
      </Card>

      {recommendation.recommendedBanners.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Recommended Banner Sizes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recommendation.recommendedBanners.flatMap(b => b.sizes).slice(0, 4).map((size, i) => (
                <Badge 
                  key={i} 
                  variant="secondary" 
                  className="bg-slate-700/50 text-slate-300"
                  data-testid={`banner-size-${i}`}
                >
                  {size.width}x{size.height} ({size.label})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-r from-purple-500/10 to-sky-500/10 border-purple-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {recommendation.insights.map((insight, i) => (
              <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                <span className="text-purple-400 mt-1">-</span>
                {insight}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
