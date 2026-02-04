import { Navigate, Route, Routes, generatePath, useParams } from 'react-router-dom'
import { DecksPage } from './views/DecksPage'
import { DeckPage } from './views/DeckPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/decks" replace />} />
      <Route path="/decks" element={<DecksPage />} />
      {/* canonical deck-movies route */}
      <Route path="/deck/:deckId/movies" element={<DeckPage />} />

      {/* backwards compat redirects */}
      <Route
        path="/decks/:deckId"
        element={
          <LegacyDeckRedirect />
        }
      />
      <Route path="*" element={<Navigate to="/decks" replace />} />
    </Routes>
  )
}

function LegacyDeckRedirect() {
  // React Router v6/v7 doesn't interpolate params in a plain string in Navigate,
  // so we generate the target path explicitly.
  const { deckId } = useParams()
  // This component should never render without params, but keep it safe.
  const id = typeof deckId === 'string' ? deckId : ''
  return <Navigate to={generatePath('/deck/:deckId/movies', { deckId: id })} replace />
}

