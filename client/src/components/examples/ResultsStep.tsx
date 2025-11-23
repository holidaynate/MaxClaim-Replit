import ResultsStep from '../ResultsStep'

export default function ResultsStepExample() {
  const mockItems = [
    { category: 'Roofing', description: 'Asphalt shingle replacement', quantity: 25, quotedPrice: 8500 },
    { category: 'Drywall', description: 'Interior wall repair', quantity: 12, quotedPrice: 2400 },
    { category: 'Painting', description: 'Interior painting - 2 coats', quantity: 1500, quotedPrice: 3200 },
    { category: 'Flooring', description: 'Hardwood floor refinishing', quantity: 800, quotedPrice: 4800 }
  ]
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <ResultsStep 
        zipCode="78501"
        items={mockItems}
        onStartOver={() => console.log('Start new claim')}
      />
    </div>
  )
}
