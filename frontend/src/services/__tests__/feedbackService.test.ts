import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getAllFeedback,
  getFeedbackById,
  moderateFeedback,
  createFeedbackItem,
  updateFeedbackItem,
  deleteFeedbackItem,
  resetMockFeedback,
} from '../feedbackService'
import * as apiClient from '../apiClient'
import type { FeedbackItem, CreateFeedbackRequest } from '../../types/feedback'

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

describe('feedbackService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetMockFeedback()
  })

  const mockItem: FeedbackItem = {
    id: 1,
    code: 'F001',
    type: 'FEEDBACK',
    title: 'Great historical information',
    comment: 'Wonderful museum tour.',
    user: 'Nguyen Minh Anh',
    rating: 5,
    date: '2025-05-10',
    status: 'PENDING',
  }

  it('fetches feedback from /api/admin/feedback when backend returns data', async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'Feedback items retrieved successfully',
      data: [mockItem],
    })

    const result = await getAllFeedback({ status: 'PENDING', type: 'FEEDBACK' })

    expect(apiClient.apiRequest).toHaveBeenCalledWith(
      '/api/admin/feedback?status=PENDING&type=FEEDBACK',
    )
    expect(result.items).toEqual([mockItem])
    expect(result.totalElements).toBe(1)
    expect(result.isDemo).toBe(false)
  })

  it('falls back to mock data when backend returns 404', async () => {
    const error = new apiClient.ApiError('Not found', 404)
    vi.mocked(apiClient.apiRequest).mockRejectedValueOnce(error)

    const result = await getAllFeedback({ status: 'PENDING' })

    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items.every((f) => f.status === 'PENDING')).toBe(true)
    expect(result.isDemo).toBe(true)
  })

  it('fetches a single feedback item by id', async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'Feedback retrieved successfully',
      data: mockItem,
    })

    const result = await getFeedbackById(1)

    expect(apiClient.apiRequest).toHaveBeenCalledWith('/api/admin/feedback/1')
    expect(result).toEqual(mockItem)
  })

  it('moderates feedback via PUT /api/admin/feedback/{id}/moderate', async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'Feedback moderated successfully',
      data: { ...mockItem, status: 'APPROVED' },
    })

    const result = await moderateFeedback(1, 'APPROVE')

    expect(apiClient.apiRequest).toHaveBeenCalledWith(
      '/api/admin/feedback/1/moderate',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ action: 'APPROVE' }),
      }),
    )
    expect(result.status).toBe('APPROVED')
  })

  it('creates content item via POST /api/admin/feedback', async () => {
    const payload: CreateFeedbackRequest = {
      type: 'CONTENT',
      title: 'Site Guidelines',
      content: 'Please observe silence in temple halls.',
      user: 'Admin',
      status: 'PUBLISHED',
    }

    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'Created successfully',
      data: { ...payload, id: 99, code: 'C099', date: '2025-05-10' },
    })

    const result = await createFeedbackItem(payload)

    expect(apiClient.apiRequest).toHaveBeenCalledWith(
      '/api/admin/feedback',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    )
    expect(result.title).toBe('Site Guidelines')
  })

  it('updates feedback item via PUT /api/admin/feedback/{id}', async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'Updated successfully',
      data: { ...mockItem, title: 'Updated Title' },
    })

    const result = await updateFeedbackItem(1, { title: 'Updated Title' })

    expect(apiClient.apiRequest).toHaveBeenCalledWith(
      '/api/admin/feedback/1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Title' }),
      }),
    )
    expect(result.title).toBe('Updated Title')
  })

  it('deletes feedback via DELETE /api/admin/feedback/{id}', async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'Deleted successfully',
      data: undefined,
    })

    await deleteFeedbackItem(1)

    expect(apiClient.apiRequest).toHaveBeenCalledWith(
      '/api/admin/feedback/1',
      expect.objectContaining({
        method: 'DELETE',
      }),
    )
  })
})
