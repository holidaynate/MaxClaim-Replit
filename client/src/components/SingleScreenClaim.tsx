import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { DocumentUpload } from "./DocumentUpload";
import { auditClaimItem, auditClaimItemLegacy } from "@shared/priceAudit";
import type { ClaimItem } from "./ItemsStep";

const TRUST_BADGES = [
  { icon: Check, text: "No Credit Card Required" },
  { icon: Check, text: "90%+ Success Rate" },
  { icon: Check, text: "Updated with Live Data" },
  { icon: Check, text: "No Risk to You" },
];

const DAMAGE_TYPES = [
  "Roofing & Exterior",
  "Water Damage",
  "Fire Damage",
  "Hail Damage",
  "Wind Damage",
  "Foundation",
  "Other Structural",
];

interface SingleScreenClaimProps {
  onCalculate: (data: {
    zipCode: string;
    propertyAddress?: string;
    damageType: string;
    insuranceOffer: number;
    items: ClaimItem[];
  }) => void;
  onAnalysisComplete: (results: any) => void;
  onZipChange?: (zip: string) => void;
  resetKey?: number;
}

export default function SingleScreenClaim({ onCalculate, onAnalysisComplete, onZipChange, resetKey = 0 }: SingleScreenClaimProps) {
  const [zipCode, setZipCode] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [damageType, setDamageType] = useState("");
  const [insuranceOffer, setInsuranceOffer] = useState("");
  const [items, setItems] = useState<ClaimItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (resetKey === 0) return;
    setZipCode("");
    setPropertyAddress("");
    setDamageType("");
    setInsuranceOffer("");
    setItems([]);
    if (onZipChange) {
      onZipChange("");
    }
  }, [resetKey, onZipChange]);

  const persistAuditResults = async (itemsToAudit: ClaimItem[], zip: string) => {
    for (const item of itemsToAudit) {
      if (!item.description || item.unitPrice <= 0) continue;
      
      const audit = auditClaimItemLegacy(item.description, item.unitPrice);
      if (!audit) continue;
      
      try {
        await apiRequest("POST", "/api/price-audits", {
          itemName: item.description,
          matchedItem: audit.matchedItem,
          userPrice: item.unitPrice,
          marketMin: audit.min,
          marketAvg: audit.avg,
          marketMax: audit.max,
          unit: audit.unit,
          category: item.category,
          flag: audit.flag,
          severity: audit.severity,
          percentFromAvg: audit.percentFromAvg,
          sampleSize: audit.sampleSize,
          zipCode: zip,
        });
      } catch (error) {
        console.error("Failed to persist audit result:", error);
      }
    }
  };

  const analysisMutation = useMutation({
    mutationFn: async (data: {
      zipCode: string;
      propertyAddress?: string;
      items: Array<{
        category: string;
        description: string;
        quantity: number;
        unit: string;
        quotedPrice: number;
      }>;
    }) => {
      const response = await apiRequest("POST", "/api/claims/analyze", data);
      return await response.json();
    },
    onSuccess: async (data, variables) => {
      const itemsForAudit: ClaimItem[] = variables.items.map(item => ({
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.quotedPrice / item.quantity
      }));
      persistAuditResults(itemsForAudit, variables.zipCode);
      
      onAnalysisComplete(data);
      toast({
        title: "Analysis Complete",
        description: "Your claim has been analyzed successfully.",
      });
    },
    onError: (error) => {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze your claim. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleExtractedItems = (extractedItems: any[]) => {
    const newItems: ClaimItem[] = extractedItems.map(item => ({
      category: item.category || "Other",
      description: item.description,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || item.quotedPrice || 0,
      unit: item.unit || "EA",
    }));
    setItems([...items, ...newItems]);
    
    const total = newItems.reduce((sum, item) => sum + ((item.unitPrice || 0) * item.quantity), 0);
    if (total > 0 && !insuranceOffer) {
      setInsuranceOffer(total.toString());
    }
    
    toast({
      title: "Document Processed",
      description: `Extracted ${newItems.length} item(s) from your document.`,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (zipCode.length < 5) {
      toast({
        title: "ZIP Code Required",
        description: "Please enter a valid 5-digit ZIP code.",
        variant: "destructive",
      });
      return;
    }
    
    if (!damageType) {
      toast({
        title: "Damage Type Required",
        description: "Please select the type of damage.",
        variant: "destructive",
      });
      return;
    }
    
    if (!insuranceOffer || parseFloat(insuranceOffer) <= 0) {
      toast({
        title: "Insurance Offer Required",
        description: "Please enter the insurance company's offer amount.",
        variant: "destructive",
      });
      return;
    }

    const submissionItems: ClaimItem[] = items.length > 0 ? items : [{
      category: damageType,
      description: `${damageType} repair`,
      quantity: 1,
      unitPrice: parseFloat(insuranceOffer),
      unit: "EA",
    }];
    
    analysisMutation.mutate({
      zipCode,
      propertyAddress: propertyAddress || undefined,
      items: submissionItems.map(item => ({
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || "EA",
        quotedPrice: item.unitPrice * item.quantity,
      })),
    });

    onCalculate({
      zipCode,
      propertyAddress,
      damageType,
      insuranceOffer: parseFloat(insuranceOffer),
      items: submissionItems,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 relative">
      <div 
        className="fixed inset-0 pointer-events-none z-10 flex items-center justify-center"
        style={{ 
          background: 'repeating-linear-gradient(45deg, transparent, transparent 200px, rgba(0, 0, 0, 0.015) 200px, rgba(0, 0, 0, 0.015) 400px)' 
        }}
        aria-hidden="true"
        role="presentation"
      >
        <div className="text-9xl font-bold opacity-[0.02] select-none rotate-[-30deg] whitespace-nowrap">
          MAX-CLAIM
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 p-6 rounded-lg">
          {TRUST_BADGES.map((badge, index) => (
            <div key={index} className="flex items-center gap-2 text-sm" data-testid={`trust-badge-${index}`}>
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white flex-shrink-0">
                <badge.icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">{badge.text}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-center text-muted-foreground">
          Data sources: FEMA NFIP Claims, BLS Construction PPI, Texas DOI Complaints, and 23 open-source databases
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">Step 1: Enter Your Information</h1>
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="font-semibold text-foreground">1. Upload</span>
              <ArrowRight className="w-4 h-4" />
            </span>
            <span className="flex items-center gap-1">
              <span className="font-semibold text-foreground">2. Details</span>
              <ArrowRight className="w-4 h-4" />
            </span>
            <span className="font-semibold text-foreground">3. Calculate</span>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
              <DocumentUpload onItemsExtracted={handleExtractedItems} />
              
              <Button 
                type="submit" 
                className="w-full text-lg h-12"
                disabled={analysisMutation.isPending}
                data-testid="button-verify-fmv"
              >
                {analysisMutation.isPending ? "Analyzing..." : "Verify Fair Market Value"}
              </Button>
              
              <p className="text-center text-sm text-muted-foreground">- OR -</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                type="text"
                placeholder="78744"
                value={zipCode}
                onChange={(e) => {
                  const newZip = e.target.value.replace(/\D/g, '').slice(0, 5);
                  setZipCode(newZip);
                  if (onZipChange) {
                    onZipChange(newZip.length === 5 ? newZip : "");
                  }
                }}
                maxLength={5}
                required
                data-testid="input-zipcode"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyAddress">Property Address (Optional)</Label>
              <Input
                id="propertyAddress"
                type="text"
                placeholder="123 Main St, Austin, TX"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                data-testid="input-property-address"
              />
              <p className="text-xs text-muted-foreground">
                Providing your address helps us get more accurate property valuations
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="damageType">Type of Damage</Label>
              <Select value={damageType} onValueChange={setDamageType} required>
                <SelectTrigger id="damageType" data-testid="select-damage-type">
                  <SelectValue placeholder="Select damage type" />
                </SelectTrigger>
                <SelectContent>
                  {DAMAGE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="insuranceOffer">Insurance Offer Amount ($)</Label>
              <Input
                id="insuranceOffer"
                type="number"
                placeholder="45000"
                value={insuranceOffer}
                onChange={(e) => setInsuranceOffer(e.target.value)}
                required
                min="0"
                step="0.01"
                data-testid="input-insurance-offer"
              />
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            100% Free - No Credit Card Required - Privacy Protected
          </p>
          <Button 
            type="submit" 
            size="lg"
            className="w-full md:w-auto px-12 text-lg h-12"
            disabled={analysisMutation.isPending}
            data-testid="button-calculate-recovery-bottom"
          >
            {analysisMutation.isPending ? "Analyzing..." : "Calculate My Recovery"}
          </Button>
        </div>
      </form>
    </div>
  );
}
