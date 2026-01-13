import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  MapPin, 
  Check,
  Star,
  Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface RegionManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userType: "agent" | "partner";
  currentRegions: string[];
  activeRegion: string;
  onRegionsChange: (regions: string[], activeRegion: string) => void;
}

const US_STATES = [
  { value: "AL", label: "Alabama", region: "Southeast" },
  { value: "AK", label: "Alaska", region: "Pacific" },
  { value: "AZ", label: "Arizona", region: "Southwest" },
  { value: "AR", label: "Arkansas", region: "South" },
  { value: "CA", label: "California", region: "Pacific" },
  { value: "CO", label: "Colorado", region: "Mountain" },
  { value: "CT", label: "Connecticut", region: "Northeast" },
  { value: "DE", label: "Delaware", region: "Mid-Atlantic" },
  { value: "FL", label: "Florida", region: "Southeast" },
  { value: "GA", label: "Georgia", region: "Southeast" },
  { value: "HI", label: "Hawaii", region: "Pacific" },
  { value: "ID", label: "Idaho", region: "Mountain" },
  { value: "IL", label: "Illinois", region: "Midwest" },
  { value: "IN", label: "Indiana", region: "Midwest" },
  { value: "IA", label: "Iowa", region: "Midwest" },
  { value: "KS", label: "Kansas", region: "Midwest" },
  { value: "KY", label: "Kentucky", region: "South" },
  { value: "LA", label: "Louisiana", region: "South" },
  { value: "ME", label: "Maine", region: "Northeast" },
  { value: "MD", label: "Maryland", region: "Mid-Atlantic" },
  { value: "MA", label: "Massachusetts", region: "Northeast" },
  { value: "MI", label: "Michigan", region: "Midwest" },
  { value: "MN", label: "Minnesota", region: "Midwest" },
  { value: "MS", label: "Mississippi", region: "South" },
  { value: "MO", label: "Missouri", region: "Midwest" },
  { value: "MT", label: "Montana", region: "Mountain" },
  { value: "NE", label: "Nebraska", region: "Midwest" },
  { value: "NV", label: "Nevada", region: "Mountain" },
  { value: "NH", label: "New Hampshire", region: "Northeast" },
  { value: "NJ", label: "New Jersey", region: "Mid-Atlantic" },
  { value: "NM", label: "New Mexico", region: "Southwest" },
  { value: "NY", label: "New York", region: "Mid-Atlantic" },
  { value: "NC", label: "North Carolina", region: "Southeast" },
  { value: "ND", label: "North Dakota", region: "Midwest" },
  { value: "OH", label: "Ohio", region: "Midwest" },
  { value: "OK", label: "Oklahoma", region: "South" },
  { value: "OR", label: "Oregon", region: "Pacific" },
  { value: "PA", label: "Pennsylvania", region: "Mid-Atlantic" },
  { value: "RI", label: "Rhode Island", region: "Northeast" },
  { value: "SC", label: "South Carolina", region: "Southeast" },
  { value: "SD", label: "South Dakota", region: "Midwest" },
  { value: "TN", label: "Tennessee", region: "South" },
  { value: "TX", label: "Texas", region: "Southwest" },
  { value: "UT", label: "Utah", region: "Mountain" },
  { value: "VT", label: "Vermont", region: "Northeast" },
  { value: "VA", label: "Virginia", region: "Southeast" },
  { value: "WA", label: "Washington", region: "Pacific" },
  { value: "WV", label: "West Virginia", region: "Southeast" },
  { value: "WI", label: "Wisconsin", region: "Midwest" },
  { value: "WY", label: "Wyoming", region: "Mountain" }
];

const REGION_GROUPS = [
  { name: "Northeast", states: ["CT", "MA", "ME", "NH", "RI", "VT"] },
  { name: "Mid-Atlantic", states: ["DE", "MD", "NJ", "NY", "PA"] },
  { name: "Southeast", states: ["FL", "GA", "NC", "SC", "VA", "WV"] },
  { name: "South", states: ["AR", "KY", "LA", "MS", "OK", "TN"] },
  { name: "Midwest", states: ["IA", "IL", "IN", "KS", "MI", "MN", "MO", "ND", "NE", "OH", "SD", "WI"] },
  { name: "Southwest", states: ["AZ", "NM", "TX"] },
  { name: "Mountain", states: ["CO", "ID", "MT", "NV", "UT", "WY"] },
  { name: "Pacific", states: ["AK", "CA", "HI", "OR", "WA"] }
];

