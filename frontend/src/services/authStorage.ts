/**
 * Smart Heritage Admin Web — Auth storage
 *
 * Persists the JWT access token issued by backend M1 (`POST /api/auth/login`)
 * so authenticated requests to protected endpoints can include the
 * `Authorization: Bearer <token>` header.
 *
 * Uses sessionStorage so the token is cleared when the browser tab is closed.
 * No token or password is written to console/logs.
 */

const TOKEN_KEY = '@smart_heritage_admin:access_token';

export const authStorage = {
  getToken(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken(token: string): void {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Ignore persistence failures; token still usable in current session
    }
  },

  clearToken(): void {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore
    }
  },
};
