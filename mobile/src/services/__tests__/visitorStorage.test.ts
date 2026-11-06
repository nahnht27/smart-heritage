import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { visitorStorage } from '../visitorStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRandomUUID = Crypto.randomUUID as jest.Mock;

describe('visitorStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    visitorStorage.__resetForTest();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockRandomUUID.mockReturnValue('11111111-1111-4111-8111-111111111111');
  });

  it('creates and persists one UUID on first use', async () => {
    const first = await visitorStorage.getVisitorId();
    const second = await visitorStorage.getVisitorId();

    expect(first).toBe('11111111-1111-4111-8111-111111111111');
    expect(second).toBe(first);
    expect(mockRandomUUID).toHaveBeenCalledTimes(1);
    expect(mockSetItem).toHaveBeenCalledWith(
      '@smart_heritage:visitor_id',
      first,
    );
  });

  it('reuses a valid stored UUID', async () => {
    mockGetItem.mockResolvedValue('22222222-2222-4222-8222-222222222222');

    const visitorId = await visitorStorage.getVisitorId();

    expect(visitorId).toBe('22222222-2222-4222-8222-222222222222');
    expect(mockRandomUUID).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('replaces an invalid stored value', async () => {
    mockGetItem.mockResolvedValue('not-a-uuid');

    const visitorId = await visitorStorage.getVisitorId();

    expect(visitorId).toBe('11111111-1111-4111-8111-111111111111');
    expect(mockSetItem).toHaveBeenCalledWith(
      '@smart_heritage:visitor_id',
      visitorId,
    );
  });
});
