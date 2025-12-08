import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Mail, RefreshCw } from "lucide-react";

export default function VerifyEmail() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token") || "";
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ['/api/auth/verify-email', token],
    queryFn: async () => {
      const res = await fetch(`/api/auth/verify-email/${token}`);
      return res.json();
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (data) {
      if (data.success) {
        setVerified(true);
      } else {
        setError(data.error || "Verification failed");
      }
    }
  }, [data]);

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
                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-amber-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-100">Check Your Email</h3>
              <p className="text-slate-400 text-sm">
                We've sent you a verification link. Click the link in your email to verify your account.
              </p>
              <Link href="/signin">
                <Button
                  variant="ghost"
                  className="mt-4 text-sky-400 hover:text-sky-300"
                  data-testid="link-back-signin-no-token"
                >
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-900 via-slate-950 to-slate-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (error) {
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
              <h3 className="text-lg font-semibold text-slate-100">Verification Failed</h3>
              <p className="text-slate-400 text-sm">{error}</p>
              <div className="flex flex-col gap-2 pt-4">
                <Link href="/signin">
                  <Button
                    className="w-full bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-600 hover:to-purple-600 text-white"
                    data-testid="button-goto-signin-error"
                  >
                    Go to Sign In
                  </Button>
                </Link>
              </div>
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
            Email Verified!
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div>
              <p className="text-slate-300 text-base mb-2">
                Your email has been verified successfully.
              </p>
              <p className="text-slate-400 text-sm">
                {data?.userType === 'agent' 
                  ? 'You can now access your advocate dashboard and start earning commissions!'
                  : 'You can now access your partner dashboard.'}
              </p>
            </div>
            <Link href={data?.userType === 'agent' ? '/agent-dashboard' : '/partner-dashboard'}>
              <Button
                className="w-full bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-600 hover:to-purple-600 text-white py-5 text-base font-semibold shadow-lg shadow-sky-500/30"
                data-testid="button-goto-dashboard"
              >
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
