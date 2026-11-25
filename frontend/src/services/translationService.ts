import { apiRequest, ApiError } from './apiClient'
import type { PageResponse } from '../types/api'
import type {
  Translation,
  TranslationFilterParams,
  TranslationRequest,
  TranslationStats,
} from '../types/translation'

const ADMIN_TRANSLATIONS_ENDPOINT = '/api/admin/translations'

// Fallback seed data modeled exactly from docs/design/admin-wireframe/Smart Heritage — Translation.png
const initialMockTranslations: Translation[] = [
  {
    id: 1,
    contentType: 'SITE',
    contentId: 1,
    contentName: 'Imperial Citadel',
    language: 'en',
    title: 'The Imperial Citadel of Hue',
    description:
      'The Imperial Citadel of Hue is an important historical and cultural heritage site in Hue, Vietnam.',
    status: 'PUBLISHED',
    updatedAt: '2025-05-10',
    imageUrl:
      'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
    translations: {
      vi: {
        title: 'Hoàng thành Huế',
        description:
          'Hoàng thành Huế là một di tích lịch sử và văn hóa quan trọng tại Huế, Việt Nam.',
        status: 'PUBLISHED',
        updatedAt: '2025-05-10',
      },
      en: {
        title: 'The Imperial Citadel of Hue',
        description:
          'The Imperial Citadel of Hue is an important historical and cultural heritage site in Hue, Vietnam.',
        status: 'PUBLISHED',
        updatedAt: '2025-05-10',
      },
    },
  },
  {
    id: 2,
    contentType: 'SITE',
    contentId: 1,
    contentName: 'Imperial Citadel',
    language: 'vi',
    title: 'Hoàng thành Huế',
    description:
      'Hoàng thành Huế là một di tích lịch sử và văn hóa quan trọng tại Huế, Việt Nam.',
    status: 'PUBLISHED',
    updatedAt: '2025-05-10',
    imageUrl:
      'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
    translations: {
      vi: {
        title: 'Hoàng thành Huế',
        description:
          'Hoàng thành Huế là một di tích lịch sử và văn hóa quan trọng tại Huế, Việt Nam.',
        status: 'PUBLISHED',
        updatedAt: '2025-05-10',
      },
      en: {
        title: 'The Imperial Citadel of Hue',
        description:
          'The Imperial Citadel of Hue is an important historical and cultural heritage site in Hue, Vietnam.',
        status: 'PUBLISHED',
        updatedAt: '2025-05-10',
      },
    },
  },
  {
    id: 3,
    contentType: 'ARTIFACT',
    contentId: 2,
    contentName: 'Hall of Supreme Harmony',
    language: 'en',
    title: 'Hall of Supreme Harmony',
    description:
      'The central palace inside Hue Imperial City, dedicated to grand court ceremonies and royal audiences.',
    status: 'PUBLISHED',
    updatedAt: '2025-05-08',
    imageUrl:
      'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
    translations: {
      vi: {
        title: 'Điện Thái Hòa',
        description:
          'Cung điện trung tâm trong Hoàng thành Huế, nơi diễn ra các đại lễ triều đình và nghi thức ngoại giao.',
        status: 'PUBLISHED',
        updatedAt: '2025-05-08',
      },
      en: {
        title: 'Hall of Supreme Harmony',
        description:
          'The central palace inside Hue Imperial City, dedicated to grand court ceremonies and royal audiences.',
        status: 'PUBLISHED',
        updatedAt: '2025-05-08',
      },
    },
  },
  {
    id: 4,
    contentType: 'ARTIFACT',
    contentId: 2,
    contentName: 'Hall of Supreme Harmony',
    language: 'vi',
    title: 'Điện Thái Hòa',
    description:
      'Cung điện trung tâm trong Hoàng thành Huế, nơi diễn ra các đại lễ triều đình và nghi thức ngoại giao.',
    status: 'PUBLISHED',
    updatedAt: '2025-05-08',
    imageUrl:
      'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
    translations: {
      vi: {
        title: 'Điện Thái Hòa',
        description:
          'Cung điện trung tâm trong Hoàng thành Huế, nơi diễn ra các đại lễ triều đình và nghi thức ngoại giao.',
        status: 'PUBLISHED',
        updatedAt: '2025-05-08',
      },
      en: {
        title: 'Hall of Supreme Harmony',
        description:
          'The central palace inside Hue Imperial City, dedicated to grand court ceremonies and royal audiences.',
        status: 'PUBLISHED',
        updatedAt: '2025-05-08',
      },
    },
  },
  {
    id: 5,
    contentType: 'SITE',
    contentId: 3,
    contentName: 'My Son Sanctuary',
    language: 'en',
    title: 'My Son Sanctuary',
    description:
      'An ancient Hindu temple complex built by the Champa civilisation between the 4th and 14th centuries.',
    status: 'DRAFT',
    updatedAt: '2025-06-06',
    imageUrl:
      'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80',
    translations: {
      en: {
        title: 'My Son Sanctuary',
        description:
          'An ancient Hindu temple complex built by the Champa civilisation between the 4th and 14th centuries.',
        status: 'DRAFT',
        updatedAt: '2025-06-06',
      },
    },
  },
  {
    id: 6,
    contentType: 'SITE',
    contentId: 4,
    contentName: 'Thien Mu Pagoda',
    language: 'vi',
    title: 'Chùa Thiên Mụ',
    description:
      'Ngôi chùa cổ kính nằm bên bờ sông Hương, biểu tượng tâm linh lâu đời của cố đô Huế.',
    status: 'PUBLISHED',
    updatedAt: '2025-05-04',
    translations: {
      vi: {
        title: 'Chùa Thiên Mụ',
        description:
          'Ngôi chùa cổ kính nằm bên bờ sông Hương, biểu tượng tâm linh lâu đời của cố đô Huế.',
        status: 'PUBLISHED',
        updatedAt: '2025-05-04',
      },
    },
  },
  {
    id: 7,
    contentType: 'ARTIFACT',
    contentId: 5,
    contentName: 'Dong Son Bronze Drum',
    language: 'vi',
    title: 'Trống đồng Đông Sơn',
    description:
      'Hiện vật tiêu biểu cho nền văn hóa Đông Sơn thời kỳ đồ đồng rực rỡ của người Việt cổ.',
    status: 'DRAFT',
    updatedAt: '2025-05-02',
    translations: {
      vi: {
        title: 'Trống đồng Đông Sơn',
        description:
          'Hiện vật tiêu biểu cho nền văn hóa Đông Sơn thời kỳ đồ đồng rực rỡ của người Việt cổ.',
        status: 'DRAFT',
        updatedAt: '2025-05-02',
      },
    },
  },
]

