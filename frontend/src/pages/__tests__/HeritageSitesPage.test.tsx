import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HeritageSitesPage from '../HeritageSitesPage'
import { ApiError, apiRequest } from '../../services/apiClient'

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

  it('filters by name only, matching the backend contract', async () => {
    const user = userEvent.setup()
    render(<HeritageSitesPage />)

    await screen.findByText('Imperial Citadel')
    const input = screen.getByLabelText(/search heritage sites/i)

    await user.type(input, 'cu chi')
    expect(screen.getByText('Cu Chi Tunnels')).toBeInTheDocument()
    expect(screen.queryByText('Imperial Citadel')).not.toBeInTheDocument()
    expect(screen.getByText('1 matching site')).toBeInTheDocument()

    await user.clear(input)
    await user.type(input, 'Hue')
    expect(screen.getByText('No matching heritage sites')).toBeInTheDocument()

    await user.clear(input)
    await user.type(input, 'nguyen')
    expect(screen.getByText('No matching heritage sites')).toBeInTheDocument()
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

describe('HeritageSitesPage — CRUD request behavior', () => {
  let currentSites: typeof sites

  function mockCrudApi() {
    currentSites = [...sites]

    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      const method = options?.method ?? 'GET'

      if (method === 'GET' && path.startsWith('/api/heritage-sites')) {
        return { success: true, message: 'ok', data: currentSites } as never
      }

      if (method === 'POST' && path === '/api/heritage-sites') {
        const body = JSON.parse(String(options?.body))
        const created = { siteId: 4, ...body }
        currentSites = [...currentSites, created]
        return { success: true, message: 'ok', data: created } as never
      }

      if (method === 'PUT' && path === '/api/heritage-sites/1') {
        const body = JSON.parse(String(options?.body))
        currentSites = currentSites.map((site) =>
          site.siteId === 1 ? { ...site, ...body } : site,
        )
        return { success: true, message: 'ok', data: currentSites[0] } as never
      }

      if (method === 'DELETE' && path === '/api/heritage-sites/2') {
        currentSites = currentSites.filter((site) => site.siteId !== 2)
        return { success: true, message: 'ok', data: null } as never
      }

      throw new Error(`Unexpected request: ${method} ${path}`)
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCrudApi()
  })

  it('creates a site with the exact POST payload and refreshes the list', async () => {
    const user = userEvent.setup()
    render(<HeritageSitesPage />)

    await screen.findByText('Imperial Citadel')
    await user.click(screen.getByRole('button', { name: /add heritage site/i }))
    await user.type(screen.getByLabelText(/site name/i), '  My Son Sanctuary  ')
    await user.type(screen.getByLabelText(/address/i), '  Duy Xuyen  ')
    await user.type(screen.getByLabelText(/description/i), '  Cham temple complex  ')
    await user.type(screen.getByLabelText(/latitude/i), '15.764')
    await user.type(screen.getByLabelText(/longitude/i), '108.118')
    await user.click(screen.getByRole('button', { name: /create site/i }))

    expect(
      await screen.findByText('Heritage site created successfully.'),
    ).toBeInTheDocument()
    expect(await screen.findByText('My Son Sanctuary')).toBeInTheDocument()

    const postCall = vi
      .mocked(apiRequest)
      .mock.calls.find(([, options]) => options?.method === 'POST')
    expect(postCall?.[0]).toBe('/api/heritage-sites')
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      name: 'My Son Sanctuary',
      description: 'Cham temple complex',
      address: 'Duy Xuyen',
      latitude: 15.764,
      longitude: 108.118,
    })

    const listCalls = vi
      .mocked(apiRequest)
      .mock.calls.filter(
        ([path, options]) =>
          path.startsWith('/api/heritage-sites') &&
          (options?.method ?? 'GET') === 'GET',
      )
    expect(listCalls.length).toBeGreaterThanOrEqual(2)
  })

  it('edits a site with the correct PUT path/body and refreshes the list', async () => {
    const user = userEvent.setup()
    render(<HeritageSitesPage />)

    await screen.findByText('Imperial Citadel')
    await user.click(
      screen.getByRole('button', { name: /edit imperial citadel/i }),
    )

    const nameInput = screen.getByLabelText(/site name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Imperial City')
    const latitudeInput = screen.getByLabelText(/latitude/i)
    await user.clear(latitudeInput)
    await user.type(latitudeInput, '16.4698')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(
      await screen.findByText('Heritage site updated successfully.'),
    ).toBeInTheDocument()
    expect(await screen.findByText('Imperial City')).toBeInTheDocument()

    const putCall = vi
      .mocked(apiRequest)
      .mock.calls.find(([, options]) => options?.method === 'PUT')
    expect(putCall?.[0]).toBe('/api/heritage-sites/1')
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
      name: 'Imperial City',
      description: 'Royal complex of the Nguyen dynasty',
      address: 'Hue',
      latitude: 16.4698,
      longitude: 107.58,
    })
  })

  it('cancels or confirms deletion and refreshes only after confirmation', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm')
    render(<HeritageSitesPage />)

    await screen.findByText('Cu Chi Tunnels')
    const deleteButton = screen.getByRole('button', {
      name: /delete cu chi tunnels/i,
    })

    confirmSpy.mockReturnValueOnce(false)
    await user.click(deleteButton)

    expect(
      vi
        .mocked(apiRequest)
        .mock.calls.some(([, options]) => options?.method === 'DELETE'),
    ).toBe(false)
    expect(screen.getByText('Cu Chi Tunnels')).toBeInTheDocument()

    confirmSpy.mockReturnValueOnce(true)
    await user.click(deleteButton)

    expect(
      await screen.findByText('Heritage site deleted successfully.'),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText('Cu Chi Tunnels')).not.toBeInTheDocument()
    })

    const deleteCall = vi
      .mocked(apiRequest)
      .mock.calls.find(([, options]) => options?.method === 'DELETE')
    expect(deleteCall?.[0]).toBe('/api/heritage-sites/2')
  })

  it('blocks invalid names and coordinates before calling the API', async () => {
    const user = userEvent.setup()
    render(<HeritageSitesPage />)

    await screen.findByText('Imperial Citadel')
    await user.click(screen.getByRole('button', { name: /add heritage site/i }))

    const nameInput = screen.getByLabelText(/site name/i)
    await user.type(nameInput, '   ')
    await user.click(screen.getByRole('button', { name: /create site/i }))
    expect(
      await screen.findByText(/please enter the heritage site name/i),
    ).toBeInTheDocument()

    await user.clear(nameInput)
    await user.type(nameInput, 'Invalid Coordinates')
    await user.type(screen.getByLabelText(/latitude/i), '91')
    const form = screen.getByRole('dialog').querySelector('form')
    fireEvent.submit(form as HTMLFormElement)
    expect(
      await screen.findByText(/latitude must be a number from -90 to 90/i),
    ).toBeInTheDocument()

    await user.clear(screen.getByLabelText(/latitude/i))
    await user.type(screen.getByLabelText(/latitude/i), '-90')
    await user.type(screen.getByLabelText(/longitude/i), '181')
    fireEvent.submit(form as HTMLFormElement)
    expect(
      await screen.findByText(/longitude must be a number from -180 to 180/i),
    ).toBeInTheDocument()

    expect(
      vi
        .mocked(apiRequest)
        .mock.calls.some(([, options]) => options?.method === 'POST'),
    ).toBe(false)
  })

  it('shows a server validation error in the still-open form without reloading', async () => {
    const user = userEvent.setup()
    vi.mocked(apiRequest).mockImplementation(async (_path, options) => {
      const method = options?.method ?? 'GET'
      if (method === 'GET') {
        return { success: true, message: 'ok', data: sites } as never
      }
      throw new ApiError('Site name already exists', 400)
    })
    render(<HeritageSitesPage />)

    await screen.findByText('Imperial Citadel')
    await user.click(screen.getByRole('button', { name: /add heritage site/i }))
    await user.type(screen.getByLabelText(/site name/i), 'Imperial Citadel')
    await user.click(screen.getByRole('button', { name: /create site/i }))

    expect(
      await screen.findByText('Site name already exists'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      vi
        .mocked(apiRequest)
        .mock.calls.filter(
          ([path, options]) =>
            path.startsWith('/api/heritage-sites') &&
            (options?.method ?? 'GET') === 'GET',
        ),
    ).toHaveLength(1)
  })

  it('shows a network error on load and retries successfully', async () => {
    const user = userEvent.setup()
    vi.mocked(apiRequest)
      .mockRejectedValueOnce(new ApiError('Cannot connect to the server.', 0))
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: sites,
      } as never)
    render(<HeritageSitesPage />)

    expect(
      await screen.findByText(/cannot connect to the server/i),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Imperial Citadel')).toBeInTheDocument()
  })
})
