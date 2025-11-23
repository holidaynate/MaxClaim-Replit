import { Check } from "lucide-react";

interface ProgressStepsProps {
  currentStep: number;
  steps: string[];
}

export default function ProgressSteps({ currentStep, steps }: ProgressStepsProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-300"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />
        
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          
          return (
            <div key={step} className="flex flex-col items-center relative z-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-colors ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border-2 border-border text-muted-foreground'
                }`}
                data-testid={`step-${index}`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
              </div>
              <span className={`mt-2 text-xs font-medium hidden sm:block ${
                isActive ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
