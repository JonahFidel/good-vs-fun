import './App.css'
import { AppRoutes } from './routes'
import { NavBar } from './components/NavBar'

export default function AppShell() {
  return (
    <div className="app">
      <header className="header">
        <p className="header-brand">Good vs. Fun</p>
        <NavBar />
      </header>

      <main className="layout">
        <AppRoutes />
      </main>
    </div>
  )
}

