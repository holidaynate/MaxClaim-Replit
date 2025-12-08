import { AlertCircle, CheckCircle, TrendingUp, TrendingDown, Download, Mail, Printer, AlertTriangle, Info, DollarSign, MapPin, Shield, Building2, Phone, ExternalLink, Award, BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import { exportResultsToPDF } from "@/lib/pdf-export";
import { generateEmailReportSummary } from "@/lib/email-report";
import { EmailReportDialog } from "@/components/EmailReportDialog";
import type { ClaimItem } from "./ItemsStep";

interface ResultsStepProps {
  zipCode: string;
  items: ClaimItem[];
  onStartOver: () => void;
}

interface PricingSource {
  name: string;
  type: 'primary' | 'secondary' | 'tertiary' | 'user';
  citation: string;
  weight: number;
  lastUpdated: string;
  url?: string;
}

interface ItemCitation {
  sources: PricingSource[];
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  shortCitation: string;
  methodology: string;
  lowEstimate: number;
  highEstimate: number;
  regionalMultiplier: number;
  regionName: string;
}

interface ItemResult {
  category: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  insuranceOffer: number;
  fmvPrice: number;
  additionalAmount: number;
  percentageIncrease: number;
  status: 'underpaid' | 'fair';
  citation?: ItemCitation | null;
}

interface RegionalContext {
  femaClaimCount: number;
  avgFEMAPayment: number;
  inflationAdjustment: number;
  topComplaints: Array<{ company: string; count: number }>;
}

interface DetectedLocation {
  areaCode: string;
  metro: string;
  description: string;
}

interface MatchedPartner {
  id: string;
  companyName: string;
  type: string;
  tier: string;
  phone: string;
  website?: string;
  licenseNumber?: string;
  score: number;
  matchReasons: string[];
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
  detectedLocation?: DetectedLocation;
  matchedPartners?: MatchedPartner[];
}

export default function ResultsStep({ zipCode, items, onStartOver }: ResultsStepProps) {
  const [results, setResults] = useState<AnalysisResponse | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

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

  const getStatusBadge = (status: 'underpaid' | 'fair') => {
    switch (status) {
      case 'underpaid':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            Underpaid
          </Badge>
        );
      case 'fair':
        return (
          <Badge className="gap-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <CheckCircle className="w-3 h-3" />
            Fair Value
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
  
  const getConfidenceBadge = (level: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (level) {
      case 'HIGH':
        return <Badge className="gap-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">High Confidence</Badge>;
      case 'MEDIUM':
        return <Badge className="gap-1 bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Medium Confidence</Badge>;
      case 'LOW':
        return <Badge variant="outline" className="gap-1 text-xs">Low Confidence</Badge>;
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
  
  const underpaidCount = itemResults.filter(item => item.status === 'underpaid').length;
  const fairCount = itemResults.filter(item => item.status === 'fair').length;

  return (
    <div className="space-y-6">
      {/* v2.0 Audit Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Items</CardDescription>
            <CardTitle className="text-2xl" data-testid="text-total-items">
              {itemResults.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className={underpaidCount > 0 ? "border-amber-500/50" : ""}>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-amber-500" />
              Underpaid Items
            </CardDescription>
            <CardTitle className="text-2xl text-amber-500" data-testid="text-low-flags">
              {underpaidCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className={fairCount > 0 ? "border-emerald-500/50" : ""}>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              FMV Achieved
            </CardDescription>
            <CardTitle className="text-2xl text-emerald-500" data-testid="text-fmv-items">
              {fairCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-2 border-green-600">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-green-600" />
              Underpayment Opportunity
            </CardDescription>
            <CardTitle className="text-2xl text-green-600" data-testid="text-underpayment">
              ${summary.totalAdditional > 0 ? summary.totalAdditional.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
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
              ${summary.totalInsuranceOffer.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Fair Market Value Total</CardDescription>
            <CardTitle className="text-2xl text-primary" data-testid="text-fmv-total">
              ${summary.totalFMV.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className={summary.totalAdditional > 0 ? "border-green-500" : ""}>
          <CardHeader className="pb-3">
            <CardDescription>You Could Claim More</CardDescription>
            <CardTitle className={`text-2xl flex items-center gap-2 ${summary.totalAdditional > 0 ? 'text-green-500' : 'text-emerald-500'}`} data-testid="text-opportunity">
              {summary.totalAdditional > 0 && <TrendingUp className="w-5 h-5" />}
              +${summary.totalAdditional > 0 ? summary.totalAdditional.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {summary.totalAdditional > 0 ? `${summary.overallIncrease.toFixed(1)}% above insurance offer` : 'All items at fair market value'}
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Fair Market Value Analysis - Using Baseline Pricing Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Fair Market Value Analysis
          </CardTitle>
          <CardDescription>
            FMV estimates based on regional construction costs with multi-source citation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Insurance Offer</TableHead>
                  <TableHead className="text-right">FMV Estimate</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Additional</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-center">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemResults.map((item, index) => (
                  <TableRow key={index} data-testid={`row-item-${index}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">{item.category}{item.unit ? ` - per ${item.unit}` : ''}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${item.insuranceOffer.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-emerald-400 font-medium">
                      <div>
                        ${item.fmvPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        {item.citation && (
                          <p className="text-xs text-muted-foreground">
                            ${item.citation.lowEstimate.toFixed(2)} - ${item.citation.highEstimate.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.additionalAmount > 0 ? (
                        <span className="text-green-500 font-medium">
                          +${item.additionalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell className="text-center" data-testid={`source-cell-${index}`}>
                      {item.citation ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              className="cursor-help inline-flex flex-col items-center gap-1"
                              data-testid={`citation-trigger-${index}`}
                            >
                              {getConfidenceBadge(item.citation.confidenceLevel)}
                              {item.citation.regionName && (
                                <span className="text-xs text-muted-foreground" data-testid={`region-name-${index}`}>
                                  {item.citation.regionName}
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm" data-testid={`citation-tooltip-${index}`}>
                            <div className="space-y-2">
                              <p className="font-medium">Data Sources:</p>
                              <ul className="text-sm space-y-1">
                                {item.citation.sources.map((source, i) => (
                                  <li key={i} className="flex justify-between gap-2">
                                    <span className="text-muted-foreground">{source.type}:</span>
                                    <span>{source.name}</span>
                                  </li>
                                ))}
                              </ul>
                              {item.citation.regionalMultiplier !== 1 && (
                                <p className="text-xs text-muted-foreground">
                                  Regional adjustment: {(item.citation.regionalMultiplier * 100 - 100).toFixed(0)}%
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground italic">
                                {item.citation.methodology}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Badge variant="outline" className="text-xs" data-testid={`baseline-badge-${index}`}>Baseline</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Additional Amount Summary */}
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

      {/* Detected Location & Matched Local Partners */}
      {results.detectedLocation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Your Location & Matched Local Contractors
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Privacy-first: We only detect your general area, never your exact address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-md bg-muted/50 border">
              <p className="text-sm font-medium mb-1">Detected Area</p>
              <p className="text-sm text-muted-foreground" data-testid="text-detected-location">
                {results.detectedLocation.description}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Area Code: {results.detectedLocation.areaCode} • Metro: {results.detectedLocation.metro}
              </p>
            </div>

            {results.matchedPartners && results.matchedPartners.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Top Matched Local Contractors</p>
                <div className="space-y-3">
                  {results.matchedPartners.map((partner, idx) => (
                    <div 
                      key={partner.id} 
                      className="p-3 rounded-md border hover-elevate"
                      data-testid={`matched-partner-${idx}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold">{partner.companyName}</h4>
                            {partner.tier === 'premium' && (
                              <Badge variant="secondary" className="text-xs">
                                <Award className="w-3 h-3 mr-1" />
                                Premium
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              Match Score: {Math.round(partner.score)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Building2 className="w-3 h-3" />
                            {partner.type}
                            {partner.licenseNumber && (
                              <span className="ml-2">License: {partner.licenseNumber}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {partner.matchReasons && partner.matchReasons.length > 0 && (
                        <div className="text-xs text-muted-foreground mb-2">
                          <span className="font-medium">Why matched: </span>
                          {partner.matchReasons.join(' • ')}
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {partner.phone && (
                          <a 
                            href={`tel:${partner.phone}`}
                            className="inline-flex items-center gap-1 text-xs hover:underline"
                            data-testid={`link-phone-${idx}`}
                          >
                            <Phone className="w-3 h-3" />
                            {partner.phone}
                          </a>
                        )}
                        {partner.website && (
                          <a 
                            href={partner.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs hover:underline"
                            data-testid={`link-website-${idx}`}
                          >
                            <ExternalLink className="w-3 h-3" />
                            Visit Website
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Contractors are ranked by proximity to your area and service quality. MaxClaim may receive referral fees from some partners.
                </p>
              </div>
            )}

            {(!results.matchedPartners || results.matchedPartners.length === 0) && (
              <div className="text-center p-6 border rounded-md bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  No local contractors found in our database for your area yet.
                </p>
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
