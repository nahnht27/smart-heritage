/**
 * Smart Heritage Admin Web — Auth provider component
 *
 * Separated from AuthContext.ts so this file only exports a React component
 * (required by React Fast Refresh).
 *
 * Session bootstrap never trusts the JWT payload for identity. When a stored
 * token exists, the provider asks the backend for the authenticated profile
 * (`GET /api/users/me`) and only grants access to ADMIN users.
 */

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  AuthContext,
  type AuthContextType,
  type AuthStatus,
} from './AuthContext.ts'
import { ApiError } from '../services/apiClient'
import { authEvents } from '../services/authEvents'
import { authStorage } from '../services/authStorage'
import {
  getProfile,
  isAdminRole,
  logout as clearStoredSession,
  mapUserResponse,
} from '../services/authService'
import type { AuthUser } from '../types/auth'

interface SessionState {
  token: string | null
  user: AuthUser | null
  status: AuthStatus
}

const UNAUTHENTICATED_SESSION: SessionState = {
  token: null,
  user: null,
  status: 'unauthenticated',
}

const ACCESS_DENIED_MESSAGE =
  'Access denied. An administrator account is required.'
const SESSION_ERROR_MESSAGE =
  'Unable to verify your session. Check your connection and try again.'
const SESSION_EXPIRED_MESSAGE =
  'Your session has expired. Please sign in again.'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(() => {
    const token = authStorage.getToken()

    return {
      token,
      user: null,
      status: token ? 'loading' : 'unauthenticated',
    }
  })
  const [authError, setAuthError] = useState<string | null>(null)
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0)

  useEffect(() => {
    const storedToken = authStorage.getToken()

    if (!storedToken) {
      return
    }

    let cancelled = false

    getProfile()
      .then((profile) => {
        if (cancelled || authStorage.getToken() !== storedToken) {
          return
        }

        if (!isAdminRole(profile.role)) {
          clearStoredSession()
          setSession(UNAUTHENTICATED_SESSION)
          setAuthError(ACCESS_DENIED_MESSAGE)
          return
        }

        setSession({
          token: storedToken,
          user: mapUserResponse(profile),
          status: 'authenticated',
        })
        setAuthError(null)
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        if (error instanceof ApiError && error.status === 401) {
          clearStoredSession()
          setSession(UNAUTHENTICATED_SESSION)
          setAuthError(null)
          return
        }

        setSession((current) =>
          current.token ? { ...current, status: 'error' } : current,
        )
        setAuthError(SESSION_ERROR_MESSAGE)
      })

    return () => {
      cancelled = true
    }
  }, [bootstrapAttempt])

  useEffect(
    () =>
      authEvents.onUnauthorized(() => {
        clearStoredSession()
        setSession(UNAUTHENTICATED_SESSION)
        setAuthError(SESSION_EXPIRED_MESSAGE)
      }),
    [],
  )

  const handleLogin = useCallback((authToken: string, authUser: AuthUser) => {
    if (!isAdminRole(authUser.role)) {
      clearStoredSession()
      setSession(UNAUTHENTICATED_SESSION)
      setAuthError(ACCESS_DENIED_MESSAGE)
      return
    }

    authStorage.setToken(authToken)
    setSession({
      token: authToken,
      user: authUser,
      status: 'authenticated',
    })
    setAuthError(null)
  }, [])

  const handleLogout = useCallback(() => {
    clearStoredSession()
    setSession(UNAUTHENTICATED_SESSION)
    setAuthError(null)
  }, [])

  const retrySession = useCallback(() => {
    setAuthError(null)
    setSession((current) =>
      current.token ? { ...current, status: 'loading' } : current,
    )
    setBootstrapAttempt((current) => current + 1)
  }, [])

  const value: AuthContextType = {
    token: session.token,
    user: session.user,
    status: session.status,
    isAuthenticated: session.status === 'authenticated',
    isBootstrapping: session.status === 'loading',
    authError,
    login: handleLogin,
    logout: handleLogout,
    retrySession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
