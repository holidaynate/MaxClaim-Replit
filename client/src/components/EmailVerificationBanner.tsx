import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function EmailVerificationBanner() {
  const { toast } = useToast();
  const [resent, setResent] = useState(false);

  const { data: verificationStatus, isLoading } = useQuery({
    queryKey: ['/api/auth/verification-status'],
    queryFn: async () => {
      const res = await fetch('/api/auth/verification-status');
      if (!res.ok) return { emailVerified: true };
      return res.json();
    },
    staleTime: 30000,
  });

  const resendMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/auth/resend-verification", { email });
      return res.json();
    },
    onSuccess: () => {
      setResent(true);
      toast({
        title: "Verification email sent",
        description: "Check your inbox for the verification link.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to send email",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || verificationStatus?.emailVerified) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6" data-testid="banner-email-verification">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <Mail className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="font-medium text-amber-100">Verify your email address</p>
            <p className="text-sm text-amber-300/80">
              Please check your inbox and click the verification link to unlock all features.
            </p>
          </div>
        </div>
        
        {resent ? (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Email sent!</span>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => resendMutation.mutate(verificationStatus?.email || '')}
            disabled={resendMutation.isPending}
            className="border-amber-500/30 text-amber-100 hover:bg-amber-500/20"
            data-testid="button-resend-verification"
          >
            {resendMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Resend Email"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
