import { useLocalSearchParams } from 'expo-router'
import { AuthGate } from '@/components/AuthGate'
import { DeckScreen } from '@/screens/DeckScreen'

export default function DeckRoute() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>()
  const id = Array.isArray(deckId) ? deckId[0] : deckId

  return <AuthGate>{id ? <DeckScreen deckId={id} /> : null}</AuthGate>
}
