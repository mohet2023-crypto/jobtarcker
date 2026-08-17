import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { Navigation } from './components/Navigation'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { ApplicationDetailPage } from './pages/ApplicationDetailPage'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { DashboardPage } from './pages/DashboardPage'
import { GlobalJobsPage } from './pages/GlobalJobsPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-shell">
          <Navigation />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/applications" element={<ApplicationsPage />} />
                <Route path="/global-jobs" element={<GlobalJobsPage />} />
                <Route
                  path="/applications/:id"
                  element={<ApplicationDetailPage />}
                />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
