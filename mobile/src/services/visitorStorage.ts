/**
 * Smart Heritage - Pseudonymous visitor identity
 *
 * The mobile app records anonymous as well as authenticated interactions, so
 * every installation keeps one stable UUID. It is generated locally, never
 * derived from personal data, and survives app restarts via AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const VISITOR_ID_KEY = '@smart_heritage:visitor_id';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let cachedVisitorId: string | null = null;

export const visitorStorage = {
  async getVisitorId(): Promise<string> {
    if (cachedVisitorId) {
      return cachedVisitorId;
    }

    try {
      const stored = await AsyncStorage.getItem(VISITOR_ID_KEY);
      if (stored && UUID_PATTERN.test(stored)) {
        cachedVisitorId = stored;
        return stored;
      }
    } catch {
      // Fall through and create an in-memory identity for this session.
    }

    const created = Crypto.randomUUID();
    cachedVisitorId = created;

    try {
      await AsyncStorage.setItem(VISITOR_ID_KEY, created);
    } catch {
      // Persistence is best-effort; the current session can still record.
    }

    return created;
  },

  __resetForTest(): void {
    cachedVisitorId = null;
  },
};
