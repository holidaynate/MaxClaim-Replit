import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, Building2, Mail, Phone, MapPin } from "lucide-react";

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

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const { toast } = useToast();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/status", {
          credentials: "include",
        });
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

  // Fetch partners based on status
  const { data: partnersData, isLoading } = useQuery<{ partners: Partner[] }>({
    queryKey: ["/api/partners", activeTab],
    queryFn: async () => {
      const res = await fetch(`/api/partners?status=${activeTab}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch partners: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const partners = partnersData?.partners || [];

  // Approve partner mutation
  const approveMutation = useMutation({
    mutationFn: async (partnerId: number) => {
      return apiRequest(`/api/partners/${partnerId}/status`, "PATCH", {
        status: "approved",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      toast({
        title: "Partner Approved",
        description: "Partner has been approved and is now visible to users.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve partner",
        variant: "destructive",
      });
    },
  });

  // Reject partner mutation
  const rejectMutation = useMutation({
    mutationFn: async (partnerId: number) => {
      return apiRequest(`/api/partners/${partnerId}/status`, "PATCH", {
        status: "rejected",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      toast({
        title: "Partner Rejected",
        description: "Partner application has been rejected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject partner",
        variant: "destructive",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("/api/admin/login", "POST", { password });
      return res.json();
    },
    onSuccess: () => {
      setIsAuthenticated(true);
      toast({
        title: "Welcome",
        description: "Logged in to admin dashboard",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Access Denied",
        description: "Incorrect password",
        variant: "destructive",
      });
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
            <CardDescription>Enter password to access partner dashboard</CardDescription>
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
              <Button 
                type="submit" 
                className="w-full" 
                data-testid="button-admin-login"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Partner Dashboard</h1>
          <p className="text-slate-400">Review and manage partner applications</p>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending" data-testid="tab-pending">
              <Clock className="h-4 w-4 mr-2" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approved
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected">
              <XCircle className="h-4 w-4 mr-2" />
              Rejected
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-slate-400">Loading partners...</p>
                </CardContent>
              </Card>
            ) : partners.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-slate-400">
                    No {activeTab} partners found
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {partners.map((partner) => (
                  <Card key={partner.id} data-testid={`card-partner-${partner.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            {partner.companyName}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {partner.type.charAt(0).toUpperCase() + partner.type.slice(1)} •{" "}
                            {partner.tier.charAt(0).toUpperCase() + partner.tier.slice(1)} Tier
                          </CardDescription>
                        </div>
                        <Badge
                          variant={
                            partner.status === "approved"
                              ? "default"
                              : partner.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                        >
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
                              <a
                                href={partner.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-500 hover:text-sky-400"
                              >
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
                            <span className="text-slate-300">
                              {new Date(partner.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {partner.status === "pending" && (
                        <div className="flex gap-2 pt-4">
                          <Button
                            onClick={() => approveMutation.mutate(partner.id)}
                            disabled={approveMutation.isPending}
                            className="flex-1"
                            data-testid={`button-approve-${partner.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => rejectMutation.mutate(partner.id)}
                            disabled={rejectMutation.isPending}
                            variant="destructive"
                            className="flex-1"
                            data-testid={`button-reject-${partner.id}`}
                          >
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
        </Tabs>
      </div>
    </div>
  );
}
