/**
 * Lets the demo operator change the backend address on the phone, so a new
 * Wi-Fi network does not require a new APK.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeServerUrl, setApiBaseUrlOverride } from './api';

const SERVER_URL_KEY = '@smart_heritage:server_url';

export async function loadServerUrl(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(SERVER_URL_KEY);
    setApiBaseUrlOverride(stored ? normalizeServerUrl(stored) : null);
  } catch {
    // Fall back to the address built into the app.
  }
}

/**
 * Saves a new address. An empty value restores the built-in one.
 * Returns false when the text is not a valid http(s) address.
 */
export async function saveServerUrl(input: string): Promise<boolean> {
  if (!input.trim()) {
    await AsyncStorage.removeItem(SERVER_URL_KEY);
    setApiBaseUrlOverride(null);
    return true;
  }

  const normalized = normalizeServerUrl(input);
  if (!normalized) {
    return false;
  }
  await AsyncStorage.setItem(SERVER_URL_KEY, normalized);
  setApiBaseUrlOverride(normalized);
  return true;
}
