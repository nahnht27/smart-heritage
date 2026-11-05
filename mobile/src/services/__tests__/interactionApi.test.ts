/**
 * Smart Heritage - Test cho Visitor Interaction API Service (LTJ-47)
 *
 * Tuân theo M5 contract: POST /api/interactions với JWT, chỉ dùng
 * VIEW/AUDIO_PLAY/SCAN và không gửi visitorId/userId/beaconId/durationSeconds.
 */
import { apiClient } from '../api';
import { authStorage } from '../authStorage';
import { interactionApi, type InteractionEvent } from '../interactionApi';

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

const baseEvent: InteractionEvent = {
  eventId: '550e8400-e29b-41d4-a716-446655440000',
  artifactId: 101,
  interactionType: 'VIEW',
  languageCode: 'vi',
};

describe('interactionApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue('test-jwt-token');
  });

  it('gửi sự kiện VIEW kèm Bearer JWT và trả về ok', async () => {
    mockPost.mockResolvedValue({ data: { interactionId: 5 }, error: null, status: 201, ok: true });

    const result = await interactionApi.sendInteraction(baseEvent);

    expect(mockGetToken).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith(
      'interactions',
      expect.objectContaining({
        eventId: baseEvent.eventId,
        artifactId: 101,
        interactionType: 'VIEW',
        languageCode: 'vi',
      }),
      { token: 'test-jwt-token' }
    );
    expect(result).toEqual({ ok: true, error: null, status: 201 });
  });

  it('giữ nguyên eventId do phía gọi cung cấp khi retry', async () => {
    mockPost.mockResolvedValue({ data: {}, error: null, status: 201, ok: true });

    await interactionApi.sendInteraction(baseEvent);
    await interactionApi.sendInteraction(baseEvent);

    expect(mockPost.mock.calls[0][1].eventId).toBe(baseEvent.eventId);
    expect(mockPost.mock.calls[1][1].eventId).toBe(baseEvent.eventId);
  });

  it('không gửi các trường ngoài contract', async () => {
    mockPost.mockResolvedValue({ data: {}, error: null, status: 201, ok: true });

    await interactionApi.sendInteraction({
      ...baseEvent,
      startedAt: '2026-11-04T09:00:00.000Z',
      endedAt: '2026-11-04T09:00:20.000Z',
    });

    const body = mockPost.mock.calls[0][1];
    expect(body).not.toHaveProperty('visitorId');
    expect(body).not.toHaveProperty('userId');
    expect(body).not.toHaveProperty('beaconId');
    expect(body).not.toHaveProperty('durationSeconds');
    expect(typeof body.startedAt).toBe('string');
    expect(typeof body.interactedAt).toBe('string');
  });

  it('không gọi API khi thiếu token', async () => {
    mockGetToken.mockResolvedValue(null);

    const result = await interactionApi.sendInteraction(baseEvent);

    expect(mockPost).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      error: 'Missing authentication token',
      status: 401,
    });
  });

  it('không crash khi API trả lỗi', async () => {
    mockPost.mockResolvedValue({ data: null, error: 'Server error', status: 500, ok: false });

    const result = await interactionApi.sendInteraction(baseEvent);

    expect(result).toEqual({ ok: false, error: 'Server error', status: 500 });
  });

  it('không crash khi xảy ra lỗi mạng', async () => {
    mockPost.mockRejectedValue(new Error('Network error'));

    const result = await interactionApi.sendInteraction(baseEvent);

    expect(result).toEqual({ ok: false, error: 'Network error', status: 0 });
  });
});
