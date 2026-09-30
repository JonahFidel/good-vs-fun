import { UserButton, useAuth } from '@clerk/clerk-react'
import { NavLink } from 'react-router-dom'
import { useIsHydrated } from '../hooks/useIsHydrated'

export function NavBar() {
  const hydrated = useIsHydrated()
  const { isSignedIn, isLoaded } = useAuth()
  const ready = hydrated && isLoaded

  return (
    <nav className="nav" aria-busy={!ready}>
      <div className="nav-links">
        <NavLink
          to="/decks"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          Decks
        </NavLink>
        {ready ? (
          isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <>
              <NavLink to="/sign-in" className="nav-link">
                Sign in
              </NavLink>
              <NavLink to="/sign-up" className="nav-link nav-link-primary">
                Sign up
              </NavLink>
            </>
          )
        ) : (
          <span className="nav-auth-placeholder" aria-hidden="true" />
        )}
      </div>
    </nav>
  )
}
