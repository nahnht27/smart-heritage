import { apiRequest, ApiError } from './apiClient'
import type { PageResponse } from '../types/api'
import type {
  CreateFeedbackRequest,
  FeedbackFilterParams,
  FeedbackItem,
  ModerateFeedbackRequest,
  UpdateFeedbackRequest,
} from '../types/feedback'

const ADMIN_FEEDBACK_ENDPOINT = '/api/admin/feedback'

// Seed mock data matching docs/design/admin-wireframe/Smart Heritage — Feedback-Content Management.png
const initialMockFeedback: FeedbackItem[] = [
  {
    id: 1,
    code: 'F001',
    type: 'FEEDBACK',
    title: 'Great historical information',
    comment:
      'The historical narrative and beacon notifications at the Imperial Gate provided deep insight into the Nguyen dynasty architecture.',
    user: 'Nguyen Minh Anh',
    userEmail: 'minhanh@example.com',
    rating: 5,
    targetName: 'Imperial Citadel',
    targetType: 'SITE',
    targetId: 1,
    date: '2025-05-10',
    status: 'PENDING',
  },
  {
    id: 2,
    code: 'F002',
    type: 'FEEDBACK',
    title: 'Very useful and easy to understand',
    comment:
      'Audio guides synced automatically with my location. Very helpful for family visitors and first-timers.',
    user: 'Tran Van Hung',
    userEmail: 'vanhung@example.com',
    rating: 5,
    targetName: 'Hall of Supreme Harmony',
    targetType: 'ARTIFACT',
    targetId: 2,
    date: '2025-05-09',
    status: 'APPROVED',
  },
  {
    id: 3,
    code: 'F003',
    type: 'FEEDBACK',
    title: 'Add more artifact images',
    comment:
      'Would love to see higher resolution close-up photographs of the royal throne and decorative dragon pillars.',
    user: 'Le Thi Phuong',
    userEmail: 'phuongle@example.com',
    rating: 3,
    targetName: 'Hall of Supreme Harmony',
    targetType: 'ARTIFACT',
    targetId: 2,
    date: '2025-05-08',
    status: 'PENDING',
  },
  {
    id: 4,
    code: 'C001',
    type: 'CONTENT',
    title: 'About Smart Heritage',
    content:
      'Smart Heritage connects cultural preservation with intelligent iBeacon proximity guidance and interactive digital exhibitions.',
    user: 'Admin',
    userEmail: 'admin@example.com',
    date: '2025-05-07',
    status: 'PUBLISHED',
  },
  {
    id: 5,
    code: 'C002',
    type: 'CONTENT',
    title: 'Visitor Guidelines',
    content:
      'Please respect quiet preservation zones, do not touch historical relics, and keep mobile devices in silent mode.',
    user: 'Admin',
    userEmail: 'admin@example.com',
    date: '2025-05-05',
    status: 'DRAFT',
  },
  {
    id: 6,
    code: 'F004',
    type: 'FEEDBACK',
    title: 'Audio playback stopped unexpectedly',
    comment:
      'I was listening to the temple history near the western pavilion when the audio stream abruptly paused.',
    user: 'David Miller',
    userEmail: 'davidm@example.com',
    rating: 2,
    targetName: 'My Son Sanctuary',
    targetType: 'SITE',
    targetId: 3,
    date: '2025-05-03',
    status: 'REJECTED',
  },
]

let mockFeedbackState = [...initialMockFeedback]

export function resetMockFeedback(): void {
  mockFeedbackState = [...initialMockFeedback]
}

export async function getAllFeedback(
  params?: FeedbackFilterParams,
): Promise<{ items: FeedbackItem[]; totalElements: number; totalPages: number; isDemo: boolean }> {
  const queryParams = new URLSearchParams()
  if (params?.q) queryParams.set('q', params.q.trim())
  if (params?.status) queryParams.set('status', params.status)
  if (params?.type) queryParams.set('type', params.type)
  if (params?.page !== undefined) queryParams.set('page', String(params.page))
  if (params?.size !== undefined) queryParams.set('size', String(params.size))

  const queryString = queryParams.toString()
  const endpoint = queryString
    ? `${ADMIN_FEEDBACK_ENDPOINT}?${queryString}`
    : ADMIN_FEEDBACK_ENDPOINT

  try {
    type ResponseData = FeedbackItem[] | PageResponse<FeedbackItem>
    const response = await apiRequest<ResponseData>(endpoint)
    const data = response.data

    if (Array.isArray(data)) {
      return {
        items: data,
        totalElements: data.length,
        totalPages: 1,
        isDemo: false,
      }
    } else if (data && Array.isArray(data.content)) {
      return {
        items: data.content,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
        isDemo: false,
      }
    }
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 404 || err.status === 501 || err.status === 0)
    ) {
      return { ...filterMockFeedback(params), isDemo: true }
    }
    throw err
  }

  return { ...filterMockFeedback(params), isDemo: true }
}

