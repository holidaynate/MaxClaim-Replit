import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, XCircle, Clock, Building2, Mail, Phone, MapPin, 
  Users, DollarSign, FileText, CreditCard, TrendingUp, LayoutDashboard,
  UserPlus, Briefcase, Calendar, Award, Globe, Copy, ExternalLink,
  Library, FileEdit
} from "lucide-react";

interface Partner {
  id: number;
  companyName: string;
  type: "contractor" | "adjuster" | "agency";
  tier: string;
  contactPerson: string;
  email: string;
  phone: string;
  website?: string;
  licenseNumber?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  priority?: number;
}

interface SalesAgent {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  region: string | null;
  agentRefCode: string | null;
  birthYear: number | null;
  commissionTierId: string | null;
  stripeConnectId: string | null;
  totalEarned: number;
  ytdEarnings: number;
  joinedAt: string;
  createdAt: string;
}

interface PartnerContract {
  id: string;
  partnerId: string;
  agentId: string | null;
  monetizationTier: string;
  baseMonthly: number;
  rotationWeight: number;
  status: string;
  contractStart: string | null;
  contractEnd: string | null;
  autoRenew: boolean;
  createdAt: string;
}

interface Commission {
  id: string;
  agentId: string;
  partnerId: string;
  commissionType: string;
  commissionAmount: number;
  status: string;
  notes: string | null;
  createdAt: string;
}

interface Payout {
  id: string;
  agentId: string;
  amount: number;
  method: string;
  status: string;
  stripeTransferId: string | null;
  createdAt: string;
}

interface DashboardStats {
  agents: { total: number; active: number };
  contracts: { total: number; active: number; byTier: { free_bogo: number; standard: number; premium: number } };
  commissions: { total: number; pending: number; count: number };
  revenue: { monthlyRecurring: number; activeSubscriptions: number };
  payouts: { pending: number; totalPending: number };
}

