import { AlertCircle, CheckCircle, TrendingDown, Download, Mail, Printer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ClaimItem } from "./ItemsStep";

interface ResultsStepProps {
  zipCode: string;
  items: ClaimItem[];
  onStartOver: () => void;
}

interface ItemResult extends ClaimItem {
  fmvPrice: number;
  variance: number;
  status: 'overpriced' | 'fair' | 'underpriced';
}

// Mock FMV calculation - in real app this would come from backend
function calculateFMV(items: ClaimItem[]): ItemResult[] {
  return items.map(item => {
    // Simple mock: FMV is 85-95% of quoted price with some variation
    const fmvMultiplier = 0.85 + Math.random() * 0.1;
    const fmvPrice = item.quotedPrice * fmvMultiplier;
    const variance = ((item.quotedPrice - fmvPrice) / fmvPrice) * 100;
    
    let status: 'overpriced' | 'fair' | 'underpriced' = 'fair';
    if (variance > 10) status = 'overpriced';
    else if (variance < -5) status = 'underpriced';
    
    return {
      ...item,
      fmvPrice,
      variance,
      status
    };
  });
}

export default function ResultsStep({ zipCode, items, onStartOver }: ResultsStepProps) {
  const results = calculateFMV(items);
  const totalQuoted = results.reduce((sum, item) => sum + item.quotedPrice, 0);
  const totalFMV = results.reduce((sum, item) => sum + item.fmvPrice, 0);
  const totalSavings = totalQuoted - totalFMV;
  const savingsPercent = (totalSavings / totalQuoted) * 100;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Quoted Amount</CardDescription>
            <CardTitle className="text-2xl">
              ${totalQuoted.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Fair Market Value</CardDescription>
            <CardTitle className="text-2xl text-primary">
              ${totalFMV.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Potential Savings</CardDescription>
            <CardTitle className="text-2xl text-green-600 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              ${totalSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{savingsPercent.toFixed(1)}% variance</p>
          </CardHeader>
        </Card>
      </div>

      {/* Detailed Results */}
      <Card>
        <CardHeader>
          <CardTitle>Line-Item Analysis</CardTitle>
          <CardDescription>
            Comparison of quoted prices vs. fair market values for ZIP code {zipCode}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Quoted</TableHead>
                  <TableHead className="text-right">FMV</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${item.quotedPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-primary font-medium">
                      ${item.fmvPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.variance > 0 ? '+' : ''}{item.variance.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {item.status === 'overpriced' && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Overpriced
                        </Badge>
                      )}
                      {item.status === 'fair' && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Fair
                        </Badge>
                      )}
                      {item.status === 'underpriced' && (
                        <Badge className="gap-1 bg-green-600">
                          <CheckCircle className="w-3 h-3" />
                          Good Deal
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
            <Button variant="outline" className="gap-2" data-testid="button-print">
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
