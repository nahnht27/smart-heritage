import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MultimediaPage from '../MultimediaPage'
import { ApiError, apiRequest } from '../../services/apiClient'

vi.mock('../../services/apiClient', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../services/apiClient')>()
  return { ...actual, apiRequest: vi.fn() }
})

const items = [
  {
    multimediaId: 1,
    artifactId: 1,
    artifactName: 'Drum',
    type: 'IMAGE',
    title: 'Safe image',
    url: 'https://example.com/drum.jpg',
  },
  {
    multimediaId: 2,
    artifactId: 1,
    artifactName: 'Drum',
    type: 'IMAGE',
    title: 'Legacy bad link',
    url: 'javascript:alert(1)',
  },
]

function mockApi() {
  vi.mocked(apiRequest).mockImplementation(async (path, options) => {
    const method = options?.method ?? 'GET'
    if (path === '/api/artifacts') {
      return {
        success: true,
        message: 'ok',
        data: [{ artifactId: 1, name: 'Drum' }],
      } as never
    }
    if (path === '/api/multimedia' && method === 'GET') {
      return { success: true, message: 'ok', data: items } as never
    }
    return { success: true, message: 'ok', data: {} } as never
  })
}

async function openFormAndFill(
  user: ReturnType<typeof userEvent.setup>,
  url: string,
) {
  await screen.findByText('Safe image')
  await user.click(screen.getByRole('button', { name: /add multimedia/i }))
  await user.selectOptions(screen.getByLabelText(/^artifact \*/i), '1')
  await user.type(screen.getByLabelText(/^url \*/i), url)
  await user.click(screen.getByRole('button', { name: /create multimedia/i }))
}

function postCalls() {
  return vi
    .mocked(apiRequest)
    .mock.calls.filter(([, options]) => options?.method === 'POST')
}

