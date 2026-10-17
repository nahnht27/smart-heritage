/**
 * Smart Heritage - Reusable API Client Service
 *
 * Configured according to Sprint 2 requirements:
 * - Reads base URL from EXPO_PUBLIC_API_BASE_URL (defaults to localhost:8080/api).
 * - Backend M1 prefix is `/api` (NOT `/api/v1`).
 * - No hardcoded secrets, tokens, or developer-specific IP addresses.
 * - Supports token authorization headers for JWT authentication.
 * - Handles request timeouts and error normalization.
 */

import { Platform } from 'react-native';

// Resolve default host based on platform for convenient local development:
// - Android Emulator uses 10.0.2.2 to access host machine
// - Web / iOS Simulator uses localhost
// - Physical device needs LAN IP of the machine running backend via EXPO_PUBLIC_API_BASE_URL
const getDefaultBaseUrl = (): string => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080/api';
  }
  return 'http://localhost:8080/api';
};

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || getDefaultBaseUrl();

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  token?: string | null;
}

/**
 * Core fetch wrapper with timeout and standardized response shape
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { timeoutMs = 10000, token, headers = {}, ...rest } = options;

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...rest,
      headers: requestHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data: T | null = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = (await response.json()) as T;
    }

    if (!response.ok) {
      return {
        data: null,
        error: (data as any)?.message || `HTTP error ${response.status}`,
        status: response.status,
      };
    }

    return {
      data,
      error: null,
      status: response.status,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return {
        data: null,
        error: 'Request timed out. Please check your network connection.',
        status: 408,
      };
    }
    return {
      data: null,
      error: err.message || 'Network error occurred',
      status: 0,
    };
  }
}

/**
 * Convenient HTTP method shortcuts
 */
export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
