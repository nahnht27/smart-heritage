import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/layout/AdminLayout'
import PlaceholderPage from './pages/PlaceholderPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import HeritageSitesPage from './pages/HeritageSitesPage'
import ArtifactsPage from './pages/ArtifactsPage'
import MultimediaPage from './pages/MultimediaPage'
import { navItems } from './config/navigation'
import { useAuth } from './context/useAuth'

import './App.css'

function ProtectedRoute() {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role?.toUpperCase() !== 'ADMIN') {
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