import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ArtifactsPage from '../ArtifactsPage'
import { ApiError, apiRequest } from '../../services/apiClient'

vi.mock('../../services/apiClient', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../services/apiClient')>()
  return { ...actual, apiRequest: vi.fn() }
})

const sites = [
  { siteId: 1, name: 'Imperial Citadel' },
  { siteId: 2, name: 'Cu Chi Tunnels' },
]

const allArtifacts = [
  { artifactId: 10, siteId: 1, siteName: 'Imperial Citadel', name: 'Bronze Drum', description: null },
  { artifactId: 11, siteId: 2, siteName: 'Cu Chi Tunnels', name: 'Ceramic Vase', description: null },
]

function mockApi() {
  vi.mocked(apiRequest).mockImplementation(async (path) => {
    if (path.startsWith('/api/heritage-sites')) {
      return { success: true, message: 'ok', data: sites } as never
    }
    if (path.includes('siteId=2')) {
      return { success: true, message: 'ok', data: [allArtifacts[1]] } as never
    }
    if (path.startsWith('/api/artifacts')) {
      return { success: true, message: 'ok', data: allArtifacts } as never
    }
    return { success: true, message: 'ok', data: {} } as never
  })
}

function artifactCalls() {
  return vi
    .mocked(apiRequest)
    .mock.calls.map(([path]) => path)
    .filter((path) => path.startsWith('/api/artifacts'))
}

describe('ArtifactsPage — Heritage Site filter & pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi()
  })

  it('offers a dropdown of heritage sites instead of a numeric ID input', async () => {
    render(<ArtifactsPage />)

    const select = await screen.findByRole('combobox', {
      name: /filter by heritage site/i,
    })
    await waitFor(() => {
      expect(
        within(select).getByRole('option', { name: 'Cu Chi Tunnels' }),
      ).toBeInTheDocument()
    })
    expect(
      within(select).getByRole('option', { name: 'All Heritage Sites' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText(/filter by heritage site id/i),
    ).not.toBeInTheDocument()
  })

  it('requests /api/artifacts with siteId when a site is chosen and drops it for "All"', async () => {
    const user = userEvent.setup()
    render(<ArtifactsPage />)

    await screen.findByText('Bronze Drum')
    const select = screen.getByRole('combobox', {
      name: /filter by heritage site/i,
    })
    await waitFor(() => expect(select).toBeEnabled())

    await user.selectOptions(select, '2')
    await waitFor(() => {
      expect(artifactCalls().some((path) => path.includes('siteId=2'))).toBe(true)
    })
    expect(await screen.findByText('Ceramic Vase')).toBeInTheDocument()
    expect(screen.queryByText('Bronze Drum')).not.toBeInTheDocument()

    await user.selectOptions(select, '')
    await waitFor(() => {
      expect(artifactCalls().at(-1)).not.toContain('siteId=')
    })
    expect(await screen.findByText('Bronze Drum')).toBeInTheDocument()
  })

  it('searches by name and supports M2 backend PageResponse with pagination', async () => {
    const user = userEvent.setup()
    vi.mocked(apiRequest).mockImplementation(async (endpoint) => {
      if (endpoint.startsWith('/api/heritage-sites')) {
        return { success: true, message: 'ok', data: sites } as never
      }
      if (endpoint.includes('page=1')) {
        return {
          success: true,
          message: 'ok',
          data: {
            content: [allArtifacts[1]],
            page: 1,
            size: 1,
            totalElements: 2,
            totalPages: 2,
          },
        } as never
      }
      return {
        success: true,
        message: 'ok',
        data: {
          content: [allArtifacts[0]],
          page: 0,
          size: 1,
          totalElements: 2,
          totalPages: 2,
        },
      } as never
    })

    render(<ArtifactsPage />)

    await screen.findByText('Bronze Drum')
    expect(screen.getByText('Showing page 1 of 2 (2 artifacts)')).toBeInTheDocument()

    const prevButton = screen.getByRole('button', { name: /previous page/i })
    const nextButton = screen.getByRole('button', { name: /next page/i })

    expect(prevButton).toBeDisabled()
    expect(nextButton).toBeEnabled()

    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText('Ceramic Vase')).toBeInTheDocument()
    })
    expect(screen.getByText('Showing page 2 of 2 (2 artifacts)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /previous page/i })).toBeEnabled()
  })
})

