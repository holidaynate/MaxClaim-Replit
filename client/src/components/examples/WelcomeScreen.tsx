import WelcomeScreen from '../WelcomeScreen'

export default function WelcomeScreenExample() {
  return (
    <div className="p-6">
      <WelcomeScreen onStart={() => console.log('Start claim analysis')} />
    </div>
  )
}
