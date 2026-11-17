import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/layout/AdminLayout'
import PlaceholderPage from './pages/PlaceholderPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import HeritageSitesPage from './pages/HeritageSitesPage'
import ArtifactsPage from './pages/ArtifactsPage'
import MultimediaPage from './pages/MultimediaPage'
import BeaconsPage from './pages/BeaconsPage'
import { navItems } from './config/navigation'
import { useAuth } from './context/useAuth'

import './App.css'

function ProtectedRoute() {
  const { isAuthenticated, user, status, authError, retrySession } =
    useAuth()

  if (status === 'loading') {
    return (
      <div className="auth-status" role="status" aria-live="polite">
        Restoring your session…
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="auth-status auth-status--error" role="alert">
        <p>{authError ?? 'Unable to verify your session.'}</p>
        <button type="button" onClick={retrySession}>
          Try again
        </button>
      </div>
    )
  }

  if (
    !isAuthenticated ||
    user?.role?.trim().toUpperCase() !== 'ADMIN'
  ) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Admin pages — protected, ADMIN only */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          {navItems.map((item) => (
            <Route
              key={item.path}
              path={item.path}
              element={
                item.path === '/dashboard' ? (
                  <DashboardPage />
                ) : item.path === '/heritage-sites' ? (
                  <HeritageSitesPage />
                ) : item.path === '/artifacts' ? (
                  <ArtifactsPage />
                ) : item.path === '/multimedia' ? (
                  <MultimediaPage />
                ) : item.path === '/beacons' ? (
                  <BeaconsPage />
                ) : (
                  <PlaceholderPage />
                )
              }
            />
          ))}

          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />
        </Route>
      </Route>

      {/* Unknown paths return to Login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App