describe('ArtifactsPage — CRUD request behavior', () => {
  let currentArtifacts: typeof allArtifacts

  function mockCrudApi() {
    currentArtifacts = [...allArtifacts]

    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      const method = options?.method ?? 'GET'

      if (method === 'GET' && path === '/api/heritage-sites') {
        return { success: true, message: 'ok', data: sites } as never
      }

      if (method === 'GET' && path === '/api/artifacts/10') {
        return { success: true, message: 'ok', data: currentArtifacts[0] } as never
      }

      if (method === 'GET' && path.startsWith('/api/artifacts')) {
        return { success: true, message: 'ok', data: currentArtifacts } as never
      }

      if (method === 'POST' && path === '/api/artifacts') {
        const body = JSON.parse(String(options?.body))
        const site = sites.find((item) => item.siteId === body.siteId)
        const created = {
          artifactId: 12,
          siteName: site?.name ?? '',
          ...body,
        }
        currentArtifacts = [...currentArtifacts, created]
        return { success: true, message: 'ok', data: created } as never
      }

      if (method === 'PUT' && path === '/api/artifacts/10') {
        const body = JSON.parse(String(options?.body))
        const site = sites.find((item) => item.siteId === body.siteId)
        currentArtifacts = currentArtifacts.map((artifact) =>
          artifact.artifactId === 10
            ? { ...artifact, ...body, siteName: site?.name ?? artifact.siteName }
            : artifact,
        )
        return { success: true, message: 'ok', data: currentArtifacts[0] } as never
      }

      if (method === 'DELETE' && path.startsWith('/api/artifacts/')) {
        const id = Number(path.split('/').at(-1))
        currentArtifacts = currentArtifacts.filter(
          (artifact) => artifact.artifactId !== id,
        )
        return { success: true, message: 'ok', data: null } as never
      }

      throw new Error(`Unexpected request: ${method} ${path}`)
    })
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    mockCrudApi()
  })

  async function openCreateForm(
    user: ReturnType<typeof userEvent.setup>,
    name = 'New Artifact',
  ) {
    await screen.findByText('Bronze Drum')
    await user.click(screen.getByRole('button', { name: /add artifact/i }))
    await user.type(screen.getByLabelText(/artifact name/i), name)
  }

  it('creates an artifact with a valid Heritage Site and refreshes the list', async () => {
    const user = userEvent.setup()
    render(<ArtifactsPage />)

    await openCreateForm(user, 'Golden Bowl')
    await user.selectOptions(screen.getByLabelText(/^heritage site/i), '2')
    await user.type(screen.getByLabelText(/description/i), '  Burial offering  ')
    await user.click(screen.getByRole('button', { name: /create artifact/i }))

    expect(
      await screen.findByText('Artifact created successfully.'),
    ).toBeInTheDocument()
    expect(await screen.findByText('Golden Bowl')).toBeInTheDocument()

    const postCall = vi
      .mocked(apiRequest)
      .mock.calls.find(([, options]) => options?.method === 'POST')
    expect(postCall?.[0]).toBe('/api/artifacts')
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      name: 'Golden Bowl',
      siteId: 2,
      description: 'Burial offering',
    })

    const listCalls = vi
      .mocked(apiRequest)
      .mock.calls.filter(([path, options]) => {
        const method = options?.method ?? 'GET'
        return method === 'GET' && path.startsWith('/api/artifacts?')
      })
    expect(listCalls.length).toBeGreaterThanOrEqual(2)
  })

  it('edits the artifact relationship with the correct PUT path/body', async () => {
    const user = userEvent.setup()
    render(<ArtifactsPage />)

    const row = (await screen.findByText('Bronze Drum')).closest('tr')
    await user.click(within(row as HTMLElement).getByRole('button', { name: 'Edit' }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Edit Artifact' })).toBeInTheDocument(),
    )
    expect(screen.getByLabelText(/artifact name/i)).toHaveValue('Bronze Drum')
    expect(screen.getByLabelText(/^heritage site/i)).toHaveValue('1')

    const nameInput = screen.getByLabelText(/artifact name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Bronze Drum Updated')
    await user.selectOptions(screen.getByLabelText(/^heritage site/i), '2')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(
      await screen.findByText('Artifact updated successfully.'),
    ).toBeInTheDocument()
    expect(await screen.findByText('Bronze Drum Updated')).toBeInTheDocument()

    const putCall = vi
      .mocked(apiRequest)
      .mock.calls.find(([, options]) => options?.method === 'PUT')
    expect(putCall?.[0]).toBe('/api/artifacts/10')
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
      name: 'Bronze Drum Updated',
      siteId: 2,
      description: null,
    })
  })

  it('cancels or confirms deletion and refreshes only after confirmation', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm')
    render(<ArtifactsPage />)

    const row = (await screen.findByText('Ceramic Vase')).closest('tr')
    const deleteButton = within(row as HTMLElement).getByRole('button', {
      name: 'Delete',
    })

    confirmSpy.mockReturnValueOnce(false)
    await user.click(deleteButton)
    expect(
      vi
        .mocked(apiRequest)
        .mock.calls.some(([, options]) => options?.method === 'DELETE'),
    ).toBe(false)
    expect(screen.getByText('Ceramic Vase')).toBeInTheDocument()

    confirmSpy.mockReturnValueOnce(true)
    await user.click(deleteButton)

    expect(
      await screen.findByText('Artifact deleted successfully.'),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByText('Ceramic Vase')).not.toBeInTheDocument(),
    )

    const deleteCall = vi
      .mocked(apiRequest)
      .mock.calls.find(([, options]) => options?.method === 'DELETE')
    expect(deleteCall?.[0]).toBe('/api/artifacts/11')
  })

  it('blocks create when no valid Heritage Site is selected', async () => {
    const user = userEvent.setup()
    render(<ArtifactsPage />)

    await openCreateForm(user)
    const form = screen.getByRole('dialog').querySelector('form')
    fireEvent.submit(form as HTMLFormElement)

    expect(
      await screen.findByText(/please select a valid heritage site/i),
    ).toBeInTheDocument()
    expect(
      vi
        .mocked(apiRequest)
        .mock.calls.some(([, options]) => options?.method === 'POST'),
    ).toBe(false)
  })

  it('disables artifact creation while Heritage Sites are unavailable', async () => {
    const user = userEvent.setup()
    vi.mocked(apiRequest).mockRejectedValue(
      new ApiError('Cannot connect to the server.', 0),
    )
    render(<ArtifactsPage />)

    expect(
      await screen.findByText(/unable to load heritage sites/i),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /add artifact/i }))

    expect(screen.getByRole('button', { name: /create artifact/i })).toBeDisabled()
    expect(
      screen.getByRole('option', { name: /unable to load heritage sites/i }),
    ).toBeInTheDocument()
  })

  it.each([
    [400, 'Invalid Heritage Site', /invalid heritage site/i],
    [409, 'Artifact is still referenced', /artifact is still referenced/i],
  ])('shows HTTP %i save errors in the open form', async (status, message, expected) => {
    const user = userEvent.setup()
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      const method = options?.method ?? 'GET'
      if (method === 'GET' && path === '/api/heritage-sites') {
        return { success: true, message: 'ok', data: sites } as never
      }
      if (method === 'GET' && path.startsWith('/api/artifacts')) {
        return { success: true, message: 'ok', data: allArtifacts } as never
      }
      throw new ApiError(message, status)
    })
    render(<ArtifactsPage />)

    await openCreateForm(user)
    await user.selectOptions(screen.getByLabelText(/^heritage site/i), '1')
    await user.click(screen.getByRole('button', { name: /create artifact/i }))

    expect(await screen.findByText(expected)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows a 409 delete error without changing the list count', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      const method = options?.method ?? 'GET'
      if (method === 'GET' && path === '/api/heritage-sites') {
        return { success: true, message: 'ok', data: sites } as never
      }
      if (method === 'GET' && path.startsWith('/api/artifacts')) {
        return { success: true, message: 'ok', data: allArtifacts } as never
      }
      throw new ApiError('Cannot delete an artifact with multimedia or beacons', 409)
    })
    render(<ArtifactsPage />)

    const row = (await screen.findByText('Bronze Drum')).closest('tr')
    await user.click(
      within(row as HTMLElement).getByRole('button', { name: 'Delete' }),
    )

    expect(
      await screen.findByText(/cannot delete an artifact with multimedia or beacons/i),
    ).toBeInTheDocument()
    expect(screen.getByText('2 artifacts')).toBeInTheDocument()
  })

  it('shows a network error on load and retries successfully', async () => {
    const user = userEvent.setup()
    let failArtifacts = true
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      const method = options?.method ?? 'GET'
      if (method === 'GET' && path === '/api/heritage-sites') {
        return { success: true, message: 'ok', data: sites } as never
      }
      if (method === 'GET' && path.startsWith('/api/artifacts')) {
        if (failArtifacts) {
          failArtifacts = false
          throw new ApiError('Cannot connect to the server.', 0)
        }
        return { success: true, message: 'ok', data: allArtifacts } as never
      }
      throw new Error(`Unexpected request: ${method} ${path}`)
    })
    render(<ArtifactsPage />)

    expect(
      await screen.findByText(/cannot connect to the server/i),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Bronze Drum')).toBeInTheDocument()
  })
})
