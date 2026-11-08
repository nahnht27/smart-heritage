import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getInteractionSummary } from '../analyticsService'
import * as apiClient from '../apiClient'

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

describe('analyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches interaction summary without query parameters', async () => {
    const mockData = {
      from: null,
      to: null,
      totalInteractions: 120,
      uniqueVisitors: 45,
      interactionTypes: [
        { interactionType: 'VIEW', count: 80 },
        { interactionType: 'SCAN', count: 40 },
      ],
      popularArtifacts: [
        { artifactId: 1, artifactName: 'Bronze Drum', interactionCount: 60 },
      ],
    }

    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'OK',
      data: mockData,
    })

    const result = await getInteractionSummary()

    expect(apiClient.apiRequest).toHaveBeenCalledWith(
      '/api/analytics/interactions/summary',
    )
    expect(result).toEqual(mockData)
  })

  it('fetches interaction summary with from and to query parameters', async () => {
    const from = '2026-11-01T00:00:00Z'
    const to = '2026-11-04T00:00:00Z'
    const mockData = {
      from,
      to,
      totalInteractions: 50,
      uniqueVisitors: 20,
      interactionTypes: [{ interactionType: 'VIEW', count: 50 }],
      popularArtifacts: [],
    }

    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'OK',
      data: mockData,
    })

    const result = await getInteractionSummary({ from, to })

    expect(apiClient.apiRequest).toHaveBeenCalledWith(
      `/api/analytics/interactions/summary?from=${encodeURIComponent(
        from,
      )}&to=${encodeURIComponent(to)}`,
    )
    expect(result).toEqual(mockData)
  })

  it('handles empty or missing response data with safe defaults', async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'OK',
      data: undefined,
    })

    const result = await getInteractionSummary()

    expect(result).toEqual({
      from: null,
      to: null,
      totalInteractions: 0,
      uniqueVisitors: 0,
      interactionTypes: [],
      popularArtifacts: [],
    })
  })
})
