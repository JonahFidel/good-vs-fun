import { UserButton, useAuth } from '@clerk/clerk-react'
import { NavLink } from 'react-router-dom'

export function NavBar() {
  const { isSignedIn } = useAuth()
  return (
    <nav className="nav">
      <div className="nav-links">
        <NavLink
          to="/decks"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          Decks
        </NavLink>
        {isSignedIn ? (
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
        )}
      </div>
    </nav>
  )
}

