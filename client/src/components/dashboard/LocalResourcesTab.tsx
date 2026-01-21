import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, 
  Globe, 
  MapPin, 
  Search, 
  ExternalLink, 
  Users, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Shield,
  Phone,
  Mail,
  Hammer,
  Zap,
  Droplets,
  Flame,
  Snowflake,
  Wind,
  TreePine,
  Wrench,
  Home,
  PaintBucket,
  Layers,
  Scale,
  FileText,
  Building
} from "lucide-react";

interface Organization {
  id: string;
  name: string;
  category: string;
  scope: string;
  state: string | null;
  city: string | null;
  website: string;
  memberDirectoryUrl: string | null;
  directoryUrl: string | null;
  chapterMapUrl: string | null;
  priority: number;
  primaryHazards: string[] | null;
  notes: string | null;
  regions: string[] | null;
  states: string[] | null;
}

interface LocalResourcesTabProps {
  activeRegion?: string;
  serviceRegions?: string[];
  onRegionChange?: (region: string) => void;
}

const CATEGORY_ICONS: Record<string, typeof Building2> = {
  general_contractors: Building,
  remodelers: Home,
  roofers: Layers,
  public_adjusters: Scale,
  attorneys: FileText,
  regulator: Shield,
  disaster_recovery: AlertTriangle,
  licensing_boards: Shield,
  plumbers: Droplets,
  electricians: Zap,
  hvac: Wind,
  flooring: Layers,
  painters: PaintBucket,
  restoration: Flame,
  windows_doors: Home,
  tree_services: TreePine,
  appliance_repair: Wrench
};

const CATEGORY_LABELS: Record<string, string> = {
  general_contractors: "General Contractors",
  remodelers: "Remodelers",
  roofers: "Roofers",
  public_adjusters: "Public Adjusters",
  attorneys: "Attorneys",
  regulator: "Regulators",
  disaster_recovery: "Disaster Recovery",
  licensing_boards: "Licensing Boards",
  plumbers: "Plumbers",
  electricians: "Electricians",
  hvac: "HVAC",
  flooring: "Flooring",
  painters: "Painters",
  restoration: "Restoration",
  windows_doors: "Windows & Doors",
  tree_services: "Tree Services",
  appliance_repair: "Appliance Repair"
};

const HAZARD_ICONS: Record<string, typeof Flame> = {
  fire: Flame,
  flood: Droplets,
  freeze: Snowflake,
  hurricane: Wind,
  tornado: Wind,
  hail: Snowflake,
  wildfire: Flame,
  earthquake: AlertTriangle
};

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" }
];

