import { ApiError, apiRequest } from './apiClient'
import { authStorage } from './authStorage'
import type {
  LoginRequest,
  LoginResponse,
  AuthUser,
  UpdateProfileRequest,
  UserResponse,
} from '../types/auth'

const LOGIN_ENDPOINT = '/api/auth/login'
const REGISTER_ENDPOINT = '/api/auth/register'
const PROFILE_ENDPOINT = '/api/users/me'

/**
 * The backend JWT only contains `sub` (username) and `role`. Profile fields
 * must always come from an authenticated API response, never from the token.
 */
export function mapUserResponse(user: UserResponse): AuthUser {
  return {
    userId: user.userId,
    username: user.username ?? '',
    email: user.email ?? '',
    role: user.role ?? '',
    preferredLanguageId: user.preferredLanguageId ?? null,
  }
}

export function isAdminRole(role: string | null | undefined): boolean {
  return typeof role === 'string' && role.trim().toUpperCase() === 'ADMIN'
}

export async function login(
  payload: LoginRequest,
): Promise<LoginResponse> {
  const result = await apiRequest<LoginResponse>(LOGIN_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  if (!result.data?.accessToken || !result.data.user) {
    throw new ApiError(
      'The server did not return login data.',
      200,
    )
  }

  // The caller must verify the ADMIN role and persist the token only after
  // that check succeeds. Persisting here would keep a VISITOR token around
  // when the admin login is rejected.
  return result.data
}

export async function register(
  payload: { username: string; email: string; password: string },
): Promise<UserResponse> {
  const result = await apiRequest<UserResponse>(REGISTER_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  if (!result.data) {
    throw new ApiError(
      'The server did not return registration data.',
      200,
    )
  }

  return result.data
}

export async function getProfile(): Promise<UserResponse> {
  const result = await apiRequest<UserResponse>(PROFILE_ENDPOINT)

  if (!result.data) {
    throw new ApiError(
      'The server did not return profile data.',
      200,
    )
  }

  return result.data
}

export async function updateProfile(
  payload: UpdateProfileRequest,
): Promise<UserResponse> {
  const result = await apiRequest<UserResponse>(PROFILE_ENDPOINT, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

  if (!result.data) {
    throw new ApiError(
      'The server did not return updated profile data.',
      200,
    )
  }

  return result.data
}

export function getToken(): string | null {
  return authStorage.getToken()
}

export function logout(): void {
  authStorage.clearToken()
}
