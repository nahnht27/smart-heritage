/**
 * Smart Heritage - Auth token storage
 *
 * Persists the JWT access token issued by backend M1 (`POST /api/auth/login`)
 * so authenticated requests to protected endpoints (e.g. `GET /api/users/me`)
 * can include the Bearer token.
 *
 * Uses @react-native-async-storage/async-storage (Expo SDK 57 / RN 0.86 compatible,
 * AsyncStorage is no longer exported from 'react-native' core).
 * Token is cleared on logout or explicit sign-out.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@smart_heritage:access_token';

export const authStorage = {
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Ignore persistence failures; token still usable in current session
    }
  },

  async clearToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore
    }
  },
};
