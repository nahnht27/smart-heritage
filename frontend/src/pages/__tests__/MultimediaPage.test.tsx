import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MultimediaPage from '../MultimediaPage'
import { apiRequest } from '../../services/apiClient'

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