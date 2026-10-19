import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/layout/AdminLayout'
import PlaceholderPage from './pages/PlaceholderPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import { navItems } from './config/navigation'
import { useAuth } from './context/useAuth'

import './App.css'

function ProtectedRoute({
  children,
}: {
  children?: React.ReactNode
}) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role?.toUpperCase() !== 'ADMIN') {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <Routes>
      {/* Login page */}
      <Route path="/login" element={<LoginPage />} />

      {/* Admin pages — protected, ADMIN only */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          {navItems.map((item) => (
            <Route
              key={item.path}
              path={item.path}
              element={
                item.path === '/dashboard'
                  ? <DashboardPage />
                  : <PlaceholderPage />
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
