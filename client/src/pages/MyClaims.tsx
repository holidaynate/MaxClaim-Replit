import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, DollarSign, TrendingUp, Clock, LogIn } from "lucide-react";

interface UserClaim {
  id: string;
  claimId: string;
  createdAt: string;
  reportUrl: string | null;
  inputs: {
    zipCode: string;
    propertyAddress?: string;
    items: Array<{
      category: string;
      description: string;
      quantity: number;
      unit: string;
    }>;
  } | null;
  claim: {
    id: string;
    status: string;
    totalQuoted: number;
    totalFmv: number;
    additionalAmount: number;
    variancePct: number;
  };
}

interface UserClaimsResponse {
  claims: UserClaim[];
  total: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function MyClaims() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const { data, isLoading, error } = useQuery<UserClaimsResponse>({
    queryKey: ["/api/user/claims"],
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-6" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          
          <Card className="text-center py-12">
            <CardContent>
              <LogIn className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
              <p className="text-muted-foreground mb-6">
                Please sign in to view your saved claims.
              </p>
              <Button asChild data-testid="button-sign-in-page">
                <a href="/api/login">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In with Replit
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold" data-testid="text-page-title">My Claims</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your saved claim analyses.
          </p>
        </div>

        {isLoading && (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-3 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="py-8 text-center">
              <p className="text-destructive">Failed to load claims. Please try again.</p>
            </CardContent>
          </Card>
        )}

        {data && data.claims.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Claims Yet</h2>
              <p className="text-muted-foreground mb-6">
                You haven't saved any claim analyses yet.
              </p>
              <Link href="/">
                <Button data-testid="button-start-claim">
                  Start a New Claim Analysis
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {data && data.claims.length > 0 && (
          <div className="grid gap-4">
            {data.claims.map((claim) => (
              <Card key={claim.id} className="hover-elevate" data-testid={`card-claim-${claim.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Claim Analysis
                        <Badge variant="outline" className="ml-2">
                          {claim.claim.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(claim.createdAt)}
                        {claim.inputs?.zipCode && (
                          <>
                            <span>·</span>
                            ZIP: {claim.inputs.zipCode}
                          </>
                        )}
                      </CardDescription>
                    </div>
                    {claim.reportUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={claim.reportUrl} target="_blank" rel="noopener noreferrer">
                          View Report
                        </a>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Insurance Offer</p>
                        <p className="font-semibold" data-testid={`text-quoted-${claim.id}`}>
                          {formatCurrency(claim.claim.totalQuoted)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Fair Market Value</p>
                        <p className="font-semibold text-primary" data-testid={`text-fmv-${claim.id}`}>
                          {formatCurrency(claim.claim.totalFmv)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-muted-foreground">Additional Potential</p>
                        <p className="font-semibold text-green-600" data-testid={`text-additional-${claim.id}`}>
                          +{formatCurrency(claim.claim.additionalAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {claim.inputs?.items && claim.inputs.items.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2">
                        {claim.inputs.items.length} item{claim.inputs.items.length !== 1 ? "s" : ""} analyzed
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set(claim.inputs.items.map((i) => i.category))).slice(0, 5).map((cat) => (
                          <Badge key={cat} variant="secondary" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                        {new Set(claim.inputs.items.map((i) => i.category)).size > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{new Set(claim.inputs.items.map((i) => i.category)).size - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
