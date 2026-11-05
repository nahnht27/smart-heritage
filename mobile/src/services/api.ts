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
  ok: boolean;
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  token?: string | null;
}

/**
 * Compose a request URL from the configured API base and a relative endpoint.
 *
 * The base URL may already include the `/api` prefix (the default for local
 * development and Docker). Screens must not repeat that prefix, but legacy
 * callers such as `/api/auth/login` are still normalized so the request never
 * becomes `/api/api/...`.
 */
export function buildApiUrl(
  endpoint: string,
  baseUrl: string = API_BASE_URL
): string {
  const trimmedEndpoint = endpoint.trim();

  if (/^https?:\/\//i.test(trimmedEndpoint)) {
    return trimmedEndpoint;
  }

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  let normalizedEndpoint = trimmedEndpoint.replace(/^\/+/, '');

  if (
    /\/api$/i.test(normalizedBase) &&
    /^api(\/|$)/i.test(normalizedEndpoint)
  ) {
    normalizedEndpoint = normalizedEndpoint.slice(3).replace(/^\/+/, '');
  }

  if (!normalizedEndpoint) {
    return normalizedBase;
  }

  return `${normalizedBase}/${normalizedEndpoint}`;
}

/**
 * Core fetch wrapper with timeout and standardized response shape
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { timeoutMs = 10000, token, headers = {}, ...rest } = options;

  const url = buildApiUrl(endpoint);

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

    let payload: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      payload = await response.json();
    }

    // Backend contract: success responses are wrapped in ApiResponse<T>
    // `{ success, message, data, timestamp, path, errors }`. Unwrap `data`
    // so service helpers receive the resource payload, not the envelope.
    const isEnvelope =
      payload !== null &&
      typeof payload === 'object' &&
      typeof payload.success === 'boolean';

    if (isEnvelope) {
      if (!response.ok || payload.success === false) {
        return {
          data: null,
          error: payload.message || `HTTP error ${response.status}`,
          status: response.status,
          ok: false,
        };
      }
      return {
        data: ('data' in payload ? payload.data : null) as T | null,
        error: null,
        status: response.status,
        ok: true,
      };
    }

    // Non-enveloped endpoint (e.g. the plain health map).
    if (!response.ok) {
      return {
        data: null,
        error: payload?.message || `HTTP error ${response.status}`,
        status: response.status,
        ok: false,
      };
    }

    return {
      data: payload as T | null,
      error: null,
      status: response.status,
      ok: true,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return {
        data: null,
        error: 'Request timed out. Please check your network connection.',
        status: 408,
        ok: false,
      };
    }
    return {
      data: null,
      error: err.message || 'Network error occurred',
      status: 0,
      ok: false,
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
