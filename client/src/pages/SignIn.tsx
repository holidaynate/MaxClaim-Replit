import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Mail, Rocket, Building2, Settings, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type UserRole = "agent" | "partner" | "admin";

interface RoleOption {
  role: UserRole;
  title: string;
  subtitle: string;
  icon: typeof Rocket;
}

const roleOptions: RoleOption[] = [
  {
    role: "partner",
    title: "I'm an Advertiser/Contractor",
    subtitle: "Roofing, Adjusting, Legal, Trade Orgs",
    icon: Building2,
  },
  {
    role: "agent",
    title: "I'm an Agent/Sales Rep",
    subtitle: "Build recurring commissions up to 40%",
    icon: Rocket,
  },
  {
    role: "admin",
    title: "I'm an Admin",
    subtitle: "MaxClaim Team",
    icon: Settings,
  },
];

export default function SignIn() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [error, setError] = useState("");

  const detectRoleMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/auth/detect-role", { email });
      return res.json();
    },
  });

  const signInMutation = useMutation({
    mutationFn: async ({ email, password, role }: { email: string; password: string; role: UserRole }) => {
      const res = await apiRequest("POST", "/api/auth/signin", { email, password, role });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Signed in successfully",
          description: `Welcome back, ${data.user?.name || data.user?.email}!`,
        });
        if (data.role === "admin") {
          setLocation("/admin");
        } else if (data.role === "agent") {
          setLocation("/agent-dashboard");
        } else {
          setLocation("/partner-dashboard");
        }
      } else {
        setError(data.message || "Invalid email or password");
      }
    },
    onError: () => {
      setError("Sign-in failed. Please try again.");
    },
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const roleData = await detectRoleMutation.mutateAsync(email);

      if (!roleData.role) {
        setShowRoleSelector(true);
        return;
      }

      signInMutation.mutate({ email, password, role: roleData.role });
    } catch {
      setShowRoleSelector(true);
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    signInMutation.mutate({ email, password, role });
  };

  const isLoading = detectRoleMutation.isPending || signInMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-900 via-slate-950 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <Card className="relative z-10 w-full max-w-md mx-4 bg-slate-900/95 backdrop-blur-xl border-slate-700 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-4xl font-black bg-gradient-to-r from-sky-400 to-purple-400 bg-clip-text text-transparent">
            MaxClaim
          </CardTitle>
          <CardDescription className="text-slate-400 text-base">
            Fair Market Value Claims — Faster Recovery
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!showRoleSelector ? (
            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500/20"
                    required
                    data-testid="input-signin-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500/20"
                    required
                    data-testid="input-signin-password"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium" data-testid="text-signin-error">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-600 hover:to-purple-600 text-white py-5 text-base font-semibold shadow-lg shadow-sky-500/30"
                data-testid="button-signin-submit"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In Securely"
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-slate-300 font-medium mb-4">
                What brings you to MaxClaim?
              </p>
              {roleOptions.map((option) => (
                <button
                  key={option.role}
                  onClick={() => handleRoleSelect(option.role)}
                  disabled={isLoading}
                  className="w-full p-4 border border-slate-600 rounded-xl hover:border-sky-500 hover:bg-sky-500/10 transition text-left disabled:opacity-50"
                  data-testid={`button-role-${option.role}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-800">
                      <option.icon className="w-5 h-5 text-sky-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-100">{option.title}</div>
                      <div className="text-sm text-slate-400">{option.subtitle}</div>
                    </div>
                  </div>
                </button>
              ))}
              <Button
                variant="ghost"
                onClick={() => setShowRoleSelector(false)}
                className="w-full text-slate-400 hover:text-slate-200"
                data-testid="button-back-to-login"
              >
                Back to login
              </Button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-slate-700 text-center">
            <p className="text-sm text-slate-400 mb-3">
              First time here?{" "}
              <a href="/signup" className="font-semibold text-sky-400 hover:text-sky-300" data-testid="link-signup">
                Create an account
              </a>
            </p>
            <p className="text-xs text-slate-500">
              <Lock className="w-3 h-3 inline-block mr-1" />
              PCI Level 1 Secure • Stripe-powered payments • Your data is encrypted
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
