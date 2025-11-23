import { Plus, Trash2, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentUpload } from "./DocumentUpload";

export interface ClaimItem {
  category: string;
  description: string;
  quantity: number;
  quotedPrice: number;
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
    onChange([...items, { category: "", description: "", quantity: 1, quotedPrice: 0 }]);
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
      quotedPrice: item.quotedPrice || 0
    }));
    
    // Append extracted items to existing items (don't replace)
    onChange([...items, ...newItems]);
  };

  const isValid = items.length > 0 && items.every(item => 
    item.category && item.description && item.quantity > 0 && item.quotedPrice > 0
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
          Add all items and services from your insurance company's settlement offer. We'll show you what you actually deserve.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {items.map((item, index) => (
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
                    <Label htmlFor={`description-${index}`}>Description</Label>
                    <Input
                      id={`description-${index}`}
                      placeholder="e.g., Asphalt shingle replacement"
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
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      data-testid={`input-quantity-${index}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`price-${index}`}>Insurance Offer ($)</Label>
                    <Input
                      id={`price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quotedPrice}
                      onChange={(e) => updateItem(index, 'quotedPrice', parseFloat(e.target.value) || 0)}
                      data-testid={`input-price-${index}`}
                    />
                  </div>
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
          ))}
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
