import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../apiClient'
import { authStorage } from '../authStorage'
import {
  getProfile,
  isAdminRole,
  login,
  mapUserResponse,
} from '../authService'

const adminUser = {
  userId: 1,
  username: 'admin',
  email: 'admin@example.com',
  role: 'ADMIN',
  preferredLanguageId: null,
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

describe('authService', () => {
  it('does not persist a token before the caller verifies ADMIN access', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        success: true,
        message: 'Login successful',
        data: {
          accessToken: 'new-token',
          tokenType: 'Bearer',
          expiresIn: 86400,
          user: adminUser,
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await login({ username: 'admin', password: 'pw' })

    expect(result.accessToken).toBe('new-token')
    expect(authStorage.getToken()).toBeNull()
  })

  it('rejects a login response without a user', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        success: true,
        message: 'Login successful',
        data: { accessToken: 'new-token' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      login({ username: 'admin', password: 'pw' }),
    ).rejects.toBeInstanceOf(ApiError)
    expect(authStorage.getToken()).toBeNull()
  })

  it('loads the authenticated profile with the stored bearer token', async () => {
    authStorage.setToken('profile-token')
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        success: true,
        message: 'Profile retrieved successfully',
        data: adminUser,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const profile = await getProfile()

    expect(profile.role).toBe('ADMIN')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer profile-token',
        }),
      }),
    )
  })

  it('recognizes ADMIN roles case-insensitively and rejects other roles', () => {
    expect(isAdminRole('ADMIN')).toBe(true)
    expect(isAdminRole(' admin ')).toBe(true)
    expect(isAdminRole('VISITOR')).toBe(false)
    expect(isAdminRole(null)).toBe(false)
    expect(isAdminRole(undefined)).toBe(false)
  })

  it('maps missing optional profile fields without crashing', () => {
    expect(
      mapUserResponse({
        userId: 2,
        username: undefined as unknown as string,
        email: undefined as unknown as string,
        role: 'ADMIN',
        preferredLanguageId: undefined as unknown as null,
      }),
    ).toEqual({
      userId: 2,
      username: '',
      email: '',
      role: 'ADMIN',
      preferredLanguageId: null,
    })
  })
})
