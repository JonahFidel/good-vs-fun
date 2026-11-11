import { UserButton, useAuth } from '@clerk/clerk-react'
import { NavLink } from 'react-router-dom'
import { useIsHydrated } from './useIsHydrated'

const userButtonAppearance = {
  elements: {
    userButtonTrigger: {
      width: 'var(--nav-user-size)',
      height: 'var(--nav-user-size)',
    },
    userButtonAvatarBox: {
      width: 'var(--nav-user-size)',
      height: 'var(--nav-user-size)',
    },
  },
} as const

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
            <UserButton afterSignOutUrl="/" appearance={userButtonAppearance} />
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
