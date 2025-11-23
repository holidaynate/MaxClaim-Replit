import ReviewStep from '../ReviewStep'

export default function ReviewStepExample() {
  const mockItems = [
    { category: 'Roofing', description: 'Asphalt shingle replacement', quantity: 25, quotedPrice: 8500 },
    { category: 'Drywall', description: 'Interior wall repair', quantity: 12, quotedPrice: 2400 },
    { category: 'Painting', description: 'Interior painting - 2 coats', quantity: 1500, quotedPrice: 3200 }
  ]
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ReviewStep 
        zipCode="78501"
        items={mockItems}
        onCalculate={() => console.log('Calculate FMV triggered')}
        onBack={() => console.log('Back to items')}
      />
    </div>
  )
}