let mockTranslationsState = [...initialMockTranslations]

export function resetMockTranslations(): void {
  mockTranslationsState = [...initialMockTranslations]
}

export async function getAllTranslations(
  params?: TranslationFilterParams,
): Promise<{ items: Translation[]; totalElements: number; totalPages: number; isDemo: boolean }> {
  const queryParams = new URLSearchParams()
  if (params?.q) queryParams.set('q', params.q.trim())
  if (params?.language) queryParams.set('language', params.language)
  if (params?.contentType) queryParams.set('contentType', params.contentType)
  if (params?.status) queryParams.set('status', params.status)
  if (params?.page !== undefined) queryParams.set('page', String(params.page))
  if (params?.size !== undefined) queryParams.set('size', String(params.size))

  const queryString = queryParams.toString()
  const endpoint = queryString
    ? `${ADMIN_TRANSLATIONS_ENDPOINT}?${queryString}`
    : ADMIN_TRANSLATIONS_ENDPOINT

  try {
    type ResponseData = Translation[] | PageResponse<Translation>
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
    // If backend returns 404/501 (endpoint not implemented yet) or network unreachable,
    // gracefully fall back to local mock data matching the design wireframe
    if (
      err instanceof ApiError &&
      (err.status === 404 || err.status === 501 || err.status === 0)
    ) {
      return { ...filterMockTranslations(params), isDemo: true }
    }
    throw err
  }

  return { ...filterMockTranslations(params), isDemo: true }
}

function filterMockTranslations(params?: TranslationFilterParams): {
  items: Translation[]
  totalElements: number
  totalPages: number
} {
  let filtered = [...mockTranslationsState]

  if (params?.q) {
    const qLower = params.q.trim().toLowerCase()
    filtered = filtered.filter(
      (item) =>
        item.contentName.toLowerCase().includes(qLower) ||
        item.title.toLowerCase().includes(qLower) ||
        item.description.toLowerCase().includes(qLower),
    )
  }

  if (params?.language && params.language !== 'ALL') {
    filtered = filtered.filter(
      (item) => item.language.toLowerCase() === params.language?.toLowerCase(),
    )
  }

  if (params?.contentType && params.contentType !== 'ALL') {
    filtered = filtered.filter(
      (item) =>
        item.contentType.toUpperCase() === params.contentType?.toUpperCase(),
    )
  }

  if (params?.status && params.status !== 'ALL') {
    filtered = filtered.filter(
      (item) => item.status.toUpperCase() === params.status?.toUpperCase(),
    )
  }

  const totalElements = filtered.length
  const page = params?.page ?? 0
  const size = params?.size ?? 10
  const totalPages = Math.max(1, Math.ceil(totalElements / size))
  const items = filtered.slice(page * size, (page + 1) * size)

  return { items, totalElements, totalPages }
}

