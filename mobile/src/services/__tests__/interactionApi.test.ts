/**
 * Smart Heritage - Test cho Visitor Interaction API Service (LTJ-34)
 *
 * Tuân theo contract docs/requirements/visitor-interaction-data-contract.md.
 */
import { apiClient } from '../api';
import { interactionApi, __resetVisitorIdForTest, type InteractionType } from '../interactionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockPost = apiClient.post as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockGetItem = AsyncStorage.getItem as jest.Mock;

const baseEvent = {
  artifactId: 101,
  interactionType: 'MANUAL_VIEW' as InteractionType,
  languageCode: 'vi',
  interactedAt: '2026-10-24T06:00:00Z',
};

describe('interactionApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetVisitorIdForTest();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
  });

  it('gửi sự kiện MANUAL_VIEW thành công và trả về ok', async () => {
    mockPost.mockResolvedValue({ data: { interactionId: 5 }, error: null, status: 201, ok: true });

    const result = await interactionApi.sendInteraction(baseEvent);

    expect(mockPost).toHaveBeenCalledWith('interactions', expect.objectContaining({
      artifactId: 101,
      interactionType: 'MANUAL_VIEW',
      languageCode: 'vi',
    }));
    expect(result.ok).toBe(true);
    expect(result.status).toBe(201);
    expect(result.error).toBeNull();
    // eventId là UUID
    expect(mockPost.mock.calls[0][1].eventId).toMatch(/^[0-9a-f-]{36}$/);
    // visitorId được sinh và lưu vào AsyncStorage
    expect(mockSetItem).toHaveBeenCalledWith('@smart_heritage:visitor_id', expect.any(String));
  });

  it('lưu visitorId ổn định khi đã có trong AsyncStorage', async () => {
    mockGetItem.mockResolvedValue('visitor-stable-id');
    mockPost.mockResolvedValue({ data: { interactionId: 6 }, error: null, status: 201, ok: true });

    await interactionApi.sendInteraction(baseEvent);

    expect(mockPost.mock.calls[0][1].visitorId).toBe('visitor-stable-id');
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('không crash khi API trả lỗi', async () => {
    mockPost.mockResolvedValue({ data: null, error: 'Server error', status: 500, ok: false });

    const result = await interactionApi.sendInteraction(baseEvent);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
    expect(result.error).toBe('Server error');
  });

  it('không crash khi xảy ra lỗi mạng', async () => {
    mockPost.mockRejectedValue(new Error('Network error'));

    const result = await interactionApi.sendInteraction(baseEvent);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toBe('Network error');
  });

  it('gửi payload đúng schema contract', async () => {
    mockPost.mockResolvedValue({ data: {}, error: null, status: 201, ok: true });

    await interactionApi.sendInteraction({
      ...baseEvent,
      userId: 12,
      beaconId: 7,
      startedAt: '2026-10-24T05:00:00Z',
      endedAt: '2026-10-24T05:00:30Z',
      durationSeconds: 30,
    });

    const body = mockPost.mock.calls[0][1];
    expect(body.eventId).toBeDefined();
    expect(body.visitorId).toBeDefined();
    expect(body.userId).toBe(12);
    expect(body.artifactId).toBe(101);
    expect(body.beaconId).toBe(7);
    expect(body.interactionType).toBe('MANUAL_VIEW');
    expect(body.languageCode).toBe('vi');
    expect(body.startedAt).toBe('2026-10-24T05:00:00Z');
    expect(body.endedAt).toBe('2026-10-24T05:00:30Z');
    expect(body.durationSeconds).toBe(30);
    expect(body.interactedAt).toBe('2026-10-24T06:00:00Z');
  });
});
