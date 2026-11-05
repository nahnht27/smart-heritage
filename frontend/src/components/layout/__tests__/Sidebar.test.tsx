import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Sidebar from '../Sidebar'
import { useAuth } from '../../../context/useAuth'

vi.mock('../../../context/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>
}

describe('Sidebar logout', () => {
  it('calls the AuthContext logout action and returns to login', async () => {
    const logout = vi.fn()
    mockedUseAuth.mockReturnValue({
      token: 'admin-token',
      user: null,
      status: 'authenticated',
      isAuthenticated: true,
      isBootstrapping: false,
      authError: null,
      login: vi.fn(),
      logout,
      retrySession: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar isCollapsed={false} />
        <LocationProbe />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Logout' }))

    expect(logout).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
  })
})
