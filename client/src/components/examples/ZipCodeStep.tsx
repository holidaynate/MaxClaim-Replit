import { useState } from 'react'
import ZipCodeStep from '../ZipCodeStep'

export default function ZipCodeStepExample() {
  const [zipCode, setZipCode] = useState('')
  
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <ZipCodeStep 
        value={zipCode}
        onChange={setZipCode}
        onNext={() => console.log('Next step triggered with ZIP:', zipCode)}
      />
    </div>
  )
}
