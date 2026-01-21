import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MapPin, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Users,
  Check,
  Info
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface RegionDemandInfo {
  region: string;
  baseMultiplier: number;
  competitorCount: number;
  disasterDeclaration: boolean;
  primaryHazards: string[];
  populationDensity: string;
  avgContractorBudget: number;
  demandIndex: number;
}

interface AvailableRegions {
  state: string;
  homeRegion: string;
  allRegions: string[];
  adjacentRegions: string[];
  nonAdjacentRegions: string[];
}

interface RegionCostBreakdown {
  region: string;
  state: string;
  zip: string;
  tradeType: string;
  baseCpc: number;
  adjustedCpc: number;
  recommendedMonthlyBudget: {
    minimum: number;
    recommended: number;
    competitive: number;
  };
  costMultiplier: number;
  competitiveness: string;
  competitorCount: number;
  demandIndex: number;
  hasDisasterDeclaration: boolean;
  primaryHazards: string[];
  explanation: string;
}

interface RegionPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zipCode: string;
  tradeType: string;
  partnerType?: "contractor" | "adjuster" | "agency";
  selectedRegions: string[];
  onRegionsChange: (regions: string[]) => void;
  budget: number;
  onBudgetChange: (budget: number) => void;
  maxRegions?: number;
  planType?: "build_your_own" | "standard" | "premium" | "free";
}

