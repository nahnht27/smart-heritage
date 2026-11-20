import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getAllTranslations,
  getTranslationById,
  createTranslation,
  updateTranslation,
  deleteTranslation,
  computeTranslationStats,
  resetMockTranslations,
} from '../translationService'
import * as apiClient from '../apiClient'
import type { Translation, TranslationRequest } from '../../types/translation'

vi.mock('../apiClient', () => ({
  apiRequest: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  },
}))

describe('translationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetMockTranslations()
  })

  const mockTranslation: Translation = {
    id: 1,
    contentType: 'SITE',
    contentId: 1,
    contentName: 'Imperial Citadel',
    language: 'en',
    title: 'The Imperial Citadel of Hue',
    description: 'Historical site in Hue, Vietnam.',
    status: 'PUBLISHED',
    updatedAt: '2025-05-10',
  }

  it('fetches translations from /api/admin/translations when backend returns data', async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'Translations retrieved successfully',
      data: [mockTranslation],
    })

    const result = await getAllTranslations({ language: 'en', q: 'Imperial' })

    expect(apiClient.apiRequest).toHaveBeenCalledWith(
      '/api/admin/translations?q=Imperial&language=en',
    )
    expect(result.items).toEqual([mockTranslation])
    expect(result.totalElements).toBe(1)
  })

  it('falls back to mock data when backend endpoint returns 404', async () => {
    const error = new apiClient.ApiError('Not found', 404)
    vi.mocked(apiClient.apiRequest).mockRejectedValueOnce(error)

    const result = await getAllTranslations({ language: 'en' })

    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items.every((item) => item.language === 'en')).toBe(true)
  })

  it('fetches single translation by id', async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'Translation retrieved successfully',
      data: mockTranslation,
    })

    const result = await getTranslationById(1)
    expect(apiClient.apiRequest).toHaveBeenCalledWith('/api/admin/translations/1')
    expect(result).toEqual(mockTranslation)
  })

  it('creates translation via POST /api/admin/translations', async () => {
    const payload: TranslationRequest = {
      contentType: 'SITE',
      contentId: 1,
      language: 'vi',
      title: 'Hoàng thành Huế',
      description: 'Di tích cố đô Huế.',
      status: 'PUBLISHED',
    }

    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'Translation created successfully',
      data: { ...mockTranslation, ...payload, id: 99 },
    })

    const result = await createTranslation(payload)

    expect(apiClient.apiRequest).toHaveBeenCalledWith(
      '/api/admin/translations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    )
    expect(result.id).toBe(99)
    expect(result.title).toBe('Hoàng thành Huế')
  })

  it('updates translation via PUT /api/admin/translations/{id}', async () => {
    const payload: TranslationRequest = {
      contentType: 'SITE',
      contentId: 1,
      language: 'en',
      title: 'Updated Title',
      description: 'Updated Description',
      status: 'PUBLISHED',
    }

    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'Translation updated successfully',
      data: { ...mockTranslation, ...payload },
    })

    const result = await updateTranslation(1, payload)

    expect(apiClient.apiRequest).toHaveBeenCalledWith(
      '/api/admin/translations/1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    )
    expect(result.title).toBe('Updated Title')
  })

  it('deletes translation via DELETE /api/admin/translations/{id}', async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'Translation deleted successfully',
      data: undefined,
    })

    await deleteTranslation(1)

    expect(apiClient.apiRequest).toHaveBeenCalledWith(
      '/api/admin/translations/1',
      expect.objectContaining({
        method: 'DELETE',
      }),
    )
  })

  it('correctly calculates translation stats', () => {
    const stats = computeTranslationStats([
      { ...mockTranslation, id: 1, status: 'PUBLISHED' },
      { ...mockTranslation, id: 2, status: 'PUBLISHED' },
      { ...mockTranslation, id: 3, status: 'DRAFT' },
    ])

    expect(stats.translated).toBe(2)
    expect(stats.draft).toBe(1)
    expect(stats.totalContent).toBeGreaterThanOrEqual(1)
  })
})
