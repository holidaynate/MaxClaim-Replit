import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Users, TrendingUp, Copy, LogOut, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";

export default function AgentDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: authData, isLoading: authLoading } = useQuery<{
    authenticated: boolean;
    role: string;
    id: string;
  }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: agentResponse, isLoading: agentLoading } = useQuery<{
    agent: {
      id: string;
      name: string;
      email: string;
      agentRefCode: string;
      totalEarned: number;
      ytdEarnings: number;
      status: string;
    };
  }>({
    queryKey: [`/api/sales-agents/${authData?.id}`],
    enabled: !!authData?.id && authData?.role === "agent",
  });

  const agentData = agentResponse?.agent;

  const handleLogout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    setLocation("/signin");
  };

  const copyRefCode = () => {
    if (agentData?.agentRefCode) {
      navigator.clipboard.writeText(agentData.agentRefCode);
      toast({
        title: "Copied!",
        description: "Your referral code has been copied to clipboard",
      });
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

  if (!authData?.authenticated || authData.role !== "agent") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6">
        <Card className="bg-slate-900/90 border-slate-700 max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-slate-100">Access Denied</CardTitle>
            <CardDescription className="text-slate-400">
              Please sign in as an advocate to access this dashboard.
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
              <h1 className="text-3xl font-bold text-slate-100">Advocate Dashboard</h1>
              <p className="text-slate-400">Welcome back, {agentData?.name || "Advocate"}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <EmailVerificationBanner />

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-900/80 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Earned</CardTitle>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              {agentLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-emerald-400" data-testid="text-total-earned">
                  ${(agentData?.totalEarned || 0).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-slate-400">YTD Earnings</CardTitle>
              <TrendingUp className="w-4 h-4 text-sky-400" />
            </CardHeader>
            <CardContent>
              {agentLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-sky-400" data-testid="text-ytd-earnings">
                  ${(agentData?.ytdEarnings || 0).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-slate-400">Status</CardTitle>
              <Users className="w-4 h-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              {agentLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <Badge 
                  variant={agentData?.status === "active" ? "default" : "secondary"}
                  className={agentData?.status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}
                  data-testid="badge-agent-status"
                >
                  {agentData?.status || "Unknown"}
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900/80 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-slate-100">Your Referral Code</CardTitle>
            <CardDescription className="text-slate-400">
              Share this code with partners. When they sign up with your code, you earn commissions!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="bg-slate-800 border border-slate-600 rounded-lg px-6 py-4 font-mono text-2xl text-sky-400" data-testid="text-ref-code">
                {agentLoading ? <Skeleton className="h-8 w-32" /> : agentData?.agentRefCode || "N/A"}
              </div>
              <Button
                variant="outline"
                onClick={copyRefCode}
                disabled={!agentData?.agentRefCode}
                data-testid="button-copy-refcode"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-slate-300">
              <p>
                <span className="font-semibold text-sky-400">1.</span> Share your referral code with contractors, adjusters, and attorneys.
              </p>
              <p>
                <span className="font-semibold text-sky-400">2.</span> When they sign up as partners, you earn 15-40% commission on their subscription.
              </p>
              <p>
                <span className="font-semibold text-sky-400">3.</span> Recurring commissions are paid monthly via Stripe Connect.
              </p>
              <p className="text-sm text-slate-500 mt-4">
                Need help? Contact support@maxclaim.com
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
