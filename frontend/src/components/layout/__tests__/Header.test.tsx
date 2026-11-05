import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Header from '../Header'
import { useAuth } from '../../../context/useAuth'
import type { AuthUser } from '../../../types/auth'

vi.mock('../../../context/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header
        title="Dashboard"
        description="Overview"
        onToggleSidebar={vi.fn()}
      />
    </MemoryRouter>,
  )
}

describe('Header profile resilience', () => {
  it('does not crash when the profile username is missing', () => {
    mockedUseAuth.mockReturnValue({
      token: 'admin-token',
      user: {
        userId: 1,
        username: undefined as unknown as string,
        email: '',
        role: 'ADMIN',
        preferredLanguageId: null,
      } as AuthUser,
      status: 'authenticated',
      isAuthenticated: true,
      isBootstrapping: false,
      authError: null,
      login: vi.fn(),
      logout: vi.fn(),
      retrySession: vi.fn(),
    })

    expect(() => renderHeader()).not.toThrow()
    expect(screen.getByText('Administrator')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renders no profile block when the user is not bootstrapped yet', () => {
    mockedUseAuth.mockReturnValue({
      token: null,
      user: null,
      status: 'loading',
      isAuthenticated: false,
      isBootstrapping: true,
      authError: null,
      login: vi.fn(),
      logout: vi.fn(),
      retrySession: vi.fn(),
    })

    renderHeader()

    expect(screen.queryByText('Signed in as')).not.toBeInTheDocument()
  })
})
