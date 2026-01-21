import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, ArrowLeft, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token") || "";
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { data: tokenValidation, isLoading: isValidating } = useQuery({
    queryKey: ['/api/auth/verify-reset-token', token],
    queryFn: async () => {
      const res = await fetch(`/api/auth/verify-reset-token/${token}`);
      return res.json();
    },
    enabled: !!token,
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/auth/reset-password", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to reset password");
      }
    },
    onError: () => {
      setError("Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    resetPasswordMutation.mutate({ token, newPassword: password });
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-900 via-slate-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <Card className="relative z-10 w-full max-w-md mx-4 bg-slate-900/95 backdrop-blur-xl border-slate-700 shadow-2xl">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-100">Invalid Reset Link</h3>
              <p className="text-slate-400 text-sm">
                This password reset link is invalid or has expired.
              </p>
              <Link href="/forgot-password">
                <Button
                  className="mt-4 bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-600 hover:to-purple-600 text-white"
                  data-testid="link-request-new"
                >
                  Request a New Link
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-900 via-slate-950 to-slate-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Validating reset link...</p>
        </div>
      </div>
    );
  }

  if (tokenValidation && !tokenValidation.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-900 via-slate-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <Card className="relative z-10 w-full max-w-md mx-4 bg-slate-900/95 backdrop-blur-xl border-slate-700 shadow-2xl">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-100">Link Expired or Invalid</h3>
              <p className="text-slate-400 text-sm">
                {tokenValidation.error || "This password reset link is no longer valid."}
              </p>
              <Link href="/forgot-password">
                <Button
                  className="mt-4 bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-600 hover:to-purple-600 text-white"
                  data-testid="link-request-new-expired"
                >
                  Request a New Link
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-900 via-slate-950 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <Card className="relative z-10 w-full max-w-md mx-4 bg-slate-900/95 backdrop-blur-xl border-slate-700 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-3xl font-black bg-gradient-to-r from-sky-400 to-purple-400 bg-clip-text text-transparent">
            New Password
          </CardTitle>
          <CardDescription className="text-slate-400 text-base">
            {tokenValidation?.email && (
              <span>
                Setting password for <span className="text-sky-400">{tokenValidation.email}</span>
              </span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">Password Updated!</h3>
                <p className="text-slate-400 text-sm">
                  Your password has been reset successfully. You can now sign in with your new password.
                </p>
              </div>
              <Link href="/signin">
                <Button
                  className="w-full bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-600 hover:to-purple-600 text-white py-5 text-base font-semibold shadow-lg shadow-sky-500/30"
                  data-testid="button-goto-signin"
                >
                  Sign In Now
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="pl-10 pr-10 bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500/20"
                    required
                    minLength={8}
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300 font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="pl-10 bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500/20"
                    required
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium" data-testid="text-reset-error">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={resetPasswordMutation.isPending}
                className="w-full bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-600 hover:to-purple-600 text-white py-5 text-base font-semibold shadow-lg shadow-sky-500/30"
                data-testid="button-reset-submit"
              >
                {resetPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Set New Password"
                )}
              </Button>

              <div className="text-center pt-4">
                <Link href="/signin">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-slate-400 hover:text-slate-200"
                    data-testid="link-back-signin-reset"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
