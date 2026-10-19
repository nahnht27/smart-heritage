/**
 * Smart Heritage Admin Web — Auth context object and types
 *
 * Separated from AuthProvider so the file exporting a React component
 * does not also export a context object (required by React Fast Refresh).
 */

import { createContext } from 'react'
import type { AuthUser } from '../types/auth'

interface AuthContextType {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export { AuthContext }
export type { AuthContextType }
