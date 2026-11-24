import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TranslationsPage from '../TranslationsPage'
import * as translationService from '../../services/translationService'
import * as apiClient from '../../services/apiClient'
import type { Translation } from '../../types/translation'

vi.mock('../../services/translationService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/translationService')>()
  return {
    ...actual,
    getAllTranslations: vi.fn(),
    createTranslation: vi.fn(),
    updateTranslation: vi.fn(),
    deleteTranslation: vi.fn(),
  }
})

vi.mock('../../services/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/apiClient')>()
  return {
    ...actual,
    apiRequest: vi.fn(),
  }
})

const mockTranslations: Translation[] = [
  {
    id: 1,
    contentType: 'SITE',
    contentId: 1,
    contentName: 'Imperial Citadel',
    language: 'en',
    title: 'The Imperial Citadel of Hue',
    description: 'The Imperial Citadel of Hue is an important heritage site.',
    status: 'PUBLISHED',
    updatedAt: '2025-05-10',
    translations: {
      vi: {
        title: 'Hoàng thành Huế',
        description: 'Hoàng thành Huế là một di tích lịch sử và văn hóa quan trọng.',
        status: 'PUBLISHED',
      },
      en: {
        title: 'The Imperial Citadel of Hue',
        description: 'The Imperial Citadel of Hue is an important heritage site.',
        status: 'PUBLISHED',
      },
    },
  },
  {
    id: 2,
    contentType: 'ARTIFACT',
    contentId: 2,
    contentName: 'Hall of Supreme Harmony',
    language: 'vi',
    title: 'Điện Thái Hòa',
    description: 'Cung điện trung tâm trong Hoàng thành Huế.',
    status: 'PUBLISHED',
    updatedAt: '2025-05-08',
  },
]

describe('TranslationsPage — Admin Translation Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.apiRequest).mockResolvedValue({
      success: true,
      message: 'OK',
      data: [{ siteId: 1, name: 'Imperial Citadel' }],
    })
    vi.mocked(translationService.getAllTranslations).mockResolvedValue({
      items: mockTranslations,
      totalElements: 2,
      totalPages: 1,
      isDemo: false,
    })
  })

  it('renders translation list with content name, type, language and status', async () => {
    render(<TranslationsPage />)

    expect(screen.getByRole('heading', { name: 'Translation', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Manage multilingual heritage content')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getAllByText('Imperial Citadel').length).toBeGreaterThan(0)
    })

    expect(screen.getByText('Hall of Supreme Harmony')).toBeInTheDocument()
    expect(screen.getAllByText('English').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Vietnamese').length).toBeGreaterThan(0)
  })

  it('filters translations by search keyword', async () => {
    render(<TranslationsPage />)

    const searchInput = screen.getByPlaceholderText('Search content...')
    await userEvent.type(searchInput, 'Harmony')

    await waitFor(() => {
      expect(translationService.getAllTranslations).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'Harmony' }),
      )
    })
  })

  it('displays selected content comparison details and quick stats', async () => {
    render(<TranslationsPage />)

    await waitFor(() => {
      expect(screen.getByText('Selected content')).toBeInTheDocument()
    })

    expect(screen.getByText('Quick Stats')).toBeInTheDocument()
    expect(screen.getByText('Total Content')).toBeInTheDocument()
    expect(screen.getByText('Translated')).toBeInTheDocument()
  })

  it('opens add translation modal and creates new translation', async () => {
    vi.mocked(translationService.createTranslation).mockResolvedValueOnce({
      id: 3,
      contentType: 'SITE',
      contentId: 1,
      contentName: 'Imperial Citadel',
      language: 'vi',
      title: 'Kỳ Đài Huế',
      description: 'Cột cờ cố đô.',
      status: 'PUBLISHED',
      updatedAt: '2025-05-11',
    })

    render(<TranslationsPage />)

    const addButton = screen.getByRole('button', { name: /\+ Add Translation/i })
    await userEvent.click(addButton)

    expect(screen.getByRole('heading', { name: 'Add Translation', level: 2 })).toBeInTheDocument()

    const titleInput = screen.getByPlaceholderText('Enter translated title')
    await userEvent.type(titleInput, 'Kỳ Đài Huế')

    const submitBtn = screen.getByRole('button', { name: 'Create Translation' })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(translationService.createTranslation).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Kỳ Đài Huế',
        }),
      )
    })
  })

  it('deletes a translation when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(translationService.deleteTranslation).mockResolvedValueOnce()

    render(<TranslationsPage />)

    await waitFor(() => {
      expect(screen.getAllByTitle('Delete translation').length).toBeGreaterThan(0)
    })

    const deleteButtons = screen.getAllByTitle('Delete translation')
    await userEvent.click(deleteButtons[0])

    expect(window.confirm).toHaveBeenCalled()
    expect(translationService.deleteTranslation).toHaveBeenCalledWith(1)
  })

  it('shows no demo notice when real API data is used', async () => {
    render(<TranslationsPage />)
    await waitFor(() => expect(vi.mocked(translationService.getAllTranslations)).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument())
    expect(screen.queryByTestId('demo-mode-notice')).not.toBeInTheDocument()
  })

  it('shows the demo-mode notice when the service fell back to in-memory data', async () => {
    vi.mocked(translationService.getAllTranslations).mockResolvedValue({
      items: mockTranslations,
      totalElements: mockTranslations.length,
      totalPages: 1,
      isDemo: true,
    })
    render(<TranslationsPage />)
    const notice = await screen.findByTestId('demo-mode-notice')
    expect(notice).toHaveTextContent(
      'Demo mode — backend endpoint is not implemented. Changes are temporary and reset when the application reloads.',
    )
  })
})
