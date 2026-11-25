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

  it('flags real API data as not demo and 404 fallback as demo', async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'OK',
      data: [mockTranslation],
    })
    expect((await getAllTranslations()).isDemo).toBe(false)

    vi.mocked(apiClient.apiRequest).mockRejectedValueOnce(
      new apiClient.ApiError('Not found', 404),
    )
    expect((await getAllTranslations()).isDemo).toBe(true)
  })

  it('does not fall back on non-endpoint errors such as 500', async () => {
    vi.mocked(apiClient.apiRequest).mockRejectedValueOnce(
      new apiClient.ApiError('boom', 500),
    )
    await expect(getAllTranslations()).rejects.toThrow('boom')
  })

  it('returns zero stats for an empty dataset (no artificial defaults)', () => {
    expect(computeTranslationStats([])).toEqual({
      totalContent: 0,
      translated: 0,
      draft: 0,
      scope: 'all-results',
    })
  })

  it('counts actual published and draft records only', () => {
    const stats = computeTranslationStats([
      { ...mockTranslation, id: 1, contentId: 1, status: 'PUBLISHED' },
      { ...mockTranslation, id: 2, contentId: 1, status: 'PUBLISHED' },
      { ...mockTranslation, id: 3, contentId: 2, status: 'DRAFT' },
    ])
    expect(stats).toEqual({
      totalContent: 2,
      translated: 2,
      draft: 1,
      scope: 'all-results',
    })
  })

  it('reports current-page scope when more results exist than were loaded', () => {
    const stats = computeTranslationStats(
      [{ ...mockTranslation, id: 1, status: 'DRAFT' }],
      25,
    )
    expect(stats.scope).toBe('current-page')
    expect(stats.draft).toBe(1)
    expect(stats.translated).toBe(0)
  })

  it('returns the requested page of the in-memory dataset with page metadata', async () => {
    vi.mocked(apiClient.apiRequest).mockRejectedValue(
      new apiClient.ApiError('Not found', 404),
    )
    const first = await getAllTranslations({ page: 0, size: 3 })
    const second = await getAllTranslations({ page: 1, size: 3 })
    expect(first.items).toHaveLength(3)
    expect(first.totalPages).toBe(Math.ceil(first.totalElements / 3))
    expect(second.items[0].id).not.toBe(first.items[0].id)
    const stats = computeTranslationStats(first.items, first.totalElements)
    expect(stats.scope).toBe('current-page')
    expect(stats.translated + stats.draft).toBe(3)
  })
})
