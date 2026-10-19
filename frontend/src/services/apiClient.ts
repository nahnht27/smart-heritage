import { env } from '../config/env'
import type { ApiResponse } from '../types/api'
import { authStorage } from './authStorage'

export class ApiError extends Error {
  status: number
  errors?: ApiResponse<never>['errors']

  constructor(
    message: string,
    status: number,
    errors?: ApiResponse<never>['errors'],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = authStorage.getToken()

  let response: Response

  try {
    response = await fetch(`${env.API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError(
      'Cannot connect to the server. Please check whether the backend is running.',
      0,
    )
  }

  const result: unknown = await response.json().catch(() => null)

  if (
    typeof result !== 'object' ||
    result === null ||
    !('success' in result) ||
    !('message' in result)
  ) {
    throw new ApiError(
      `Invalid server response (HTTP ${response.status}). Please check the backend status.`,
      response.status,
    )
  }

  const body = result as ApiResponse<T>

  if (!response.ok || !body.success) {
    throw new ApiError(
      body.message || 'Request failed.',
      response.status,
      body.errors,
    )
  }

  return body
}
