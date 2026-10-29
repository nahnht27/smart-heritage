/**
 * Smart Heritage - Test cho Visitor Interaction API Service (LTJ-34)
 *
 * Tuân theo contract docs/integration/api-contract.md.
 */
import { apiClient } from '../api';
import { authStorage } from '../authStorage';
import { interactionApi, __resetVisitorIdForTest, type InteractionType } from '../interactionApi';

jest.mock('../api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

jest.mock('../authStorage', () => ({
  authStorage: {
    getToken: jest.fn(),
  },
}));

const mockPost = apiClient.post as jest.Mock;
const mockGetToken = authStorage.getToken as jest.Mock;

const baseEvent = {
  eventId: '550e8400-e29b-41d4-a716-446655440000',
  artifactId: 101,
  interactionType: 'VIEW' as InteractionType,
  languageCode: 'vi',
  startedAt: '2026-10-24T10:00:00Z',
  interactedAt: '2026-10-24T10:00:00Z',
};

describe('interactionApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetVisitorIdForTest();
    mockGetToken.mockResolvedValue('fake-token');
  });

  it('gửi sự kiện VIEW thành công và trả về ok', async () => {
    mockPost.mockResolvedValue({ data: { interactionId: 5 }, error: null, status: 201, ok: true });

    const result = await interactionApi.recordInteraction(baseEvent);

    expect(mockPost).toHaveBeenCalledWith(
      'interactions',
      expect.objectContaining({
        artifactId: 101,
        interactionType: 'VIEW',
        languageCode: 'vi',
      }),
      expect.objectContaining({ token: 'fake-token' }),
    );
    expect(result.ok).toBe(true);
    expect(result.status).toBe(201);
    expect(result.error).toBeNull();
    // eventId là UUID
    expect(mockPost.mock.calls[0][1].eventId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('khi chưa đăng nhập, không gửi request', async () => {
    mockGetToken.mockResolvedValue(null);

    const result = await interactionApi.recordInteraction(baseEvent);

    expect(mockPost).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(result.error).toContain('Authentication is required');
  });

  it('khi API trả lỗi, không crash', async () => {
    mockPost.mockResolvedValue({ data: null, error: 'Server error', status: 500, ok: false });

    const result = await interactionApi.recordInteraction(baseEvent);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
    expect(result.error).toBe('Server error');
  });

  it('khi xảy ra lỗi mạng, không crash', async () => {
    mockPost.mockRejectedValue(new Error('Network error'));

    const result = await interactionApi.recordInteraction(baseEvent);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toBe('Network error');
  });

  it('gửi payload đúng schema contract', async () => {
    mockPost.mockResolvedValue({ data: {}, error: null, status: 201, ok: true });

    await interactionApi.recordInteraction({
      ...baseEvent,
      endedAt: '2026-10-24T10:00:30Z',
    });

    const body = mockPost.mock.calls[0][1];
    expect(body.eventId).toBeDefined();
    expect(body.artifactId).toBe(101);
    expect(body.interactionType).toBe('VIEW');
    expect(body.languageCode).toBe('vi');
    expect(body.startedAt).toBe('2026-10-24T10:00:00Z');
    expect(body.endedAt).toBe('2026-10-24T10:00:30Z');
    expect(body.interactedAt).toBe('2026-10-24T10:00:00Z');
    // Không gửi visitorId, userId, beaconId, durationSeconds (không thuộc contract)
    expect(body.visitorId).toBeUndefined();
    expect(body.userId).toBeUndefined();
    expect(body.beaconId).toBeUndefined();
    expect(body.durationSeconds).toBeUndefined();
  });

  it('giữ nguyên eventId khi retry cùng một event', async () => {
    const eventId = '550e8400-e29b-41d4-a716-446655440000';
    mockPost.mockResolvedValue({ data: {}, error: null, status: 201, ok: true });

    await interactionApi.recordInteraction({ ...baseEvent, eventId });
    await interactionApi.recordInteraction({ ...baseEvent, eventId });

    const calls = mockPost.mock.calls;
    expect(calls[0][1].eventId).toBe(eventId);
    expect(calls[1][1].eventId).toBe(eventId);
    expect(calls.length).toBe(2);
  });
});
