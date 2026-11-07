import {
  DEFAULT_BEACON_UUID,
  beaconKey,
  createBeaconRegion,
  isValidBeaconUuid,
  isValidMajorMinor,
  normalizeBeaconIdentity,
  normalizeBeaconUuid,
  parseNativeBeacon,
} from '../beacon/ibeacon';

const UUID = 'E2C56DB5-DFFB-48D2-B060-D0F5A71096E0';

describe('ibeacon helpers', () => {
  it('normalizes UUIDs for comparison and API calls', () => {
    expect(normalizeBeaconUuid(`  ${UUID}  `)).toBe(UUID.toLowerCase());
  });

  it('accepts a canonical proximity UUID', () => {
    expect(isValidBeaconUuid(UUID)).toBe(true);
    expect(isValidBeaconUuid('not-a-uuid')).toBe(false);
    expect(isValidBeaconUuid(null)).toBe(false);
  });

  it('validates major and minor ranges', () => {
    expect(isValidMajorMinor(0)).toBe(true);
    expect(isValidMajorMinor(65535)).toBe(true);
    expect(isValidMajorMinor(-1)).toBe(false);
    expect(isValidMajorMinor(65536)).toBe(false);
    expect(isValidMajorMinor(1.5)).toBe(false);
  });

  it('normalizes a complete identity and rejects partial identities', () => {
    expect(
      normalizeBeaconIdentity({ uuid: ` ${UUID} `, major: 1, minor: 2 }),
    ).toEqual({ uuid: UUID.toLowerCase(), major: 1, minor: 2 });

    expect(normalizeBeaconIdentity({ uuid: UUID, major: 1 })).toBeNull();
    expect(normalizeBeaconIdentity(null)).toBeNull();
  });

  it('builds a stable key from normalized identity fields', () => {
    expect(
      beaconKey({ uuid: UUID, major: 10, minor: 20 }),
    ).toBe(`${UUID.toLowerCase()}:10:20`);
  });

  it('parses native readings and rejects invalid ones', () => {
    expect(
      parseNativeBeacon({
        uuid: UUID,
        major: 10,
        minor: 20,
        rssi: -68,
        distance: 1.25,
        timestamp: 1234,
      }),
    ).toEqual({
      uuid: UUID.toLowerCase(),
      major: 10,
      minor: 20,
      rssi: -68,
      distance: 1.25,
      timestamp: 1234,
    });

    expect(
      parseNativeBeacon({
        uuid: 'invalid',
        major: 10,
        minor: 20,
        rssi: -68,
      }),
    ).toBeNull();
  });

  it('creates a region from the default UUID and an explicit UUID', () => {
    expect(createBeaconRegion()).toEqual({
      identifier: 'smart-heritage',
      uuid: DEFAULT_BEACON_UUID.toLowerCase(),
    });
    expect(createBeaconRegion(UUID)).toEqual({
      identifier: 'smart-heritage',
      uuid: UUID.toLowerCase(),
    });
  });
});
