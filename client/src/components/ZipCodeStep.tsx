import { MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ZipCodeStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export default function ZipCodeStep({ value, onChange, onNext }: ZipCodeStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.length >= 5) {
      onNext();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Property Location
        </CardTitle>
        <CardDescription>
          Enter your ZIP code to get accurate regional fair market values for your area.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="zipCode">ZIP Code</Label>
            <Input
              id="zipCode"
              type="text"
              placeholder="e.g., 78501"
              value={value}
              onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 5))}
              maxLength={5}
              className="text-lg"
              data-testid="input-zipcode"
            />
            <p className="text-xs text-muted-foreground">
              We use this only for regional cost comparison - no personal data is stored.
            </p>
          </div>
          <Button 
            type="submit" 
            className="w-full"
            disabled={value.length < 5}
            data-testid="button-continue"
          >
            Continue to Items
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
