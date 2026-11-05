/**
 * Smart Heritage - API client envelope handling tests
 *
 * Backend success/error responses use the `ApiResponse<T>` envelope
 * `{ success, message, data, timestamp, path, errors }`. `apiRequest`
 * must unwrap `data` for service helpers.
 */
import { apiRequest, buildApiUrl } from '../api';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  };
}

describe('buildApiUrl', () => {
  it.each([
    [
      'development base with /api and relative auth endpoint',
      'auth/login',
      'http://localhost:8080/api',
      'http://localhost:8080/api/auth/login',
    ],
    [
      'legacy caller repeating /api does not double the prefix',
      '/api/auth/login',
      'http://localhost:8080/api',
      'http://localhost:8080/api/auth/login',
    ],
    [
      'trailing slash on the base is ignored',
      '/api/auth/register',
      'http://10.0.2.2:8080/api/',
      'http://10.0.2.2:8080/api/auth/register',
    ],
    [
      'base without /api and endpoint with /api',
      '/api/auth/register',
      'https://api.example.com',
      'https://api.example.com/api/auth/register',
    ],
    [
      'production base with /api',
      'auth/login',
      'https://heritage.example.com/api',
      'https://heritage.example.com/api/auth/login',
    ],
    [
      'public content endpoint is unchanged',
      'heritage-sites',
      'http://localhost:8080/api',
      'http://localhost:8080/api/heritage-sites',
    ],
  ] as const)('%s', (_label, endpoint, baseUrl, expected) => {
    expect(buildApiUrl(endpoint, baseUrl)).toBe(expected);
  });

  it('keeps absolute URLs untouched', () => {
    expect(
      buildApiUrl(
        'https://cdn.example.com/image.jpg',
        'http://localhost:8080/api',
      ),
    ).toBe('https://cdn.example.com/image.jpg');
  });
});

describe('apiRequest', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('unwraps the ApiResponse envelope on success', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, {
        success: true,
        message: 'Request completed successfully',
        data: [{ artifactId: 1, name: 'Artifact A' }],
      }),
    );

    const result = await apiRequest<{ artifactId: number; name: string }[]>(
      'artifacts',
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ artifactId: 1, name: 'Artifact A' }]);
  });

  it('returns the envelope message on error', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(401, {
        success: false,
        message: 'Authentication is required to access this resource',
        data: null,
      }),
    );

    const result = await apiRequest('users/me');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(result.data).toBeNull();
    expect(result.error).toContain('Authentication is required');
  });

  it('supports non-enveloped responses such as /api/health', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, { status: 'UP', timestamp: '2026-01-01T00:00:00Z' }),
    );

    const result = await apiRequest<{ status: string }>('health');

    expect(result.ok).toBe(true);
    expect(result.data?.status).toBe('UP');
  });

  it('normalizes network failures without throwing', async () => {
    mockFetch.mockRejectedValue(new Error('Network down'));

    const result = await apiRequest('heritage-sites');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.data).toBeNull();
  });
});