export function LocalResourcesTab({ activeRegion = "TX", serviceRegions = [], onRegionChange }: LocalResourcesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedScope, setSelectedScope] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: orgsData, isLoading } = useQuery<{
    organizations: Organization[];
    total: number;
  }>({
    queryKey: ["/api/pro-organizations"],
  });

  const organizations = orgsData?.organizations || [];

  const filteredOrgs = organizations.filter((org) => {
    const matchesSearch = 
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (org.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = selectedCategory === "all" || org.category === selectedCategory;
    const matchesScope = selectedScope === "all" || org.scope === selectedScope;
    
    const matchesRegion = 
      org.scope === "national" ||
      org.state === activeRegion ||
      (org.states?.includes(activeRegion) ?? false) ||
      (org.regions?.includes(activeRegion) ?? false);

    return matchesSearch && matchesCategory && matchesScope && matchesRegion;
  });

  const groupedOrgs = filteredOrgs.reduce((acc, org) => {
    if (!acc[org.category]) {
      acc[org.category] = [];
    }
    acc[org.category].push(org);
    return acc;
  }, {} as Record<string, Organization[]>);

  const nationalOrgs = filteredOrgs.filter(org => org.scope === "national");
  const stateOrgs = filteredOrgs.filter(org => org.scope === "state");
  const regionalOrgs = filteredOrgs.filter(org => org.scope === "regional");
  const localOrgs = filteredOrgs.filter(org => org.scope === "local");

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryIcon = (category: string) => {
    const Icon = CATEGORY_ICONS[category] || Building2;
    return <Icon className="w-4 h-4" />;
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case "national":
        return "bg-sky-500/20 text-sky-400 border-sky-500/30";
      case "regional":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "state":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "local":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case 2:
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const activeStateLabel = US_STATES.find(s => s.value === activeRegion)?.label || activeRegion;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Local Resources Hub</h2>
          <p className="text-slate-400 text-sm">
            Professional organizations and resources for {activeStateLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-sky-400" />
          <Select value={activeRegion} onValueChange={onRegionChange}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700" data-testid="select-region">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
              {US_STATES.map((state) => (
                <SelectItem key={state.value} value={state.value}>
                  {state.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/80 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              National
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-400" data-testid="count-national">
              {isLoading ? <Skeleton className="h-8 w-12" /> : nationalOrgs.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              Regional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400" data-testid="count-regional">
              {isLoading ? <Skeleton className="h-8 w-12" /> : regionalOrgs.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              State
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400" data-testid="count-state">
              {isLoading ? <Skeleton className="h-8 w-12" /> : stateOrgs.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Local
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400" data-testid="count-local">
              {isLoading ? <Skeleton className="h-8 w-12" /> : localOrgs.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-amber-900/20 border-amber-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Disaster Resources
          </CardTitle>
          <CardDescription className="text-slate-400">
            Federal and state emergency assistance programs for {activeStateLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              asChild
              className="border-amber-600/50 text-amber-300 bg-amber-900/20 hover:bg-amber-800/30 justify-start h-auto py-3"
            >
              <a 
                href={`https://www.fema.gov/disaster/current?field_state_tid=${activeRegion}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span className="font-medium">FEMA Disasters</span>
                  </div>
                  <span className="text-xs text-slate-400">Current declarations for {activeStateLabel}</span>
                </div>
              </a>
            </Button>
            <Button
              variant="outline"
              asChild
              className="border-amber-600/50 text-amber-300 bg-amber-900/20 hover:bg-amber-800/30 justify-start h-auto py-3"
            >
              <a 
                href="https://disasterloanassistance.sba.gov/ela/s/" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span className="font-medium">SBA Disaster Loans</span>
                  </div>
                  <span className="text-xs text-slate-400">Small business disaster assistance</span>
                </div>
              </a>
            </Button>
            <Button
              variant="outline"
              asChild
              className="border-amber-600/50 text-amber-300 bg-amber-900/20 hover:bg-amber-800/30 justify-start h-auto py-3"
            >
              <a 
                href="https://www.usa.gov/state-consumer" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    <span className="font-medium">State Consumer Protection</span>
                  </div>
                  <span className="text-xs text-slate-400">File complaints, find help</span>
                </div>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/80 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100">Search Organizations</CardTitle>
          <CardDescription className="text-slate-400">
            Find professional organizations by name, category, or scope
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700"
                data-testid="input-search-orgs"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48 bg-slate-800 border-slate-700" data-testid="select-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedScope} onValueChange={setSelectedScope}>
              <SelectTrigger className="w-full md:w-36 bg-slate-800 border-slate-700" data-testid="select-scope">
                <SelectValue placeholder="All Scopes" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">All Scopes</SelectItem>
                <SelectItem value="national">National</SelectItem>
                <SelectItem value="regional">Regional</SelectItem>
                <SelectItem value="state">State</SelectItem>
                <SelectItem value="local">Local</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : filteredOrgs.length === 0 ? (
        <Card className="bg-slate-900/80 border-slate-700">
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">No organizations found</h3>
            <p className="text-slate-500">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedOrgs).map(([category, orgs]) => (
            <Card key={category} className="bg-slate-900/80 border-slate-700">
              <CardHeader 
                className="cursor-pointer"
                onClick={() => toggleCategory(category)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(category)}
                    <CardTitle className="text-slate-100">
                      {CATEGORY_LABELS[category] || category}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                      {orgs.length}
                    </Badge>
                  </div>
                  {expandedCategories.has(category) ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </CardHeader>
              {expandedCategories.has(category) && (
                <CardContent>
                  <div className="space-y-3">
                    {orgs.map((org) => (
                      <div
                        key={org.id}
                        className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50"
                        data-testid={`org-card-${org.id}`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h4 className="font-medium text-slate-100">{org.name}</h4>
                              <Badge className={getScopeColor(org.scope)} variant="outline">
                                {org.scope}
                              </Badge>
                              {org.priority === 1 && (
                                <Badge className={getPriorityColor(org.priority)} variant="outline">
                                  High Priority
                                </Badge>
                              )}
                            </div>
                            {org.notes && (
                              <p className="text-sm text-slate-400 mb-2">{org.notes}</p>
                            )}
                            {org.primaryHazards && org.primaryHazards.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-slate-500">Specializes in:</span>
                                {org.primaryHazards.map((hazard) => {
                                  const HazardIcon = HAZARD_ICONS[hazard] || AlertTriangle;
                                  return (
                                    <Badge key={hazard} variant="outline" className="bg-slate-700/50 text-slate-300 border-slate-600 text-xs">
                                      <HazardIcon className="w-3 h-3 mr-1" />
                                      {hazard}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                            {(org.state || org.city) && (
                              <div className="flex items-center gap-1 mt-2 text-sm text-slate-500">
                                <MapPin className="w-3 h-3" />
                                {org.city ? `${org.city}, ${org.state}` : org.state}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            {org.website && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="border-slate-600 text-slate-300"
                              >
                                <a href={org.website} target="_blank" rel="noopener noreferrer">
                                  <Globe className="w-3 h-3 mr-2" />
                                  Website
                                </a>
                              </Button>
                            )}
                            {(org.memberDirectoryUrl || org.directoryUrl) && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="border-sky-600 text-sky-400"
                              >
                                <a 
                                  href={org.memberDirectoryUrl || org.directoryUrl || "#"} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <Users className="w-3 h-3 mr-2" />
                                  Find Pros
                                  <ExternalLink className="w-3 h-3 ml-1" />
                                </a>
                              </Button>
                            )}
                            {org.chapterMapUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="border-purple-600 text-purple-400"
                              >
                                <a href={org.chapterMapUrl} target="_blank" rel="noopener noreferrer">
                                  <MapPin className="w-3 h-3 mr-2" />
                                  Local Chapters
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
