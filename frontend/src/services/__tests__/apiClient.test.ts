import { describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from '../apiClient'
import { authEvents } from '../authEvents'
import { authStorage } from '../authStorage'

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

const expiredEnvelope = {
  success: false,
  message: 'Authentication is required to access this resource',
}

describe('apiClient authentication errors', () => {
  it('clears the session and emits unauthorized for an authenticated 401', async () => {
    authStorage.setToken('token-1')
    const listener = vi.fn()
    const unsubscribe = authEvents.onUnauthorized(listener)
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401, expiredEnvelope))
    vi.stubGlobal('fetch', fetchMock)

    try {
      await expect(apiRequest('/api/users/me')).rejects.toMatchObject({
        status: 401,
      })

      expect(authStorage.getToken()).toBeNull()
      expect(listener).toHaveBeenCalledTimes(1)
    } finally {
      unsubscribe()
    }
  })

  it('does not trigger the global sign-out signal for a rejected login', async () => {
    authStorage.setToken('stale-token')
    const listener = vi.fn()
    const unsubscribe = authEvents.onUnauthorized(listener)
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(401, {
        success: false,
        message: 'Invalid username or password',
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    try {
      await expect(
        apiRequest('/api/auth/login', { method: 'POST' }),
      ).rejects.toMatchObject({ status: 401 })

      expect(listener).not.toHaveBeenCalled()
    } finally {
      unsubscribe()
    }
  })

  it('does not clear a newer token when an older request returns 401', async () => {
    authStorage.setToken('old-token')
    const listener = vi.fn()
    const unsubscribe = authEvents.onUnauthorized(listener)
    let resolveRequest: (response: Response) => void = () => {}

    const fetchMock = vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    try {
      const request = apiRequest('/api/users/me')
      authStorage.setToken('new-token')
      resolveRequest(jsonResponse(401, expiredEnvelope))

      await expect(request).rejects.toMatchObject({ status: 401 })

      expect(authStorage.getToken()).toBe('new-token')
      expect(listener).not.toHaveBeenCalled()
    } finally {
      unsubscribe()
    }
  })

  it('keeps the session for HTTP 403', async () => {
    authStorage.setToken('token-2')
    const listener = vi.fn()
    const unsubscribe = authEvents.onUnauthorized(listener)
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(403, { success: false, message: 'Forbidden' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    try {
      await expect(apiRequest('/api/users/me')).rejects.toBeInstanceOf(
        ApiError,
      )

      expect(authStorage.getToken()).toBe('token-2')
      expect(listener).not.toHaveBeenCalled()
    } finally {
      unsubscribe()
    }
  })

  it('keeps the session when the network is unavailable', async () => {
    authStorage.setToken('token-3')
    const listener = vi.fn()
    const unsubscribe = authEvents.onUnauthorized(listener)
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('offline'))
    vi.stubGlobal('fetch', fetchMock)

    try {
      await expect(apiRequest('/api/users/me')).rejects.toMatchObject({
        status: 0,
      })

      expect(authStorage.getToken()).toBe('token-3')
      expect(listener).not.toHaveBeenCalled()
    } finally {
      unsubscribe()
    }
  })
})
