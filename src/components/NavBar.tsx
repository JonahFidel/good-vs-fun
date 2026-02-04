import { NavLink } from 'react-router-dom'

export function NavBar() {
  return (
    <nav className="nav">
      <div className="nav-links">
        <NavLink
          to="/decks"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          Decks
        </NavLink>
      </div>
    </nav>
  )
}