function filterMockFeedback(params?: FeedbackFilterParams): {
  items: FeedbackItem[]
  totalElements: number
  totalPages: number
} {
  let filtered = [...mockFeedbackState]

  if (params?.q) {
    const qLower = params.q.trim().toLowerCase()
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(qLower) ||
        (item.comment ?? '').toLowerCase().includes(qLower) ||
        (item.content ?? '').toLowerCase().includes(qLower) ||
        item.user.toLowerCase().includes(qLower) ||
        item.code.toLowerCase().includes(qLower),
    )
  }

  if (params?.status && params.status !== 'ALL') {
    filtered = filtered.filter(
      (item) => item.status.toUpperCase() === params.status?.toUpperCase(),
    )
  }

  if (params?.type && params.type !== 'ALL') {
    filtered = filtered.filter(
      (item) => item.type.toUpperCase() === params.type?.toUpperCase(),
    )
  }

  const totalElements = filtered.length
  const page = params?.page ?? 0
  const size = params?.size ?? 10
  const totalPages = Math.max(1, Math.ceil(totalElements / size))
  const items = filtered.slice(page * size, (page + 1) * size)

  return { items, totalElements, totalPages }
}

export async function getFeedbackById(
  feedbackId: number,
): Promise<FeedbackItem> {
  try {
    const response = await apiRequest<FeedbackItem>(
      `${ADMIN_FEEDBACK_ENDPOINT}/${feedbackId}`,
    )
    if (response.data) return response.data
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 404 || err.status === 501 || err.status === 0)
    ) {
      const found = mockFeedbackState.find((f) => f.id === feedbackId)
      if (found) return found
    }
    throw err
  }

  const found = mockFeedbackState.find((f) => f.id === feedbackId)
  if (!found) {
    throw new ApiError('Feedback item not found.', 404)
  }
  return found
}

export async function moderateFeedback(
  feedbackId: number,
  action: 'APPROVE' | 'REJECT',
): Promise<FeedbackItem> {
  const payload: ModerateFeedbackRequest = { action }

  try {
    const response = await apiRequest<FeedbackItem>(
      `${ADMIN_FEEDBACK_ENDPOINT}/${feedbackId}/moderate`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    )
    if (response.data) return response.data
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 404 || err.status === 501 || err.status === 0)
    ) {
      const idx = mockFeedbackState.findIndex((f) => f.id === feedbackId)
      if (idx !== -1) {
        const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
        const updated: FeedbackItem = {
          ...mockFeedbackState[idx],
          status: newStatus,
          moderatedAt: new Date().toISOString(),
        }
        mockFeedbackState[idx] = updated
        return updated
      }
    }
    throw err
  }

  throw new ApiError('Failed to moderate feedback.', 500)
}

export async function createFeedbackItem(
  payload: CreateFeedbackRequest,
): Promise<FeedbackItem> {
  try {
    const response = await apiRequest<FeedbackItem>(ADMIN_FEEDBACK_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (response.data) return response.data
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 404 || err.status === 501 || err.status === 0)
    ) {
      const nextId =
        mockFeedbackState.length > 0
          ? Math.max(...mockFeedbackState.map((f) => f.id)) + 1
          : 1
      const prefix = payload.type === 'FEEDBACK' ? 'F' : 'C'
      const code = `${prefix}${String(nextId).padStart(3, '0')}`
      const today = new Date().toISOString().split('T')[0]

      const newItem: FeedbackItem = {
        id: nextId,
        code,
        type: payload.type,
        title: payload.title,
        comment: payload.comment,
        content: payload.content,
        user: payload.user || 'Admin',
        userEmail: payload.userEmail || 'admin@example.com',
        rating: payload.rating,
        targetName: payload.targetName,
        targetType: payload.targetType,
        targetId: payload.targetId,
        date: today,
        status:
          payload.status ?? (payload.type === 'FEEDBACK' ? 'PENDING' : 'PUBLISHED'),
      }

      mockFeedbackState = [newItem, ...mockFeedbackState]
      return newItem
    }
    throw err
  }

  throw new ApiError('Failed to create content item.', 500)
}

export async function updateFeedbackItem(
  feedbackId: number,
  payload: UpdateFeedbackRequest,
): Promise<FeedbackItem> {
  try {
    const response = await apiRequest<FeedbackItem>(
      `${ADMIN_FEEDBACK_ENDPOINT}/${feedbackId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    )
    if (response.data) return response.data
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 404 || err.status === 501 || err.status === 0)
    ) {
      const idx = mockFeedbackState.findIndex((f) => f.id === feedbackId)
      if (idx !== -1) {
        const updated: FeedbackItem = {
          ...mockFeedbackState[idx],
          ...payload,
          updatedAt: new Date().toISOString(),
        }
        mockFeedbackState[idx] = updated
        return updated
      }
    }
    throw err
  }

  throw new ApiError('Failed to update feedback item.', 500)
}

export async function deleteFeedbackItem(feedbackId: number): Promise<void> {
  try {
    await apiRequest<void>(`${ADMIN_FEEDBACK_ENDPOINT}/${feedbackId}`, {
      method: 'DELETE',
    })
    mockFeedbackState = mockFeedbackState.filter((f) => f.id !== feedbackId)
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 404 || err.status === 501 || err.status === 0)
    ) {
      mockFeedbackState = mockFeedbackState.filter((f) => f.id !== feedbackId)
      return
    }
    throw err
  }
}
