import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WelcomeScreen from "@/components/WelcomeScreen";
import ProgressSteps from "@/components/ProgressSteps";
import ZipCodeStep from "@/components/ZipCodeStep";
import ItemsStep, { type ClaimItem } from "@/components/ItemsStep";
import ReviewStep from "@/components/ReviewStep";
import ResultsStep from "@/components/ResultsStep";

const STEPS = ['Location', 'Items', 'Review', 'Results'];

export default function Home() {
  const [currentStep, setCurrentStep] = useState(-1); // -1 = welcome screen
  const [zipCode, setZipCode] = useState("");
  const [items, setItems] = useState<ClaimItem[]>([
    { category: "", description: "", quantity: 1, quotedPrice: 0 }
  ]);

  const resetForm = () => {
    setCurrentStep(-1);
    setZipCode("");
    setItems([{ category: "", description: "", quantity: 1, quotedPrice: 0 }]);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 py-8 px-4">
        {currentStep === -1 ? (
          <WelcomeScreen onStart={() => setCurrentStep(0)} />
        ) : (
          <div className="max-w-4xl mx-auto">
            <ProgressSteps currentStep={currentStep} steps={STEPS} />
            
            {currentStep === 0 && (
              <ZipCodeStep
                value={zipCode}
                onChange={setZipCode}
                onNext={() => setCurrentStep(1)}
              />
            )}
            
            {currentStep === 1 && (
              <ItemsStep
                items={items}
                onChange={setItems}
                onNext={() => setCurrentStep(2)}
                onBack={() => setCurrentStep(0)}
              />
            )}
            
            {currentStep === 2 && (
              <ReviewStep
                zipCode={zipCode}
                items={items}
                onCalculate={() => setCurrentStep(3)}
                onBack={() => setCurrentStep(1)}
              />
            )}
            
            {currentStep === 3 && (
              <ResultsStep
                zipCode={zipCode}
                items={items}
                onStartOver={resetForm}
              />
            )}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