interface ProOrganization {
  id: string;
  name: string;
  category: string;
  scope: string;
  state: string | null;
  city: string | null;
  website: string | null;
  memberDirectoryUrl: string | null;
  directoryUrl: string | null;
  chapterMapUrl: string | null;
  chapterInfoUrl: string | null;
  parentId: string | null;
  regions: string[] | null;
  states: string[] | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  createdAt: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  placeholders: string[] | null;
  isActive: number; // 1 or 0 from database
  createdAt: string;
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [password, setPassword] = useState("");
  const [mainTab, setMainTab] = useState("overview");
  const [partnerStatus, setPartnerStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [proOrgCategory, setProOrgCategory] = useState<string>("all");
  const [proOrgState, setProOrgState] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/status", { credentials: "include" });
        const data = await res.json();
        setIsAuthenticated(data.isAdmin || false);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const { data: statsData } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"],
    enabled: isAuthenticated,
  });

  const { data: partnersData, isLoading: partnersLoading } = useQuery<{ partners: Partner[] }>({
    queryKey: ["/api/partners", partnerStatus],
    queryFn: async () => {
      const res = await fetch(`/api/partners?status=${partnerStatus}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch partners");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: agentsData, isLoading: agentsLoading } = useQuery<{ agents: SalesAgent[] }>({
    queryKey: ["/api/admin/agents"],
    enabled: isAuthenticated,
  });

  const { data: contractsData, isLoading: contractsLoading } = useQuery<{ contracts: PartnerContract[] }>({
    queryKey: ["/api/admin/contracts"],
    enabled: isAuthenticated,
  });

  const { data: commissionsData, isLoading: commissionsLoading } = useQuery<{ commissions: Commission[]; summary: { total: number; count: number } }>({
    queryKey: ["/api/admin/commissions"],
    enabled: isAuthenticated,
  });

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery<{ payouts: Payout[] }>({
    queryKey: ["/api/admin/payouts"],
    enabled: isAuthenticated,
  });

  const { data: proOrgsData, isLoading: proOrgsLoading } = useQuery<{ organizations: ProOrganization[]; total: number }>({
    queryKey: ["/api/pro-organizations", proOrgCategory, proOrgState],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (proOrgCategory !== "all") params.append("category", proOrgCategory);
      if (proOrgState !== "all") params.append("state", proOrgState);
      const queryString = params.toString();
      const url = queryString ? `/api/pro-organizations?${queryString}` : "/api/pro-organizations";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pro organizations");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: templatesData, isLoading: templatesLoading } = useQuery<{ templates: EmailTemplate[]; total: number }>({
    queryKey: ["/api/email-templates"],
    enabled: isAuthenticated,
  });

  const partners = partnersData?.partners || [];
  const agents = agentsData?.agents || [];
  const contracts = contractsData?.contracts || [];
  const commissions = commissionsData?.commissions || [];
  const payouts = payoutsData?.payouts || [];
  const proOrgs = proOrgsData?.organizations || [];
  const emailTemplates = templatesData?.templates || [];

  // Get unique states from pro organizations for filter
  const uniqueStates = Array.from(new Set(proOrgs.filter(o => o.state).map(o => o.state as string))).sort();

  // Copy template to clipboard with fallback
  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-HTTPS or unsupported browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      toast({ title: "Copied!", description: "Template copied to clipboard" });
    } catch {
      toast({ title: "Error", description: "Failed to copy to clipboard", variant: "destructive" });
    }
  };

  // Format category for display
  const formatCategory = (cat: string) => {
    return cat.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const approveMutation = useMutation({
    mutationFn: async (partnerId: number) => {
      return apiRequest(`/api/partners/${partnerId}/status`, "PATCH", { status: "approved" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      toast({ title: "Partner Approved", description: "Partner has been approved and is now visible to users." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to approve partner", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (partnerId: number) => {
      return apiRequest(`/api/partners/${partnerId}/status`, "PATCH", { status: "rejected" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      toast({ title: "Partner Rejected", description: "Partner application has been rejected." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reject partner", variant: "destructive" });
    },
  });

  const payCommissionMutation = useMutation({
    mutationFn: async (commissionId: string) => {
      return apiRequest(`/api/admin/commissions/${commissionId}/pay`, "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      toast({ title: "Commission Paid", description: "Commission has been marked as paid." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to pay commission", variant: "destructive" });
    },
  });

  const processPayoutMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      return apiRequest(`/api/admin/payouts/${payoutId}/process`, "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      toast({ title: "Payout Processing", description: "Payout is now being processed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to process payout", variant: "destructive" });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("/api/admin/login", "POST", { password });
      return res.json();
    },
    onSuccess: () => {
      setIsAuthenticated(true);
      toast({ title: "Welcome", description: "Logged in to admin dashboard" });
    },
    onError: () => {
      toast({ title: "Access Denied", description: "Incorrect password", variant: "destructive" });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(password);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p className="text-center text-slate-400">Checking authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>Enter password to access admin dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  data-testid="input-admin-password"
                  disabled={loginMutation.isPending}
                />
              </div>
              <Button type="submit" className="w-full" data-testid="button-admin-login" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-slate-400">Manage partners, agents, contracts, and monetization</p>
        </div>

        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="mb-6 flex-wrap gap-1">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="partners" data-testid="tab-partners">
              <Building2 className="h-4 w-4 mr-2" />
              Partners
            </TabsTrigger>
            <TabsTrigger value="agents" data-testid="tab-agents">
              <Users className="h-4 w-4 mr-2" />
              Sales Agents
            </TabsTrigger>
            <TabsTrigger value="contracts" data-testid="tab-contracts">
              <FileText className="h-4 w-4 mr-2" />
              Contracts
            </TabsTrigger>
            <TabsTrigger value="commissions" data-testid="tab-commissions">
              <DollarSign className="h-4 w-4 mr-2" />
              Commissions
            </TabsTrigger>
            <TabsTrigger value="payouts" data-testid="tab-payouts">
              <CreditCard className="h-4 w-4 mr-2" />
              Payouts
            </TabsTrigger>
            <TabsTrigger value="pro-orgs" data-testid="tab-pro-orgs">
              <Library className="h-4 w-4 mr-2" />
              Pro Orgs
            </TabsTrigger>
            <TabsTrigger value="templates" data-testid="tab-templates">
              <FileEdit className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-monthly-revenue">
                    {formatCurrency(statsData?.revenue?.monthlyRecurring || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {statsData?.revenue?.activeSubscriptions || 0} active subscriptions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-active-contracts">
                    {statsData?.contracts?.active || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {statsData?.contracts?.total || 0} total contracts
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Pending Commissions</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-pending-commissions">
                    {formatCurrency(statsData?.commissions?.pending || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {statsData?.commissions?.count || 0} pending payments
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-active-agents">
                    {statsData?.agents?.active || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {statsData?.agents?.total || 0} total agents
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contracts by Tier</CardTitle>
                  <CardDescription>Breakdown of active contracts by monetization tier</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm">Premium (2.0x weight)</span>
                      </div>
                      <span className="font-semibold" data-testid="tier-premium-count">
                        {statsData?.contracts?.byTier?.premium || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm">Standard (1.0x weight)</span>
                      </div>
                      <span className="font-semibold" data-testid="tier-standard-count">
                        {statsData?.contracts?.byTier?.standard || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                        <span className="text-sm">BOGO Free (0.5x weight)</span>
                      </div>
                      <span className="font-semibold" data-testid="tier-bogo-count">
                        {statsData?.contracts?.byTier?.free_bogo || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pending Payouts</CardTitle>
                  <CardDescription>Agent payouts awaiting processing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-500" data-testid="total-pending-payouts">
                    {formatCurrency(statsData?.payouts?.totalPending || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {statsData?.payouts?.pending || 0} payouts pending
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="partners">
            <div className="mb-4">
              <Select value={partnerStatus} onValueChange={(val) => setPartnerStatus(val as any)}>
                <SelectTrigger className="w-48" data-testid="select-partner-status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {partnersLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-slate-400">Loading partners...</p>
                </CardContent>
              </Card>
            ) : partners.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-slate-400">No {partnerStatus} partners found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {partners.map((partner) => (
                  <Card key={partner.id} data-testid={`card-partner-${partner.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            {partner.companyName}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {partner.type.charAt(0).toUpperCase() + partner.type.slice(1)} • {partner.tier.charAt(0).toUpperCase() + partner.tier.slice(1)} Tier
                          </CardDescription>
                        </div>
                        <Badge variant={partner.status === "approved" ? "default" : partner.status === "rejected" ? "destructive" : "secondary"}>
                          {partner.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-300">{partner.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-300">{partner.phone}</span>
                          </div>
                          {partner.website && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-slate-400" />
                              <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:text-sky-400">
                                {partner.website}
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="text-slate-400">Contact: </span>
                            <span className="text-slate-300">{partner.contactPerson}</span>
                          </div>
                          {partner.licenseNumber && (
                            <div className="text-sm">
                              <span className="text-slate-400">License: </span>
                              <span className="text-slate-300">{partner.licenseNumber}</span>
                            </div>
                          )}
                          <div className="text-sm">
                            <span className="text-slate-400">Applied: </span>
                            <span className="text-slate-300">{new Date(partner.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {partner.status === "pending" && (
                        <div className="flex gap-2 pt-4 flex-wrap">
                          <Button onClick={() => approveMutation.mutate(partner.id)} disabled={approveMutation.isPending} className="flex-1" data-testid={`button-approve-${partner.id}`}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button onClick={() => rejectMutation.mutate(partner.id)} disabled={rejectMutation.isPending} variant="destructive" className="flex-1" data-testid={`button-reject-${partner.id}`}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="agents">
            {agentsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-slate-400">Loading agents...</p>
                </CardContent>
              </Card>
            ) : agents.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <UserPlus className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-400 mb-4">No sales agents found</p>
                  <p className="text-sm text-slate-500">Agents can be added via the API</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {agents.map((agent) => (
                  <Card key={agent.id} data-testid={`card-agent-${agent.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <Badge variant={agent.status === "active" ? "default" : "secondary"}>
                          {agent.status}
                        </Badge>
                      </div>
                      <CardDescription>{agent.email}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {agent.agentRefCode && (
                        <div className="bg-sky-500/10 border border-sky-500/30 rounded-md p-2">
                          <p className="text-xs text-slate-400 mb-1">Reference Code</p>
                          <p className="text-sky-400 font-mono font-bold text-lg" data-testid={`text-refcode-${agent.id}`}>
                            {agent.agentRefCode}
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-slate-400">YTD Earnings</p>
                          <p className="font-semibold text-green-400">{formatCurrency(Number(agent.ytdEarnings) || 0)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Total Earned</p>
                          <p className="font-semibold">{formatCurrency(Number(agent.totalEarned) || 0)}</p>
                        </div>
                      </div>
                      {agent.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-slate-400" />
                          <span>{agent.phone}</span>
                        </div>
                      )}
                      {agent.region && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span>{agent.region}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>Joined {formatDate(agent.joinedAt || agent.createdAt)}</span>
                      </div>
                      {agent.stripeConnectId && (
                        <div className="flex items-center gap-2 text-sm">
                          <CreditCard className="h-4 w-4 text-green-500" />
                          <span className="text-green-500">Stripe Connected</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="contracts">
            {contractsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-slate-400">Loading contracts...</p>
                </CardContent>
              </Card>
            ) : contracts.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Briefcase className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-400">No contracts found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {contracts.map((contract) => (
                  <Card key={contract.id} data-testid={`card-contract-${contract.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Contract #{contract.id.slice(0, 8)}
                          </CardTitle>
                          <CardDescription>Partner: {contract.partnerId.slice(0, 8)}...</CardDescription>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <Badge variant={contract.monetizationTier === "premium" ? "default" : contract.monetizationTier === "standard" ? "secondary" : "outline"}>
                            {contract.monetizationTier}
                          </Badge>
                          <Badge variant={contract.status === "approved" ? "default" : "secondary"}>
                            {contract.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">Monthly Fee</p>
                          <p className="font-semibold">{formatCurrency(Number(contract.baseMonthly) || 0)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Rotation Weight</p>
                          <p className="font-semibold">{contract.rotationWeight}x</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Start Date</p>
                          <p className="font-semibold">{formatDate(contract.contractStart)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Auto Renew</p>
                          <p className="font-semibold">{contract.autoRenew ? "Yes" : "No"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="commissions">
            {commissionsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-slate-400">Loading commissions...</p>
                </CardContent>
              </Card>
            ) : commissions.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Award className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-400">No commissions found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Commission Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-400">Total Commissions</p>
                        <p className="text-2xl font-bold">{formatCurrency(commissionsData?.summary?.total || 0)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Commission Count</p>
                        <p className="text-2xl font-bold">{commissionsData?.summary?.count || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4">
                  {commissions.map((commission) => (
                    <Card key={commission.id} data-testid={`card-commission-${commission.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <CardTitle className="text-lg">{formatCurrency(Number(commission.commissionAmount))}</CardTitle>
                            <CardDescription>
                              {commission.commissionType} • Agent: {commission.agentId.slice(0, 8)}...
                            </CardDescription>
                          </div>
                          <Badge variant={commission.status === "paid" ? "default" : commission.status === "pending" ? "secondary" : "outline"}>
                            {commission.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="text-sm text-slate-400">
                          Created: {formatDate(commission.createdAt)}
                        </div>
                        {commission.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => payCommissionMutation.mutate(commission.id)}
                            disabled={payCommissionMutation.isPending}
                            data-testid={`button-pay-commission-${commission.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark as Paid
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payouts">
            {payoutsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-slate-400">Loading payouts...</p>
                </CardContent>
              </Card>
            ) : payouts.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <CreditCard className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-400">No payouts found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {payouts.map((payout) => (
                  <Card key={payout.id} data-testid={`card-payout-${payout.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-lg">{formatCurrency(Number(payout.amount))}</CardTitle>
                          <CardDescription>
                            Agent: {payout.agentId.slice(0, 8)}... • Method: {payout.method}
                          </CardDescription>
                        </div>
                        <Badge variant={payout.status === "completed" ? "default" : payout.status === "processing" ? "secondary" : "outline"}>
                          {payout.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="text-sm text-slate-400">
                        Created: {formatDate(payout.createdAt)}
                        {payout.stripeTransferId && (
                          <span className="ml-2">• Stripe: {payout.stripeTransferId.slice(0, 12)}...</span>
                        )}
                      </div>
                      {payout.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => processPayoutMutation.mutate(payout.id)}
                          disabled={processPayoutMutation.isPending}
                          data-testid={`button-process-payout-${payout.id}`}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Process Payout
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pro-orgs">
            <div className="mb-4 flex flex-wrap gap-4">
              <Select value={proOrgCategory} onValueChange={setProOrgCategory}>
                <SelectTrigger className="w-48" data-testid="select-pro-org-category">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="general_contractors">General Contractors</SelectItem>
                  <SelectItem value="remodelers">Remodelers</SelectItem>
                  <SelectItem value="roofers">Roofers</SelectItem>
                  <SelectItem value="public_adjusters">Public Adjusters</SelectItem>
                  <SelectItem value="attorneys">Attorneys</SelectItem>
                  <SelectItem value="disaster_recovery">Disaster Recovery</SelectItem>
                </SelectContent>
              </Select>

              <Select value={proOrgState} onValueChange={setProOrgState}>
                <SelectTrigger className="w-40" data-testid="select-pro-org-state">
                  <SelectValue placeholder="Filter by state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {uniqueStates.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {proOrgsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-slate-400">Loading organizations...</p>
                </CardContent>
              </Card>
            ) : proOrgs.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Library className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-400">No organizations found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {proOrgs.map((org) => (
                  <Card key={org.id} data-testid={`card-pro-org-${org.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{org.name}</CardTitle>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {formatCategory(org.category)}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {org.scope.charAt(0).toUpperCase() + org.scope.slice(1)}
                        {org.state && ` • ${org.state}`}
                        {org.city && ` • ${org.city}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {org.regions && org.regions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {org.regions.slice(0, 6).map((r, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>
                          ))}
                          {org.regions.length > 6 && (
                            <Badge variant="secondary" className="text-xs">+{org.regions.length - 6} more</Badge>
                          )}
                        </div>
                      )}
                      {org.website && (
                        <a 
                          href={org.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-sky-500 hover:underline"
                          data-testid={`link-website-${org.id}`}
                        >
                          <Globe className="h-4 w-4" />
                          Website
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {(org.directoryUrl || org.memberDirectoryUrl) && (
                        <a 
                          href={org.directoryUrl || org.memberDirectoryUrl || ""} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-sky-500 hover:underline"
                          data-testid={`link-directory-${org.id}`}
                        >
                          <Users className="h-4 w-4" />
                          Find Members
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {org.chapterMapUrl && (
                        <a 
                          href={org.chapterMapUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-sky-500 hover:underline"
                          data-testid={`link-chapters-${org.id}`}
                        >
                          <MapPin className="h-4 w-4" />
                          Find Chapters
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {org.notes && (
                        <p className="text-xs text-slate-400 mt-2">{org.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates">
            {templatesLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-slate-400">Loading templates...</p>
                </CardContent>
              </Card>
            ) : emailTemplates.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <FileEdit className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-400">No templates found</p>
                </CardContent>
              </Card>
            ) : selectedTemplate ? (
              <div className="space-y-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedTemplate(null)}
                  data-testid="button-back-templates"
                >
                  &larr; Back to Templates
                </Button>
                
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle>{selectedTemplate.name}</CardTitle>
                        <CardDescription>
                          Category: {formatCategory(selectedTemplate.category)}
                        </CardDescription>
                      </div>
                      <Badge variant={selectedTemplate.isActive === 1 ? "default" : "secondary"}>
                        {selectedTemplate.isActive === 1 ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Subject Line</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <Input 
                          readOnly 
                          value={selectedTemplate.subject} 
                          className="font-mono text-sm"
                          data-testid="input-template-subject"
                        />
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => copyToClipboard(selectedTemplate.subject)}
                          data-testid="button-copy-subject"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Email Body</Label>
                      <div className="mt-1 space-y-2">
                        <div className="relative">
                          <pre className="p-4 bg-slate-900 rounded-lg text-sm text-slate-300 whitespace-pre-wrap font-mono overflow-x-auto max-h-96">
                            {selectedTemplate.body}
                          </pre>
                          <Button 
                            size="sm" 
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard(selectedTemplate.body)}
                            data-testid="button-copy-body"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Body
                          </Button>
                        </div>
                      </div>
                    </div>

                    {selectedTemplate.placeholders && selectedTemplate.placeholders.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Placeholders to Replace</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedTemplate.placeholders.map((p, i) => (
                            <Badge key={i} variant="outline" className="font-mono">
                              [{p}]
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button 
                      className="w-full mt-4"
                      onClick={() => copyToClipboard(`Subject: ${selectedTemplate.subject}\n\n${selectedTemplate.body}`)}
                      data-testid="button-copy-full-template"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Full Template
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {emailTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="cursor-pointer hover-elevate transition-all"
                    onClick={() => setSelectedTemplate(template)}
                    data-testid={`card-template-${template.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <Badge variant={template.isActive === 1 ? "default" : "secondary"}>
                          {template.isActive === 1 ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <CardDescription>
                        {formatCategory(template.category)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-400 line-clamp-2">
                        {template.subject}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        Click to view full template
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
