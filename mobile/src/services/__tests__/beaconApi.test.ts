import { apiClient } from '../api';
import { beaconApi } from '../beacon/beaconApi';

jest.mock('../api', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const mockGet = apiClient.get as jest.Mock;
const UUID = 'E2C56DB5-DFFB-48D2-B060-D0F5A71096E0';

const resolvedBeacon = {
  beaconId: 7,
  name: 'Beacon cổng chính',
  uuid: UUID.toLowerCase(),
  major: 1,
  minor: 2,
  enabled: true,
  artifactId: 42,
  artifactName: 'Trống đồng',
  siteId: 3,
  siteName: 'Khu di tích',
};

describe('beaconApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves a normalized beacon identity', async () => {
    mockGet.mockResolvedValue({
      data: resolvedBeacon,
      error: null,
      status: 200,
      ok: true,
    });

    const result = await beaconApi.resolve({
      uuid: ` ${UUID} `,
      major: 1,
      minor: 2,
    });

    expect(mockGet).toHaveBeenCalledWith(
      `beacons/resolve?uuid=${encodeURIComponent(UUID.toLowerCase())}&major=1&minor=2`,
    );
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data).toEqual(resolvedBeacon);
  });

  it('rejects invalid identities without calling the API', async () => {
    const result = await beaconApi.resolve({
      uuid: 'invalid',
      major: 1,
      minor: 2,
    });

    expect(mockGet).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  it('returns a not-found result for an unknown or disabled beacon', async () => {
    mockGet.mockResolvedValue({
      data: null,
      error: 'Beacon not found',
      status: 404,
      ok: false,
    });

    const result = await beaconApi.resolve({ uuid: UUID, major: 1, minor: 2 });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.data).toBeNull();
    expect(result.error).toBe('Beacon not found');
  });
});
