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
  selectedRegions: string[];
  onRegionsChange: (regions: string[]) => void;
  budget: number;
  onBudgetChange: (budget: number) => void;
}

export function RegionPickerModal({
  open,
  onOpenChange,
  zipCode,
  tradeType,
  selectedRegions,
  onRegionsChange,
  budget,
  onBudgetChange,
}: RegionPickerModalProps) {
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
    
    setLocalRegions(prev => 
      prev.includes(region)
        ? prev.filter(r => r !== region)
        : [...prev, region]
    );
  };

  const handleConfirm = () => {
    onRegionsChange(localRegions);
    onBudgetChange(localBudget);
    onOpenChange(false);
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

  const renderRegionItem = (region: string, type: 'home' | 'adjacent' | 'other') => {
    const demand = getRegionDemand(region);
    const isSelected = localRegions.includes(region);
    const isHome = type === 'home';
    
    return (
      <div 
        key={region}
        className={`p-3 rounded-lg border transition-all ${
          isSelected 
            ? 'border-purple-500 bg-purple-500/10' 
            : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
        } ${isHome ? 'cursor-default' : 'cursor-pointer'}`}
        onClick={() => !isHome && handleRegionToggle(region)}
        data-testid={`region-item-${region.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {!isHome ? (
              <Checkbox 
                checked={isSelected}
                className="mt-1"
                onCheckedChange={() => handleRegionToggle(region)}
              />
            ) : (
              <div className="mt-1 w-4 h-4 rounded bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-200">{region}</span>
                {isHome && (
                  <Badge variant="secondary" className="text-xs bg-emerald-500/20 text-emerald-400">
                    Home
                  </Badge>
                )}
                {type === 'adjacent' && (
                  <Badge variant="secondary" className="text-xs bg-sky-500/20 text-sky-400">
                    Adjacent
                  </Badge>
                )}
                {demand?.disasterDeclaration && (
                  <Badge className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Disaster
                  </Badge>
                )}
              </div>
              
              {demand && (
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Demand: {demand.demandIndex}/100
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {demand.competitorCount} competitors
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    ${demand.avgContractorBudget}/mo avg
                  </span>
                </div>
              )}
              
              {demand?.primaryHazards && demand.primaryHazards.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
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
              <div className="text-xs text-slate-500">cost mult.</div>
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
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <MapPin className="w-5 h-5 text-sky-400" />
            Configure Your Regions
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Select the regions where you want your ads to appear. Your home region is included automatically.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
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
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300">Monthly Budget</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">$</span>
                    <Input
                      type="number"
                      value={localBudget}
                      onChange={(e) => setLocalBudget(Number(e.target.value))}
                      className="w-24 bg-slate-800 border-slate-700 text-right"
                      min={100}
                      max={10000}
                      data-testid="input-budget"
                    />
                    <span className="text-slate-400">/mo</span>
                  </div>
                </div>
                <Slider
                  value={[localBudget]}
                  onValueChange={([value]) => setLocalBudget(value)}
                  min={100}
                  max={5000}
                  step={50}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>$100</span>
                  <span>$5,000+</span>
                </div>
              </div>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-3">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-purple-400">
                        {localRegions.length}
                      </div>
                      <div className="text-xs text-slate-400">Regions</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-emerald-400">
                        ${localBudget}
                      </div>
                      <div className="text-xs text-slate-400">Monthly</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-sky-400">
                        ~{calculateEstimatedLeads()}
                      </div>
                      <div className="text-xs text-slate-400">Est. Leads</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {calculateEstimatedCost() > localBudget && (
                <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 p-2 rounded">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>
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
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            className="bg-purple-600 hover:bg-purple-700"
            disabled={localRegions.length === 0}
            data-testid="button-confirm-regions"
          >
            Confirm Selection ({localRegions.length} regions)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
