import './App.css'
import { AppRoutes } from './routes'
import { NavBar } from './components/NavBar'

export default function AppShell() {
  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Good Fun Movie</p>
          <h1>Rank movies by good and fun</h1>
          <p className="subhead">
            Plot movies on a 0–10 grid to compare how good vs. how fun they are.
          </p>
        </div>
        <NavBar />
      </header>

      <main className="layout">
        <AppRoutes />
      </main>
    </div>
  )
}