export function RegionManagerModal({
  open,
  onOpenChange,
  userId,
  userType,
  currentRegions,
  activeRegion,
  onRegionsChange,
}: RegionManagerModalProps) {
  const { toast } = useToast();
  const [selectedRegions, setSelectedRegions] = useState<string[]>(currentRegions);
  const [primaryRegion, setPrimaryRegion] = useState(activeRegion);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedRegions(currentRegions.length > 0 ? currentRegions : [activeRegion || "TX"]);
      setPrimaryRegion(activeRegion || (currentRegions.length > 0 ? currentRegions[0] : "TX"));
    }
  }, [open, currentRegions, activeRegion]);

  const updateRegionsMutation = useMutation({
    mutationFn: async () => {
      const endpoint = userType === "agent" 
        ? `/api/sales-agents/${userId}/regions`
        : `/api/partners/${userId}/regions`;
      
      return apiRequest("PUT", endpoint, {
        serviceRegions: selectedRegions,
        activeRegion: primaryRegion
      });
    },
    onSuccess: () => {
      toast({
        title: "Regions updated",
        description: "Your service regions have been saved successfully.",
      });
      onRegionsChange(selectedRegions, primaryRegion);
      queryClient.invalidateQueries({ queryKey: userType === "agent" ? ["/api/sales-agents"] : ["/api/partners"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update regions. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleStateToggle = (stateCode: string) => {
    setSelectedRegions(prev => {
      if (prev.includes(stateCode)) {
        const newRegions = prev.filter(s => s !== stateCode);
        if (primaryRegion === stateCode && newRegions.length > 0) {
          setPrimaryRegion(newRegions[0]);
        }
        return newRegions;
      } else {
        return [...prev, stateCode];
      }
    });
  };

  const handleSetPrimary = (stateCode: string) => {
    if (!selectedRegions.includes(stateCode)) {
      setSelectedRegions(prev => [...prev, stateCode]);
    }
    setPrimaryRegion(stateCode);
  };

  const handleSelectRegion = (regionName: string) => {
    const region = REGION_GROUPS.find(r => r.name === regionName);
    if (region) {
      const allSelected = region.states.every(s => selectedRegions.includes(s));
      if (allSelected) {
        setSelectedRegions(prev => prev.filter(s => !region.states.includes(s)));
      } else {
        setSelectedRegions(prev => Array.from(new Set([...prev, ...region.states])));
      }
    }
  };

  const filteredStates = US_STATES.filter(state => 
    state.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    state.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
    state.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = () => {
    if (selectedRegions.length === 0) {
      toast({
        title: "Select at least one region",
        description: "You must have at least one service region selected.",
        variant: "destructive",
      });
      return;
    }
    updateRegionsMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-sky-400" />
            Manage Service Regions
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Select the states where you provide services. Set your primary region to focus the Local Resources Hub.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-3 h-3 rounded bg-sky-500" />
              <span>Selected ({selectedRegions.length})</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Star className="w-3 h-3 text-amber-400" />
              <span>Primary Region</span>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search states..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700"
              data-testid="input-search-states"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {REGION_GROUPS.map(region => {
              const selectedCount = region.states.filter(s => selectedRegions.includes(s)).length;
              const isFullySelected = selectedCount === region.states.length;
              return (
                <Button
                  key={region.name}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectRegion(region.name)}
                  className={`border-slate-600 ${isFullySelected ? 'bg-sky-500/20 border-sky-500/50 text-sky-300' : 'text-slate-300'}`}
                  data-testid={`button-region-${region.name.toLowerCase().replace(/\s/g, '-')}`}
                >
                  {region.name}
                  {selectedCount > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-slate-700 text-slate-300 text-xs">
                      {selectedCount}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>

          <ScrollArea className="h-64 border border-slate-700 rounded-lg p-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {filteredStates.map(state => {
                const isSelected = selectedRegions.includes(state.value);
                const isPrimary = primaryRegion === state.value;
                return (
                  <div
                    key={state.value}
                    className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? isPrimary 
                          ? 'bg-amber-500/10 border-amber-500/50' 
                          : 'bg-sky-500/10 border-sky-500/30'
                        : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                    }`}
                    onClick={() => handleStateToggle(state.value)}
                    data-testid={`state-${state.value.toLowerCase()}`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleStateToggle(state.value)}
                        className="border-slate-600"
                      />
                      <Label className={`cursor-pointer ${isSelected ? 'text-slate-100' : 'text-slate-400'}`}>
                        {state.label}
                      </Label>
                    </div>
                    {isSelected && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-6 w-6 ${isPrimary ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetPrimary(state.value);
                        }}
                        data-testid={`button-primary-${state.value.toLowerCase()}`}
                      >
                        <Star className={`w-4 h-4 ${isPrimary ? 'fill-amber-400' : ''}`} />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {selectedRegions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-slate-400">Selected:</span>
              {selectedRegions.map(state => {
                const stateInfo = US_STATES.find(s => s.value === state);
                return (
                  <Badge 
                    key={state}
                    variant="outline"
                    className={`${primaryRegion === state ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-sky-500/20 border-sky-500/30 text-sky-300'}`}
                  >
                    {primaryRegion === state && <Star className="w-3 h-3 mr-1 fill-amber-400" />}
                    {stateInfo?.label || state}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600"
            data-testid="button-cancel-regions"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateRegionsMutation.isPending || selectedRegions.length === 0}
            className="bg-sky-600 hover:bg-sky-700"
            data-testid="button-save-regions"
          >
            {updateRegionsMutation.isPending ? "Saving..." : "Save Regions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
