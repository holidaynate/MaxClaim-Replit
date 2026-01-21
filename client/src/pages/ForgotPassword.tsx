import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPasswordMutation.mutate(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-900 via-slate-950 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <Card className="relative z-10 w-full max-w-md mx-4 bg-slate-900/95 backdrop-blur-xl border-slate-700 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-3xl font-black bg-gradient-to-r from-sky-400 to-purple-400 bg-clip-text text-transparent">
            Reset Password
          </CardTitle>
          <CardDescription className="text-slate-400 text-base">
            Enter your email to receive a reset link
          </CardDescription>
        </CardHeader>

        <CardContent>
          {submitted ? (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">Check Your Email</h3>
                <p className="text-slate-400 text-sm">
                  If an account exists for <span className="text-sky-400">{email}</span>, you'll receive a password reset link shortly.
                </p>
              </div>
              <p className="text-slate-500 text-xs">
                The link expires in 1 hour. Check your spam folder if you don't see it.
              </p>
              <Link href="/signin">
                <Button
                  variant="ghost"
                  className="text-sky-400 hover:text-sky-300"
                  data-testid="link-back-signin"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
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
                    data-testid="input-forgot-email"
                  />
                </div>
              </div>

              {forgotPasswordMutation.isError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium" data-testid="text-forgot-error">
                  Something went wrong. Please try again.
                </div>
              )}

              <Button
                type="submit"
                disabled={forgotPasswordMutation.isPending}
                className="w-full bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-600 hover:to-purple-600 text-white py-5 text-base font-semibold shadow-lg shadow-sky-500/30"
                data-testid="button-forgot-submit"
              >
                {forgotPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <div className="text-center pt-4">
                <Link href="/signin">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-slate-400 hover:text-slate-200"
                    data-testid="link-back-signin-form"
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
