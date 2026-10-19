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

export async function login(
  payload: LoginRequest,
): Promise<LoginResponse> {
  const result = await apiRequest<LoginResponse>(LOGIN_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  if (!result.data?.accessToken) {
    throw new ApiError(
      'The server did not return login data.',
      200,
    )
  }

  // Persist the JWT access token so protected requests can use it.
  authStorage.setToken(result.data.accessToken)

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
  const token = authStorage.getToken()
  const result = await apiRequest<UserResponse>(PROFILE_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${token ?? ''}`,
    },
  })

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
  const token = authStorage.getToken()
  const result = await apiRequest<UserResponse>(PROFILE_ENDPOINT, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token ?? ''}`,
    },
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

export function isAuthenticated(): boolean {
  return authStorage.getToken() !== null
}

export function logout(): void {
  authStorage.clearToken()
}

export function getCurrentUser(): AuthUser | null {
  const token = authStorage.getToken()
  if (!token) {
    return null
  }

  try {
    const payload = token.split('.')[1]
    if (!payload) {
      return null
    }
    const decoded = JSON.parse(atob(payload))
    return {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      preferredLanguageId: decoded.preferredLanguageId,
    }
  } catch {
    return null
  }
}
