
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/layout/AdminLayout'
import PlaceholderPage from './pages/PlaceholderPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import { navItems } from './config/navigation'

import './App.css'

function App() {
  return (
    <Routes>
      {/* Login page */}
      <Route path="/login" element={<LoginPage />} />

      {/* Admin pages */}
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

      {/* Unknown paths return to Login */}
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  )
}

export default App
