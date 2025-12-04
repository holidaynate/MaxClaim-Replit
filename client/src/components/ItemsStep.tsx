import { Plus, Trash2, Package, Info, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DocumentUpload } from "./DocumentUpload";
import { UNIT_TYPES } from "@shared/schema";
import { auditClaimItem, type AuditResult } from "@shared/priceAudit";
import PriceAuditBadge from "./PriceAuditBadge";

export interface ClaimItem {
  category: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
}

interface ItemsStepProps {
  items: ClaimItem[];
  onChange: (items: ClaimItem[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const CATEGORIES = [
  "Roofing",
  "Flooring",
  "Drywall",
  "Painting",
  "Plumbing",
  "Electrical",
  "HVAC",
  "Windows & Doors",
  "Appliances",
  "Cabinets",
  "Other"
];

export default function ItemsStep({ items, onChange, onNext, onBack }: ItemsStepProps) {
  const addItem = () => {
    onChange([...items, { category: "", description: "", quantity: 1, unit: "EA", unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ClaimItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const handleExtractedItems = (extractedItems: any[]) => {
    const newItems = extractedItems.map(item => ({
      category: item.category || "Other",
      description: item.description,
      quantity: item.quantity || 1,
      unit: item.unit || "EA",
      unitPrice: item.quotedPrice || item.unitPrice || 0
    }));
    
    onChange([...items, ...newItems]);
  };

  const isValid = items.length > 0 && items.every(item => 
    item.category && item.description && item.quantity > 0 && item.unitPrice > 0
  );

  const calculateSubtotal = (item: ClaimItem) => {
    return (item.unitPrice * item.quantity).toFixed(2);
  };

  const totalClaimValue = items.reduce((sum, item) => 
    sum + (item.unitPrice * item.quantity), 0
  );

  return (
    <div className="space-y-6">
      <DocumentUpload onItemsExtracted={handleExtractedItems} />
      
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Claim Items & Services
        </CardTitle>
        <CardDescription>
          Enter the <strong>unit price</strong> for each item (price per unit, not total). We'll calculate subtotals and audit against fair market values.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {items.map((item, index) => {
            const audit: AuditResult | null = item.description && item.unitPrice > 0 && item.quantity > 0
              ? auditClaimItem(item.description, item.unitPrice, item.quantity)
              : null;
            
            const subtotal = calculateSubtotal(item);
            
            return (
              <Card key={index} className="relative">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`category-${index}`}>Category</Label>
                      <Select
                        value={item.category}
                        onValueChange={(value) => updateItem(index, 'category', value)}
                      >
                        <SelectTrigger id={`category-${index}`} data-testid={`select-category-${index}`}>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`description-${index}`}>Item Description</Label>
                      <Input
                        id={`description-${index}`}
                        placeholder="e.g., Remove 3-Tab Asphalt, Ridge Vent"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        data-testid={`input-description-${index}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                      <Input
                        id={`quantity-${index}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        data-testid={`input-quantity-${index}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <Label htmlFor={`unit-${index}`}>Unit</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-1 text-xs">
                                <p><strong>LF</strong> - Linear Feet (fence, piping)</p>
                                <p><strong>SF</strong> - Square Feet (flooring, painting)</p>
                                <p><strong>SQ</strong> - Roofing Squares (100 SF per square)</p>
                                <p><strong>CT</strong> - Count/Units (windows, doors)</p>
                                <p><strong>EA</strong> - Each (individual items)</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select
                        value={item.unit || "EA"}
                        onValueChange={(value) => updateItem(index, 'unit', value)}
                      >
                        <SelectTrigger id={`unit-${index}`} data-testid={`select-unit-${index}`}>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(UNIT_TYPES).map(([key, value]) => (
                            <SelectItem key={key} value={key}>
                              {value.abbr} - {value.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <Label htmlFor={`price-${index}`}>Unit Price ($)</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">Enter the price <strong>per unit</strong> (not the line total). We'll calculate the subtotal automatically.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id={`price-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        data-testid={`input-unit-price-${index}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-xs flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Line Subtotal
                      </Label>
                      <div className="h-9 flex items-center px-3 rounded-md bg-muted text-foreground font-medium" data-testid={`text-subtotal-${index}`}>
                        ${subtotal}
                      </div>
                    </div>
                    {audit && (
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-muted-foreground text-xs">Price Audit</Label>
                        <PriceAuditBadge audit={audit} showDetails={true} />
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => removeItem(index)}
                    data-testid={`button-remove-${index}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={addItem}
          data-testid="button-add-item"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Item
        </Button>

        {items.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Total Claim Value:</span>
            <span className="text-lg font-bold" data-testid="text-total-claim-value">
              ${totalClaimValue.toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onBack} data-testid="button-back">
            Back
          </Button>
          <Button 
            className="flex-1"
            onClick={onNext}
            disabled={!isValid}
            data-testid="button-continue"
          >
            Review & Calculate
          </Button>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
