import { AlertCircle, CheckCircle, TrendingUp, TrendingDown, Download, Mail, Printer, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import { exportResultsToPDF } from "@/lib/pdf-export";
import { generateEmailReportSummary } from "@/lib/email-report";
import { EmailReportDialog } from "@/components/EmailReportDialog";
import { auditBatch, type BatchAuditResult, type AuditResult } from "@shared/priceAudit";
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
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const batchAuditResults: BatchAuditResult = auditBatch(
    items.map(item => ({
      name: item.description,
      price: item.unitPrice,
      qty: item.quantity
    }))
  );

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
            unit: item.unit,
            quotedPrice: item.unitPrice * item.quantity
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

  const getStatusBadge = (auditResult: AuditResult) => {
    switch (auditResult.status) {
      case 'LOW_FLAG':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            Underpaid
          </Badge>
        );
      case 'HIGH_FLAG':
        return (
          <Badge className="gap-1 bg-amber-500/20 text-amber-400 border-amber-500/30">
            <AlertCircle className="w-3 h-3" />
            Overpaid
          </Badge>
        );
      case 'PASS':
        return (
          <Badge variant="secondary" className="gap-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <CheckCircle className="w-3 h-3" />
            Fair Price
          </Badge>
        );
      case 'MISSING_ITEM':
        return (
          <Badge variant="outline" className="gap-1">
            <Info className="w-3 h-3" />
            No Data
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Info className="w-3 h-3" />
            Unknown
          </Badge>
        );
    }
  };

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
      {/* v2.0 Audit Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Items</CardDescription>
            <CardTitle className="text-2xl" data-testid="text-total-items">
              {batchAuditResults.totalItems}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className={batchAuditResults.flagBreakdown.lowFlags > 0 ? "border-amber-500/50" : ""}>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-amber-500" />
              Underpaid Items
            </CardDescription>
            <CardTitle className="text-2xl text-amber-500" data-testid="text-low-flags">
              {batchAuditResults.flagBreakdown.lowFlags}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className={batchAuditResults.flagBreakdown.highFlags > 0 ? "border-red-500/50" : ""}>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-red-500" />
              Overpaid Items
            </CardDescription>
            <CardTitle className="text-2xl text-red-500" data-testid="text-high-flags">
              {batchAuditResults.flagBreakdown.highFlags}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-2 border-green-600">
          <CardHeader className="pb-3">
            <CardDescription>Potential Underpayment</CardDescription>
            <CardTitle className="text-2xl text-green-600" data-testid="text-underpayment">
              ${batchAuditResults.potentialUnderpayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Your Claim Total</CardDescription>
            <CardTitle className="text-2xl" data-testid="text-claim-total">
              ${batchAuditResults.totalClaimValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Expected Market Value</CardDescription>
            <CardTitle className="text-2xl text-primary" data-testid="text-expected-value">
              ${batchAuditResults.totalExpectedValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className={batchAuditResults.variance < 0 ? "border-amber-500" : ""}>
          <CardHeader className="pb-3">
            <CardDescription>Variance from Market</CardDescription>
            <CardTitle className={`text-2xl flex items-center gap-2 ${batchAuditResults.variance < 0 ? 'text-amber-500' : 'text-emerald-500'}`} data-testid="text-variance">
              {batchAuditResults.variance < 0 ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
              ${Math.abs(batchAuditResults.variance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {batchAuditResults.variance < 0 ? 'Below market average' : 'Above market average'}
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* v2.0 Detailed Audit Results */}
      <Card>
        <CardHeader>
          <CardTitle>Price Audit Results</CardTitle>
          <CardDescription>
            Unit price comparison against RRC contractor minimum and insurer maximum rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">RRC Min</TableHead>
                  <TableHead className="text-right">Ins Max</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batchAuditResults.results.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{result.item}</p>
                        {result.unit && <p className="text-sm text-muted-foreground">per {result.unit}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {result.pricing ? `$${result.pricing.entered.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {result.pricing ? `$${result.pricing.rrcMin.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {result.pricing ? `$${result.pricing.insMax.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {result.quantity?.toFixed(2) || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {result.subtotal > 0 ? `$${result.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {getStatusBadge(result)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Legacy FMV Analysis from backend */}
      {summary.totalAdditional > 0 && (
        <Card className="border-2 border-green-600">
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Additional Amount You May Deserve
            </CardTitle>
            <CardDescription>
              Based on regional fair market values for ZIP code {zipCode}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600" data-testid="text-additional-amount">
              +${summary.totalAdditional.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{summary.overallIncrease.toFixed(1)}% above insurance offer</p>
          </CardContent>
        </Card>
      )}

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

              <div className="space-y-1">
                <p className="text-sm font-medium">Construction Cost Inflation</p>
                <p className="text-2xl font-bold" data-testid="text-inflation">
                  {results.regionalContext && results.regionalContext.inflationAdjustment !== 0 ? (
                    <>
                      {results.regionalContext.inflationAdjustment > 0 ? '+' : ''}
                      {results.regionalContext.inflationAdjustment}%
                    </>
                  ) : (
                    'N/A'
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {results.regionalContext && results.regionalContext.inflationAdjustment !== 0 
                    ? 'Year-over-year adjustment applied (BLS data)'
                    : 'BLS data unavailable - using static pricing'
                  }
                </p>
              </div>
            </div>

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

      {/* Disaster Relief Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Assistance and Disaster Relief Resources</CardTitle>
          <CardDescription>
            Additional support programs for your area (ZIP code: {zipCode})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <a
                href="https://www.fema.gov/assistance/individual/program"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-md border hover-elevate"
                data-testid="link-fema"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">FEMA Disaster Assistance Programs</p>
                  <p className="text-xs text-muted-foreground">Federal disaster relief and recovery programs</p>
                </div>
              </a>

              <a
                href="https://www.211.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-md border hover-elevate"
                data-testid="link-211"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">Local 211 Services</p>
                  <p className="text-xs text-muted-foreground">Food, shelter, and home repair assistance</p>
                </div>
              </a>

              <a
                href="https://www.texashomeownerassistance.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-md border hover-elevate"
                data-testid="link-texas-assistance"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">Texas Homeowner Assistance</p>
                  <p className="text-xs text-muted-foreground">State homeowner relief programs</p>
                </div>
              </a>

              <a
                href="https://www.hud.gov/info/disasterresources"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-md border hover-elevate"
                data-testid="link-hud"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">HUD Repair Programs</p>
                  <p className="text-xs text-muted-foreground">Housing repair grants and loans</p>
                </div>
              </a>

              <a
                href="https://www.bls.gov/ppi/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-md border hover-elevate"
                data-testid="link-bls"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">BLS Replacement Cost Index</p>
                  <p className="text-xs text-muted-foreground">Official construction cost data and inflation rates</p>
                </div>
              </a>

              <a
                href="https://data.texas.gov/dataset/Insurance-Complaints-All-Data"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-md border hover-elevate"
                data-testid="link-tdi"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">TDI Insurance Complaints</p>
                  <p className="text-xs text-muted-foreground">Public complaint records for insurers</p>
                </div>
              </a>
            </div>
            <p className="text-xs text-muted-foreground italic mt-4" data-testid="text-resources-context">
              All resources are relevant to your provided ZIP code ({zipCode}) for custom public aid guidance.
            </p>
          </div>
        </CardContent>
      </Card>

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
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={() => exportResultsToPDF(results)}
              data-testid="button-download"
              aria-label="Download Fair Market Value report as PDF"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Download PDF
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setEmailDialogOpen(true)}
              data-testid="button-email"
              aria-label="Email Fair Market Value report"
            >
              <Mail className="w-4 h-4" aria-hidden="true" />
              Email Report
            </Button>
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={() => window.print()}
              data-testid="button-print"
              aria-label="Print Fair Market Value report"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
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

      {/* Email Report Dialog */}
      <EmailReportDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        reportSummary={generateEmailReportSummary(results)}
      />
    </div>
  );
}