export async function getTranslationById(
  translationId: number,
): Promise<Translation> {
  try {
    const response = await apiRequest<Translation>(
      `${ADMIN_TRANSLATIONS_ENDPOINT}/${translationId}`,
    )
    if (response.data) return response.data
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 404 || err.status === 501 || err.status === 0)
    ) {
      const found = mockTranslationsState.find((t) => t.id === translationId)
      if (found) return found
    }
    throw err
  }

  const found = mockTranslationsState.find((t) => t.id === translationId)
  if (!found) {
    throw new ApiError('Translation not found.', 404)
  }
  return found
}

export async function createTranslation(
  payload: TranslationRequest,
): Promise<Translation> {
  try {
    const response = await apiRequest<Translation>(
      ADMIN_TRANSLATIONS_ENDPOINT,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )
    if (response.data) return response.data
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 404 || err.status === 501 || err.status === 0)
    ) {
      // Mock create
      const newId =
        mockTranslationsState.length > 0
          ? Math.max(...mockTranslationsState.map((t) => t.id)) + 1
          : 1
      const today = new Date().toISOString().split('T')[0]
      const newTranslation: Translation = {
        id: newId,
        contentType: payload.contentType,
        contentId: payload.contentId,
        contentName:
          payload.contentType === 'SITE'
            ? `Heritage Site #${payload.contentId}`
            : `Artifact #${payload.contentId}`,
        language: payload.language,
        title: payload.title,
        description: payload.description,
        status: payload.status,
        updatedAt: today,
        translations: {
          [payload.language]: {
            title: payload.title,
            description: payload.description,
            status: payload.status,
            updatedAt: today,
          },
        },
      }
      mockTranslationsState = [newTranslation, ...mockTranslationsState]
      return newTranslation
    }
    throw err
  }

  throw new ApiError('Failed to create translation.', 500)
}

export async function updateTranslation(
  translationId: number,
  payload: TranslationRequest,
): Promise<Translation> {
  try {
    const response = await apiRequest<Translation>(
      `${ADMIN_TRANSLATIONS_ENDPOINT}/${translationId}`,
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
      const idx = mockTranslationsState.findIndex((t) => t.id === translationId)
      if (idx !== -1) {
        const today = new Date().toISOString().split('T')[0]
        const updated: Translation = {
          ...mockTranslationsState[idx],
          contentType: payload.contentType,
          contentId: payload.contentId,
          language: payload.language,
          title: payload.title,
          description: payload.description,
          status: payload.status,
          updatedAt: today,
          translations: {
            ...mockTranslationsState[idx].translations,
            [payload.language]: {
              title: payload.title,
              description: payload.description,
              status: payload.status,
              updatedAt: today,
            },
          },
        }
        mockTranslationsState[idx] = updated
        return updated
      }
    }
    throw err
  }

  throw new ApiError('Failed to update translation.', 500)
}

export async function deleteTranslation(
  translationId: number,
): Promise<void> {
  try {
    await apiRequest<void>(
      `${ADMIN_TRANSLATIONS_ENDPOINT}/${translationId}`,
      {
        method: 'DELETE',
      },
    )
    mockTranslationsState = mockTranslationsState.filter(
      (t) => t.id !== translationId,
    )
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 404 || err.status === 501 || err.status === 0)
    ) {
      mockTranslationsState = mockTranslationsState.filter(
        (t) => t.id !== translationId,
      )
      return
    }
    throw err
  }
}

/**
 * Stats are computed only from the records passed in (the currently loaded
 * page). `totalElements` is the API-reported result count, used to tell the
 * caller whether these stats cover every result or just the current page.
 * No fallback or minimum values are applied: an empty list yields zeros.
 */
export function computeTranslationStats(
  items: Translation[],
  totalElements: number = items.length,
): TranslationStats {
  const contentSet = new Set<string>()
  items.forEach((item) => {
    contentSet.add(`${item.contentType}:${item.contentId}`)
  })

  return {
    totalContent: contentSet.size,
    translated: items.filter((item) => item.status === 'PUBLISHED').length,
    draft: items.filter((item) => item.status === 'DRAFT').length,
    scope: totalElements > items.length ? 'current-page' : 'all-results',
  }
}
