import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ArtifactsPage from '../ArtifactsPage'
import { apiRequest } from '../../services/apiClient'

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
