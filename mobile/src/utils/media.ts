/**
 * Smart Heritage - Multimedia helpers
 *
 * Normalizes backend multimedia types and validates URLs before rendering so
 * the mobile app never crashes or renders the wrong player for bad data.
 */

export type MediaType = 'image' | 'audio' | 'video' | 'unknown';

export function normalizeMediaType(raw: unknown): MediaType {
  if (typeof raw !== 'string') {
    return 'unknown';
  }

  const value = raw.trim().toLowerCase();
  if (value === 'image' || value === 'audio' || value === 'video') {
    return value;
  }

  return 'unknown';
}

export function isPlayableUrl(url: unknown): url is string {
  if (typeof url !== 'string') {
    return false;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  return /^(https?:|file:|content:|data:)/i.test(trimmed);
}
