import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../AuthContext.tsx'
import { useAuth } from '../useAuth'
import { ApiError } from '../../services/apiClient'
import { authEvents } from '../../services/authEvents'
import { authStorage } from '../../services/authStorage'
import { getProfile } from '../../services/authService'
import type { AuthUser } from '../../types/auth'

vi.mock('../../services/authService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../services/authService')>()

  return {
    ...actual,
    getProfile: vi.fn(),
  }
})

const adminUser: AuthUser = {
  userId: 1,
  username: 'admin',
  email: 'admin@example.com',
  role: 'ADMIN',
  preferredLanguageId: null,
}

const visitorUser: AuthUser = {
  userId: 2,
  username: 'visitor',
  email: 'visitor@example.com',
  role: 'VISITOR',
  preferredLanguageId: null,
}

function Harness() {
  const auth = useAuth()

  return (
    <div>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="username">{auth.user?.username ?? 'none'}</span>
      <span data-testid="error">{auth.authError ?? ''}</span>
      <button type="button" onClick={() => auth.login('fresh-token', adminUser)}>
        login-admin
      </button>
      <button type="button" onClick={() => auth.login('visitor-token', visitorUser)}>
        login-visitor
      </button>
      <button type="button" onClick={auth.logout}>
        logout
      </button>
      <button type="button" onClick={auth.retrySession}>
        retry
      </button>
    </div>
  )
}

function renderSession() {
  return render(
    <AuthProvider>
      <Harness />
    </AuthProvider>,
  )
}

const mockedGetProfile = vi.mocked(getProfile)

beforeEach(() => {
  mockedGetProfile.mockReset()
})

describe('AuthProvider session bootstrap', () => {
  it('starts unauthenticated when no token is stored', async () => {
    renderSession()

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    expect(screen.getByTestId('username')).toHaveTextContent('none')
    await waitFor(() => expect(mockedGetProfile).not.toHaveBeenCalled())
  })

  it('restores an ADMIN session from /users/me', async () => {
    authStorage.setToken('admin-token')
    mockedGetProfile.mockResolvedValue(adminUser)

    renderSession()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    )
    expect(screen.getByTestId('username')).toHaveTextContent('admin')
  })

  it('clears the session when the profile belongs to a VISITOR', async () => {
    authStorage.setToken('visitor-token')
    mockedGetProfile.mockResolvedValue(visitorUser)

    renderSession()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent(
        'unauthenticated',
      ),
    )
    expect(authStorage.getToken()).toBeNull()
    expect(screen.getByTestId('error')).toHaveTextContent('Access denied')
  })

  it('clears an invalid or expired token after a 401', async () => {
    authStorage.setToken('expired-token')
    mockedGetProfile.mockRejectedValue(
      new ApiError('Authentication is required', 401),
    )

    renderSession()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent(
        'unauthenticated',
      ),
    )
    expect(authStorage.getToken()).toBeNull()
  })

  it('keeps the token and shows a retry state for network errors', async () => {
    authStorage.setToken('network-token')
    mockedGetProfile.mockRejectedValue(
      new ApiError('Cannot connect to the server.', 0),
    )

    renderSession()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('error'),
    )
    expect(authStorage.getToken()).toBe('network-token')
    expect(screen.getByTestId('error')).toHaveTextContent(
      'Unable to verify your session',
    )
  })

  it('retries bootstrap after a network error', async () => {
    authStorage.setToken('retry-token')
    mockedGetProfile
      .mockRejectedValueOnce(new ApiError('offline', 0))
      .mockResolvedValueOnce(adminUser)

    renderSession()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('error'),
    )

    await userEvent.click(screen.getByRole('button', { name: 'retry' }))

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    )
    expect(authStorage.getToken()).toBe('retry-token')
  })
})

describe('AuthProvider logout and global session expiry', () => {
  it('clears storage and in-memory state on logout', async () => {
    authStorage.setToken('admin-token')
    mockedGetProfile.mockResolvedValue(adminUser)

    renderSession()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    )

    await userEvent.click(screen.getByRole('button', { name: 'logout' }))

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    expect(screen.getByTestId('username')).toHaveTextContent('none')
    expect(authStorage.getToken()).toBeNull()
  })

  it('does not restore a session after a refresh following logout', async () => {
    authStorage.setToken('admin-token')
    mockedGetProfile.mockResolvedValue(adminUser)

    const firstRender = renderSession()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    )

    await userEvent.click(screen.getByRole('button', { name: 'logout' }))
    firstRender.unmount()

    renderSession()

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    expect(mockedGetProfile).toHaveBeenCalledTimes(1)
  })

  it('replaces the previous token when logging in again after logout', async () => {
    authStorage.setToken('old-token')
    mockedGetProfile.mockResolvedValue(adminUser)

    renderSession()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    )

    await userEvent.click(screen.getByRole('button', { name: 'logout' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'login-admin' }),
    )

    expect(authStorage.getToken()).toBe('fresh-token')
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
  })

  it('resets the session when an authenticated request emits 401', async () => {
    authStorage.setToken('admin-token')
    mockedGetProfile.mockResolvedValue(adminUser)

    renderSession()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    )

    act(() => {
      authEvents.emitUnauthorized()
    })

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    expect(authStorage.getToken()).toBeNull()
    expect(screen.getByTestId('error')).toHaveTextContent(
      'Your session has expired',
    )
  })

  it('does not persist a token when login is called with a VISITOR', async () => {
    renderSession()

    await userEvent.click(
      screen.getByRole('button', { name: 'login-visitor' }),
    )

    expect(authStorage.getToken()).toBeNull()
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    expect(screen.getByTestId('error')).toHaveTextContent('Access denied')
  })
})
