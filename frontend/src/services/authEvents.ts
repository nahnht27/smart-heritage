/**
 * Smart Heritage Admin Web — auth lifecycle events
 *
 * Keeps the API client decoupled from React/AuthContext. When an authenticated
 * request fails with HTTP 401, the client clears the stored token and emits an
 * `unauthorized` event so the provider can reset its in-memory session.
 */

type UnauthorizedListener = () => void

const listeners = new Set<UnauthorizedListener>()

export const authEvents = {
  onUnauthorized(listener: UnauthorizedListener): () => void {
    listeners.add(listener)

    return () => {
      listeners.delete(listener)
    }
  },

  emitUnauthorized(): void {
    for (const listener of listeners) {
      listener()
    }
  },
}
