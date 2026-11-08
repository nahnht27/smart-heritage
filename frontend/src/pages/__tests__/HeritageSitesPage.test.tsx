import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HeritageSitesPage from '../HeritageSitesPage'
import { apiRequest } from '../../services/apiClient'

vi.mock('../../services/apiClient', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../services/apiClient')>()
  return { ...actual, apiRequest: vi.fn() }
})

const sites = [
  {
    siteId: 1,
    name: 'Imperial Citadel',
    description: 'Royal complex of the Nguyen dynasty',
    address: 'Hue',
    latitude: 16.46,
    longitude: 107.58,
  },
  {
    siteId: 2,
    name: 'Cu Chi Tunnels',
    description: 'Underground network from the war',
    address: 'Ho Chi Minh City',
    latitude: 11.14,
    longitude: 106.46,
  },
  {
    siteId: 3,
    name: 'Hoi An Ancient Town',
    description: null,
    address: null,
    latitude: null,
    longitude: null,
  },
]

describe('HeritageSitesPage — search & pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      message: 'ok',
      data: sites,
    } as never)
  })

  it('filters by name, address and description (case-insensitive)', async () => {
    const user = userEvent.setup()
    render(<HeritageSitesPage />)

    await screen.findByText('Imperial Citadel')
    const input = screen.getByLabelText(/search heritage sites/i)

    await user.type(input, 'cu chi')
    expect(screen.getByText('Cu Chi Tunnels')).toBeInTheDocument()
    expect(screen.queryByText('Imperial Citadel')).not.toBeInTheDocument()
    expect(screen.getByText('1 matching site')).toBeInTheDocument()

    await user.clear(input)
    await user.type(input, 'ho chi minh')
    expect(screen.getByText('Cu Chi Tunnels')).toBeInTheDocument()

    await user.clear(input)
    await user.type(input, 'nguyen')
    expect(screen.getByText('Imperial Citadel')).toBeInTheDocument()
    expect(screen.queryByText('Cu Chi Tunnels')).not.toBeInTheDocument()
  })

  it('shows a no-match state and clears the search', async () => {
    const user = userEvent.setup()
    render(<HeritageSitesPage />)

    await screen.findByText('Imperial Citadel')
    await user.type(screen.getByLabelText(/search heritage sites/i), 'zzz')

    expect(screen.getByText('No matching heritage sites')).toBeInTheDocument()
    expect(screen.queryByText('No heritage sites yet')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear search/i }))

    expect(screen.getByText('Imperial Citadel')).toBeInTheDocument()
    expect(screen.getByText('3 sites')).toBeInTheDocument()
  })

  it('supports M2 backend PageResponse and handles pagination', async () => {
    const user = userEvent.setup()
    vi.mocked(apiRequest).mockImplementation(async (endpoint) => {
      if (endpoint.includes('page=1')) {
        return {
          success: true,
          message: 'ok',
          data: {
            content: [sites[2]],
            page: 1,
            size: 2,
            totalElements: 3,
            totalPages: 2,
          },
        } as never
      }
      return {
        success: true,
        message: 'ok',
        data: {
          content: [sites[0], sites[1]],
          page: 0,
          size: 2,
          totalElements: 3,
          totalPages: 2,
        },
      } as never
    })

    render(<HeritageSitesPage />)

    await screen.findByText('Imperial Citadel')
    expect(screen.getByText('Cu Chi Tunnels')).toBeInTheDocument()
    expect(screen.getByText('Showing page 1 of 2 (3 sites)')).toBeInTheDocument()

    const prevButton = screen.getByRole('button', { name: /previous page/i })
    const nextButton = screen.getByRole('button', { name: /next page/i })

    expect(prevButton).toBeDisabled()
    expect(nextButton).toBeEnabled()

    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText('Hoi An Ancient Town')).toBeInTheDocument()
    })
    expect(screen.getByText('Showing page 2 of 2 (3 sites)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /previous page/i })).toBeEnabled()
  })
})
