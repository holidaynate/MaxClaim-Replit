import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Eye, MousePointer, TrendingUp, LogOut, ArrowLeft, DollarSign, Clock, CheckCircle, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";

interface LeadStats {
  partnerId: string;
  total: number;
  pending: number;
  inProgress: number;
  closed: number;
  paid: number;
  totalValue: number;
  totalCommissions: number;
}

interface PartnerLead {
  id: string;
  leadType: string;
  status: string;
  claimValue: number | null;
  commissionAmount: number | null;
  clickedAt: string | null;
  closedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export default function PartnerDashboard() {
  const [, setLocation] = useLocation();

  const { data: authData, isLoading: authLoading } = useQuery<{
    authenticated: boolean;
    role: string;
    id: string;
  }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: partnerResponse, isLoading: partnerLoading } = useQuery<{
    partner: {
      id: string;
      companyName: string;
      contactPerson: string;
      email: string;
      type: string;
      tier: string;
      status: string;
    };
  }>({
    queryKey: [`/api/partners/${authData?.id}`],
    enabled: !!authData?.id && authData?.role === "partner",
  });

  const partnerData = partnerResponse?.partner;

  const { data: leadStats, isLoading: statsLoading } = useQuery<LeadStats>({
    queryKey: [`/api/partners/${authData?.id}/lead-stats`],
    enabled: !!authData?.id && authData?.role === "partner",
  });

  const { data: leadsResponse, isLoading: leadsLoading } = useQuery<{ leads: PartnerLead[] }>({
    queryKey: [`/api/partners/${authData?.id}/leads`],
    enabled: !!authData?.id && authData?.role === "partner",
  });

  const leads = leadsResponse?.leads || [];

  const handleLogout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    setLocation("/signin");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "pending":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "rejected":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getLeadStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "closed":
        return "bg-sky-500/20 text-sky-400 border-sky-500/30";
      case "in_progress":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "pending":
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "--";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!authData?.authenticated || authData.role !== "partner") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6">
        <Card className="bg-slate-900/90 border-slate-700 max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-slate-100">Access Denied</CardTitle>
            <CardDescription className="text-slate-400">
              Please sign in as a partner to access this dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/signin")} className="w-full" data-testid="button-goto-signin">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              className="text-slate-400 hover:text-slate-100"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Partner Dashboard</h1>
              <p className="text-slate-400">
                Welcome, {partnerData?.contactPerson || "Partner"}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <EmailVerificationBanner />

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-900/80 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Leads</CardTitle>
              <Users className="w-4 h-4 text-sky-400" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-sky-400" data-testid="text-total-leads">
                    {leadStats?.total ?? 0}
                  </div>
                  <p className="text-xs text-slate-500">{leadStats?.pending ?? 0} pending</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-slate-400">In Progress</CardTitle>
              <Clock className="w-4 h-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-amber-400" data-testid="text-in-progress">
                    {leadStats?.inProgress ?? 0}
                  </div>
                  <p className="text-xs text-slate-500">Active leads</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-slate-400">Conversions</CardTitle>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-emerald-400" data-testid="text-conversions">
                    {(leadStats?.closed ?? 0) + (leadStats?.paid ?? 0)}
                  </div>
                  <p className="text-xs text-slate-500">{leadStats?.paid ?? 0} paid out</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-slate-400">Commission Earned</CardTitle>
              <DollarSign className="w-4 h-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-purple-400" data-testid="text-commission">
                    {formatCurrency(leadStats?.totalCommissions ?? 0)}
                  </div>
                  <p className="text-xs text-slate-500">Total value: {formatCurrency(leadStats?.totalValue ?? 0)}</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {partnerData?.status === "pending" && (
          <Card className="bg-amber-500/10 border-amber-500/30 mb-8">
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                <div>
                  <h3 className="font-semibold text-amber-400">Account Under Review</h3>
                  <p className="text-slate-400 text-sm">
                    Your partner account is pending approval. We'll notify you via email once approved.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-slate-900/80 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Account Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Business Type</span>
                  <span className="text-slate-100 capitalize" data-testid="text-business-type">
                    {partnerLoading ? <Skeleton className="h-5 w-24" /> : partnerData?.type || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-slate-400">Tier</span>
                  <span className="text-slate-100 capitalize" data-testid="text-tier">
                    {partnerLoading ? <Skeleton className="h-5 w-20" /> : partnerData?.tier || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-slate-400">Status</span>
                  {partnerLoading ? (
                    <Skeleton className="h-5 w-20" />
                  ) : (
                    <Badge className={getStatusColor(partnerData?.status || "")} data-testid="badge-partner-status">
                      {partnerData?.status || "Unknown"}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Contact Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-slate-400">Company</span>
                  <span className="text-slate-100" data-testid="text-company-name">
                    {partnerLoading ? <Skeleton className="h-5 w-32" /> : partnerData?.companyName || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-slate-400">Contact</span>
                  <span className="text-slate-100" data-testid="text-contact-person">
                    {partnerLoading ? <Skeleton className="h-5 w-32" /> : partnerData?.contactPerson || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-slate-400">Email</span>
                  <span className="text-slate-100 truncate max-w-[200px]" data-testid="text-email">
                    {partnerLoading ? <Skeleton className="h-5 w-40" /> : partnerData?.email || "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900/80 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">Recent Leads</CardTitle>
            <CardDescription className="text-slate-400">
              Track your leads through the sales funnel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No leads yet</p>
                <p className="text-sm">Leads will appear here as customers interact with your listing</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">Lead ID</TableHead>
                    <TableHead className="text-slate-400">Type</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Created</TableHead>
                    <TableHead className="text-slate-400 text-right">Value</TableHead>
                    <TableHead className="text-slate-400 text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.slice(0, 10).map((lead) => (
                    <TableRow key={lead.id} className="border-slate-700" data-testid={`row-lead-${lead.id}`}>
                      <TableCell className="text-sky-300 font-mono text-sm">
                        {lead.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-slate-100 capitalize">
                        {lead.leadType}
                      </TableCell>
                      <TableCell>
                        <Badge className={getLeadStatusColor(lead.status)}>
                          {lead.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {formatDate(lead.createdAt)}
                      </TableCell>
                      <TableCell className="text-right text-slate-100">
                        {formatCurrency(lead.claimValue)}
                      </TableCell>
                      <TableCell className="text-right text-emerald-400">
                        {formatCurrency(lead.commissionAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
