/**
 * Smart Heritage Admin Web — Auth context object and types
 *
 * Separated from AuthProvider so the file exporting a React component
 * does not also export a context object (required by React Fast Refresh).
 */

import { createContext } from 'react'
import type { AuthUser } from '../types/auth'

export type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'error'

interface AuthContextType {
  token: string | null
  user: AuthUser | null
  status: AuthStatus
  isAuthenticated: boolean
  isBootstrapping: boolean
  authError: string | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
  retrySession: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export { AuthContext }
export type { AuthContextType }