describe('MultimediaPage — URL safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi()
  })

  it('renders http(s) URLs as safe links and other schemes as plain text', async () => {
    render(<MultimediaPage />)

    const link = await screen.findByRole('link', {
      name: 'https://example.com/drum.jpg',
    })
    expect(link).toHaveAttribute('href', 'https://example.com/drum.jpg')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')

    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'javascript:alert(1)' }),
    ).not.toBeInTheDocument()
  })

  it.each(['javascript:alert(1)', 'ftp://example.com/file.mp3'])(
    'rejects non-http(s) URL %s without calling the API',
    async (badUrl) => {
      const user = userEvent.setup()
      render(<MultimediaPage />)

      await openFormAndFill(user, badUrl)

      expect(
        await screen.findByText(/url must start with http:\/\/ or https:\/\//i),
      ).toBeInTheDocument()
      expect(postCalls()).toHaveLength(0)
    },
  )

  it('submits a valid https URL', async () => {
    const user = userEvent.setup()
    render(<MultimediaPage />)

    await openFormAndFill(user, 'https://example.com/new.mp3')

    await waitFor(() => expect(postCalls()).toHaveLength(1))
    const body = JSON.parse(String(postCalls()[0][1]?.body))
    expect(body).toMatchObject({
      artifactId: 1,
      type: 'IMAGE',
      url: 'https://example.com/new.mp3',
    })
  })
})
describe('MultimediaPage — CRUD and filters', () => {
  const artifactOptions = [
    { artifactId: 1, name: 'Drum' },
    { artifactId: 2, name: 'Bronze Drum' },
  ]

  const allItems = [
    ...items,
    {
      multimediaId: 3,
      artifactId: 2,
      artifactName: 'Bronze Drum',
      type: 'VIDEO',
      title: 'Bronze Drum documentary',
      url: 'https://example.com/video.mp4',
    },
  ]

  let currentItems: typeof allItems

  function mockCrudApi() {
    currentItems = [...allItems]

    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      const method = options?.method ?? 'GET'

      if (method === 'GET' && path === '/api/artifacts') {
        return { success: true, message: 'ok', data: artifactOptions } as never
      }

      if (method === 'GET' && path === '/api/multimedia/1') {
        return { success: true, message: 'ok', data: currentItems[0] } as never
      }

      if (method === 'GET' && path.startsWith('/api/multimedia')) {
        const query = path.split('?')[1]
        const artifactId = query
          ? new URLSearchParams(query).get('artifactId')
          : null
        const filtered = artifactId
          ? currentItems.filter((item) => String(item.artifactId) === artifactId)
          : currentItems
        return { success: true, message: 'ok', data: filtered } as never
      }

      if (method === 'POST' && path === '/api/multimedia') {
        const body = JSON.parse(String(options?.body))
        const artifact = artifactOptions.find(
          (item) => item.artifactId === body.artifactId,
        )
        const created = {
          multimediaId: 4,
          artifactName: artifact?.name ?? '',
          ...body,
        }
        currentItems = [...currentItems, created]
        return { success: true, message: 'ok', data: created } as never
      }

      if (method === 'PUT' && path === '/api/multimedia/1') {
        const body = JSON.parse(String(options?.body))
        const artifact = artifactOptions.find(
          (item) => item.artifactId === body.artifactId,
        )
        currentItems = currentItems.map((item) =>
          item.multimediaId === 1
            ? {
                ...item,
                ...body,
                artifactName: artifact?.name ?? item.artifactName,
              }
            : item,
        )
        return { success: true, message: 'ok', data: currentItems[0] } as never
      }

      if (method === 'DELETE' && path.startsWith('/api/multimedia/')) {
        const id = Number(path.split('/').at(-1))
        currentItems = currentItems.filter(
          (item) => item.multimediaId !== id,
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
    url = 'https://example.com/new.mp3',
  ) {
    await screen.findByText('Safe image')
    await user.click(screen.getByRole('button', { name: /add multimedia/i }))
    await user.selectOptions(screen.getByLabelText(/^artifact \*/i), '1')
    await user.type(screen.getByLabelText(/^url \*/i), url)
  }

  it('creates a resource and refreshes the list with a normalized null title', async () => {
    const user = userEvent.setup()
    render(<MultimediaPage />)

    await openCreateForm(user)
    await user.selectOptions(screen.getByLabelText(/^artifact \*/i), '2')
    await user.selectOptions(screen.getByLabelText(/^type \*/i), 'AUDIO')
    await user.type(screen.getByLabelText(/^title$/i), '   ')
    await user.click(screen.getByRole('button', { name: /create multimedia/i }))

    expect(
      await screen.findByText('Multimedia created successfully.'),
    ).toBeInTheDocument()
    expect(await screen.findByText('Untitled')).toBeInTheDocument()

    const postCall = vi
      .mocked(apiRequest)
      .mock.calls.find(([, options]) => options?.method === 'POST')
    expect(postCall?.[0]).toBe('/api/multimedia')
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      artifactId: 2,
      type: 'AUDIO',
      title: null,
      url: 'https://example.com/new.mp3',
    })
  })

  it('edits an existing resource with the correct PUT path and relationship', async () => {
    const user = userEvent.setup()
    render(<MultimediaPage />)

    const row = (await screen.findByText('Safe image')).closest('tr')
    await user.click(within(row as HTMLElement).getByRole('button', { name: 'Edit' }))

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Edit Multimedia' }),
      ).toBeInTheDocument(),
    )
    expect(screen.getByLabelText(/^artifact \*/i)).toHaveValue('1')
    expect(screen.getByLabelText(/^url \*/i)).toHaveValue(
      'https://example.com/drum.jpg',
    )

    await user.selectOptions(screen.getByLabelText(/^artifact \*/i), '2')
    await user.selectOptions(screen.getByLabelText(/^type \*/i), 'VIDEO')
    const titleInput = screen.getByLabelText(/^title$/i)
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated documentary')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(
      await screen.findByText('Multimedia updated successfully.'),
    ).toBeInTheDocument()

    const putCall = vi
      .mocked(apiRequest)
      .mock.calls.find(([, options]) => options?.method === 'PUT')
    expect(putCall?.[0]).toBe('/api/multimedia/1')
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
      artifactId: 2,
      type: 'VIDEO',
      title: 'Updated documentary',
      url: 'https://example.com/drum.jpg',
    })
  })

  it('cancels or confirms deletion and refreshes only after confirmation', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm')
    render(<MultimediaPage />)

    const row = (await screen.findByText('Legacy bad link')).closest('tr')
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

    confirmSpy.mockReturnValueOnce(true)
    await user.click(deleteButton)

    expect(
      await screen.findByText('Multimedia deleted successfully.'),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByText('Legacy bad link')).not.toBeInTheDocument(),
    )

    const deleteCall = vi
      .mocked(apiRequest)
      .mock.calls.find(([, options]) => options?.method === 'DELETE')
    expect(deleteCall?.[0]).toBe('/api/multimedia/2')
  })

  it('requests the artifact filter and applies the media-type filter client-side', async () => {
    const user = userEvent.setup()
    render(<MultimediaPage />)

    await screen.findByText('Safe image')
    const artifactFilter = screen.getByRole('combobox', {
      name: /filter by artifact/i,
    })
    const typeFilter = screen.getByRole('combobox', {
      name: /filter by media type/i,
    })

    await waitFor(() => expect(artifactFilter).toBeEnabled())
    await user.selectOptions(artifactFilter, '2')

    await waitFor(() => {
      const paths = vi.mocked(apiRequest).mock.calls.map(([path]) => path)
      expect(
        paths.some((path) => path.includes('artifactId=2')),
      ).toBe(true)
    })
    expect(
      await screen.findByText('Bronze Drum documentary'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Safe image')).not.toBeInTheDocument()

    await user.selectOptions(typeFilter, 'VIDEO')
    expect(screen.getByText('Bronze Drum documentary')).toBeInTheDocument()
    expect(screen.getByText('1 resource')).toBeInTheDocument()

    await user.selectOptions(typeFilter, 'AUDIO')
    expect(screen.getByText('No multimedia found')).toBeInTheDocument()
  })

  it('blocks create when no artifact is selected', async () => {
    const user = userEvent.setup()
    render(<MultimediaPage />)

    await screen.findByText('Safe image')
    await user.click(screen.getByRole('button', { name: /add multimedia/i }))
    await user.type(screen.getByLabelText(/^url \*/i), 'https://example.com/a.mp3')
    const form = screen.getByRole('dialog').querySelector('form')
    fireEvent.submit(form as HTMLFormElement)

    expect(
      await screen.findByText(/please select an artifact/i),
    ).toBeInTheDocument()
    expect(postCalls()).toHaveLength(0)
  })

  it('disables creation when the Artifact API returns no options', async () => {
    const user = userEvent.setup()
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      const method = options?.method ?? 'GET'
      if (method === 'GET' && path === '/api/artifacts') {
        return { success: true, message: 'ok', data: [] } as never
      }
      if (method === 'GET' && path.startsWith('/api/multimedia')) {
        return { success: true, message: 'ok', data: [] } as never
      }
      throw new Error(`Unexpected request: ${method} ${path}`)
    })
    render(<MultimediaPage />)

    await user.click(screen.getByRole('button', { name: /add multimedia/i }))
    expect(
      screen.getByText(/no artifacts available/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /create multimedia/i }),
    ).toBeDisabled()
  })

  it.each([
    [400, 'Invalid artifact relationship', /invalid artifact relationship/i],
    [409, 'Duplicate multimedia URL', /duplicate multimedia url/i],
  ])('shows HTTP %i save errors in the open form', async (status, message, expected) => {
    const user = userEvent.setup()
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      const method = options?.method ?? 'GET'
      if (method === 'GET' && path === '/api/artifacts') {
        return { success: true, message: 'ok', data: artifactOptions } as never
      }
      if (method === 'GET' && path.startsWith('/api/multimedia')) {
        return { success: true, message: 'ok', data: allItems } as never
      }
      throw new ApiError(message, status)
    })
    render(<MultimediaPage />)

    await openCreateForm(user)
    await user.click(screen.getByRole('button', { name: /create multimedia/i }))

    expect(await screen.findByText(expected)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows a network error on load and retries successfully', async () => {
    const user = userEvent.setup()
    let failItems = true
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      const method = options?.method ?? 'GET'
      if (method === 'GET' && path === '/api/artifacts') {
        return { success: true, message: 'ok', data: artifactOptions } as never
      }
      if (method === 'GET' && path.startsWith('/api/multimedia')) {
        if (failItems) {
          failItems = false
          throw new ApiError('Cannot connect to the server.', 0)
        }
        return { success: true, message: 'ok', data: allItems } as never
      }
      throw new Error(`Unexpected request: ${method} ${path}`)
    })
    render(<MultimediaPage />)

    expect(
      await screen.findByText(/cannot connect to the server/i),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Safe image')).toBeInTheDocument()
  })
})
