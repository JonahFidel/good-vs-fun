import { useLocalSearchParams } from 'expo-router'
import { AuthGate } from '@/components/AuthGate'
import { DeckScreen } from '@/screens/DeckScreen'

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? ''
  }
  return value ?? ''
}

export default function DeckRoute() {
  const { deckId, ghost, ghost2 } = useLocalSearchParams<{
    deckId: string
    ghost?: string
    ghost2?: string
  }>()
  const id = firstParam(deckId)

  return (
    <AuthGate>
      {id ? (
        <DeckScreen
          key={id}
          deckId={id}
          initialGhostId={firstParam(ghost)}
          initialGhost2Id={firstParam(ghost2)}
        />
      ) : null}
    </AuthGate>
  )
}
