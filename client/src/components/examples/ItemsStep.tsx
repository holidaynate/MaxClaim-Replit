import { useState } from 'react'
import ItemsStep, { type ClaimItem } from '../ItemsStep'

export default function ItemsStepExample() {
  const [items, setItems] = useState<ClaimItem[]>([
    { category: 'Roofing', description: 'Asphalt shingle replacement', quantity: 25, quotedPrice: 8500 }
  ])
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ItemsStep 
        items={items}
        onChange={setItems}
        onNext={() => console.log('Next step triggered with items:', items)}
        onBack={() => console.log('Back to previous step')}
      />
    </div>
  )
}
