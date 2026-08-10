import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { Navigation } from './components/Navigation'
import { ApplicationDetailPage } from './pages/ApplicationDetailPage'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { DashboardPage } from './pages/DashboardPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <p className="brand">Deadline Dash</p>
          <Navigation />
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/applications/:id" element={<ApplicationDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
