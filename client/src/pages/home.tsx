import { useState, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import ContractorPanel from "@/components/ContractorPanel";
import ResourceBand from "@/components/ResourceBand";
import PartnerSection from "@/components/PartnerSection";
import SingleScreenClaim from "@/components/SingleScreenClaim";
import ResultsStep from "@/components/ResultsStep";
import type { ClaimItem } from "@/components/ItemsStep";

export default function Home() {
  const [showResults, setShowResults] = useState(false);
  const [claimData, setClaimData] = useState<{
    zipCode: string;
    propertyAddress?: string;
    items: ClaimItem[];
  } | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [userZip, setUserZip] = useState("");
  const [resetKey, setResetKey] = useState(0);
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
    setUserZip(data.zipCode);
  };

  const handleAnalysisComplete = (results: any) => {
    setAnalysisResults(results);
    setShowResults(true);
  };

  const resetForm = () => {
    setShowResults(false);
    setClaimData(null);
    setUserZip(""); // Clear ZIP to reset contractor panel
    setResetKey(prev => prev + 1); // Increment to trigger form reset
  };

  const handleZipChange = (zip: string) => {
    setUserZip(zip);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      {!showResults ? (
        <>
          <Hero />
          <HowItWorks />
          
          {/* Main Content: Form + Sidebar */}
          <section id="claim-wizard" className="max-w-6xl mx-auto px-4 py-12">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              {/* Left: Claim Form */}
              <div ref={formRef}>
                <SingleScreenClaim 
                  onCalculate={handleCalculate} 
                  onAnalysisComplete={handleAnalysisComplete}
                  onZipChange={handleZipChange}
                  resetKey={resetKey}
                />
              </div>
              
              {/* Right: Sidebar */}
              <div className="space-y-6">
                <ContractorPanel userZip={userZip} />
                <ResourceBand />
              </div>
            </div>
          </section>
          
          <PartnerSection />
        </>
      ) : claimData ? (
        <main className="flex-1 py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <ResultsStep
              zipCode={claimData.zipCode}
              items={claimData.items}
              onStartOver={resetForm}
            />
          </div>
        </main>
      ) : null}
      
      <Footer />
    </div>
  );
}
