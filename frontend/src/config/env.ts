// VITE_API_BASE_URL is the backend *origin*, e.g. http://localhost:8080.
// API paths already include the `/api` prefix, so a trailing `/api` is stripped
// to avoid accidentally requesting `/api/api/...` when the variable is set to
// the full API base URL.
const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '')
  .trim()
  .replace(/\/+$/, '')

const API_BASE_URL = rawBaseUrl.replace(/\/api$/, '')

export const env = { API_BASE_URL }
