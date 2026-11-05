/**
 * Smart Heritage - Authentication API service regression tests.
 *
 * The base URL already contains `/api`, so auth endpoints must be relative and
 * must never be composed as `/api/api/...`.
 */
import { apiClient } from '../api';
import { authStorage } from '../authStorage';
import { AUTH_ENDPOINTS, authApi } from '../authApi';

jest.mock('../api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

jest.mock('../authStorage', () => ({
  authStorage: {
    setToken: jest.fn(),
  },
}));

const mockPost = apiClient.post as jest.Mock;
const mockSetToken = authStorage.setToken as jest.Mock;

const loginResponse = {
  accessToken: 'fake-access-token',
  tokenType: 'Bearer',
  expiresIn: 3600,
  user: {
    userId: 1,
    username: 'visitor',
    email: 'visitor@example.com',
    role: 'VISITOR',
    preferredLanguageId: null,
  },
};

describe('authApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('composes the login endpoint exactly once', async () => {
    mockPost.mockResolvedValue({
      data: loginResponse,
      error: null,
      status: 200,
      ok: true,
    });

    const result = await authApi.login({
      username: 'visitor',
      password: 'secret',
    });

    expect(mockPost).toHaveBeenCalledWith('auth/login', {
      username: 'visitor',
      password: 'secret',
    });
    expect(AUTH_ENDPOINTS.login).toBe('auth/login');
    expect(result.ok).toBe(true);
    expect(mockSetToken).toHaveBeenCalledWith('fake-access-token');
  });

  it('does not store a token when credentials are rejected', async () => {
    mockPost.mockResolvedValue({
      data: null,
      error: 'Invalid username or password',
      status: 401,
      ok: false,
    });

    const result = await authApi.login({
      username: 'visitor',
      password: 'wrong',
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(result.error).toBe('Invalid username or password');
    expect(mockSetToken).not.toHaveBeenCalled();
  });

  it('composes the register endpoint exactly once', async () => {
    mockPost.mockResolvedValue({
      data: {
        userId: 2,
        username: 'new-user',
        email: 'new@example.com',
        role: 'VISITOR',
        preferredLanguageId: null,
      },
      error: null,
      status: 201,
      ok: true,
    });

    const result = await authApi.register({
      username: 'new-user',
      email: 'new@example.com',
      password: 'secret',
    });

    expect(mockPost).toHaveBeenCalledWith('auth/register', {
      username: 'new-user',
      email: 'new@example.com',
      password: 'secret',
    });
    expect(AUTH_ENDPOINTS.register).toBe('auth/register');
    expect(result.ok).toBe(true);
    expect(mockSetToken).not.toHaveBeenCalled();
  });

  it('passes network/envelope errors through without storing a token', async () => {
    mockPost.mockResolvedValue({
      data: null,
      error: 'Request timed out. Please check your network connection.',
      status: 408,
      ok: false,
    });

    const result = await authApi.login({
      username: 'visitor',
      password: 'secret',
    });

    expect(result).toEqual({
      data: null,
      error: 'Request timed out. Please check your network connection.',
      status: 408,
      ok: false,
    });
    expect(mockSetToken).not.toHaveBeenCalled();
  });
});
