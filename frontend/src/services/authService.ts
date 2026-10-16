import { ApiError, apiRequest } from './apiClient'
import type { LoginRequest, LoginResponse } from '../types/auth'

const LOGIN_ENDPOINT = '/api/auth/login'

export async function login(
  payload: LoginRequest,
): Promise<LoginResponse> {
  const result = await apiRequest<LoginResponse>(LOGIN_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  if (!result.data) {
    throw new ApiError(
      'The server did not return login data.',
      200,
    )
  }

  return result.data
}