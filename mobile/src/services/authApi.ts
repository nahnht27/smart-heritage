/**
 * Smart Heritage - Authentication API Service
 *
 * Centralizes the auth endpoints so screens never repeat the `/api` prefix.
 * `apiClient` owns URL composition; the base URL already contains `/api`.
 */

import { apiClient, type ApiResponse } from './api';
import { authStorage } from './authStorage';

export interface AuthUser {
  userId: number;
  username: string;
  email: string;
  role: string;
  preferredLanguageId: number | null;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}

export interface RegisterResponse {
  userId: number;
  username: string;
  email: string;
  role: string;
  preferredLanguageId: number | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export const AUTH_ENDPOINTS = {
  login: 'auth/login',
  register: 'auth/register',
} as const;

export const authApi = {
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    const result = await apiClient.post<LoginResponse>(
      AUTH_ENDPOINTS.login,
      credentials,
    );

    // Persist only after a successful response that actually contains a token.
    if (result.ok && result.data?.accessToken) {
      await authStorage.setToken(result.data.accessToken);
    }

    return result;
  },

  register(payload: RegisterPayload): Promise<ApiResponse<RegisterResponse>> {
    return apiClient.post<RegisterResponse>(AUTH_ENDPOINTS.register, payload);
  },
};
