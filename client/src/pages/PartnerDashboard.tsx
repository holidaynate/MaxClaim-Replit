import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Eye, MousePointer, TrendingUp, LogOut, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-900/80 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-slate-400">Company</CardTitle>
              <Building2 className="w-4 h-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              {partnerLoading ? (
                <Skeleton className="h-6 w-32" />
              ) : (
                <div className="text-lg font-semibold text-slate-100" data-testid="text-company-name">
                  {partnerData?.companyName || "N/A"}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-slate-400">Status</CardTitle>
              <TrendingUp className="w-4 h-4 text-sky-400" />
            </CardHeader>
            <CardContent>
              {partnerLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <Badge className={getStatusColor(partnerData?.status || "")} data-testid="badge-partner-status">
                  {partnerData?.status || "Unknown"}
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-slate-400">Impressions</CardTitle>
              <Eye className="w-4 h-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400" data-testid="text-impressions">
                --
              </div>
              <p className="text-xs text-slate-500">Coming soon</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-slate-400">Clicks</CardTitle>
              <MousePointer className="w-4 h-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400" data-testid="text-clicks">
                --
              </div>
              <p className="text-xs text-slate-500">Coming soon</p>
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

        <Card className="bg-slate-900/80 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">Account Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400">Business Type</p>
                  <p className="text-slate-100 capitalize" data-testid="text-business-type">
                    {partnerLoading ? <Skeleton className="h-5 w-24" /> : partnerData?.type || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Tier</p>
                  <p className="text-slate-100 capitalize" data-testid="text-tier">
                    {partnerLoading ? <Skeleton className="h-5 w-20" /> : partnerData?.tier || "N/A"}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400">Contact Email</p>
                  <p className="text-slate-100" data-testid="text-email">
                    {partnerLoading ? <Skeleton className="h-5 w-40" /> : partnerData?.email || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Contact Person</p>
                  <p className="text-slate-100" data-testid="text-contact-person">
                    {partnerLoading ? <Skeleton className="h-5 w-32" /> : partnerData?.contactPerson || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
