/**
 * Smart Heritage - ID helpers
 *
 * Generates RFC 4122 v4 UUIDs for visitor interaction events.
 * Prefers the platform Web Crypto implementation and falls back to a
 * Math.random based generator for React Native runtimes without it.
 */

export function createEventId(): string {
  const cryptoObject = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoObject && typeof cryptoObject.randomUUID === 'function') {
    return cryptoObject.randomUUID();
  }

  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return template.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
