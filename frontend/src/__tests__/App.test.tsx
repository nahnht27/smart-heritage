import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import type { AuthContextType } from '../context/AuthContext'
import { useAuth } from '../context/useAuth'
import type { AuthUser } from '../types/auth'

vi.mock('../context/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

const adminUser: AuthUser = {
  userId: 1,
  username: 'admin',
  email: 'admin@example.com',
  role: 'ADMIN',
  preferredLanguageId: null,
}

const visitorUser: AuthUser = {
  ...adminUser,
  userId: 2,
  username: 'visitor',
  role: 'VISITOR',
}

function makeAuthValue(
  overrides: Partial<AuthContextType> = {},
): AuthContextType {
  return {
    token: null,
    user: null,
    status: 'unauthenticated',
    isAuthenticated: false,
    isBootstrapping: false,
    authError: null,
    login: vi.fn(),
    logout: vi.fn(),
    retrySession: vi.fn(),
    ...overrides,
  }
}

function renderApp(initialPath = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Admin protected routes', () => {
  it('shows a bootstrap state instead of redirecting while loading', () => {
    mockedUseAuth.mockReturnValue(
      makeAuthValue({
        status: 'loading',
        isBootstrapping: true,
        token: 'stored-token',
      }),
    )

    renderApp()

    expect(screen.getByText(/Restoring your session/i)).toBeInTheDocument()
    expect(screen.queryByText('Welcome back')).not.toBeInTheDocument()
  })

  it('redirects an unauthenticated user to login', () => {
    mockedUseAuth.mockReturnValue(makeAuthValue())

    renderApp()

    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })

  it('does not allow a non-ADMIN session into admin routes', () => {
    mockedUseAuth.mockReturnValue(
      makeAuthValue({
        token: 'visitor-token',
        user: visitorUser,
        status: 'authenticated',
        isAuthenticated: true,
      }),
    )

    renderApp()

    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('shows a retry action when session verification failed', async () => {
    const retrySession = vi.fn()
    mockedUseAuth.mockReturnValue(
      makeAuthValue({
        token: 'stored-token',
        status: 'error',
        authError: 'Unable to verify your session.',
        retrySession,
      }),
    )

    renderApp()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(retrySession).toHaveBeenCalledTimes(1)
  })

  it('opens admin routes for an authenticated ADMIN', () => {
    mockedUseAuth.mockReturnValue(
      makeAuthValue({
        token: 'admin-token',
        user: adminUser,
        status: 'authenticated',
        isAuthenticated: true,
      }),
    )

    renderApp()

    expect(screen.queryByText('Welcome back')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Dashboard', level: 1 }),
    ).toBeInTheDocument()
  })
})
