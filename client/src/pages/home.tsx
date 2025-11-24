import { useState, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SingleScreenClaim from "@/components/SingleScreenClaim";
import ResultsStep from "@/components/ResultsStep";
import { Button } from "@/components/ui/button";
import type { ClaimItem } from "@/components/ItemsStep";

export default function Home() {
  const [showResults, setShowResults] = useState(false);
  const [claimData, setClaimData] = useState<{
    zipCode: string;
    propertyAddress?: string;
    items: ClaimItem[];
  } | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const handleCalculate = (data: {
    zipCode: string;
    propertyAddress?: string;
    damageType: string;
    insuranceOffer: number;
    items: ClaimItem[];
  }) => {
    setClaimData({
      zipCode: data.zipCode,
      propertyAddress: data.propertyAddress,
      items: data.items,
    });
  };

  const handleAnalysisComplete = (results: any) => {
    setAnalysisResults(results);
    setShowResults(true);
  };

  const resetForm = () => {
    setShowResults(false);
    setClaimData(null);
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Focus on the ZIP code input after scrolling
    setTimeout(() => {
      const zipInput = document.getElementById('zipCode');
      zipInput?.focus();
    }, 500);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 py-8 px-4">
        {!showResults ? (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold">Max-Claim</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Free consumer advocacy tool to help you get the full amount you deserve from underpaid insurance claims.
              </p>
              {/* Top CTA - Scroll to Form */}
              <Button 
                onClick={scrollToForm}
                size="lg"
                className="text-lg h-12 px-12"
                data-testid="button-calculate-recovery-top"
              >
                Calculate My Recovery
              </Button>
            </div>
            <div ref={formRef}>
              <SingleScreenClaim onCalculate={handleCalculate} onAnalysisComplete={handleAnalysisComplete} />
            </div>
          </div>
        ) : claimData ? (
          <div className="max-w-4xl mx-auto">
            <ResultsStep
              zipCode={claimData.zipCode}
              items={claimData.items}
              onStartOver={resetForm}
            />
          </div>
        ) : null}
      </main>
      
      <Footer />
    </div>
  );
}
