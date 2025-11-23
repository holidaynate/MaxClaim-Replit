import { AlertCircle, CheckCircle, TrendingUp, Download, Mail, Printer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import type { ClaimItem } from "./ItemsStep";

interface ResultsStepProps {
  zipCode: string;
  items: ClaimItem[];
  onStartOver: () => void;
}

interface ItemResult {
  category: string;
  description: string;
  quantity: number;
  insuranceOffer: number;
  fmvPrice: number;
  additionalAmount: number;
  percentageIncrease: number;
  status: 'underpaid' | 'fair';
}

interface RegionalContext {
  femaClaimCount: number;
  avgFEMAPayment: number;
  inflationAdjustment: number;
  topComplaints: Array<{ company: string; count: number }>;
}

interface AnalysisResponse {
  zipCode: string;
  items: ItemResult[];
  summary: {
    totalInsuranceOffer: number;
    totalFMV: number;
    totalAdditional: number;
    overallIncrease: number;
  };
  regionalContext?: RegionalContext;
}

export default function ResultsStep({ zipCode, items, onStartOver }: ResultsStepProps) {
  const [results, setResults] = useState<AnalysisResponse | null>(null);

  const analysisMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/claims/analyze",
        {
          zipCode,
          items: items.map(item => ({
            category: item.category,
            description: item.description,
            quantity: item.quantity,
            quotedPrice: item.quotedPrice
          }))
        }
      );
      return await response.json() as AnalysisResponse;
    },
    onSuccess: (data: AnalysisResponse) => {
      setResults(data);
    }
  });

  useEffect(() => {
    analysisMutation.mutate();
  }, []);

  if (analysisMutation.isPending || !results) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Analyzing your claim against regional fair market values...</p>
          <p className="text-sm text-muted-foreground">Fetching real-time data from FEMA, BLS, and regional sources...</p>
        </div>
      </div>
    );
  }

  if (analysisMutation.isError) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Analysis Failed</CardTitle>
          <CardDescription>
            We encountered an error calculating your fair market values. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => analysisMutation.mutate()}>Retry Analysis</Button>
        </CardContent>
      </Card>
    );
  }

  const { summary, items: itemResults } = results;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Insurance Company Offer</CardDescription>
            <CardTitle className="text-2xl">
              ${summary.totalInsuranceOffer.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Fair Market Value</CardDescription>
            <CardTitle className="text-2xl text-primary">
              ${summary.totalFMV.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-2 border-green-600">
          <CardHeader className="pb-3">
            <CardDescription>Additional Amount You Deserve</CardDescription>
            <CardTitle className="text-2xl text-green-600 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              ${summary.totalAdditional.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{summary.overallIncrease.toFixed(1)}% increase</p>
          </CardHeader>
        </Card>
      </div>

      {/* Detailed Results */}
      <Card>
        <CardHeader>
          <CardTitle>Line-Item Analysis</CardTitle>
          <CardDescription>
            Comparison of insurance offer vs. fair market values for ZIP code {zipCode}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Insurance Offer</TableHead>
                  <TableHead className="text-right">Fair Market Value</TableHead>
                  <TableHead className="text-right">Additional</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemResults.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${item.insuranceOffer.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-primary font-medium">
                      ${item.fmvPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      +${item.additionalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.status === 'underpaid' && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Underpaid
                        </Badge>
                      )}
                      {item.status === 'fair' && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Fair Offer
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Regional Context from External APIs */}
      {results.regionalContext && (
        <Card>
          <CardHeader>
            <CardTitle>Regional Insurance Data</CardTitle>
            <CardDescription>
              Real-world data from FEMA, BLS, and public records for ZIP {zipCode}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* FEMA Claims Data */}
              {results.regionalContext.femaClaimCount > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Historical Claims in Your Area</p>
                  <p className="text-2xl font-bold" data-testid="text-fema-count">
                    {results.regionalContext.femaClaimCount}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    FEMA flood insurance claims
                  </p>
                  {results.regionalContext.avgFEMAPayment > 0 && (
                    <p className="text-sm text-muted-foreground" data-testid="text-fema-avg">
                      Avg payment: ${results.regionalContext.avgFEMAPayment.toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* BLS Inflation Adjustment */}
              {results.regionalContext.inflationAdjustment !== 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Construction Cost Inflation</p>
                  <p className="text-2xl font-bold" data-testid="text-inflation">
                    {results.regionalContext.inflationAdjustment > 0 ? '+' : ''}
                    {results.regionalContext.inflationAdjustment}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Applied to your FMV calculation (BLS data)
                  </p>
                </div>
              )}
            </div>

            {/* Top Insurance Complaints */}
            {results.regionalContext.topComplaints && results.regionalContext.topComplaints.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Most Complained About Insurers (Texas)</p>
                <div className="space-y-1">
                  {results.regionalContext.topComplaints.map((complaint, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm" data-testid={`complaint-${idx}`}>
                      <span className="text-muted-foreground">{complaint.company}</span>
                      <Badge variant="outline">{complaint.count} complaints</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Export Your Analysis</CardTitle>
          <CardDescription>
            Download or share your Fair Market Value report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button variant="outline" className="gap-2" data-testid="button-download">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            <Button variant="outline" className="gap-2" data-testid="button-email">
              <Mail className="w-4 h-4" />
              Email Report
            </Button>
            <Button variant="outline" className="gap-2" data-testid="button-print" onClick={() => window.print()}>
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </div>
          <Button 
            variant="secondary" 
            className="w-full"
            onClick={onStartOver}
            data-testid="button-new-claim"
          >
            Start New Claim Analysis
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
