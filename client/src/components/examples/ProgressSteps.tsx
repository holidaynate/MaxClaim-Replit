import { useState } from 'react'
import ProgressSteps from '../ProgressSteps'
import { Button } from '@/components/ui/button'

export default function ProgressStepsExample() {
  const [currentStep, setCurrentStep] = useState(1)
  const steps = ['Location', 'Items', 'Review', 'Results']
  
  return (
    <div className="p-6">
      <ProgressSteps currentStep={currentStep} steps={steps} />
      <div className="flex gap-2 mt-6 justify-center">
        <Button 
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          data-testid="button-prev"
        >
          Previous
        </Button>
        <Button 
          onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
          disabled={currentStep === steps.length - 1}
          data-testid="button-next"
        >
          Next
        </Button>
      </div>
    </div>
  )
}
