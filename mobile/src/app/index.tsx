import { AuthGate } from '@/components/AuthGate'
import { DecksScreen } from '@/screens/DecksScreen'

export default function HomeScreen() {
  return (
    <AuthGate>
      <DecksScreen />
    </AuthGate>
  )
}
