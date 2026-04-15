import { SignIn, SignUp, useAuth } from '@clerk/clerk-react'
import { Navigate, Route, Routes, generatePath, useParams } from 'react-router-dom'
import { DecksPage } from './views/DecksPage'
import { DeckPage } from './views/DeckPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) {
    return <p className="status-line">Loading…</p>
  }
  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />
  }
  return <>{children}</>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/decks" replace />} />
      <Route
        path="/sign-in/*"
        element={
          <div className="sign-in-page">
            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              afterSignInUrl="/decks"
            />
          </div>
        }
      />
      <Route
        path="/sign-up/*"
        element={
          <div className="sign-in-page">
            <SignUp
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              afterSignUpUrl="/decks"
            />
          </div>
        }
      />
      <Route
        path="/decks"
        element={
          <ProtectedRoute>
            <DecksPage />
          </ProtectedRoute>
        }
      />
      {/* canonical deck-movies route */}
      <Route
        path="/deck/:deckId/movies"
        element={
          <ProtectedRoute>
            <DeckPage />
          </ProtectedRoute>
        }
      />

      {/* backwards compat redirects */}
      <Route
        path="/decks/:deckId"
        element={
          <ProtectedRoute>
            <LegacyDeckRedirect />
          </ProtectedRoute>
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

