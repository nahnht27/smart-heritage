/**
 * Smart Heritage Admin Web — Auth provider component
 *
 * Separated from AuthContext.ts so this file only exports a React component
 * (required by React Fast Refresh).
 */

import {
  useState,
  type ReactNode,
} from 'react'
import { AuthContext, type AuthContextType } from './AuthContext.ts'
import { authStorage } from '../services/authStorage'
import { getToken, isAuthenticated, getCurrentUser, logout } from '../services/authService'
import type { AuthUser } from '../types/auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getToken())
  const [user, setUser] = useState<AuthUser | null>(() =>
    isAuthenticated() ? getCurrentUser() : null,
  )

  const handleLogin = (authToken: string, authUser: AuthUser) => {
    authStorage.setToken(authToken)
    setToken(authToken)
    setUser(authUser)
  }

  const handleLogout = () => {
    logout()
    setToken(null)
    setUser(null)
  }

  const value: AuthContextType = {
    token,
    user,
    isAuthenticated: isAuthenticated(),
    login: handleLogin,
    logout: handleLogout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
