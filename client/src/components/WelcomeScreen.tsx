import { Calculator, Shield, DollarSign, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-lg mb-2">
          <Calculator className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold">Welcome to MaxClaim</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Free consumer advocacy tool to ensure you're getting fair market value on your insurance claim estimates. 
          Compare quoted prices against regional averages in minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-md">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-semibold">Enter Your Claim</h3>
            <p className="text-sm text-muted-foreground">
              Add items and services from your insurance estimate with quoted prices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-md">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="font-semibold">Get FMV Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Compare against fair market values based on your geographic location
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-md">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-semibold">Advocate for Yourself</h3>
            <p className="text-sm text-muted-foreground">
              Export detailed reports and sample letters to support your claim
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Your Privacy Matters
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>No account or login required - start immediately</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>We only collect ZIP codes for regional pricing - no personal information</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Free forever - this is a consumer advocacy tool, not a business</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Not licensed adjusters or appraisers - educational tool only</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button 
          size="lg" 
          className="text-lg px-8"
          onClick={onStart}
          data-testid="button-start"
        >
          Start Your Claim Analysis
        </Button>
      </div>
    </div>
  );
}