export function RegionPickerModal({
  open,
  onOpenChange,
  zipCode,
  tradeType,
  partnerType = "contractor",
  selectedRegions,
  onRegionsChange,
  budget,
  onBudgetChange,
  maxRegions,
  planType = "build_your_own",
}: RegionPickerModalProps) {
  const minBudget = partnerType === "adjuster" ? 50 : 200;
  const recommendedBudget = 200;
  const isFixedPricePlan = planType === 'standard' || planType === 'premium';
  const [localRegions, setLocalRegions] = useState<string[]>(selectedRegions);
  const [localBudget, setLocalBudget] = useState(budget);
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  const { data: availableData, isLoading: loadingRegions } = useQuery<AvailableRegions>({
    queryKey: ['/api/regions/by-zip', zipCode],
    enabled: !!zipCode && open,
    staleTime: 300000,
  });

  const { data: demandData, isLoading: loadingDemand } = useQuery<{ state: string; regions: RegionDemandInfo[] }>({
    queryKey: ['/api/regions/demand', availableData?.state],
    enabled: !!availableData?.state && open,
    staleTime: 300000,
  });

  useEffect(() => {
    if (open) {
      setLocalRegions(selectedRegions);
      setLocalBudget(budget);
    }
  }, [open, selectedRegions, budget]);

  useEffect(() => {
    if (availableData?.homeRegion && localRegions.length === 0) {
      setLocalRegions([availableData.homeRegion]);
    }
  }, [availableData]);

  const handleRegionToggle = (region: string) => {
    if (region === availableData?.homeRegion) return;
    
    setLocalRegions(prev => {
      if (prev.includes(region)) {
        return prev.filter(r => r !== region);
      }
      if (maxRegions && prev.length >= maxRegions) {
        return prev;
      }
      return [...prev, region];
    });
  };

  const isAtMaxRegions = maxRegions ? localRegions.length >= maxRegions : false;

  const handleConfirm = () => {
    onRegionsChange(localRegions);
    onBudgetChange(Math.max(minBudget, localBudget));
    onOpenChange(false);
  };

  const handleBudgetBlur = () => {
    if (localBudget < minBudget) {
      setLocalBudget(minBudget);
    }
  };

  const getRegionDemand = (regionName: string): RegionDemandInfo | undefined => {
    return demandData?.regions.find(r => r.region === regionName);
  };

  const calculateEstimatedCost = () => {
    let totalCost = 0;
    localRegions.forEach(region => {
      const demand = getRegionDemand(region);
      if (demand) {
        totalCost += demand.avgContractorBudget * 0.5;
      } else {
        totalCost += 300;
      }
    });
    return Math.round(totalCost);
  };

  const calculateEstimatedLeads = () => {
    let totalLeads = 0;
    localRegions.forEach(region => {
      const demand = getRegionDemand(region);
      const regionBudget = localBudget / localRegions.length;
      const cpc = demand ? 4 * demand.baseMultiplier : 4;
      const clicks = regionBudget / cpc;
      const conversionRate = demand && demand.demandIndex > 70 ? 0.08 : 0.05;
      totalLeads += clicks * conversionRate;
    });
    return Math.round(totalLeads);
  };

  const isLoading = loadingRegions || loadingDemand;

  const handleRegionKeyDown = (e: React.KeyboardEvent, region: string, isHome: boolean) => {
    if (isHome) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleRegionToggle(region);
    }
  };

  const renderRegionItem = (region: string, type: 'home' | 'adjacent' | 'other') => {
    const demand = getRegionDemand(region);
    const isSelected = localRegions.includes(region);
    const isHome = type === 'home';
    const regionId = `region-${region.toLowerCase().replace(/\s+/g, '-')}`;
    const isDisabled = !isSelected && isAtMaxRegions;
    
    const demandLevelText = demand?.demandIndex 
      ? demand.demandIndex >= 80 ? 'Very High' 
        : demand.demandIndex >= 60 ? 'High' 
        : demand.demandIndex >= 40 ? 'Medium' 
        : 'Low'
      : null;
    
    return (
      <div 
        key={region}
        className={`p-3 rounded-lg border transition-all min-h-[48px] ${
          isSelected 
            ? 'border-purple-500 bg-purple-500/10' 
            : isDisabled
              ? 'border-slate-700 bg-slate-800/30 opacity-50 cursor-not-allowed'
              : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
        } ${isHome ? 'cursor-default' : isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => !isHome && !isDisabled && handleRegionToggle(region)}
        onKeyDown={(e) => !isDisabled && handleRegionKeyDown(e, region, isHome)}
        tabIndex={isHome || isDisabled ? -1 : 0}
        role={isHome ? undefined : "checkbox"}
        aria-checked={isHome ? undefined : isSelected}
        aria-disabled={isDisabled}
        aria-label={isHome 
          ? `${region} - Your home region (always included)` 
          : `${region}${type === 'adjacent' ? ' - Adjacent region' : ''}${demand?.disasterDeclaration ? ', Active disaster declaration' : ''}${demandLevelText ? `, ${demandLevelText} demand` : ''}${isDisabled ? ' - Maximum regions selected' : ''}`
        }
        data-testid={`region-item-${region.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {!isHome ? (
              <Checkbox 
                id={regionId}
                checked={isSelected}
                disabled={isDisabled}
                className="mt-1 min-w-[20px] min-h-[20px]"
                onCheckedChange={() => !isDisabled && handleRegionToggle(region)}
                tabIndex={-1}
                aria-hidden="true"
              />
            ) : (
              <div className="mt-1 w-5 h-5 min-w-[20px] min-h-[20px] rounded bg-emerald-500/20 flex items-center justify-center" aria-hidden="true">
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-slate-200">{region}</span>
                {isHome && (
                  <Badge variant="secondary" className="text-xs bg-emerald-500/20 text-emerald-400">
                    Home
                    <span className="sr-only"> region - always included</span>
                  </Badge>
                )}
                {type === 'adjacent' && (
                  <Badge variant="secondary" className="text-xs bg-sky-500/20 text-sky-400">
                    Adjacent
                    <span className="sr-only"> region - lower acquisition cost</span>
                  </Badge>
                )}
                {demand?.disasterDeclaration && (
                  <Badge className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">
                    <AlertTriangle className="w-3 h-3 mr-1" aria-hidden="true" />
                    <span>Disaster</span>
                    <span className="sr-only"> declaration active - high demand area</span>
                  </Badge>
                )}
              </div>
              
              {demand && (
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" aria-hidden="true" />
                    <span aria-label={`Demand index: ${demand.demandIndex} out of 100, ${demandLevelText}`}>
                      Demand: {demand.demandIndex}/100
                      <span className="sr-only"> ({demandLevelText})</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" aria-hidden="true" />
                    <span>{demand.competitorCount} competitors</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" aria-hidden="true" />
                    <span>${demand.avgContractorBudget}/mo avg</span>
                  </span>
                </div>
              )}
              
              {demand?.primaryHazards && demand.primaryHazards.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2" aria-label="Primary hazards in this region">
                  {demand.primaryHazards.map(hazard => (
                    <Badge 
                      key={hazard}
                      variant="outline" 
                      className="text-xs text-slate-400"
                    >
                      {hazard.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {demand && (
            <div className="text-right">
              <div className="text-sm font-medium text-slate-200">
                {demand.baseMultiplier}x
              </div>
              <div className="text-xs text-slate-500">
                cost mult.
                <span className="sr-only">iplier - affects advertising cost</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 text-slate-100 flex-wrap">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sky-400" />
              {isFixedPricePlan ? 'Edit Your Regions' : 'Configure Your Regions'}
            </div>
            {maxRegions && (
              <Badge 
                variant={isAtMaxRegions ? "default" : "secondary"}
                className={isAtMaxRegions ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700"}
              >
                {localRegions.length}/{maxRegions} regions
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {isFixedPricePlan 
              ? `Choose which ${maxRegions} regions you want for your ${planType === 'standard' ? 'Standard' : 'Premium'} plan. Your home region is included automatically.`
              : 'Select the regions where you want your ads to appear. Your home region is included automatically.'
            }
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4" role="status" aria-label="Loading available regions">
            <Skeleton className="h-20" aria-hidden="true" />
            <Skeleton className="h-20" aria-hidden="true" />
            <Skeleton className="h-20" aria-hidden="true" />
            <span className="sr-only">Loading available regions for your area...</span>
          </div>
        ) : availableData ? (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Your Home Region
              </h4>
              {renderRegionItem(availableData.homeRegion, 'home')}
            </div>

            {availableData.adjacentRegions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sky-400" />
                  Adjacent Regions ({availableData.adjacentRegions.length})
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-slate-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Regions neighboring your home area. Lower acquisition costs due to proximity.</p>
                    </TooltipContent>
                  </Tooltip>
                </h4>
                <div className="space-y-2">
                  {availableData.adjacentRegions.map(region => 
                    renderRegionItem(region, 'adjacent')
                  )}
                </div>
              </div>
            )}

            {availableData.nonAdjacentRegions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  Other Regions ({availableData.nonAdjacentRegions.length})
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-slate-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">High-demand regions in your state that aren't directly adjacent to your home area.</p>
                    </TooltipContent>
                  </Tooltip>
                </h4>
                <div className="space-y-2">
                  {availableData.nonAdjacentRegions.map(region => 
                    renderRegionItem(region, 'other')
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-700 space-y-4">
              {!isFixedPricePlan && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex flex-col">
                      <Label htmlFor="budget-input" className="text-slate-300">Monthly Budget</Label>
                      <span className="text-xs text-sky-400 mt-0.5">Recommended: ${recommendedBudget}/mo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400" aria-hidden="true">$</span>
                      <Input
                        id="budget-input"
                        type="number"
                        value={localBudget}
                        onChange={(e) => setLocalBudget(Number(e.target.value) || 0)}
                        onBlur={handleBudgetBlur}
                        className="w-24 bg-slate-800 border-slate-700 text-right min-h-[44px]"
                        min={minBudget}
                        max={10000}
                        data-testid="input-budget"
                        aria-label="Monthly advertising budget in dollars"
                        aria-describedby="budget-helper-text"
                      />
                      <span className="text-slate-400" aria-hidden="true">/mo</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500" id="budget-helper-text">
                    {partnerType === "adjuster" 
                      ? `Recommended: $${recommendedBudget}/month, but many adjusters start as low as $${minBudget} in a single region.`
                      : `Recommended: $${recommendedBudget}/month to stay visible in your area. You can choose less if you're just getting started (min: $${minBudget}).`
                    }
                  </p>
                  <Slider
                    value={[Math.max(minBudget, localBudget)]}
                    onValueChange={([value]) => setLocalBudget(value)}
                    min={minBudget}
                    max={5000}
                    step={50}
                    className="py-2"
                    aria-label="Adjust monthly budget"
                    aria-valuemin={minBudget}
                    aria-valuemax={5000}
                    aria-valuenow={localBudget}
                    aria-valuetext={`$${localBudget} per month`}
                  />
                  <div className="flex justify-between text-xs text-slate-500" id="budget-range-hint">
                    <span>${minBudget}</span>
                    <span>$5,000+</span>
                  </div>
                </div>
              )}

              <Card className="bg-slate-800/50 border-slate-700" aria-live="polite" aria-atomic="true">
                <CardContent className="py-3">
                  <div className={`grid ${isFixedPricePlan ? 'grid-cols-2' : 'grid-cols-3'} gap-4 text-center`} role="group" aria-label="Selection summary">
                    <div>
                      <div className="text-lg font-bold text-purple-400">
                        {localRegions.length}{maxRegions ? `/${maxRegions}` : ''}
                      </div>
                      <div className="text-xs text-slate-400">
                        Regions
                        <span className="sr-only"> selected</span>
                      </div>
                    </div>
                    {isFixedPricePlan ? (
                      <div>
                        <div className="text-lg font-bold text-emerald-400">
                          ${planType === 'standard' ? '500' : '2,000'}
                        </div>
                        <div className="text-xs text-slate-400">
                          Fixed Price
                          <span className="sr-only"> per month</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div className="text-lg font-bold text-emerald-400">
                            ${localBudget}
                          </div>
                          <div className="text-xs text-slate-400">
                            Monthly
                            <span className="sr-only"> budget</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-sky-400">
                            ~{calculateEstimatedLeads()}
                          </div>
                          <div className="text-xs text-slate-400">
                            Est. Leads
                            <span className="sr-only"> per month</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {!isFixedPricePlan && calculateEstimatedCost() > localBudget && (
                <div 
                  className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 p-2 rounded"
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>
                    <span className="sr-only">Warning: </span>
                    Your budget may be below competitive levels for {localRegions.length} regions. 
                    Consider increasing to ${calculateEstimatedCost()} or selecting fewer regions.
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400">
            <p>Unable to load regions for ZIP code {zipCode}</p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-regions"
            aria-label="Cancel region selection and close dialog"
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            className="bg-purple-600 hover:bg-purple-700 min-h-[44px]"
            disabled={localRegions.length === 0}
            data-testid="button-confirm-regions"
            aria-label={`Confirm selection of ${localRegions.length} region${localRegions.length !== 1 ? 's' : ''} with $${localBudget} monthly budget`}
          >
            Confirm Selection ({localRegions.length} regions)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
