import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from '../LoginPage'
import { AuthProvider } from '../../context/AuthContext.tsx'
import { ApiError } from '../../services/apiClient'
import { authStorage } from '../../services/authStorage'
import {
  getProfile,
  login as loginWithCredentials,
} from '../../services/authService'
import type { LoginResponse } from '../../types/auth'

vi.mock('../../services/authService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../services/authService')>()

  return {
    ...actual,
    getProfile: vi.fn(),
    login: vi.fn(),
  }
})

const adminLoginResponse: LoginResponse = {
  accessToken: 'admin-token',
  tokenType: 'Bearer',
  expiresIn: 86400,
  user: {
    userId: 1,
    username: 'admin',
    email: 'admin@example.com',
    role: 'ADMIN',
    preferredLanguageId: null,
  },
}

const visitorLoginResponse: LoginResponse = {
  accessToken: 'visitor-token',
  tokenType: 'Bearer',
  expiresIn: 86400,
  user: {
    userId: 2,
    username: 'visitor',
    email: 'visitor@example.com',
    role: 'VISITOR',
    preferredLanguageId: null,
  },
}

const mockedLogin = vi.mocked(loginWithCredentials)
const mockedGetProfile = vi.mocked(getProfile)

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function submitCredentials(username: string, password: string) {
  const user = userEvent.setup()

  await user.type(screen.getByLabelText('Username'), username)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: /Sign In/i }))
}

beforeEach(() => {
  mockedLogin.mockReset()
  mockedGetProfile.mockReset()
})

describe('LoginPage authentication lifecycle', () => {
  it('establishes a session only for an ADMIN login', async () => {
    mockedLogin.mockResolvedValue(adminLoginResponse)

    renderLoginPage()
    await submitCredentials('admin', 'pw')

    await waitFor(
      () => expect(screen.getByText('Dashboard')).toBeInTheDocument(),
      { timeout: 2000 },
    )
    expect(authStorage.getToken()).toBe('admin-token')
  })

  it('does not keep a token or session for a VISITOR login', async () => {
    mockedLogin.mockResolvedValue(visitorLoginResponse)

    renderLoginPage()
    await submitCredentials('visitor', 'pw')

    await waitFor(() =>
      expect(screen.getByText(/Access denied/i)).toBeInTheDocument(),
    )
    expect(authStorage.getToken()).toBeNull()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('clears a stale token when a VISITOR login is rejected', async () => {
    authStorage.setToken('stale-admin-token')
    mockedGetProfile.mockResolvedValue(adminLoginResponse.user)
    mockedLogin.mockResolvedValue(visitorLoginResponse)

    renderLoginPage()
    await submitCredentials('visitor', 'pw')

    await waitFor(() =>
      expect(screen.getByText(/Access denied/i)).toBeInTheDocument(),
    )
    expect(authStorage.getToken()).toBeNull()
  })

  it('shows a credential error for a rejected login without redirecting', async () => {
    mockedLogin.mockRejectedValue(
      new ApiError('Invalid username or password', 401),
    )

    renderLoginPage()
    await submitCredentials('admin', 'wrong')

    await waitFor(() =>
      expect(
        screen.getByText('Invalid username or password.'),
      ).toBeInTheDocument(),
    )
    expect(authStorage.getToken()).toBeNull()
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })
})
