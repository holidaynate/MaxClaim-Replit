import { FileCheck, MapPin, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ClaimItem } from "./ItemsStep";

interface ReviewStepProps {
  zipCode: string;
  items: ClaimItem[];
  onCalculate: () => void;
  onBack: () => void;
}

export default function ReviewStep({ zipCode, items, onCalculate, onBack }: ReviewStepProps) {
  const totalClaim = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-primary" />
          Review Your Claim
        </CardTitle>
        <CardDescription>
          Verify all information before calculating what you actually deserve
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2 p-4 bg-muted rounded-md">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Property Location</p>
            <p className="text-sm text-muted-foreground">ZIP Code: {zipCode}</p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Claim Items ({items.length})</h3>
          </div>
          
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.category}</TableCell>
                    <TableCell className="text-muted-foreground">{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.unit || 'EA'}</TableCell>
                    <TableCell className="text-right">
                      ${item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${(item.unitPrice * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={5} className="font-semibold">Total Claim Value</TableCell>
                  <TableCell className="text-right font-semibold text-lg">
                    ${totalClaim.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onBack} data-testid="button-back">
            Back to Items
          </Button>
          <Button 
            className="flex-1"
            onClick={onCalculate}
            data-testid="button-calculate"
          >
            Calculate Fair Market Value
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
